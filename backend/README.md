# Studate: backend

API REST de [Studate](https://studateapp.blogspot.com/), la app para conocer a gente de tu propia
universidad. Es el proyecto del Grupo 3 de EA (María Cazorla, Diego Soledispa y Miguel Ángel
Quiroga), organizado en capas (rutas, middleware, controllers, services y models).

El objetivo del Sprint 1 (el mínimo 1) es el **backoffice**: la zona de administración, en la que
solo entra un `admin`. Pide:

- Gestión de usuarios y roles, con el rol del usuario en el payload del JWT
- Tres modelos: `User`, `Grade` (los votos de La Orla) y `Date` (las citas)
- Paginación en el servidor
- Archivar (borrado lógico) y eliminar para siempre (borrado físico)
- Usuarios activos e inactivos, con un prehook de Mongoose

El proyecto parte del ejercicio del Seminario 7 (JWT, refresh token en cookie HttpOnly, paginación y
WebSockets), que se guarda tal cual en el tag `seminari7-base`. De ahí se trae la autenticación, la
estructura en capas y la forma de hacer la paginación, el borrado lógico y Swagger.

El frontend Angular que consume esta API está en
[STUDATE---FRONTEND](https://github.com/mariacazorla/STUDATE---FRONTEND).

Las tareas del sprint, el contrato con el frontend y la bitácora están en [LOGS.md](LOGS.md); cómo
trabajamos (ramas, commits, pull requests), en [CONTRIBUTING.md](CONTRIBUTING.md). El tablero del
sprint es el [GitHub Project de Studate](https://github.com/users/mariacazorla/projects/2).

## Stack tecnológico

Lo que ya está instalado y funcionando:

| Tecnología | Versión | Para qué se usa |
|---|---|---|
| [Node.js](https://nodejs.org/) | 24 LTS (mínimo 22.12) | Ejecuta JavaScript fuera del navegador: es el servidor |
| [TypeScript](https://www.typescriptlang.org/) | 6.0 | JavaScript con tipos. Se compila a JavaScript en `build/` |
| [Express](https://expressjs.com/) | 5.2 | Recibe las peticiones HTTP y las reparte por rutas y middleware |
| [MongoDB](https://www.mongodb.com/) | local o Atlas | Base de datos que guarda documentos |
| [Mongoose](https://mongoosejs.com/) | 9.10 | Define la forma de los datos (esquemas) y habla con MongoDB |
| [Joi](https://joi.dev/) | 18.2 | Comprueba que el body de una petición es correcto |
| [dotenv](https://github.com/motdotla/dotenv) | 17.4 | Carga las variables del archivo `.env` en `process.env` |
| [chalk](https://github.com/chalk/chalk) | 4.1 | Pone colores a los mensajes de la consola |
| [cors](https://github.com/expressjs/cors) | 2.8 | Controla desde qué origen puede llamar un navegador a la API |
| [swagger-ui-express](https://github.com/scottie1984/swagger-ui-express) | 5.0 | Muestra la documentación de la API en `/api-docs` |
| [swagger-jsdoc](https://github.com/Surnet/swagger-jsdoc) | 6.3 | Construye esa documentación leyendo los comentarios `@openapi` de las rutas |
| [joi-to-swagger](https://github.com/Twipped/joi-to-swagger) | 6.2 | Convierte los esquemas de Joi en los esquemas de la documentación |
| [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) | 9.0 | Firma y verifica los tokens JWT (`sign` y `verify`) |
| [tsx](https://tsx.is/) | 4.23 | Ejecuta TypeScript sin compilar y reinicia la API al guardar (`npm run dev`) |
| [Oxlint](https://oxc.rs/docs/guide/usage/linter) | 1.85 | Analiza el código de `src/` y detecta errores comunes |
| [Prettier](https://prettier.io/) | extensión de VS Code | Da formato al código al guardar (reglas en `.prettierrc`) |

Las contraseñas no necesitan librería: se cifran con `scrypt`, que viene con Node (`node:crypto`).

## Requisitos previos

- [Node.js](https://nodejs.org/) 24 LTS (mínimo 22.12). Incluye [npm](https://www.npmjs.com/).
  Si usas [nvm](https://github.com/nvm-sh/nvm), `nvm use` elige la versión indicada en `.nvmrc`.
- [MongoDB](https://www.mongodb.com/): una instancia local o un cluster en MongoDB Atlas.
- [VS Code](https://code.visualstudio.com/) con la extensión Prettier (recomendado).

TypeScript no hace falta instalarlo aparte: viene con las dependencias del proyecto.

## Clonar el proyecto

```
git clone https://github.com/mariacazorla/STUDUDATE---BACKEND.git
cd STUDUDATE---BACKEND
```

## Instalar las dependencias

```
npm install
```

## Configurar las variables de entorno

Cada miembro del equipo tiene su propio `.env`, que **no se sube a git**. Se crea copiando la plantilla:

```
cp .env.example .env
```

| Variable | Qué es | Valor por defecto |
|---|---|---|
| `MONGO_URL` | Dirección de tu MongoDB | `mongodb://127.0.0.1:27017/studate` |
| `SERVER_PORT` | Puerto en el que escucha la API | `1337` |
| `CORS_ORIGIN` | Origen exacto del frontend (con cookies no vale `*`) | `http://localhost:4200` |
| `NODE_ENV` | Con `production`, la cookie del refresh token se marca `Secure` (solo HTTPS) | `development` |
| `JWT_SECRET` | Secreto con el que se firma el access token. **Obligatoria** | valor de clase en `.env.example` |
| `JWT_REFRESH_SECRET` | Secreto con el que se firma el refresh token; distinto del anterior. **Obligatoria** | valor de clase en `.env.example` |
| `JWT_EXPIRES_IN` | Cuánto dura el access token | `15m` (15 minutos) |
| `JWT_REFRESH_EXPIRES_IN` | Cuánto dura el refresh token | `7d` (7 días) |

Si falta `JWT_SECRET` o `JWT_REFRESH_SECRET`, la API no arranca y dice qué variable falta. Si ya tenías
un `.env` de antes de la autenticación, copia esas cuatro líneas de `.env.example`.

Studate usa su propia base de datos (`studate`), así los datos de los seminarios no se mezclan con los
del proyecto.

## Llenar la base de datos (la primera vez)

Si arrancas con la base de datos vacía, la API funciona pero no devuelve nada y no hay ningún usuario
con el que iniciar sesión. Para tener datos con los que probar, hay 14 usuarios, 25 votos de La Orla
y 4 Dates de ejemplo en `src/seed-data.ts` (los Dates salen de las cuatro parejas que se han dado A+): un admin, un usuario normal y doce estudiantes con su perfil. De los estudiantes,
dos están inactivos y dos archivados, para poder probar el prehook de activos y el borrado lógico:

```
npm run seed
```

Este comando solo inserta los datos si la base de datos está vacía. Si ya tienes datos de pruebas
anteriores, o vienen de una versión antigua de los modelos (por ejemplo, los usuarios de antes de tener
perfil), hay que borrarlos y volver a crearlos:

```
npm run seed -- --reset
```

Siempre trabaja sobre la base de datos de tu `.env`.

Todos tienen la contraseña `studate26`. Los que más se usan para probar:

| Email | Rol | Para qué |
|---|---|---|
| `admin@example.com` | `admin` | Entrar en el backoffice |
| `user@example.com` | `user` | Un usuario normal: puede iniciar sesión, pero no entrar en el backoffice |
| `aina@example.com`, `iker@example.com` | `user` | Inactivos |
| `sara@example.com`, `dani@example.com` | `user` | Archivados |

Las contraseñas están escritas a la vista en `src/seed-data.ts`. Es un proyecto de clase: son públicas
a propósito, para que cualquiera que clone el repositorio pueda entrar con cualquier usuario. En la
base de datos sí se guardan cifradas, porque el modelo `User` las cifra antes de guardarlas.


## Estructura del proyecto

```
src/
  server.ts        Punto de entrada: conecta con MongoDB, registra el middleware y las rutas y arranca el servidor
  seed.ts          Script que llena la base de datos con los datos de ejemplo
  seed-data.ts     Los datos de ejemplo
  config/          Lee las variables de entorno y las reúne en un objeto config
    swagger.ts       Las piezas comunes de la documentación de Swagger
  library/         Utilidades compartidas
    Logging.ts       Mensajes de consola con fecha y color (info, warning, error)
  routes/          El mapa de URLs: qué petición va a qué controller
    Auth.ts, Users.ts, Grade.ts, Date.ts
  middleware/      Lo que se ejecuta entre la ruta y el controller
    VerifyToken.ts   Comprueba el token de la cabecera Authorization y deja el usuario en req.user (401).
                     Aquí se amplía también el tipo Request de Express con req.user
    RequireRole.ts   Deja pasar solo a un rol concreto (403)
    Joi.ts           Guardas: validan el body (422), el id de la URL (400) y la paginación (400)
    Cors.ts          Cabeceras de CORS, configuradas con CORS_ORIGIN
    Logger.ts        Escribe en consola cada petición y su código de respuesta
    ErrorHandler.ts  Convierte cualquier error en su código: 400, 401, 404, 409, 422 o 500
  controllers/     Leen la petición (req), llaman al service y eligen la respuesta (res)
    Auth.ts, Users.ts, Grade.ts, Date.ts
  services/        Leen y escriben en la base de datos a través de los models. No saben que existe HTTP
    AuthService.ts, UserService.ts, GradeService.ts, DateService.ts
  models/          Esquemas de Mongoose y las interfaces de cada recurso
    User.ts          Usuario, y las interfaces de los tokens (payload) y de req.user
    Grade.ts         Voto de La Orla (A+ o F de un usuario a otro)
    Date.ts          Date (cita entre dos usuarios); se importa como DateModel
  utils/           Funciones pequeñas sin dependencias de Express
    password.ts      Cifra y comprueba contraseñas con scrypt
    escape-regexp.ts Escapa el texto de una búsqueda para usarlo en una expresión regular
```

Una petición recorre las capas siempre en el mismo orden:

```
cliente -> server.ts (logger, JSON, CORS) -> routes/ -> middleware/ (token, rol y validación) -> controllers/ -> services/ -> models/ -> MongoDB
```

Cada capa hace una sola cosa. Por eso los `services/` y los `models/` no importan Express:
si un día se cambiara Express por otro framework, esas dos carpetas no habría que tocarlas.

## Autenticación

La API usa **JWT** (JSON Web Token). Un JWT es un texto con tres partes separadas por puntos:
cabecera, contenido (payload) y firma. El servidor firma el token con un secreto que solo él conoce
(`JWT_SECRET`), así que puede comprobar que un token lo ha creado él y que nadie lo ha modificado.
El contenido **no está cifrado**: cualquiera puede leerlo (por ejemplo en https://jwt.io). Por eso
solo lleva el id del usuario (`sub`), su rol (`role`) y cuándo caduca (`exp`), nunca la contraseña.

El recorrido completo:

1. `POST /auth/register` con `{ name, email, password }` crea el usuario (siempre con el rol `user`)
   y responde 201 **sin token**. El frontend lleva entonces a la página de login.
2. `POST /auth/login` con `{ email, password }` responde `{ token, user }`, o 401 si el email o la
   contraseña no son correctos (el mismo mensaje en los dos casos, para no revelar qué emails están
   registrados). El refresh token no va en el JSON: se deja en una **cookie HttpOnly** (ver más abajo).
3. En cada petición a una ruta protegida, el cliente envía el token en la cabecera:
   `Authorization: Bearer <token>`.
4. El middleware `VerifyToken` comprueba la firma y la caducidad, y que el usuario siga activo, y deja el
   usuario en `req.user`. Si falta el token, ha caducado, no es válido o la cuenta ya no está activa,
   responde 401.
5. El middleware `RequireRole('admin')` comprueba el rol: si el usuario no es `admin`, responde 403.
6. El access token dura poco (15 minutos). Cuando caduca, el cliente llama a `POST /auth/refresh`
   sin body: el navegador adjunta la cookie y la API responde `{ token }`, un access token nuevo, sin
   volver a escribir la contraseña. El refresh token dura 7 días.
7. `POST /auth/logout` borra la cookie. A partir de ahí, `/auth/refresh` responde 401.

### Dónde va cada token

El access token se devuelve en el JSON y el frontend lo guarda **solo en memoria**. El refresh token
viaja en la cookie `refreshToken`, que pone el backend con `res.cookie` en el login:

| Atributo | Para qué |
|---|---|
| `HttpOnly` | JavaScript no puede leerla (`document.cookie` no la muestra). Un script inyectado por XSS no se la puede llevar |
| `SameSite=Strict` | El navegador no la envía en peticiones que provoca otra web (CSRF) |
| `Path=/auth` | Solo se envía a `/auth/refresh` y `/auth/logout`, que son las únicas rutas que la necesitan |
| `Max-Age` | Dura lo mismo que el refresh token (`JWT_REFRESH_EXPIRES_IN`) |
| `Secure` | Solo por HTTPS. Se activa con `NODE_ENV=production`; en clase va por `http://localhost` |

Para que el navegador envíe y acepte la cookie entre `localhost:4200` y `localhost:1337`, el frontend
llama a `/auth/*` con `withCredentials: true` y CORS responde con `credentials: true` y el origen
exacto de `CORS_ORIGIN` (con credenciales, `*` no está permitido). La cookie la lee `cookie-parser`,
que la deja en `req.cookies`.

401 y 403 no son lo mismo: 401 es "no sé quién eres" (no hay sesión válida) y 403 es "sé quién eres,
pero no tienes permiso".

Qué está protegido. Cada ruta lleva sus middlewares en su router (`src/routes/`), en este orden:
primero `VerifyToken`, después `RequireRole` si hace falta un rol, después la validación y por último
el controller. Por ejemplo:

```ts
router.get('/me', VerifyToken, controller.readMe);
```

La autenticación va antes que la validación: a quien no tiene sesión se le responde 401, sin decirle
si su petición estaba bien formada.

| Rutas | Quién puede |
|---|---|
| `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` | Cualquiera (refresh necesita la cookie con un refresh token válido) |
| `/ping`, `/api-docs` | Cualquiera |
| `/users/me`, `/users/directory` | Cualquier usuario con sesión |
| `/users`, `/users/:userId`, `/users/:userId/archive`, `/users/:userId/restore` (gestión de usuarios) | Solo `admin` |
| `/grades` (votos de La Orla) | Solo `admin` |
| `/dates` | Cualquier usuario con sesión, cada uno sus propios Dates; el admin, todos. Eliminar es solo del `admin` |

Decisiones y límites, porque es un proyecto de clase:

- El access token y el refresh token se firman con **secretos distintos**: un refresh token no sirve
  como access token, ni al revés.
- Los refresh tokens **no se guardan** en la base de datos. Es lo más sencillo, pero tiene un coste:
  el servidor no puede invalidar un refresh token antes de que caduque, y cerrar sesión consiste en
  borrar la cookie (`/auth/logout`) y que el frontend olvide el access token que tiene en memoria.
- Al renovar, el servidor vuelve a leer el usuario de la base de datos: si le han cambiado el rol, el
  token nuevo ya lleva el rol actual; si se ha borrado, desactivado o archivado, responde 401.

### Usuarios activos (prehook)

Un admin puede desactivar a un usuario (`active: false`) o archivarlo (`deleted: true`). Ninguno de los dos
tiene que poder entrar. En lugar de filtrar en cada consulta, el modelo `User` tiene un **prehook de
Mongoose**: una función que se ejecuta antes de cada consulta de usuarios y le añade el filtro
`{ active: true, deleted: false }`:

```ts
UserSchema.pre(['find', 'findOne', 'findOneAndUpdate', 'countDocuments'], function () {
    if (this.getOptions().withInactive) {
        return;
    }

    this.where({ active: true, deleted: false });
});
```

Como el login busca al usuario por email, a un usuario inactivo o archivado no lo encuentra y responde 401
con el mismo mensaje de siempre. Lo mismo al renovar el token. Las rutas del admin sí necesitan verlos
a todos, y se saltan el filtro con `.setOptions({ withInactive: true })`.

¿Y si el usuario ya tenía sesión cuando lo desactivan? Su access token sigue siendo válido hasta 15
minutos. Para que no pueda seguir usando la API, `VerifyToken` busca en cada petición al usuario del token
(pasando por el prehook) y, si ya no está activo, responde 401 "Tu cuenta no está activa". El frontend,
con cualquier 401 que no sea de token caducado, cierra la sesión y lleva al login. Cuesta una consulta a
MongoDB por petición, que para este proyecto no es un problema.

Para probarlo con curl:

```
curl -c cookies.txt -X POST http://localhost:1337/auth/login -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"studate26"}'
curl http://localhost:1337/users/me -H "Authorization: Bearer <el token de la respuesta anterior>"
curl -b cookies.txt -X POST http://localhost:1337/auth/refresh
```

`-c` guarda la cookie que deja el login y `-b` la envía en el refresh. Sin `-b`, el refresh responde 401.

## Endpoints

Todas las rutas salvo `/auth/*` y `/ping` necesitan la cabecera `Authorization: Bearer <token>` (ver
[Autenticación](#autenticación)).

| Método | URL | Qué hace | Body |
|---|---|---|---|
| GET | `/ping` | Comprueba que la API está viva | |
| POST | `/auth/register` | Registra un usuario (rol `user`). No devuelve token | `{ "name": "...", "email": "...", "password": "..." }` |
| POST | `/auth/login` | Inicia sesión: devuelve `{ token, user }` y deja el refresh token en una cookie HttpOnly | `{ "email": "...", "password": "..." }` |
| POST | `/auth/refresh` | Devuelve un access token nuevo: `{ token }`. Lee el refresh token de la cookie | |
| POST | `/auth/logout` | Borra la cookie del refresh token (204) | |
| GET | `/users/me` | Devuelve el usuario con sesión (`_id`, `name`, `email`, `role`). Lo saca de `req.user` | |
| GET | `/users/directory` | Con quién puede abrir un Date el usuario con sesión: los demás usuarios activos (nombre, titulación y foto). Cualquier usuario con sesión | |
| GET | `/users` | Lista los usuarios, paginados (`?page=&limit=&search=&role=&active=&degree=&archived=`). Solo admin | |
| GET | `/users/:userId` | Devuelve un usuario, también si está inactivo o archivado. Solo admin | |
| POST | `/users` | Crea un usuario con su rol y si está activo. Solo admin | `{ "name": "...", "email": "...", "password": "...", "role": "user" }` |
| PUT | `/users/:userId` | Edita un usuario, su rol y si está activo (no la contraseña). Solo admin | `{ "name": "...", "email": "...", "role": "user", "active": true }` |
| POST | `/users/:userId/archive` | Archiva un usuario (borrado lógico). Solo admin | |
| POST | `/users/:userId/restore` | Restaura un usuario archivado. Solo admin | |
| DELETE | `/users/:userId` | Elimina para siempre un usuario archivado (borrado físico) y sus votos. Solo admin | |
| GET | `/grades` | Lista los votos de La Orla, paginados (`?page=&limit=&value=&user=`). Solo admin | |
| GET | `/grades/:gradeId` | Devuelve un voto, con los datos de los dos usuarios. Solo admin | |
| POST | `/grades` | Crea un voto. Solo admin | `{ "from": "<id>", "to": "<id>", "value": "A+" }` |
| PUT | `/grades/:gradeId` | Cambia la nota de un voto. Solo admin | `{ "value": "F" }` |
| DELETE | `/grades/:gradeId` | Elimina un voto (borrado físico). Solo admin | |
| GET | `/dates` | Lista los Dates, paginados (`?page=&limit=&status=&user=`). El admin ve todos; un usuario, los suyos | |
| GET | `/dates/:dateId` | Devuelve un Date (un usuario, solo los suyos) | |
| POST | `/dates` | Abre un Date entre dos usuarios (un usuario, solo si es uno de los dos) | `{ "users": ["<id>", "<id>"] }` |
| PUT | `/dates/:dateId` | Cambia el Date de bandeja | `{ "status": "ongoing" }` |
| POST | `/dates/:dateId/extend` | Usa la prórroga: 24 horas más, una sola vez | |
| DELETE | `/dates/:dateId` | Elimina un Date (borrado físico). Solo admin | |
Un usuario tiene `name`, `email` y `role` (`user` o `admin`), los datos de su perfil (`birthDate`,
`degree` o titulación, `lookingFor` o "Qué busco", `bio` y `photo`) y el estado de su cuenta: `active`
(si un admin lo ha desactivado) y `deleted` con `deletedAt` (si está archivado). La contraseña nunca se
devuelve. La foto se guarda dentro del propio usuario como texto en base64 (`data:image/jpeg;base64,...`),
con un máximo de 200 000 caracteres: es lo más sencillo para el proyecto y no necesita guardar ficheros.

Ejemplo con curl (también sirve Postman o Thunder Client):

```
curl http://localhost:1337/users/me -H "Authorization: Bearer <token>"
```

En el listado de usuarios, `search` busca en el nombre y el email sin distinguir mayúsculas; `role` deja
solo los de un rol; `active=true` o `active=false`, solo los activos o los inactivos; `degree`, solo los de una titulación
(el texto entero); y `archived=true`,
solo los archivados (por defecto no salen). Un admin no puede cambiarse su propio rol ni desactivarse:
responde 403 "No puedes hacer esto con tu propio usuario", para que el backoffice no se quede sin admin.

Un voto de La Orla (`Grade`) es la nota que un usuario (`from`) le pone al perfil de otro (`to`): `A+`
(aprobado, me interesa) o `F` (suspenso). En las respuestas, `from` y `to` llegan con el nombre, el email
y la foto del usuario (`populate`), también si está inactivo. Cada usuario solo puede votar una vez a
cada perfil (409 si se repite) y nadie se puede votar a sí mismo (422). `value` filtra por nota y `user`
deja los votos en los que participa un usuario. Un voto no se archiva: eliminarlo es un borrado físico.

Un **Date** es una cita entre dos usuarios (`users`). Se abre solo cuando los dos se ponen A+ en La Orla
(al crear un voto A+ o al cambiar uno a A+, si ya existe el A+ contrario), y también se puede abrir a mano.
Al abrirse se sortea a quién le toca escribir primero (`firstTurn`) y caduca en 24 horas (`expiresAt`); la
prórroga (`POST /dates/:dateId/extend`) añade 24 horas más una sola vez (`extended`). Está en una de las
bandejas del blog (`status`): `pending` (Pendiente), `ongoing` (En curso) o `closed` (Cerrado). Solo puede
haber un Date entre cada pareja (409). Un usuario normal solo ve, cambia y abre sus propios Dates; los de
otros le dan 404. Al eliminar un usuario para siempre se borran también sus Dates.

El modelo se llama `Date` en MongoDB, pero en el código se importa como `DateModel`: `Date` ya es la clase de
fechas de JavaScript, y si el modelo se llamara así, `new Date()` dejaría de funcionar en ese fichero.

Códigos de respuesta: 201 al crear, 200 al leer o modificar, 204 al borrar, 400 si el id de la URL
no tiene forma de id de MongoDB, 401 si falta el token o no es válido, 403 si el usuario no tiene el
rol necesario, 404 si el id no existe, 409 si el email ya existe, 422 si el body no es
válido y 500 si falla algo en el servidor.

## Borrado lógico y borrado físico

Hay dos formas de "borrar" un usuario, y en el backoffice se usan en este orden:

1. **Archivar** (borrado lógico, *soft delete*): `POST /users/:userId/archive`. El usuario **no se elimina**
   de MongoDB: se marca con `deleted: true` y la fecha en `deletedAt`. A partir de ahí:
   - no sale en el listado (sí con `?archived=true`);
   - no puede iniciar sesión ni renovar el token (lo hace el [prehook](#usuarios-activos-prehook));
   - no se puede editar (404) hasta que se restaure;
   - su email sigue ocupado, así que al restaurarlo nunca choca con otro usuario.
2. **Restaurar**: `POST /users/:userId/restore` deshace el archivado (`deleted: false` y se quita `deletedAt`).
3. **Eliminar para siempre** (borrado físico, *hard delete*): `DELETE /users/:userId`. El documento
   desaparece de MongoDB y no se puede deshacer. Solo se puede con un usuario **archivado**; si no, la API
   responde 409 "Archiva el usuario antes de eliminarlo".

¿Por qué en dos pasos? El borrado lógico es lo normal en una aplicación real: un error se arregla
restaurando y no se pierden datos. El borrado físico existe para cuando de verdad hay que quitar los datos
de alguien (por ejemplo, si lo pide el propio usuario), y obligar a archivar antes evita borrar a alguien
por error con un solo clic.

Un admin no puede archivarse ni eliminarse a sí mismo (403).

## Documentación de la API

La documentación de cada endpoint se escribe en un comentario `/** @openapi */` justo encima de su
ruta, en `src/routes/`. Al arrancar, `swagger-jsdoc` lee esos comentarios y monta el documento que
se ve en http://localhost:1337/api-docs.

Los esquemas del body no se escriben a mano: `joi-to-swagger` los genera a partir de los mismos
esquemas de Joi que validan las peticiones, así que la documentación no puede quedarse desfasada
cuando se añade o se quita un campo.

Las piezas comunes (datos generales, esquemas, respuestas de error y el esquema de seguridad
`bearerAuth`) están en `src/config/swagger.ts`. Cada respuesta de error lleva de ejemplo el mensaje que
devuelve de verdad la API (por ejemplo, `NotArchived`, `OwnUser`, `GradeConflict` o `DateConflict`), para
que quien hace el frontend sepa qué va a recibir. Las rutas están agrupadas por etiquetas: Health, Auth,
Users, Grades y Dates. En `src/routes/Auth.ts` la documentación va debajo
del código, para que el router se lea de un vistazo.

Para probar las rutas protegidas desde Swagger: ejecuta `POST /auth/login`, copia el `token` de la
respuesta, pulsa el botón **Authorize** de arriba a la derecha y pégalo (solo el token, sin la palabra
`Bearer`). A partir de ahí Swagger envía la cabecera en todas las peticiones. Las rutas con candado son
las que lo necesitan.

## Cómo se ha probado la API

No hay tests automáticos en el backend. Al cerrar cada rama se prueba lo hecho contra la API arrancada y
con la base de datos recién sembrada (`npm run seed -- --reset`), con curl, también los casos de error: sin
token, con el rol que no toca, con ids que no existen o mal formados, con el body mal y con las reglas de
cada recurso (archivar antes de eliminar, un voto por pareja, una prórroga por Date...). Cada entrada de la
bitácora de [LOGS.md](LOGS.md) dice qué se probó y cuántas pruebas salieron bien. Un ejemplo:

```
curl -c cookies.txt -X POST http://localhost:1337/auth/login -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"studate26"}'
curl "http://localhost:1337/users?archived=true" -H "Authorization: Bearer <token>"
curl -X DELETE http://localhost:1337/users/<id de un usuario no archivado> -H "Authorization: Bearer <token>"
```

La última responde 409 "Archiva el usuario antes de eliminarlo". Las mismas pruebas se pueden hacer desde
la página de Swagger.

## Cómo contribuir

Ramas, commits y pull requests en [CONTRIBUTING.md](CONTRIBUTING.md). Tareas pendientes y bitácora en
[LOGS.md](LOGS.md).
