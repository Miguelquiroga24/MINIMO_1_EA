import { NextFunction, Request, Response } from 'express';
import Logging from '../library/Logging';

// Middleware que se encarga de registrar informacion sobre las peticiones
export const Logger = (req: Request, res: Response, next: NextFunction) => {
    // Registramos la informacion de la petición cuando llega al servidor
    // Guardamos el metodo, la URL y la IP desde la que se hace la petición
    Logging.info(`Incoming - METHOD: [${req.method}] - URL: [${req.originalUrl}] - IP: [${req.socket.remoteAddress}]`);

    // Esperamos a que termine la respuesta para poder saber su codigo de estado
    res.on('finish', () => {
        // Registramos la informacion de la respuesta una vez ha terminado
        // Asi podemos saber si la petición se ha realizado correctamente o ha dado algun error
        Logging.info(`Result - METHOD: [${req.method}] - URL: [${req.originalUrl}] - IP: [${req.socket.remoteAddress}] - STATUS: [${res.statusCode}]`);
    });

    // Continuamos con el siguiente middleware o con la siguiente funcion
    next();
};

// Exportamos el middleware para poder utilizarlo en el resto de la aplicacion
export default Logger;
