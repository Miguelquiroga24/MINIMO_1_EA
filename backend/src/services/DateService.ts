import DateModel, { DATE_DURATION_MS, DateStatus } from '../models/Date';
import Grade from '../models/Grade';
import User, { AuthUser } from '../models/User';
import type { DateListQuery } from '../middleware/Joi';

// Igual que en los votos: los usuarios del Date se devuelven con su nombre, su email y su foto, tambien
// si estan inactivos (sin withInactive, el prehook de User los dejaria en null)
const POPULATE_USERS = { path: 'users', select: 'name email photo', options: { withInactive: true } };

// El filtro que dice que Dates puede ver quien hace la peticion: el admin, todos; un usuario normal,
// solo aquellos en los que el es uno de los dos (users contiene su id)
const visibleTo = (requester: AuthUser) => (requester.role === 'admin' ? {} : { users: requester.id });

// Funcion que busca una pagina de Dates, primero los mas nuevos
export const getDates = async ({ page, limit, status, user }: DateListQuery, requester: AuthUser) => {
    const filter = {
        ...visibleTo(requester),
        ...(status ? { status } : {}),
        // El filtro por usuario solo lo puede usar el admin: un usuario normal ya solo ve los suyos
        ...(user && requester.role === 'admin' ? { users: user } : {})
    };

    const [dates, total] = await Promise.all([
        DateModel.find(filter)
            .populate(POPULATE_USERS)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit),
        DateModel.countDocuments(filter)
    ]);

    return {
        dates,
        total,
        page,
        pages: Math.ceil(total / limit)
    };
};

// Funcion que busca un Date por su id. Si quien lo pide no puede verlo, devuelve null (404):
// asi un usuario no puede saber si existen los Dates de otros
export const getDateById = (dateId: string, requester: AuthUser) => {
    return DateModel.findOne({ _id: dateId, ...visibleTo(requester) }).populate(POPULATE_USERS);
};

// Funcion que abre un Date entre dos usuarios.
//   - Comprueba que existen (aunque esten inactivos) y que no hay ya un Date entre los dos
//   - Sortea a quien le toca escribir primero (Math.random da un numero entre 0 y 1)
//   - Caduca en 24 horas
// Devuelve { error } si algo falla, para que el controlador elija el codigo, o { date } si se ha abierto
export const createDate = async (userA: string, userB: string) => {
    const [a, b] = await Promise.all([
        User.findById(userA).setOptions({ withInactive: true }),
        User.findById(userB).setOptions({ withInactive: true })
    ]);

    if (!a || !b) {
        return { error: 'user-not-found' };
    }

    // $all: que la lista users tenga los dos ids, en cualquier orden
    const existing = await DateModel.findOne({ users: { $all: [userA, userB] } });

    if (existing) {
        return { error: 'already-exists' };
    }

    const created = await DateModel.create({
        users: [userA, userB],
        firstTurn: Math.random() < 0.5 ? userA : userB,
        expiresAt: new Date(Date.now() + DATE_DURATION_MS)
    });

    return { date: await created.populate(POPULATE_USERS) };
};

// Funcion que cambia el estado de un Date (Pendiente, En curso o Cerrado)
export const updateStatus = (dateId: string, status: DateStatus, requester: AuthUser) => {
    return DateModel.findOneAndUpdate({ _id: dateId, ...visibleTo(requester) }, { status }, { new: true }).populate(POPULATE_USERS);
};

// Funcion que usa la prorroga: suma 24 horas a la caducidad. Solo hay una prorroga por Date.
// Devuelve null si no existe (404) y { error } si la prorroga ya se habia usado (409)
export const extendDate = async (dateId: string, requester: AuthUser) => {
    const date = await DateModel.findOne({ _id: dateId, ...visibleTo(requester) });

    if (!date) {
        return null;
    }

    if (date.extended) {
        return { error: 'already-extended' };
    }

    date.expiresAt = new Date(date.expiresAt.getTime() + DATE_DURATION_MS);
    date.extended = true;
    await date.save();

    return { date: await date.populate(POPULATE_USERS) };
};

// Funcion que elimina un Date (borrado fisico). Solo la usa el admin
export const deleteDate = (dateId: string) => {
    return DateModel.findByIdAndDelete(dateId);
};

// Funcion que abre un Date si dos usuarios se han dado A+ mutuamente. La llama GradeService cada vez
// que se crea un A+ o se cambia una nota a A+. Si ya habia un Date entre los dos, no hace nada.
// Devuelve el Date abierto, o null si no se ha abierto ninguno
export const openDateIfMutual = async (from: string, to: string) => {
    // ¿Existe el A+ contrario (de "to" a "from")?
    const reverse = await Grade.findOne({ from: to, to: from, value: 'A+' });

    if (!reverse) {
        return null;
    }

    const result = await createDate(from, to);

    return 'date' in result ? result.date : null;
};

export default { getDates, getDateById, createDate, updateStatus, extendDate, deleteDate, openDateIfMutual };
