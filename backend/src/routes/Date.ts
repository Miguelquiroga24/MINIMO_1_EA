import express from 'express';

import controller from '../controllers/Date';

import { Schemas, ValidateDateList, ValidateId, ValidateJoi } from '../middleware/Joi';
import { RequireRole } from '../middleware/RequireRole';
import { VerifyToken } from '../middleware/VerifyToken';

// Rutas de los Dates. A diferencia del backoffice, no son solo para admin: cualquier usuario con sesion
// ve y gestiona sus propios Dates (el service filtra por req.user). Eliminar si es solo del admin.
const router = express.Router();

/**
 * @openapi
 * /dates:
 *   get:
 *     tags: [Dates]
 *     summary: Lista los Dates
 *     description: El admin ve todos; un usuario normal, solo los suyos. Primero los más nuevos.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 5 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, ongoing, closed] }
 *         description: Solo los de esta bandeja
 *       - in: query
 *         name: user
 *         schema: { type: string, pattern: '^[0-9a-fA-F]{24}$' }
 *         description: Solo los de este usuario (solo para el admin)
 *     responses:
 *       200: { $ref: '#/components/responses/DateList' }
 *       400: { $ref: '#/components/responses/InvalidPagination' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       500: { $ref: '#/components/responses/ServerError' }
 */

// Ruta para obtener una pagina de Dates
router.get('/', VerifyToken, ValidateDateList, controller.readAll);

/**
 * @openapi
 * /dates/{dateId}:
 *   get:
 *     tags: [Dates]
 *     summary: Devuelve un Date
 *     description: Un usuario normal solo puede ver los suyos (404 si no).
 *     parameters:
 *       - in: path
 *         name: dateId
 *         required: true
 *         schema: { type: string, pattern: '^[0-9a-fA-F]{24}$' }
 *     responses:
 *       200: { $ref: '#/components/responses/DateOne' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */

// Ruta para buscar un Date usando su ID
router.get('/:dateId', VerifyToken, ValidateId('dateId'), controller.readDate);

/**
 * @openapi
 * /dates:
 *   post:
 *     tags: [Dates]
 *     summary: Abre un Date entre dos usuarios
 *     description: >
 *       Se sortea quién escribe primero y caduca en 24 horas. Un usuario normal solo puede abrir Dates en los
 *       que está él (403). Solo puede haber un Date entre cada pareja (409). Los Dates también se abren solos
 *       cuando dos usuarios se dan A+ en La Orla.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/DateInput' }
 *     responses:
 *       201: { $ref: '#/components/responses/DateOne' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/NotYourDate' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/DateConflict' }
 *       422: { $ref: '#/components/responses/Unprocessable' }
 */

// Ruta para abrir un Date
router.post('/', VerifyToken, ValidateJoi(Schemas.date.create), controller.createDate);

/**
 * @openapi
 * /dates/{dateId}:
 *   put:
 *     tags: [Dates]
 *     summary: Cambia un Date de bandeja
 *     parameters:
 *       - in: path
 *         name: dateId
 *         required: true
 *         schema: { type: string, pattern: '^[0-9a-fA-F]{24}$' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/DateUpdateInput' }
 *     responses:
 *       200: { $ref: '#/components/responses/DateOne' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       422: { $ref: '#/components/responses/Unprocessable' }
 */

// Ruta para cambiar el estado
router.put('/:dateId', VerifyToken, ValidateId('dateId'), ValidateJoi(Schemas.date.update), controller.updateDate);

/**
 * @openapi
 * /dates/{dateId}/extend:
 *   post:
 *     tags: [Dates]
 *     summary: Usa la prórroga de un Date (24 horas más)
 *     description: Solo hay una prórroga por Date (409 si ya se ha usado).
 *     parameters:
 *       - in: path
 *         name: dateId
 *         required: true
 *         schema: { type: string, pattern: '^[0-9a-fA-F]{24}$' }
 *     responses:
 *       200: { $ref: '#/components/responses/DateOne' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/AlreadyExtended' }
 */

// Ruta para usar la prorroga
router.post('/:dateId/extend', VerifyToken, ValidateId('dateId'), controller.extendDate);

/**
 * @openapi
 * /dates/{dateId}:
 *   delete:
 *     tags: [Dates]
 *     summary: Elimina un Date (solo admin)
 *     description: Borrado físico.
 *     parameters:
 *       - in: path
 *         name: dateId
 *         required: true
 *         schema: { type: string, pattern: '^[0-9a-fA-F]{24}$' }
 *     responses:
 *       204:
 *         description: Date eliminado
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */

// Ruta para eliminar un Date: esta si es solo para el admin
router.delete('/:dateId', VerifyToken, RequireRole('admin'), ValidateId('dateId'), controller.deleteDate);

export = router;
