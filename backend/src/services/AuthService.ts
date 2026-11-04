import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import User, { AccessTokenPayload, IUser, IUserModel, RefreshTokenPayload } from '../models/User';
import { verifyPassword } from '../utils/password';

// Firma el access token: el que se envia en cada peticion en la cabecera Authorization.
// Dura poco (JWT_EXPIRES_IN, 15 minutos por defecto) para que, si alguien lo roba, le sirva poco tiempo.
// jwt.sign añade solo el claim exp a partir de expiresIn.
export const signAccessToken = (user: IUserModel) => {
    const payload: AccessTokenPayload = { sub: String(user._id), role: user.role };

    return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
};

// Firma el refresh token: solo sirve para pedir un access token nuevo en POST /auth/refresh.
// Dura mas (JWT_REFRESH_EXPIRES_IN, 7 dias por defecto) y se firma con otro secreto, asi que
// no se puede usar como access token.
export const signRefreshToken = (user: IUserModel) => {
    const payload: RefreshTokenPayload = { sub: String(user._id) };

    return jwt.sign(payload, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });
};

// Registra un usuario nuevo. Siempre se crea con el rol user (el valor por defecto del modelo).
// Si el email ya existe, MongoDB lanza un error 11000 y el ErrorHandler responde 409.
export const register = (data: Pick<IUser, 'name' | 'email' | 'password'>) => {
    const user = new User({ name: data.name, email: data.email, password: data.password });

    return user.save();
};

// Comprueba el email y la contraseña. Si son correctos devuelve los dos tokens y el usuario;
// si no, devuelve null y el controlador responde 401.
export const login = async (email: string, password: string) => {
    // La contraseña tiene select: false en el modelo, asi que hay que pedirla a proposito
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    // Si el email no existe o la contraseña no coincide, devolvemos lo mismo (null).
    // Asi el que llama no puede saber que emails estan registrados.
    if (!user || !(await verifyPassword(password, user.password))) {
        return null;
    }

    return {
        token: signAccessToken(user),
        refreshToken: signRefreshToken(user),
        // toJSON() quita la contraseña del usuario antes de devolverlo
        user: user.toJSON()
    };
};

// Recibe un refresh token y, si es valido, devuelve un access token nuevo.
// Si el token esta caducado o mal firmado, jwt.verify lanza un error y el ErrorHandler responde 401.
// Si el usuario ya no existe devuelve null y el controlador responde 401.
export const refresh = async (refreshToken: string) => {
    const payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as RefreshTokenPayload;

    // Volvemos a leer el usuario de la base de datos: asi el token nuevo lleva su rol actual
    const user = await User.findById(payload.sub);

    if (!user) {
        return null;
    }

    return { token: signAccessToken(user) };
};

export default { register, login, refresh };
