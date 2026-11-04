import express from 'express';
import controller from '../controllers/Users';
import { Schemas, ValidateId, ValidateJoi, ValidateUserList } from '../middleware/Joi';
import { RequireRole } from '../middleware/RequireRole';
import { VerifyToken } from '../middleware/VerifyToken';

// Agrupa las rutas relacionadas con los usuarios.
// /me sirve a cualquier usuario con sesion. El resto es la gestion de usuarios del backoffice:
// cada ruta pasa primero por VerifyToken (401 si no hay un token valido) y despues por
// RequireRole('admin') (403 si el usuario no es admin). Solo entonces se valida la peticion.
const router = express.Router();

/**
 * @openapi
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: Devuelve el usuario con sesión
 *     description: El usuario se saca del token (req.user, que rellena VerifyToken), no de la URL.
 *     responses:
 *       200:
 *         description: El usuario con sesión
 *         content:
 *           application/json:
 *             example: { user: { _id: 6ab3f2fe9c500204a7d5f8a1, name: Admin Studate, email: admin@example.com, role: admin } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */

// Devuelve el usuario con sesion a partir de req.user.
// Va antes que /:userId: si no, Express pensaria que "me" es un id
router.get('/me', VerifyToken, controller.readMe);

/**
 * @openapi
 * /users/directory:
 *   get:
 *     tags: [Users]
 *     summary: Usuarios con los que se puede abrir un Date
 *     description: >
 *       Cualquier usuario con sesión. Los demás usuarios normales activos, ordenados por nombre, solo con su nombre,
 *       su titulación y su foto.
 *     responses:
 *       200:
 *         description: Los usuarios
 *         content:
 *           application/json:
 *             example: { users: [{ _id: 6ab3f2fe9c500204a7d5f8a3, name: Laia Puig, degree: Grau en Enginyeria Telemàtica }] }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */

// Con quien se puede abrir un Date. Tambien va antes que /:userId
router.get('/directory', VerifyToken, controller.readDirectory);

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: Lista los usuarios (backoffice)
 *     description: >
 *       Una página de usuarios ordenados por nombre. El admin ve también a los inactivos; los archivados
 *       salen solo con archived=true.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 5 }
 *         description: Número de usuarios por página
 *       - in: query
 *         name: search
 *         schema: { type: string, maxLength: 100 }
 *         description: Buscar por nombre o email
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [user, admin] }
 *         description: Solo los usuarios de este rol
 *       - in: query
 *         name: active
 *         schema: { type: boolean }
 *         description: true para ver solo los activos, false para ver solo los inactivos
 *       - in: query
 *         name: degree
 *         schema: { type: string, maxLength: 100 }
 *         description: Solo los de esta titulación (el texto entero, por ejemplo Grau en Enginyeria Telemàtica)
 *       - in: query
 *         name: archived
 *         schema: { type: boolean, default: false }
 *         description: true para ver solo los archivados
 *     responses:
 *       200: { $ref: '#/components/responses/UserList' }
 *       400: { $ref: '#/components/responses/InvalidPagination' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       500: { $ref: '#/components/responses/ServerError' }
 */

// Ruta para obtener una pagina de usuarios con sus filtros
router.get('/', VerifyToken, RequireRole('admin'), ValidateUserList, controller.listUsers);

/**
 * @openapi
 * /users/{userId}:
 *   get:
 *     tags: [Users]
 *     summary: Devuelve un usuario (backoffice)
 *     description: También si está inactivo o archivado.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, pattern: '^[0-9a-fA-F]{24}$' }
 *         example: 6ab3f2fe9c500204a7d5f8a3
 *     responses:
 *       200: { $ref: '#/components/responses/UserOne' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */

// Ruta para buscar un usuario usando su ID
router.get('/:userId', VerifyToken, RequireRole('admin'), ValidateId('userId'), controller.readUser);

/**
 * @openapi
 * /users:
 *   post:
 *     tags: [Users]
 *     summary: Crea un usuario (backoffice)
 *     description: A diferencia del registro, el admin puede elegir el rol y si el usuario está activo.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UserInput' }
 *     responses:
 *       201: { $ref: '#/components/responses/UserOne' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *       422: { $ref: '#/components/responses/Unprocessable' }
 *       500: { $ref: '#/components/responses/ServerError' }
 */

// Ruta para crear un usuario. Primero se comprueba el body con Joi
router.post('/', VerifyToken, RequireRole('admin'), ValidateJoi(Schemas.user.create), controller.createUser);

/**
 * @openapi
 * /users/{userId}:
 *   put:
 *     tags: [Users]
 *     summary: Edita un usuario, su rol y si está activo (backoffice)
 *     description: >
 *       La contraseña no se cambia desde aquí. Un usuario archivado no se puede editar (404): primero hay que
 *       restaurarlo. Un admin no puede cambiarse su propio rol ni desactivarse (403).
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, pattern: '^[0-9a-fA-F]{24}$' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UserUpdateInput' }
 *     responses:
 *       200: { $ref: '#/components/responses/UserOne' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/OwnUser' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *       422: { $ref: '#/components/responses/Unprocessable' }
 */

// Ruta para editar un usuario
router.put('/:userId', VerifyToken, RequireRole('admin'), ValidateId('userId'), ValidateJoi(Schemas.user.update), controller.updateUser);

/**
 * @openapi
 * /users/{userId}/archive:
 *   post:
 *     tags: [Users]
 *     summary: Archiva un usuario (borrado lógico, backoffice)
 *     description: >
 *       El usuario no se elimina: se marca como archivado (deleted y deletedAt) y ya no puede iniciar sesión.
 *       Se puede restaurar. Un admin no puede archivarse a sí mismo (403).
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, pattern: '^[0-9a-fA-F]{24}$' }
 *     responses:
 *       200: { $ref: '#/components/responses/UserOne' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/OwnUser' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */

// Ruta para archivar un usuario
router.post('/:userId/archive', VerifyToken, RequireRole('admin'), ValidateId('userId'), controller.archiveUser);

/**
 * @openapi
 * /users/{userId}/restore:
 *   post:
 *     tags: [Users]
 *     summary: Restaura un usuario archivado (backoffice)
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, pattern: '^[0-9a-fA-F]{24}$' }
 *     responses:
 *       200: { $ref: '#/components/responses/UserOne' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */

// Ruta para restaurar un usuario archivado
router.post('/:userId/restore', VerifyToken, RequireRole('admin'), ValidateId('userId'), controller.restoreUser);

/**
 * @openapi
 * /users/{userId}:
 *   delete:
 *     tags: [Users]
 *     summary: Elimina un usuario para siempre (borrado físico, backoffice)
 *     description: >
 *       Solo se puede eliminar un usuario archivado (si no, 409). No se puede deshacer: se borran también
 *       sus votos de La Orla y sus Dates. Un admin no puede eliminarse a sí mismo (403).
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, pattern: '^[0-9a-fA-F]{24}$' }
 *     responses:
 *       204:
 *         description: Usuario eliminado
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/OwnUser' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/NotArchived' }
 */

// Ruta para eliminar un usuario para siempre
router.delete('/:userId', VerifyToken, RequireRole('admin'), ValidateId('userId'), controller.deleteUser);

export = router;
