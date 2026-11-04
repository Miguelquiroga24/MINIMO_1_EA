import { NextFunction, Request, Response } from 'express';
import type { UserListQuery } from '../middleware/Joi';
import UserService from '../services/UserService';

// Mensaje del 403 cuando un admin intenta cambiarse el rol o desactivarse a si mismo.
// Si se lo permitieramos, el backoffice se podria quedar sin ningun admin.
export const OWN_USER_MESSAGE = 'No puedes hacer esto con tu propio usuario';

// Devuelve el usuario con sesion. Su id lo saca VerifyToken del token y lo deja en req.user:
// por eso esta ruta no necesita ningun parametro en la URL.
const readMe = async (req: Request, res: Response, next: NextFunction) => {
    // VerifyToken va antes en la ruta, asi que req.user siempre existe aqui.
    // Lo comprobamos igualmente para que TypeScript sepa que no es undefined.
    if (!req.user) {
        res.status(401).json({ message: 'Falta el token' });
        return;
    }

    try {
        const user = await UserService.getUserById(req.user.id);

        if (user) {
            res.status(200).json({ user });
        } else {
            // El token es valido pero el usuario se ha borrado (o desactivado) despues de hacer login
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        next(error);
    }
};

// Devuelve con quien puede abrir un Date el usuario con sesion (todos menos el)
const readDirectory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const users = await UserService.getDirectory(req.user!.id);

        res.status(200).json({ users });
    } catch (error) {
        next(error);
    }
};

// ---- Gestion de usuarios del backoffice (solo admin) ----

// Función para obtener una pagina de usuarios con los filtros del backoffice
const listUsers = async (req: Request, res: Response<unknown, { query: UserListQuery }>, next: NextFunction) => {
    try {
        // ValidateUserList ya ha comprobado y convertido los filtros de la URL
        const result = await UserService.getUsers(res.locals.query);

        // Devolvemos los usuarios junto con los datos de paginacion
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

// Función para buscar un usuario concreto usando su ID
const readUser = async (req: Request<{ userId: string }>, res: Response, next: NextFunction) => {
    // Cogemos el ID del usuario de los parametros de la URL
    const userId = req.params.userId;

    try {
        const user = await UserService.getUserForAdmin(userId);

        if (user) {
            res.status(200).json({ user });
        } else {
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        next(error);
    }
};

// Función para crear un usuario desde el backoffice
const createUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await UserService.createUser(req.body);

        // El codigo 201 indica que se ha creado un recurso nuevo.
        // toJSON() del modelo quita la contraseña antes de enviarlo
        res.status(201).json({ user });
    } catch (error) {
        // Si el email ya existe, el ErrorHandler responde 409
        next(error);
    }
};

// Función para modificar los datos de un usuario (tambien su rol y si esta activo)
const updateUser = async (req: Request<{ userId: string }>, res: Response, next: NextFunction) => {
    const userId = req.params.userId;

    // Un admin no puede quitarse a si mismo el rol admin ni desactivarse
    const isOwnUser = userId === req.user!.id;
    const changesOwnRole = req.body.role !== undefined && req.body.role !== req.user!.role;

    if (isOwnUser && (changesOwnRole || req.body.active === false)) {
        res.status(403).json({ message: OWN_USER_MESSAGE });
        return;
    }

    try {
        const user = await UserService.updateUser(userId, req.body);

        if (user) {
            res.status(200).json({ user });
        } else {
            // No existe o esta archivado
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        next(error);
    }
};

// Función para archivar un usuario (borrado logico)
const archiveUser = async (req: Request<{ userId: string }>, res: Response, next: NextFunction) => {
    const userId = req.params.userId;

    // Un admin no puede archivarse a si mismo
    if (userId === req.user!.id) {
        res.status(403).json({ message: OWN_USER_MESSAGE });
        return;
    }

    try {
        const user = await UserService.archiveUser(userId);

        if (user) {
            res.status(200).json({ user });
        } else {
            // No existe o ya estaba archivado
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        next(error);
    }
};

// Función para restaurar un usuario archivado
const restoreUser = async (req: Request<{ userId: string }>, res: Response, next: NextFunction) => {
    const userId = req.params.userId;

    try {
        const user = await UserService.restoreUser(userId);

        if (user) {
            res.status(200).json({ user });
        } else {
            // No existe o no estaba archivado
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        next(error);
    }
};

// Función para eliminar un usuario para siempre (borrado fisico)
const deleteUser = async (req: Request<{ userId: string }>, res: Response, next: NextFunction) => {
    const userId = req.params.userId;

    // Un admin no puede eliminarse a si mismo
    if (userId === req.user!.id) {
        res.status(403).json({ message: OWN_USER_MESSAGE });
        return;
    }

    try {
        const result = await UserService.deleteUser(userId);

        if (result === 'deleted') {
            // 204: se ha eliminado y no hay nada que devolver
            res.status(204).send();
        } else if (result === 'not-archived') {
            // 409: el usuario existe, pero su estado no permite eliminarlo todavia
            res.status(409).json({ message: 'Archiva el usuario antes de eliminarlo' });
        } else {
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        next(error);
    }
};

export default { readMe, readDirectory, listUsers, readUser, createUser, updateUser, archiveUser, restoreUser, deleteUser };
