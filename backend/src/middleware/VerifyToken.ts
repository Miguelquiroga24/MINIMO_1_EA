import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import type { AccessTokenPayload, AuthUser } from '../models/User';
import UserService from '../services/UserService';

// Express no sabe que nosotros añadimos req.user en este middleware.
// Aqui ampliamos su tipo Request para que TypeScript conozca ese campo en todos los
// controladores. Es opcional (?) porque en las rutas publicas no hay usuario.
declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}

// Middleware que comprueba que la peticion trae un access token valido.
// Se pone delante de cada ruta protegida, en los ficheros de src/routes/.
//
// El token llega en la cabecera:   Authorization: Bearer eyJhbGciOi...
//
// Si es valido, deja el usuario en req.user para los siguientes middlewares y controladores.
//
// Ademas comprueba en la base de datos que el usuario sigue activo. El token dura 15 minutos: sin esta
// comprobacion, un usuario al que un admin desactiva o archiva podria seguir usando la API hasta que
// le caducara. getUserById pasa por el prehook del modelo, asi que no encuentra a los inactivos ni a
// los archivados. Responder 401 hace que el frontend cierre la sesion y lleve al login.
export const VerifyToken = async (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;

    // Sin cabecera, o con una que no empieza por "Bearer ", no hay sesion
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Falta el token' });
    }

    // Nos quedamos con lo que va despues de "Bearer "
    const token = header.slice('Bearer '.length);

    try {
        // jwt.verify comprueba la firma con nuestro secreto y que el token no haya caducado (exp).
        // Si algo falla lanza un error: TokenExpiredError si ha caducado, JsonWebTokenError si
        // la firma no es correcta o el token esta mal formado
        const payload = jwt.verify(token, config.jwt.secret) as AccessTokenPayload;

        // El usuario del token tiene que seguir existiendo y estar activo
        const user = await UserService.getUserById(payload.sub);

        if (!user) {
            return res.status(401).json({ message: 'Tu cuenta no está activa' });
        }

        req.user = { id: payload.sub, role: payload.role };

        next();
    } catch (error) {
        // El ErrorHandler convierte los errores de JWT en un 401
        next(error);
    }
};

export default VerifyToken;
