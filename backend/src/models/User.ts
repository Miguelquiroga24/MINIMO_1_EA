import mongoose, { Document, Schema } from 'mongoose';

import Logging from '../library/Logging';
import { hashPassword } from '../utils/password';

// Tamaño maximo de la foto de perfil (en caracteres). La foto se guarda dentro del propio usuario como
// texto en base64 ("data:image/jpeg;base64,..."). El frontend la reduce antes de enviarla, asi que una foto
// normal ocupa unos 30 KB; con este limite nadie puede llenar la base de datos subiendo fotos enormes.
export const PHOTO_MAX_LENGTH = 200_000;

// Roles que puede tener un usuario.
// admin entra en el backoffice; user es el usuario normal de la app.
export const USER_ROLES = ['user', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

// Definimos los datos que puede tener un usuario.
// Un usuario es quien inicia sesion en la aplicacion: un estudiante de la universidad o un admin.
export interface IUser {
    name: string;

    email: string;

    password: string;

    role: UserRole;

    // ---- Perfil: lo que se ve de un estudiante en Studate ----

    // Fecha de nacimiento: con ella se calcula la edad
    birthDate?: Date;

    // Titulación que estudia, por ejemplo "Grau en Enginyeria Telemàtica"
    degree?: string;

    // El "Qué busco" del perfil, por ejemplo "Alguien con quien estudiar"
    lookingFor?: string;

    // Unas líneas para presentarse
    bio?: string;

    // Foto de perfil en base64 (ver PHOTO_MAX_LENGTH)
    photo?: string;

    // ---- Estado de la cuenta ----

    // Un admin puede desactivar a un usuario: un usuario inactivo no puede iniciar sesion ni usar la API
    active: boolean;

    // Marca si el usuario esta archivado (borrado logico). Un usuario archivado no se elimina de la base
    // de datos: se puede restaurar. Eliminarlo para siempre es otra operacion (borrado fisico)
    deleted: boolean;

    deletedAt?: Date;
}

// ---- Interfaces de la autenticacion con JWT ----

// Lo que guardamos dentro del access token (el "payload" del JWT).
// sub (subject) es el id del usuario y role su rol. La librería añade además iat (cuándo se
// firmó) y exp (cuándo caduca).
// Ojo: el payload de un JWT no está cifrado, solo firmado. Cualquiera puede leerlo (por ejemplo
// en jwt.io), así que nunca se pone aquí la contraseña ni nada privado.
export interface AccessTokenPayload {
    sub: string;
    role: UserRole;
}

// Lo que guardamos dentro del refresh token: solo el id del usuario.
// El rol no hace falta, porque al renovar se vuelve a leer el usuario de la base de datos.
export interface RefreshTokenPayload {
    sub: string;
}

// El usuario con sesión que el middleware VerifyToken deja en req.user
export interface AuthUser {
    id: string;
    role: UserRole;
}

// Esta interfaz junta los datos del usuario con las propiedades de un documento de MongoDB
export interface IUserModel extends IUser, Document {}

const UserSchema: Schema = new Schema(
    {
        // El nombre es el que se ve en la aplicacion (por ejemplo, en La Orla o en un Date)
        name: { type: String, required: true, trim: true },

        // El email es con lo que se inicia sesion, asi que no puede repetirse.
        // Lo guardamos en minusculas para que Ana@example.com y ana@example.com sean el mismo
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },

        // La contraseña se guarda cifrada (ver el hook de abajo) y no sale en las consultas:
        // para leerla hay que pedirla a proposito con .select('+password')
        password: { type: String, required: true, select: false },

        // Si no se indica, un usuario nuevo es user. Los admin se crean con el seed
        role: { type: String, enum: USER_ROLES, default: 'user' },

        // Los datos del perfil son opcionales: al registrarse solo se piden nombre, email y contraseña
        birthDate: { type: Date },

        degree: { type: String, trim: true },

        lookingFor: { type: String, trim: true, maxlength: 100 },

        bio: { type: String, trim: true, maxlength: 500 },

        photo: { type: String, maxlength: PHOTO_MAX_LENGTH },

        // Por defecto un usuario esta activo
        active: { type: Boolean, default: true },

        // Borrado logico, igual que hacian autores y libros en el seminario.
        // Ojo: aqui el email sigue siendo unico entre todos los usuarios, tambien los archivados
        // (no hay indice parcial). Asi, al restaurar un usuario su email nunca choca con el de otro.
        deleted: { type: Boolean, default: false },

        deletedAt: { type: Date }
    },
    {
        // Mongoose crea automaticamente las fechas de creacion y actualizacion
        timestamps: true,

        // Quitamos el campo que usa Mongoose para controlar las versiones
        versionKey: false,

        // Al convertir el usuario a JSON quitamos la contraseña, por si alguna vez se ha leido
        toJSON: {
            transform: (document, result: Record<string, unknown>) => {
                delete result.password;

                return result;
            }
        }
    }
);

// Este hook se ejecuta antes de guardar un usuario en la base de datos
UserSchema.pre('save', async function () {
    // Si la contraseña no ha cambiado no la volvemos a cifrar
    // (cifrariamos una contraseña que ya esta cifrada)
    if (!this.isModified('password')) {
        return;
    }

    // Guardamos la contraseña cifrada en lugar de la original
    this.password = await hashPassword(String(this.password));
});

// Prehook de "está activo": se ejecuta antes de cada consulta de usuarios (find, findOne, findById, que
// por dentro es un findOne, findOneAndUpdate y countDocuments) y le añade el filtro
// { active: true, deleted: false }. Así, por defecto, la aplicación solo "ve" a los usuarios activos y
// no archivados, sin tener que acordarse de filtrar en cada consulta. Por ejemplo:
//   - el login busca el usuario por email: si está inactivo o archivado no lo encuentra y responde 401
//   - el refresh vuelve a leer el usuario: si lo han desactivado, ya no le da un token nuevo
//
// El admin sí necesita verlos todos (para reactivarlos o restaurarlos). Para saltarse el filtro, la
// consulta lleva la opción withInactive:
//
//     User.find(filtro).setOptions({ withInactive: true })
//
UserSchema.pre(['find', 'findOne', 'findOneAndUpdate', 'countDocuments'], function () {
    // getOptions() devuelve las opciones de la consulta, también las nuestras (como withInactive)
    if (this.getOptions().withInactive) {
        return;
    }

    this.where({ active: true, deleted: false });
});

// Este hook se ejecuta despues de guardar correctamente el usuario
UserSchema.post('save', function (user) {
    // Simulamos el envio de un email de bienvenida
    // En este caso simplemente lo mostramos en los logs
    Logging.info(`Email simulation: welcome email sent to ${user.email}`);
});

export default mongoose.model<IUserModel>('User', UserSchema);
