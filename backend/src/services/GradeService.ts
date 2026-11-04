import Grade, { GradeValue, IGrade } from '../models/Grade';
import User from '../models/User';
import type { GradeListQuery } from '../middleware/Joi';
import { openDateIfMutual } from './DateService';

// Al devolver un voto, cambiamos el id de from y to por los datos del usuario (populate).
// Ojo con el prehook de User: populate tambien hace una consulta a User, y sin withInactive un
// usuario inactivo o archivado saldria como null. El admin tiene que ver de quien es cada voto.
const POPULATE_USERS = [
    { path: 'from', select: 'name email photo', options: { withInactive: true } },
    { path: 'to', select: 'name email photo', options: { withInactive: true } }
];

// Funcion que busca una pagina de votos, primero los mas nuevos
export const getGrades = async ({ page, limit, value, user }: GradeListQuery) => {
    // user filtra los votos en los que ese usuario es el que vota o el que recibe el voto
    const filter = {
        ...(value ? { value } : {}),
        ...(user ? { $or: [{ from: user }, { to: user }] } : {})
    };

    const [grades, total] = await Promise.all([
        Grade.find(filter)
            .populate(POPULATE_USERS)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit),
        Grade.countDocuments(filter)
    ]);

    return {
        grades,
        total,
        page,
        pages: Math.ceil(total / limit)
    };
};

// Funcion que busca un voto por su id, con los datos de los dos usuarios
export const getGradeById = (gradeId: string) => {
    return Grade.findById(gradeId).populate(POPULATE_USERS);
};

// Funcion que crea un voto. Antes comprueba que no es un voto a uno mismo y que los dos usuarios existen
// (aunque esten inactivos: el admin puede cargar votos de cualquiera).
// Devuelve { error } si algo falla, para que el controlador elija el codigo, o { grade } si se ha creado.
export const createGrade = async (data: IGrade) => {
    if (String(data.from) === String(data.to)) {
        return { error: 'same-user' };
    }

    const [from, to] = await Promise.all([
        User.findById(data.from).setOptions({ withInactive: true }),
        User.findById(data.to).setOptions({ withInactive: true })
    ]);

    if (!from) {
        return { error: 'from-not-found' };
    }

    if (!to) {
        return { error: 'to-not-found' };
    }

    // Lo comprobamos antes de guardar para dar un mensaje claro. Si no, el indice unico de (from, to)
    // haria saltar el error 11000 y el ErrorHandler responderia "from ya existe", que no se entiende
    const existing = await Grade.findOne({ from: data.from, to: data.to });

    if (existing) {
        return { error: 'already-voted' };
    }

    const created = await Grade.create(data);

    // El "match" de Studate: si este voto es un A+ y el otro ya le habia dado A+, se abre un Date
    if (created.value === 'A+') {
        await openDateIfMutual(String(created.from), String(created.to));
    }

    return { grade: await getGradeById(String(created._id)) };
};

// Funcion que cambia la nota de un voto (de A+ a F o al reves).
// Con new: true devolvemos el voto ya cambiado
export const updateGrade = async (gradeId: string, value: GradeValue) => {
    const grade = await Grade.findByIdAndUpdate(gradeId, { value }, { new: true });

    if (!grade) {
        return null;
    }

    // Si ahora es un A+, puede que se haya formado un match (igual que al crear un voto).
    // Cambiar un A+ a F no cierra el Date que ya estuviera abierto
    if (value === 'A+') {
        await openDateIfMutual(String(grade.from), String(grade.to));
    }

    // Al final cambiamos los ids de from y to por los datos de los usuarios
    return grade.populate(POPULATE_USERS);
};

// Funcion que elimina un voto. Es un borrado fisico: un voto no se archiva, o existe o no existe
export const deleteGrade = (gradeId: string) => {
    return Grade.findByIdAndDelete(gradeId);
};

export default { getGrades, getGradeById, createGrade, updateGrade, deleteGrade };
