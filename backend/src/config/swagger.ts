import path from 'node:path';
import swaggerJsdoc from 'swagger-jsdoc';
import j2s from 'joi-to-swagger';
import { Schemas } from '../middleware/Joi';
import { config } from './config';

// La documentación de cada endpoint está escrita en un comentario /** @openapi */
// encima de su ruta, en src/routes/. Aquí solo se montan las piezas comunes.

// Los esquemas del body salen de los mismos esquemas de Joi que validan las
// peticiones, así que no se pueden quedar desfasados.
const { swagger: registerInput } = j2s(Schemas.auth.register);
const { swagger: loginInput } = j2s(Schemas.auth.login);
const { swagger: userInput } = j2s(Schemas.user.create);
const { swagger: userUpdateInput } = j2s(Schemas.user.update);
const { swagger: gradeInput } = j2s(Schemas.grade.create);
const { swagger: gradeUpdateInput } = j2s(Schemas.grade.update);
const { swagger: dateInput } = j2s(Schemas.date.create);
const { swagger: dateUpdateInput } = j2s(Schemas.date.update);

// Lo que devuelve la API no es igual a lo que se envía: lleva el _id y las fechas que
// pone MongoDB, y el usuario nunca devuelve la contraseña.
const storedFields = {
    _id: { type: 'string', example: '6ab3f2fe9c500204a7d5f80b' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
};

const { password: _password, ...userFields } = registerInput.properties;

// El usuario tal como lo devuelve la API: los datos del registro (sin contraseña), el rol, el perfil
// y el estado de la cuenta (activo y archivado)
const userSchema = {
    type: 'object',
    properties: {
        ...storedFields,
        ...userFields,
        role: { type: 'string', enum: ['user', 'admin'] },
        birthDate: { type: 'string', format: 'date-time' },
        degree: { type: 'string' },
        lookingFor: { type: 'string', maxLength: 100 },
        bio: { type: 'string', maxLength: 500 },
        photo: { type: 'string', description: 'Foto en base64 (data:image/jpeg;base64,...)' },
        active: { type: 'boolean' },
        deleted: { type: 'boolean', description: 'true si el usuario está archivado' },
        deletedAt: { type: 'string', format: 'date-time' }
    }
};

// Una respuesta correcta: el esquema de lo que se devuelve y un ejemplo con datos de verdad
const okResponse = (description: string, schema: object, example: object) => ({
    description,
    content: { 'application/json': { schema, example } }
});

// Una respuesta de error: siempre un message, con un ejemplo del mensaje real
const errorResponse = (description: string, message: string) => ({
    description,
    content: {
        'application/json': {
            schema: {
                type: 'object',
                properties: { message: { type: 'string' } }
            },
            example: { message }
        }
    }
});

const userExample = {
    _id: '6ab3f2fe9c500204a7d5f8a3',
    name: 'Laia Puig',
    email: 'laia@example.com',
    role: 'user',
    birthDate: '2003-02-20T00:00:00.000Z',
    degree: 'Grau en Enginyeria Telemàtica',
    lookingFor: 'Tomar algo después de clase',
    bio: 'Siempre en la biblioteca de la EETAC, casi siempre con café.',
    active: true,
    deleted: false,
    createdAt: '2026-11-03T10:00:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z'
};

// Un voto de La Orla: from y to llegan con los datos del usuario (populate), no solo con su id
const userSummary = {
    type: 'object',
    properties: { _id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' }, photo: { type: 'string' } }
};

const gradeSchema = {
    type: 'object',
    properties: {
        ...storedFields,
        from: userSummary,
        to: userSummary,
        value: { type: 'string', enum: ['A+', 'F'] }
    }
};

const gradeExample = {
    _id: '6ab3f2fe9c500204a7d5f901',
    from: { _id: '6ab3f2fe9c500204a7d5f8a3', name: 'Laia Puig', email: 'laia@example.com' },
    to: { _id: '6ab3f2fe9c500204a7d5f8a4', name: 'Pau Ferrer', email: 'pau@example.com' },
    value: 'A+',
    createdAt: '2026-11-03T10:00:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z'
};

// Un Date: users llega con los datos de los dos usuarios; firstTurn es el id del que escribe primero
const dateSchema = {
    type: 'object',
    properties: {
        ...storedFields,
        users: { type: 'array', items: userSummary },
        status: { type: 'string', enum: ['pending', 'ongoing', 'closed'] },
        firstTurn: { type: 'string', description: 'Id del usuario al que le toca escribir primero' },
        expiresAt: { type: 'string', format: 'date-time' },
        extended: { type: 'boolean', description: 'Si ya se ha usado la prórroga' }
    }
};

const dateExample = {
    _id: '6ab3f2fe9c500204a7d5fa01',
    users: [gradeExample.from, gradeExample.to],
    status: 'pending',
    firstTurn: '6ab3f2fe9c500204a7d5f8a4',
    expiresAt: '2026-11-04T10:00:00.000Z',
    extended: false,
    createdAt: '2026-11-03T10:00:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z'
};

const swaggerPath = (filePath: string) => filePath.replace(/\\/g, '/');

const swaggerDocument = swaggerJsdoc({
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Studate API',
            version: '1.0.0',
            description: 'API de Studate, proyecto del Grupo 3 de EA (Node.js, Express, TypeScript y MongoDB).'
        },
        servers: [{ url: `http://localhost:${config.server.port}` }],
        tags: [
            { name: 'Health', description: 'Comprobar que la API responde' },
            { name: 'Auth', description: 'Registro, login, renovación del token y logout' },
            { name: 'Users', description: 'Usuarios: el de la sesión, con quién abrir un Date y la gestión de usuarios del backoffice (solo admin)' },
            { name: 'Grades', description: 'Votos de La Orla: A+ o F de un usuario a otro (solo admin)' },
            { name: 'Dates', description: 'Citas entre dos usuarios que se han dado A+ (el admin ve todas; un usuario, las suyas)' }
        ],
        // Por defecto todas las rutas piden el token (el candado de Swagger).
        // Las rutas públicas lo quitan con security: [] en su comentario @openapi.
        security: [{ bearerAuth: [] }],
        components: {
            // Cómo se envía el token: en la cabecera Authorization: Bearer <token>.
            // En la página de Swagger se pega con el botón Authorize.
            securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
                // El refresh token va en una cookie HttpOnly que deja el login; la usan /auth/refresh y /auth/logout.
                // Desde la propia página de Swagger funciona sola, porque el navegador la envía.
                refreshCookie: { type: 'apiKey', in: 'cookie', name: 'refreshToken' }
            },
            schemas: {
                RegisterInput: registerInput,
                LoginInput: loginInput,
                UserInput: userInput,
                UserUpdateInput: userUpdateInput,
                User: userSchema,
                GradeInput: gradeInput,
                GradeUpdateInput: gradeUpdateInput,
                Grade: gradeSchema,
                DateInput: dateInput,
                DateUpdateInput: dateUpdateInput,
                Date: dateSchema
            },
            responses: {
                LoginOk: okResponse(
                    'Sesión iniciada: el access token y el usuario (el refresh token va en la cookie)',
                    {
                        type: 'object',
                        properties: {
                            token: { type: 'string' },
                            user: userSchema
                        }
                    },
                    { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', user: userExample }
                ),
                BadCredentials: errorResponse('El email o la contraseña no son correctos', 'Email o contraseña incorrectos'),
                Unauthorized: errorResponse(
                    'Falta el token, ha caducado, no es válido o la cuenta ya no está activa ("Tu cuenta no está activa")',
                    'El token ha caducado'
                ),
                Forbidden: errorResponse('El usuario no tiene el rol necesario', 'Necesitas el rol admin'),
                GradeOne: okResponse('Un voto, con los datos de los dos usuarios', { type: 'object', properties: { grade: gradeSchema } }, { grade: gradeExample }),
                GradeList: okResponse(
                    'Una página de votos y los datos de paginación',
                    {
                        type: 'object',
                        properties: {
                            grades: { type: 'array', items: gradeSchema },
                            total: { type: 'integer', example: 25 },
                            page: { type: 'integer', example: 1 },
                            pages: { type: 'integer', example: 5 }
                        }
                    },
                    { grades: [gradeExample], total: 25, page: 1, pages: 5 }
                ),
                DateOne: okResponse('Un Date, con los datos de los dos usuarios', { type: 'object', properties: { date: dateSchema } }, { date: dateExample }),
                DateList: okResponse(
                    'Una página de Dates y los datos de paginación',
                    {
                        type: 'object',
                        properties: {
                            dates: { type: 'array', items: dateSchema },
                            total: { type: 'integer', example: 4 },
                            page: { type: 'integer', example: 1 },
                            pages: { type: 'integer', example: 1 }
                        }
                    },
                    { dates: [dateExample], total: 4, page: 1, pages: 1 }
                ),
                AlreadyExtended: errorResponse('La prórroga solo se puede usar una vez', 'La prórroga de este Date ya se ha usado'),
                GradeConflict: errorResponse('Ese usuario ya ha votado ese perfil (para cambiar la nota, PUT)', 'Este usuario ya ha votado ese perfil'),
                DateConflict: errorResponse('Ya hay un Date entre esos dos usuarios', 'Ya hay un Date entre estos dos usuarios'),
                NotYourDate: errorResponse('Un usuario normal solo puede abrir Dates en los que está él', 'Solo puedes abrir Dates en los que estés tú'),
                NotArchived: errorResponse('Solo se puede eliminar para siempre un usuario archivado', 'Archiva el usuario antes de eliminarlo'),
                OwnUser: errorResponse('Un admin no puede hacer esto con su propio usuario', 'No puedes hacer esto con tu propio usuario'),
                UserOne: okResponse('Un usuario', { type: 'object', properties: { user: userSchema } }, { user: userExample }),
                UserList: okResponse(
                    'Una página de usuarios y los datos de paginación',
                    {
                        type: 'object',
                        properties: {
                            users: { type: 'array', items: userSchema },
                            total: { type: 'integer', example: 12 },
                            page: { type: 'integer', example: 1 },
                            pages: { type: 'integer', example: 2 }
                        }
                    },
                    { users: [userExample], total: 12, page: 1, pages: 2 }
                ),
                BadRequest: errorResponse('El id de la URL no tiene forma de id de MongoDB', 'userId no es un id válido'),
                InvalidPagination: errorResponse('Los parámetros de paginación o búsqueda no son válidos', '"page" must be greater than or equal to 1'),
                NotFound: errorResponse('No existe ningún recurso con ese id', 'not found'),
                Conflict: errorResponse('Ya existe otro recurso con ese email', 'email ya existe'),
                Unprocessable: errorResponse('El body no cumple el esquema', '"email" is required'),
                ServerError: errorResponse('Error inesperado del servidor', 'Internal server error')
            }
        }
    },
    // __dirname es src/config con npm run dev y build/config con npm start:
    // en los dos casos se leen las rutas, porque al compilar se conservan los comentarios
    apis: [
        swaggerPath(path.join(__dirname, '../routes/*.ts')),
        swaggerPath(path.join(__dirname, '../routes/*.js')),
        swaggerPath(path.join(__dirname, '../server.ts')),
        swaggerPath(path.join(__dirname, '../server.js'))
    ]
});

export default swaggerDocument;
