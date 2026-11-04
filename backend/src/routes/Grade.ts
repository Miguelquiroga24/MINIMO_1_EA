import express from 'express';

import controller from '../controllers/Grade';

import { Schemas, ValidateGradeList, ValidateId, ValidateJoi } from '../middleware/Joi';
import { RequireRole } from '../middleware/RequireRole';
import { VerifyToken } from '../middleware/VerifyToken';

// Rutas de los votos de La Orla. Todas son del backoffice: cada una pasa primero por VerifyToken
// (401 si no hay un token valido) y despues por RequireRole('admin') (403 si no es admin).
// Solo entonces se valida la peticion y llega al controller.
const router = express.Router();

/**
 * @openapi
 * /grades:
 *   get:
 *     tags: [Grades]
 *     summary: Lista los votos de La Orla (backoffice)
 *     description: Una página de votos, primero los más nuevos, con los datos de los dos usuarios.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 5 }
 *       - in: query
 *         name: value
 *         schema: { type: string, enum: ['A+', 'F'] }
 *         description: Solo los votos con esta nota
 *       - in: query
 *         name: user
 *         schema: { type: string, pattern: '^[0-9a-fA-F]{24}$' }
 *         description: Solo los votos en los que este usuario vota o es votado
 *     responses:
 *       200: { $ref: '#/components/responses/GradeList' }
 *       400: { $ref: '#/components/responses/InvalidPagination' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       500: { $ref: '#/components/responses/ServerError' }
 */

// Ruta para obtener una pagina de votos
router.get('/', VerifyToken, RequireRole('admin'), ValidateGradeList, controller.readAll);

/**
 * @openapi
 * /grades/{gradeId}:
 *   get:
 *     tags: [Grades]
 *     summary: Devuelve un voto (backoffice)
 *     parameters:
 *       - in: path
 *         name: gradeId
 *         required: true
 *         schema: { type: string, pattern: '^[0-9a-fA-F]{24}$' }
 *     responses:
 *       200: { $ref: '#/components/responses/GradeOne' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */

// Ruta para buscar un voto usando su ID
router.get('/:gradeId', VerifyToken, RequireRole('admin'), ValidateId('gradeId'), controller.readGrade);

/**
 * @openapi
 * /grades:
 *   post:
 *     tags: [Grades]
 *     summary: Crea un voto (backoffice)
 *     description: >
 *       Un usuario solo puede votar una vez a cada perfil (409 si se repite) y no se puede votar a sí mismo (422).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/GradeInput' }
 *     responses:
 *       201: { $ref: '#/components/responses/GradeOne' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/GradeConflict' }
 *       422: { $ref: '#/components/responses/Unprocessable' }
 */

// Ruta para crear un voto. Primero se comprueba el body con Joi
router.post('/', VerifyToken, RequireRole('admin'), ValidateJoi(Schemas.grade.create), controller.createGrade);

/**
 * @openapi
 * /grades/{gradeId}:
 *   put:
 *     tags: [Grades]
 *     summary: Cambia la nota de un voto (backoffice)
 *     parameters:
 *       - in: path
 *         name: gradeId
 *         required: true
 *         schema: { type: string, pattern: '^[0-9a-fA-F]{24}$' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/GradeUpdateInput' }
 *     responses:
 *       200: { $ref: '#/components/responses/GradeOne' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       422: { $ref: '#/components/responses/Unprocessable' }
 */

// Ruta para cambiar la nota
router.put('/:gradeId', VerifyToken, RequireRole('admin'), ValidateId('gradeId'), ValidateJoi(Schemas.grade.update), controller.updateGrade);

/**
 * @openapi
 * /grades/{gradeId}:
 *   delete:
 *     tags: [Grades]
 *     summary: Elimina un voto (backoffice)
 *     description: Borrado físico. Un voto no se archiva.
 *     parameters:
 *       - in: path
 *         name: gradeId
 *         required: true
 *         schema: { type: string, pattern: '^[0-9a-fA-F]{24}$' }
 *     responses:
 *       204:
 *         description: Voto eliminado
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */

// Ruta para eliminar un voto
router.delete('/:gradeId', VerifyToken, RequireRole('admin'), ValidateId('gradeId'), controller.deleteGrade);

export = router;
