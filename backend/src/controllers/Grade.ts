import { NextFunction, Request, Response } from 'express';
import type { GradeListQuery } from '../middleware/Joi';
import GradeService from '../services/GradeService';

// Función para obtener una pagina de votos de La Orla
const readAll = async (req: Request, res: Response<unknown, { query: GradeListQuery }>, next: NextFunction) => {
    try {
        // ValidateGradeList ya ha comprobado y convertido los filtros de la URL
        const result = await GradeService.getGrades(res.locals.query);

        // Devolvemos los votos junto con los datos de paginacion
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

// Función para buscar un voto concreto usando su ID
const readGrade = async (req: Request<{ gradeId: string }>, res: Response, next: NextFunction) => {
    const gradeId = req.params.gradeId;

    try {
        const grade = await GradeService.getGradeById(gradeId);

        if (grade) {
            res.status(200).json({ grade });
        } else {
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        next(error);
    }
};

// Función para crear un voto
const createGrade = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await GradeService.createGrade(req.body);

        // El service nos dice que ha fallado y aqui elegimos el codigo de respuesta
        if ('grade' in result) {
            res.status(201).json({ grade: result.grade });
        } else if (result.error === 'same-user') {
            // 422: el body tiene buena forma, pero no tiene sentido votarse a uno mismo
            res.status(422).json({ message: 'Un usuario no se puede votar a sí mismo' });
        } else if (result.error === 'already-voted') {
            // 409: esa pareja ya tiene voto (para cambiar la nota esta PUT)
            res.status(409).json({ message: 'Este usuario ya ha votado ese perfil' });
        } else if (result.error === 'from-not-found') {
            res.status(404).json({ message: 'El usuario que vota (from) no existe' });
        } else {
            res.status(404).json({ message: 'El usuario votado (to) no existe' });
        }
    } catch (error) {
        next(error);
    }
};

// Función para cambiar la nota de un voto
const updateGrade = async (req: Request<{ gradeId: string }>, res: Response, next: NextFunction) => {
    const gradeId = req.params.gradeId;

    try {
        const grade = await GradeService.updateGrade(gradeId, req.body.value);

        if (grade) {
            res.status(200).json({ grade });
        } else {
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        next(error);
    }
};

// Función para eliminar un voto
const deleteGrade = async (req: Request<{ gradeId: string }>, res: Response, next: NextFunction) => {
    const gradeId = req.params.gradeId;

    try {
        const grade = await GradeService.deleteGrade(gradeId);

        if (grade) {
            // 204: se ha eliminado y no hay nada que devolver
            res.status(204).send();
        } else {
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        next(error);
    }
};

export default { readAll, readGrade, createGrade, updateGrade, deleteGrade };
