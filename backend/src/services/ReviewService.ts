import mongoose from 'mongoose';
import DateModel from '../models/Date';
import Review, { ICriterionScore } from '../models/Review';
import { AuthUser } from '../models/User';
import type { ReviewListQuery } from '../middleware/Joi';
import { escapeRegExp } from '../utils/escape-regexp';

// Al devolver una valoracion se cambian los ids por los datos (populate):
//   - author: nombre, email y foto (tambien si esta inactivo, por el prehook de User)
//   - date: los dos usuarios del Date (solo el nombre) y su estado
const POPULATE_REVIEW = [
    { path: 'author', select: 'name email photo', options: { withInactive: true } },
    {
        path: 'date',
        select: 'users status',
        populate: { path: 'users', select: 'name', options: { withInactive: true } }
    }
];

// Los datos que se pueden enviar al crear o editar una valoracion (author nunca: sale del token)
export interface ReviewInput {
    date: string;
    criteria: ICriterionScore[];
    comment?: string;
    wouldRepeat: boolean;
}

// Los Dates cuyas valoraciones puede ver quien hace la peticion. El admin, todos (null: sin filtro);
// un usuario normal, solo los Dates en los que esta el (igual que en DateService)
const visibleDateIds = async (requester: AuthUser) => {
    if (requester.role === 'admin') {
        return null;
    }

    return DateModel.find({ users: requester.id }).distinct('_id');
};

// Comprueba si quien hace la peticion puede ver un Date concreto
const canSeeDate = async (dateId: string, requester: AuthUser) => {
    const filter = requester.role === 'admin' ? { _id: dateId } : { _id: dateId, users: requester.id };

    return DateModel.exists(filter);
};

// Funcion que busca una pagina de valoraciones, primero las mas nuevas.
// Los filtros se combinan: texto del comentario, un Date y una media minima
export const getReviews = async ({ page, limit, search, date, minScore }: ReviewListQuery, requester: AuthUser) => {
    const visible = await visibleDateIds(requester);

    // Cada filtro es una condicion; se juntan todas con $and
    const conditions: Record<string, unknown>[] = [];

    if (visible) {
        conditions.push({ date: { $in: visible } });
    }
    if (date) {
        conditions.push({ date });
    }
    if (search) {
        conditions.push({ comment: new RegExp(escapeRegExp(search), 'i') });
    }
    if (minScore !== undefined) {
        conditions.push({ average: { $gte: minScore } });
    }

    const filter = conditions.length > 0 ? { $and: conditions } : {};

    const [reviews, total] = await Promise.all([
        Review.find(filter)
            .populate(POPULATE_REVIEW)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit),
        Review.countDocuments(filter)
    ]);

    return {
        reviews,
        total,
        page,
        pages: Math.ceil(total / limit)
    };
};

// Funcion que busca una valoracion por su id. Si es de un Date que quien la pide no puede ver, devuelve
// null (404), como hacen los Dates
export const getReviewById = async (reviewId: string, requester: AuthUser) => {
    const review = await Review.findById(reviewId);

    if (!review || !(await canSeeDate(String(review.date), requester))) {
        return null;
    }

    return review.populate(POPULATE_REVIEW);
};

// Funcion que crea una valoracion. Las reglas:
//   - el Date tiene que existir (404)
//   - solo la puede escribir uno de los dos usuarios del Date (403)
//   - el Date no puede estar pendiente: todavia no han hablado (409)
//   - una valoracion por usuario y Date (409)
// Devuelve { error } para que el controlador elija el codigo, o { review } si se ha creado
export const createReview = async (data: ReviewInput, requester: AuthUser) => {
    const date = await DateModel.findById(data.date);

    if (!date) {
        return { error: 'date-not-found' };
    }

    const isParticipant = (date.users as mongoose.Types.ObjectId[]).some((user) => String(user) === requester.id);

    if (!isParticipant) {
        return { error: 'not-participant' };
    }

    if (date.status === 'pending') {
        return { error: 'date-pending' };
    }

    // Lo comprobamos antes para dar un mensaje claro (si no, saltaria el 11000 del indice unico)
    const existing = await Review.exists({ date: data.date, author: requester.id });

    if (existing) {
        return { error: 'already-reviewed' };
    }

    // create() dispara el hook que calcula la media
    const created = await Review.create({ ...data, author: requester.id });

    return { review: await created.populate(POPULATE_REVIEW) };
};

// Funcion que edita una valoracion. Solo el autor o un admin (si no, 403).
// Se edita con save() y no con findOneAndUpdate para que el hook vuelva a calcular la media
export const updateReview = async (reviewId: string, data: Partial<ReviewInput>, requester: AuthUser) => {
    const review = await Review.findById(reviewId);

    if (!review) {
        return null;
    }

    if (requester.role !== 'admin' && String(review.author) !== requester.id) {
        return { error: 'not-owner' };
    }

    if (data.criteria !== undefined) {
        review.criteria = data.criteria;
    }
    if (data.comment !== undefined) {
        review.comment = data.comment;
    }
    if (data.wouldRepeat !== undefined) {
        review.wouldRepeat = data.wouldRepeat;
    }

    await review.save();

    return { review: await review.populate(POPULATE_REVIEW) };
};

// Funcion que elimina una valoracion (borrado fisico). Solo el autor o un admin (si no, 403)
export const deleteReview = async (reviewId: string, requester: AuthUser) => {
    const review = await Review.findById(reviewId);

    if (!review) {
        return 'not-found';
    }

    if (requester.role !== 'admin' && String(review.author) !== requester.id) {
        return 'not-owner';
    }

    await review.deleteOne();

    return 'deleted';
};

// El resumen estadistico de las valoraciones de un Date, calculado por MongoDB con un aggregate:
//   - general: cuantas hay, la media, la mas baja, la mas alta y cuantas repetirian
//   - por criterio: $unwind separa el vector de criterios (un documento por criterio) y $group los junta
//     por nombre para sacar la media y cuantas veces se ha cumplido lo esperado
// $facet hace los dos calculos a la vez sobre los mismos documentos
export const getDateStats = async (dateId: string, requester: AuthUser) => {
    if (!(await canSeeDate(dateId, requester))) {
        return null;
    }

    const [result] = await Review.aggregate([
        { $match: { date: new mongoose.Types.ObjectId(dateId) } },
        {
            $facet: {
                overall: [
                    {
                        $group: {
                            _id: null,
                            total: { $sum: 1 },
                            average: { $avg: '$average' },
                            min: { $min: '$average' },
                            max: { $max: '$average' },
                            wouldRepeat: { $sum: { $cond: ['$wouldRepeat', 1, 0] } }
                        }
                    }
                ],
                byCriterion: [
                    { $unwind: '$criteria' },
                    {
                        $group: {
                            _id: '$criteria.criterion',
                            average: { $avg: '$criteria.score' },
                            count: { $sum: 1 },
                            met: { $sum: { $cond: ['$criteria.met', 1, 0] } }
                        }
                    },
                    { $sort: { _id: 1 } }
                ]
            }
        }
    ]);

    const overall = result.overall[0];
    const round = (value: number) => Math.round(value * 100) / 100;

    // Sin valoraciones, todo a cero
    if (!overall) {
        return { date: dateId, total: 0, average: 0, min: 0, max: 0, wouldRepeat: 0, criteria: [] };
    }

    return {
        date: dateId,
        total: overall.total,
        average: round(overall.average),
        min: overall.min,
        max: overall.max,
        wouldRepeat: overall.wouldRepeat,
        criteria: result.byCriterion.map((item: { _id: string; average: number; count: number; met: number }) => ({
            criterion: item._id,
            average: round(item.average),
            count: item.count,
            met: item.met
        }))
    };
};

export default { getReviews, getReviewById, createReview, updateReview, deleteReview, getDateStats };
