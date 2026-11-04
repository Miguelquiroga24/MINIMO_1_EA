import cookieParser from 'cookie-parser';
import express from 'express';
import http from 'http';
import mongoose from 'mongoose';
import { config } from './config/config';
import { Cors } from './middleware/Cors';
import Logging from './library/Logging';
import Logger from './middleware/Logger';
import ErrorHandler from './middleware/ErrorHandler';
import authRoutes from './routes/Auth';
import dateRoutes from './routes/Date';
import gradeRoutes from './routes/Grade';
import swaggerUi from 'swagger-ui-express'; // permite mostrar Swagger en el navegador.
import swaggerDocument from './config/swagger'; // importa el documento que hemos creado en swagger.ts
import userRoutes from './routes/Users';

const router = express();

/** Connect to Mongo */
mongoose
    .connect(config.mongo.url, { retryWrites: true, w: 'majority' })
    .then(() => {
        Logging.info('Mongo connected successfully.');
        StartServer();
    })
    .catch((error) => Logging.error(error));

/** Only Start Server if Mongoose Connects */
const StartServer = () => {
    router.use(Logger);

    router.use(express.urlencoded({ extended: true }));
    router.use(express.json());

    // Lee la cabecera Cookie y deja las cookies en req.cookies (la del refresh token la usa /auth)
    router.use(cookieParser());

    /** CORS */
    router.use(Cors);

    /** Routes */
    // Cada router protege sus propias rutas con VerifyToken y RequireRole (ver src/routes/).
    // /auth es publica: registro, login, refresh y logout.
    router.use('/auth', authRoutes);
    router.use('/users', userRoutes);
    router.use('/grades', gradeRoutes);
    router.use('/dates', dateRoutes);

    // La documentacion y el healthcheck son publicos
    router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    /** Healthcheck */
    /**
     * @openapi
     * /ping:
     *   get:
     *     tags: [Health]
     *     summary: Comprueba que la API está viva
     *     security: []
     *     responses:
     *       200:
     *         description: La API responde
     *         content:
     *           application/json:
     *             example: { hello: world }
     */
    router.get('/ping', (req, res) => res.status(200).json({ hello: 'world' }));

    /** Error handling */
    router.use((req, res, next) => {
        next(new Error('Not found'));
    });

    router.use(ErrorHandler);

    // Creamos el servidor HTTP con Express y lo ponemos a escuchar en el puerto del .env
    const server = http.createServer(router);

    server.listen(config.server.port, () => Logging.info(`Server is running on port ${config.server.port}`));
};
