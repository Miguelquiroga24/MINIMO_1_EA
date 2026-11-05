import express from 'express';

import controller from '../controllers/Review';

import { Schemas, ValidateId, ValidateJoi, ValidateReviewList } from '../middleware/Joi';
import { VerifyToken } from '../middleware/VerifyToken';

// Rutas de las valoraciones de los Dates. Todas necesitan sesion (VerifyToken: 401 sin token o caducado).
// Quien puede ver, editar o eliminar cada valoracion lo decide el service a partir de req.user:
//   - ver: los dos usuarios del Date y el admin
//   - crear: solo uno de los dos usuarios del Date, y el autor es siempre el del token
//   - editar y eliminar: el autor o un admin (403 si no)
const router = express.Router();

/**
 * @openapi
 * /reviews/stats/{dateId}:
 *   get:
 *     tags: [Reviews]
 *     summary: Resumen estadístico de las valoraciones de un Date
 *     description: >
 *       Lo calcula MongoDB con un aggregate: cuántas valoraciones hay, la media, la más baja, la más alta,
 *       cuántos repetirían y la media de cada criterio. Un usuario normal solo puede verlo de sus Dates (404 si no).
 *     parameters:
 *       - in: path
 *         name: dateId
 *         required: true
 *         schema: { type: string, pattern: '^[0-9a-fA-F]{24}$' }
 *     responses:
 *       200: { $ref: '#/components/responses/ReviewStats' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */

// Va antes que /:reviewId: si no, Express pensaria que "stats" es un id
router.get('/stats/:dateId', VerifyToken, ValidateId('dateId'), controller.readStats);

/**
 * @openapi
 * /reviews:
 *   get:
 *     tags: [Reviews]
 *     summary: Lista las valoraciones
 *     description: >
 *       Paginado en el servidor, primero las más nuevas, con el Date y el autor (populate). Los filtros se pueden
 *       combinar. El admin ve todas; un usuario normal, solo las de sus Dates.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 5 }
 *       - in: query
 *         name: search
 *         schema: { type: string, maxLength: 100 }
 *         description: Texto que se busca en el comentario
 *       - in: query
 *         name: date
 *         schema: { type: string, pattern: '^[0-9a-fA-F]{24}$' }
 *         description: Solo las de este Date
 *       - in: query
 *         name: minScore
 *         schema: { type: number, minimum: 1, maximum: 5 }
 *         description: Solo las que tienen una media igual o mayor
 *     responses:
 *       200: { $ref: '#/components/responses/ReviewList' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       422: { $ref: '#/components/responses/InvalidQuery' }
 *       500: { $ref: '#/components/responses/ServerError' }
 */

// Ruta para obtener una pagina de valoraciones con sus filtros
router.get('/', VerifyToken, ValidateReviewList, controller.readAll);

/**
 * @openapi
 * /reviews/{reviewId}:
 *   get:
 *     tags: [Reviews]
 *     summary: Devuelve una valoración
 *     description: Un usuario normal solo puede ver las de sus Dates (404 si no).
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema: { type: string, pattern: '^[0-9a-fA-F]{24}$' }
 *     responses:
 *       200: { $ref: '#/components/responses/ReviewOne' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */

// Ruta para buscar una valoracion usando su ID
router.get('/:reviewId', VerifyToken, ValidateId('reviewId'), controller.readReview);

/**
 * @openapi
 * /reviews:
 *   post:
 *     tags: [Reviews]
 *     summary: Valora un Date
 *     description: >
 *       El autor es el usuario del token (no se envía en el body). Solo uno de los dos usuarios del Date (403),
 *       el Date no puede estar pendiente (409) y cada usuario solo puede valorar una vez cada Date (409).
 *       La media (average) la calcula el servidor.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ReviewInput' }
 *     responses:
 *       201: { $ref: '#/components/responses/ReviewOne' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/NotParticipant' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/ReviewConflict' }
 *       422: { $ref: '#/components/responses/Unprocessable' }
 */

// Ruta para crear una valoracion. Primero se comprueba el body con Joi
router.post('/', VerifyToken, ValidateJoi(Schemas.review.create), controller.createReview);

/**
 * @openapi
 * /reviews/{reviewId}:
 *   put:
 *     tags: [Reviews]
 *     summary: Edita una valoración
 *     description: Solo el autor o un admin (403). El Date no se cambia. Hay que enviar al menos un campo.
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema: { type: string, pattern: '^[0-9a-fA-F]{24}$' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ReviewUpdateInput' }
 *     responses:
 *       200: { $ref: '#/components/responses/ReviewOne' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/NotOwner' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       422: { $ref: '#/components/responses/Unprocessable' }
 */

// Ruta para editar una valoracion
router.put('/:reviewId', VerifyToken, ValidateId('reviewId'), ValidateJoi(Schemas.review.update), controller.updateReview);

/**
 * @openapi
 * /reviews/{reviewId}:
 *   delete:
 *     tags: [Reviews]
 *     summary: Elimina una valoración (borrado físico)
 *     description: Solo el autor o un admin (403).
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema: { type: string, pattern: '^[0-9a-fA-F]{24}$' }
 *     responses:
 *       204:
 *         description: Valoración eliminada
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/NotOwner' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */

// Ruta para eliminar una valoracion
router.delete('/:reviewId', VerifyToken, ValidateId('reviewId'), controller.deleteReview);

export = router;
