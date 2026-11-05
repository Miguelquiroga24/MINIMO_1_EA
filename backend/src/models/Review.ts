import mongoose, { Document, Schema } from 'mongoose';

// Los criterios con los que se puntua un Date. Cada valoracion puntua uno o varios (sin repetir)
export const REVIEW_CRITERIA = ['conversation', 'punctuality', 'chemistry', 'sincerity'] as const;
export type ReviewCriterion = (typeof REVIEW_CRITERIA)[number];

// Las notas van de 1 a 5
export const SCORE_MIN = 1;
export const SCORE_MAX = 5;

// Una puntuacion de un criterio. Es un subdocumento: vive dentro de la valoracion, no tiene coleccion propia
export interface ICriterionScore {
    // Que se puntua (String)
    criterion: ReviewCriterion;

    // La nota, de 1 a 5 (Number)
    score: number;

    // Si en ese criterio el Date ha cumplido lo que esperaba (Boolean)
    met: boolean;
}

// Una valoracion de un Date. La escribe uno de los dos usuarios del Date (author) cuando ya han empezado
// a hablar (el Date no puede estar pendiente)
export interface IReview {
    // El Date que se valora
    date: mongoose.Types.ObjectId | string;

    // Quien escribe la valoracion. Sale siempre del token, nunca del body
    author: mongoose.Types.ObjectId | string;

    criteria: ICriterionScore[];

    comment?: string;

    // Si repetiria con esa persona
    wouldRepeat: boolean;

    // La media de las notas de los criterios. No se envia: se calcula al guardar (ver el hook de abajo)
    average: number;
}

export interface IReviewModel extends IReview, Document {}

// _id: false porque los criterios no necesitan id propio: se identifican por el nombre del criterio
const CriterionScoreSchema = new Schema(
    {
        criterion: { type: String, enum: REVIEW_CRITERIA, required: true },

        score: { type: Number, min: SCORE_MIN, max: SCORE_MAX, required: true },

        met: { type: Boolean, required: true }
    },
    { _id: false }
);

const ReviewSchema: Schema = new Schema(
    {
        // Referencias, como from y to en los votos: con populate llegan los datos del Date y del autor
        date: { type: Schema.Types.ObjectId, ref: 'Date', required: true },

        author: { type: Schema.Types.ObjectId, ref: 'User', required: true },

        // El vector de subdocumentos: al menos un criterio
        criteria: {
            type: [CriterionScoreSchema],
            validate: {
                validator: (criteria: ICriterionScore[]) => criteria.length > 0,
                message: 'Una valoración tiene que puntuar al menos un criterio'
            }
        },

        comment: { type: String, trim: true, maxlength: 500 },

        wouldRepeat: { type: Boolean, required: true },

        average: { type: Number }
    },
    {
        timestamps: true,

        versionKey: false
    }
);

// Cada usuario solo puede valorar una vez cada Date. Si se repite, MongoDB lanza el error 11000
ReviewSchema.index({ date: 1, author: 1 }, { unique: true });

// Antes de validar (y por tanto antes de guardar) se calcula la media de los criterios, con dos decimales.
// Asi el filtro por nota minima del listado puede buscar directamente por average.
// Ojo: solo se ejecuta con save() y create(), por eso el service edita con save() y no con findOneAndUpdate
ReviewSchema.pre('validate', function () {
    const criteria = this.criteria as ICriterionScore[];

    if (criteria.length === 0) {
        return;
    }

    const sum = criteria.reduce((total, item) => total + item.score, 0);
    this.average = Math.round((sum / criteria.length) * 100) / 100;
});

export default mongoose.model<IReviewModel>('Review', ReviewSchema);
