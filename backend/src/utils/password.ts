import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

// Convertimos scrypt en una funcion que podemos utilizar con await
const deriveKey = promisify(scrypt);

// Longitud en bytes de la clave que genera scrypt
const KEY_LENGTH = 64;

// Cifra una contraseña. Devuelve un texto con el formato scrypt:sal:clave, que es lo que se
// guarda en la base de datos en lugar de la contraseña original.
export const hashPassword = async (password: string) => {
    // La sal es un valor aleatorio distinto para cada usuario: asi dos usuarios con la misma
    // contraseña no tienen el mismo texto guardado
    const salt = randomBytes(16).toString('hex');

    const derivedKey = (await deriveKey(password, salt, KEY_LENGTH)) as Buffer;

    return `scrypt:${salt}:${derivedKey.toString('hex')}`;
};

// Comprueba si una contraseña coincide con la que esta guardada (en formato scrypt:sal:clave).
// No se puede "descifrar" lo guardado: se vuelve a cifrar la contraseña recibida con la misma
// sal y se comparan los dos resultados.
export const verifyPassword = async (password: string, stored: string) => {
    const [algorithm, salt, key] = stored.split(':');

    if (algorithm !== 'scrypt' || !salt || !key) {
        return false;
    }

    const storedKey = Buffer.from(key, 'hex');
    const derivedKey = (await deriveKey(password, salt, storedKey.length)) as Buffer;

    // timingSafeEqual tarda lo mismo aunque los dos valores se parezcan mucho o nada.
    // Con un === normal, un atacante podria medir el tiempo de respuesta para ir adivinando.
    return timingSafeEqual(storedKey, derivedKey);
};
