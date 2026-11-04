import { NextFunction, Request, Response } from 'express';
import type { DateListQuery } from '../middleware/Joi';
import DateService from '../services/DateService';

// Los Dates los usan el admin (todos) y los usuarios normales (solo los suyos). Cada funcion le pasa
// al service quien hace la peticion (req.user, que deja VerifyToken) para que filtre lo que puede ver.

// Función para obtener una pagina de Dates
const readAll = async (req: Request, res: Response<unknown, { query: DateListQuery }>, next: NextFunction) => {
    try {
        const result = await DateService.getDates(res.locals.query, req.user!);

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

// Función para buscar un Date concreto usando su ID
const readDate = async (req: Request<{ dateId: string }>, res: Response, next: NextFunction) => {
    try {
        const date = await DateService.getDateById(req.params.dateId, req.user!);

        if (date) {
            res.status(200).json({ date });
        } else {
            // No existe, o es de otros usuarios
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        next(error);
    }
};

// Función para abrir un Date entre dos usuarios
const createDate = async (req: Request, res: Response, next: NextFunction) => {
    const [userA, userB] = req.body.users as string[];

    // Un usuario normal solo puede abrir Dates en los que esta el; el admin, entre quien quiera
    if (req.user!.role !== 'admin' && userA !== req.user!.id && userB !== req.user!.id) {
        res.status(403).json({ message: 'Solo puedes abrir Dates en los que estés tú' });
        return;
    }

    try {
        const result = await DateService.createDate(userA, userB);

        if ('date' in result) {
            res.status(201).json({ date: result.date });
        } else if (result.error === 'already-exists') {
            // 409: ya hay un Date entre esos dos usuarios
            res.status(409).json({ message: 'Ya hay un Date entre estos dos usuarios' });
        } else {
            res.status(404).json({ message: 'Alguno de los dos usuarios no existe' });
        }
    } catch (error) {
        next(error);
    }
};

// Función para cambiar un Date de bandeja (Pendiente, En curso o Cerrado)
const updateDate = async (req: Request<{ dateId: string }>, res: Response, next: NextFunction) => {
    try {
        const date = await DateService.updateStatus(req.params.dateId, req.body.status, req.user!);

        if (date) {
            res.status(200).json({ date });
        } else {
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        next(error);
    }
};

// Función para usar la prorroga de un Date (24 horas mas, solo una vez)
const extendDate = async (req: Request<{ dateId: string }>, res: Response, next: NextFunction) => {
    try {
        const result = await DateService.extendDate(req.params.dateId, req.user!);

        if (!result) {
            res.status(404).json({ message: 'not found' });
        } else if ('date' in result) {
            res.status(200).json({ date: result.date });
        } else {
            // 409: el Date existe, pero la prorroga ya se habia usado
            res.status(409).json({ message: 'La prórroga de este Date ya se ha usado' });
        }
    } catch (error) {
        next(error);
    }
};

// Función para eliminar un Date (solo admin, lo comprueba la ruta)
const deleteDate = async (req: Request<{ dateId: string }>, res: Response, next: NextFunction) => {
    try {
        const date = await DateService.deleteDate(req.params.dateId);

        if (date) {
            res.status(204).send();
        } else {
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        next(error);
    }
};

export default { readAll, readDate, createDate, updateDate, extendDate, deleteDate };
