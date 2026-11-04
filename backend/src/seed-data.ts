import { GradeValue } from './models/Grade';
import { IUser } from './models/User';

// Datos de ejemplo para llenar la base de datos.
// Los nombres y los correos son inventados.

// Contraseña de todos los usuarios de ejemplo. Está sin cifrar y es pública a propósito
// (ver el README): el hook pre-save del modelo User la cifra al guardarla.
const PASSWORD = 'studate26';

// Titulaciones de la EETAC, para que los perfiles se parezcan a los de verdad
const TELEMATICA = 'Grau en Enginyeria Telemàtica';
const TELECO = 'Grau en Enginyeria de Sistemes de Telecomunicació';
const AERO = 'Grau en Enginyeria Aeroespacial';
const SISTEMES_AERO = 'Grau en Enginyeria de Sistemes Aeroespacials';

// Un admin, un usuario normal para probar y doce estudiantes.
// Hay dos inactivos (active: false) y dos archivados (deleted: true) para poder probar
// el prehook de "está activo" y el borrado lógico.
export const usersSeed: IUser[] = [
    {
        name: 'Admin Studate',
        email: 'admin@example.com',
        password: PASSWORD,
        role: 'admin',
        bio: 'Cuenta de administración del backoffice.',
        active: true,
        deleted: false
    },
    {
        name: 'Usuario',
        email: 'user@example.com',
        password: PASSWORD,
        role: 'user',
        degree: TELEMATICA,
        lookingFor: 'Alguien con quien estudiar',
        birthDate: new Date('2004-05-12'),
        active: true,
        deleted: false
    },
    {
        name: 'Laia Puig',
        email: 'laia@example.com',
        password: PASSWORD,
        role: 'user',
        degree: TELEMATICA,
        lookingFor: 'Tomar algo después de clase',
        bio: 'Siempre en la biblioteca de la EETAC, casi siempre con café.',
        birthDate: new Date('2003-02-20'),
        active: true,
        deleted: false
    },
    {
        name: 'Pau Ferrer',
        email: 'pau@example.com',
        password: PASSWORD,
        role: 'user',
        degree: AERO,
        lookingFor: 'Compañero de proyecto',
        bio: 'Drones, maquetas y demasiadas horas en el laboratorio.',
        birthDate: new Date('2002-11-03'),
        active: true,
        deleted: false
    },
    {
        name: 'Nerea Gil',
        email: 'nerea@example.com',
        password: PASSWORD,
        role: 'user',
        degree: TELECO,
        lookingFor: 'Alguien con quien estudiar',
        bio: 'Si hay que repasar Señales y Sistemas, me apunto.',
        birthDate: new Date('2004-07-08'),
        active: true,
        deleted: false
    },
    {
        name: 'Marc Soler',
        email: 'marc@example.com',
        password: PASSWORD,
        role: 'user',
        degree: SISTEMES_AERO,
        lookingFor: 'Tomar algo después de clase',
        bio: 'Del Baix Llobregat de toda la vida.',
        birthDate: new Date('2001-09-15'),
        active: true,
        deleted: false
    },
    {
        name: 'Aina Roca',
        email: 'aina@example.com',
        password: PASSWORD,
        role: 'user',
        degree: TELEMATICA,
        lookingFor: 'Hacer amigos',
        bio: 'Primer año, todavía buscando el aula 5.',
        birthDate: new Date('2007-01-30'),
        // Inactiva: un admin la ha desactivado y no puede iniciar sesión
        active: false,
        deleted: false
    },
    {
        name: 'Hugo Martín',
        email: 'hugo@example.com',
        password: PASSWORD,
        role: 'user',
        degree: AERO,
        lookingFor: 'Compañero de proyecto',
        bio: 'Apruebo Física a la tercera, pero apruebo.',
        birthDate: new Date('2003-04-25'),
        active: true,
        deleted: false
    },
    {
        name: 'Clara Vidal',
        email: 'clara@example.com',
        password: PASSWORD,
        role: 'user',
        degree: TELECO,
        lookingFor: 'Tomar algo después de clase',
        bio: 'Tengo los apuntes de Redes mejor ordenados de la clase.',
        birthDate: new Date('2004-12-01'),
        active: true,
        deleted: false
    },
    {
        name: 'Iker Navarro',
        email: 'iker@example.com',
        password: PASSWORD,
        role: 'user',
        degree: SISTEMES_AERO,
        lookingFor: 'Hacer amigos',
        birthDate: new Date('2005-06-18'),
        // Inactivo
        active: false,
        deleted: false
    },
    {
        name: 'Júlia Serra',
        email: 'julia@example.com',
        password: PASSWORD,
        role: 'user',
        degree: TELEMATICA,
        lookingFor: 'Alguien con quien estudiar',
        bio: 'Escalada los fines de semana, programación entre semana.',
        birthDate: new Date('2003-08-09'),
        active: true,
        deleted: false
    },
    {
        name: 'Oriol Costa',
        email: 'oriol@example.com',
        password: PASSWORD,
        role: 'user',
        degree: AERO,
        lookingFor: 'Tomar algo después de clase',
        bio: 'Cocino mejor de lo que dibujo planos.',
        birthDate: new Date('2002-03-14'),
        active: true,
        deleted: false
    },
    {
        name: 'Sara Molina',
        email: 'sara@example.com',
        password: PASSWORD,
        role: 'user',
        degree: TELECO,
        lookingFor: 'Hacer amigos',
        birthDate: new Date('2004-10-22'),
        // Archivada: no sale en las listas normales, pero se puede restaurar
        active: true,
        deleted: true,
        deletedAt: new Date('2026-10-28')
    },
    {
        name: 'Dani Prat',
        email: 'dani@example.com',
        password: PASSWORD,
        role: 'user',
        degree: SISTEMES_AERO,
        lookingFor: 'Compañero de proyecto',
        birthDate: new Date('2003-05-05'),
        // Archivado
        active: true,
        deleted: true,
        deletedAt: new Date('2026-10-30')
    }
];

// Votos de La Orla. Cada voto dice quién vota y a quién con sus emails: el script del seed los cambia
// por los ids que MongoDB les ha dado. Solo votan usuarios activos.
// Hay cuatro parejas que se han dado A+ mutuamente (Laia y Pau, Nerea y Marc, Hugo y Júlia,
// Usuario y Oriol): son las que tendrán un Date.
export interface GradeSeed {
    from: string;
    to: string;
    value: GradeValue;
}

export const gradesSeed: GradeSeed[] = [
    { from: 'laia@example.com', to: 'pau@example.com', value: 'A+' },
    { from: 'pau@example.com', to: 'laia@example.com', value: 'A+' },
    { from: 'nerea@example.com', to: 'marc@example.com', value: 'A+' },
    { from: 'marc@example.com', to: 'nerea@example.com', value: 'A+' },
    { from: 'hugo@example.com', to: 'julia@example.com', value: 'A+' },
    { from: 'julia@example.com', to: 'hugo@example.com', value: 'A+' },
    { from: 'user@example.com', to: 'oriol@example.com', value: 'A+' },
    { from: 'oriol@example.com', to: 'user@example.com', value: 'A+' },
    { from: 'laia@example.com', to: 'marc@example.com', value: 'F' },
    { from: 'laia@example.com', to: 'hugo@example.com', value: 'A+' },
    { from: 'pau@example.com', to: 'julia@example.com', value: 'A+' },
    { from: 'pau@example.com', to: 'nerea@example.com', value: 'F' },
    { from: 'nerea@example.com', to: 'laia@example.com', value: 'A+' },
    { from: 'nerea@example.com', to: 'oriol@example.com', value: 'F' },
    { from: 'marc@example.com', to: 'clara@example.com', value: 'A+' },
    { from: 'hugo@example.com', to: 'clara@example.com', value: 'F' },
    { from: 'clara@example.com', to: 'hugo@example.com', value: 'F' },
    { from: 'clara@example.com', to: 'oriol@example.com', value: 'A+' },
    { from: 'julia@example.com', to: 'user@example.com', value: 'A+' },
    { from: 'julia@example.com', to: 'pau@example.com', value: 'F' },
    { from: 'oriol@example.com', to: 'laia@example.com', value: 'F' },
    { from: 'oriol@example.com', to: 'nerea@example.com', value: 'A+' },
    { from: 'user@example.com', to: 'clara@example.com', value: 'F' },
    { from: 'user@example.com', to: 'laia@example.com', value: 'A+' },
    { from: 'marc@example.com', to: 'pau@example.com', value: 'F' }
];
