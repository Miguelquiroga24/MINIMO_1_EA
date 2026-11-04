import mongoose, { Document, Schema } from 'mongoose';

// Las dos notas que se pueden poner en La Orla: A+ (aprobado, me interesa) o F (suspenso, no me interesa)
export const GRADE_VALUES = ['A+', 'F'] as const;
export type GradeValue = (typeof GRADE_VALUES)[number];

// Un voto de La Orla. En la app, cada estudiante va viendo perfiles (el "Expediente") y a cada uno le
// pone una nota. Si dos usuarios se ponen A+ el uno al otro, se abre un Date entre ellos.
export interface IGrade {
    // Quien pone la nota
    from: mongoose.Types.ObjectId | string;

    // A quien se la pone
    to: mongoose.Types.ObjectId | string;

    value: GradeValue;
}

// Esta interfaz junta los datos del voto con las propiedades de un documento de MongoDB
export interface IGradeModel extends IGrade, Document {}

const GradeSchema: Schema = new Schema(
    {
        // Los dos usuarios se guardan con su id y una referencia (ref) al modelo User.
        // Asi, con populate, la consulta puede traer su nombre y su email en lugar del id
        from: { type: Schema.Types.ObjectId, ref: 'User', required: true },

        to: { type: Schema.Types.ObjectId, ref: 'User', required: true },

        value: { type: String, enum: GRADE_VALUES, required: true }
    },
    {
        // createdAt nos dice cuando se voto; updatedAt, si se cambio la nota despues
        timestamps: true,

        versionKey: false
    }
);

// Un usuario solo puede poner una nota a cada perfil: la pareja (from, to) no se puede repetir.
// Si se intenta, MongoDB lanza un error 11000 y el ErrorHandler responde 409.
// Ojo: el voto de A a B y el de B a A son parejas distintas, y los dos pueden existir.
GradeSchema.index({ from: 1, to: 1 }, { unique: true });

export default mongoose.model<IGradeModel>('Grade', GradeSchema);
