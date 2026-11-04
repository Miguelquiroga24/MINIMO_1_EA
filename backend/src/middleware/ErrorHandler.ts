import { ErrorRequestHandler } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

import Logging from '../library/Logging';

// Definimos los posibles datos que puede tener un error
// Algunos errores pueden tener un codigo, un estado o informacion adicional
type DatabaseError = Error & { code?: number; status?: number; details?: unknown[] };

export const ErrorHandler: ErrorRequestHandler = (error: DatabaseError, req, res, next) => {

    // Si es un error 404 solo mostramos un aviso en el log
    // No hace falta tratarlo como un error grave del servidor
    if (error.message === 'Not found') {

        Logging.warning(`Not found: ${req.method} ${req.originalUrl}`);

    } else if (error instanceof JsonWebTokenError) {

        // Un token caducado o falso tampoco es un fallo del servidor: solo un aviso
        Logging.warning(`Token rechazado (${error.message}): ${req.method} ${req.originalUrl}`);

    } else {

        // Para el resto de errores los guardamos como errores normales
        Logging.error(error);
    }

    // Comprobamos si ya se ha empezado a enviar una respuesta
    // Si es asi dejamos que Express continue gestionando el error
    if (res.headersSent) {

        return next(error);
    }

    // Errores de la libreria jsonwebtoken: el token ha caducado o no es valido.
    // En los dos casos el usuario no esta identificado, asi que respondemos 401.
    // Damos mensajes distintos para que el frontend sepa cuando le basta con renovar el token.
    // Va antes que el resto porque TokenExpiredError es un tipo de JsonWebTokenError.
    if (error instanceof TokenExpiredError) {

        return res.status(401).json({ message: 'El token ha caducado' });
    }

    if (error instanceof JsonWebTokenError) {

        return res.status(401).json({ message: 'Token no válido' });
    }

    // El codigo 11000 indica que se ha intentado introducir un valor duplicado
    if (error.code === 11000) {

        // Buscamos cual es el campo que esta duplicado
        const duplicatedField = Object.keys((error as DatabaseError & { keyPattern?: Record<string, unknown> }).keyPattern ?? {})[0];

        // Devolvemos un 409 porque el recurso entra en conflicto con uno que ya existe
        return res.status(409).json({
            message: `${duplicatedField || 'El valor'} ya existe`
        });
    }

    // Si el error tiene detalles significa que tenemos informacion sobre la validacion
    // Por ejemplo Joi puede indicar que campo no cumple las condiciones
    if (error.details) {

        // Cogemos el primer error de validacion para mostrar su mensaje
        const [firstDetail] = error.details as { message?: string }[];

        // Devolvemos un 422 porque los datos recibidos no cumplen la validacion
        return res.status(422).json({ message: firstDetail?.message ?? 'La petición no cumple las reglas de validación' });
    }

    // Estos errores suelen estar relacionados con datos que no tienen el formato esperado
    // En estos casos devolvemos un error 400 de peticion incorrecta
    if (error.name === 'ValidationError' || error.name === 'CastError') {

        return res.status(400).json({ message: error.message });
    }

    // Comprobamos de nuevo si el error corresponde a un recurso que no existe
    if (error.name === 'Error' && error.message === 'Not found') {

        return res.status(404).json({ message: error.message });
    }

    // Si tenemos un codigo de error entre 400 y 499 usamos ese codigo
    // Si no hay ninguno valido devolvemos un 500 porque es un error interno
    const status = error.status && error.status >= 400 && error.status < 500 ? error.status : 500;

    // Devolvemos el mensaje del error al cliente
    // Si es un error 500 mostramos un mensaje generico por seguridad
    return res.status(status).json({
        message: status === 500 ? 'Internal server error' : error.message
    });
};

// Exportamos el manejador de errores para poder utilizarlo en la aplicacion
export default ErrorHandler;

