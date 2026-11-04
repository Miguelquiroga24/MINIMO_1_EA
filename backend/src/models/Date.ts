import mongoose, { Document, Schema } from 'mongoose';

// Ojo con el nombre: en la app esto se llama "Date" (una cita), pero Date ya es una clase de JavaScript
// (new Date() para las fechas). Si importaramos este modelo como Date, en ese fichero new Date() dejaria
// de funcionar. Por eso el modelo de Mongoose se llama 'Date' (coleccion dates), pero en el codigo se
// importa siempre como DateModel, y sus interfaces son IDate e IDateModel.

// Estados de un Date, las "bandejas" del blog:
//   pending  Pendiente: se ha abierto, pero todavia nadie ha escrito
//   ongoing  En curso: ya estan hablando
//   closed   Cerrado: se ha terminado o ha caducado
export const DATE_STATUSES = ['pending', 'ongoing', 'closed'] as const;
export type DateStatus = (typeof DATE_STATUSES)[number];

// Cuanto dura un Date antes de caducar, y cuanto añade la prorroga: 24 horas
export const DATE_DURATION_MS = 24 * 60 * 60 * 1000;

// Un Date se abre cuando dos usuarios se ponen A+ en La Orla
export interface IDate {
    // Los dos usuarios del Date
    users: mongoose.Types.ObjectId[] | string[];

    status: DateStatus;

    // A quien le toca escribir primero: se sortea al abrir el Date
    firstTurn: mongoose.Types.ObjectId | string;

    // Cuando caduca: 24 horas despues de abrirse (o 48 si se usa la prorroga)
    expiresAt: Date;

    // Si ya se ha usado la prorroga (solo hay una)
    extended: boolean;
}

// Esta interfaz junta los datos del Date con las propiedades de un documento de MongoDB
export interface IDateModel extends IDate, Document {}

const DateSchema: Schema = new Schema(
    {
        // Referencias al modelo User, como from y to en los votos
        users: {
            type: [Schema.Types.ObjectId],
            ref: 'User',
            required: true,
            validate: {
                validator: (users: string[]) => users.length === 2,
                message: 'Un Date es siempre entre dos usuarios'
            }
        },

        // Al abrirse, un Date esta pendiente
        status: { type: String, enum: DATE_STATUSES, default: 'pending' },

        firstTurn: { type: Schema.Types.ObjectId, ref: 'User', required: true },

        expiresAt: { type: Date, required: true },

        extended: { type: Boolean, default: false }
    },
    {
        timestamps: true,

        versionKey: false
    }
);

export default mongoose.model<IDateModel>('Date', DateSchema);
