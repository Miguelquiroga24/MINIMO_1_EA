import { NextFunction, Request, Response } from 'express';
import type { ReviewListQuery } from '../middleware/Joi';
import ReviewService from '../services/ReviewService';

// Las valoraciones de los Dates. Todas las rutas van con sesion (VerifyToken), y cada funcion le pasa al
// service quien hace la peticion (req.user): el autor sale de ahi, nunca del body

// Mensaje del 403 cuando alguien que no es el autor ni admin intenta editar o eliminar
const NOT_OWNER_MESSAGE = 'Solo el autor o un admin pueden hacer esto';

// Función para obtener una pagina de valoraciones con sus filtros
const readAll = async (req: Request, res: Response<unknown, { query: ReviewListQuery }>, next: NextFunction) => {
    try {
        const result = await ReviewService.getReviews(res.locals.query, req.user!);

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

// Función para buscar una valoracion usando su ID
const readReview = async (req: Request<{ reviewId: string }>, res: Response, next: NextFunction) => {
    try {
        const review = await ReviewService.getReviewById(req.params.reviewId, req.user!);

        if (review) {
            res.status(200).json({ review });
        } else {
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        next(error);
    }
};

// Función para crear una valoracion. El autor es el usuario del token
const createReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await ReviewService.createReview(req.body, req.user!);

        if ('review' in result) {
            res.status(201).json({ review: result.review });
        } else if (result.error === 'date-not-found') {
            res.status(404).json({ message: 'El Date no existe' });
        } else if (result.error === 'not-participant') {
            // 403: tiene sesion, pero no es uno de los dos usuarios del Date
            res.status(403).json({ message: 'Solo puedes valorar Dates en los que estés tú' });
        } else if (result.error === 'date-pending') {
            // 409: el Date existe, pero su estado todavia no permite valorarlo
            res.status(409).json({ message: 'No se puede valorar un Date pendiente' });
        } else {
            res.status(409).json({ message: 'Ya has valorado este Date' });
        }
    } catch (error) {
        next(error);
    }
};

// Función para editar una valoracion (solo el autor o un admin)
const updateReview = async (req: Request<{ reviewId: string }>, res: Response, next: NextFunction) => {
    try {
        const result = await ReviewService.updateReview(req.params.reviewId, req.body, req.user!);

        if (!result) {
            res.status(404).json({ message: 'not found' });
        } else if ('review' in result) {
            res.status(200).json({ review: result.review });
        } else {
            res.status(403).json({ message: NOT_OWNER_MESSAGE });
        }
    } catch (error) {
        next(error);
    }
};

// Función para eliminar una valoracion (solo el autor o un admin)
const deleteReview = async (req: Request<{ reviewId: string }>, res: Response, next: NextFunction) => {
    try {
        const result = await ReviewService.deleteReview(req.params.reviewId, req.user!);

        if (result === 'deleted') {
            res.status(204).send();
        } else if (result === 'not-owner') {
            res.status(403).json({ message: NOT_OWNER_MESSAGE });
        } else {
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        next(error);
    }
};

// Función que devuelve el resumen estadistico de las valoraciones de un Date
const readStats = async (req: Request<{ dateId: string }>, res: Response, next: NextFunction) => {
    try {
        const stats = await ReviewService.getDateStats(req.params.dateId, req.user!);

        if (stats) {
            res.status(200).json({ stats });
        } else {
            // El Date no existe, o es de otros usuarios
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        next(error);
    }
};

export default { readAll, readReview, createReview, updateReview, deleteReview, readStats };
