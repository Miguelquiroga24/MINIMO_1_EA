import mongoose from 'mongoose';
import { config } from './config/config';
import Logging from './library/Logging';
import DateModel from './models/Date';
import Grade from './models/Grade';
import User from './models/User';
import { gradesSeed, usersSeed } from './seed-data';
import { openDateIfMutual } from './services/DateService';

// Llena la base de datos con los datos de ejemplo de seed-data.ts.
//
//   npm run seed             inserta los datos solo si la base de datos está vacía
//   npm run seed -- --reset  borra los usuarios, los votos y los Dates y los vuelve a insertar
//
// Siempre trabaja sobre la base de datos del .env (MONGO_URL).

const reset = process.argv.includes('--reset');

const seed = async () => {
    await mongoose.connect(config.mongo.url);
    Logging.info(`Conectado a ${config.mongo.url}`);

    if (reset) {
        // Ojo: deleteMany({}) es un borrado fisico real y a proposito.
        // El reset del seed rehace los datos desde cero, tambien los que estaban archivados.
        const users = await User.deleteMany({});
        const grades = await Grade.deleteMany({});
        const dates = await DateModel.deleteMany({});
        Logging.warning(`Borrados ${users.deletedCount} usuarios, ${grades.deletedCount} votos y ${dates.deletedCount} Dates`);
    }

    const usersInDb = await User.countDocuments();

    if (usersInDb > 0) {
        Logging.warning('La base de datos ya tiene datos. Para rehacerla: npm run seed -- --reset');
        return;
    }

    // create() dispara los hooks del modelo: la contrasena del usuario se guarda cifrada
    const createdUsers = await User.create(usersSeed);
    Logging.info(`Usuarios creados: ${createdUsers.length}`);

    // Cada voto trae los emails de los dos usuarios; aquí se cambian por los ids que les ha dado MongoDB
    const idOf = (email: string) => {
        const user = createdUsers.find((created) => created.email === email);

        if (!user) {
            throw new Error(`En seed-data.ts hay un voto de un usuario que no existe: ${email}`);
        }

        return user._id;
    };

    const createdGrades = await Grade.insertMany(gradesSeed.map((grade) => ({ from: idOf(grade.from), to: idOf(grade.to), value: grade.value })));
    Logging.info(`Votos de La Orla creados: ${createdGrades.length}`);

    // Los Dates salen de los votos con la misma regla que usa la API: por cada A+, si ya existe el A+
    // contrario y todavia no hay Date entre los dos, se abre uno
    for (const grade of createdGrades.filter((created) => created.value === 'A+')) {
        await openDateIfMutual(String(grade.from), String(grade.to));
    }

    // Para que haya Dates en todas las bandejas, uno pasa a "En curso" (con la prorroga usada)
    // y otro a "Cerrado" (y ya caducado)
    const dates = await DateModel.find().sort({ createdAt: 1 });

    if (dates.length >= 2) {
        await DateModel.updateOne(
            { _id: dates[0]._id },
            { status: 'ongoing', extended: true, expiresAt: new Date(Date.now() + 30 * 60 * 60 * 1000) }
        );
        await DateModel.updateOne({ _id: dates[1]._id }, { status: 'closed', expiresAt: new Date(Date.now() - 2 * 60 * 60 * 1000) });
    }

    Logging.info(`Dates abiertos: ${dates.length}`);
};

seed()
    .catch((error) => {
        Logging.error(error);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
