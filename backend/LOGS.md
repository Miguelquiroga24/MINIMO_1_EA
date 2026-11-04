# LOGS

Bitácora del backend de Studate. Tiene dos partes:

- **Tareas**: lo que hay que hacer en este repositorio en el sprint, agrupado por ramas. Quien cierra una tarea la marca.
- **Bitácora**: lo que se ha hecho, las decisiones tomadas y qué prompts de IA se han usado.

Las tareas del frontend están en el LOGS.md de [STUDATE---FRONTEND](https://github.com/mariacazorla/STUDATE---FRONTEND).
El tablero del sprint, con las horas, es el [GitHub Project de Studate](https://github.com/users/mariacazorla/projects/2).

## Contrato

Lo que backend y frontend tienen que cumplir igual. Si algo de aquí cambia, se cambia en los dos LOGS.md.

- **Rutas públicas**: `POST /auth/register` y `POST /auth/login`. `POST /auth/refresh` y `POST /auth/logout` se autentican con la cookie del refresh token. `GET /ping` y la documentación
  (`/api-docs`) también son públicas. Todo lo demás exige token.
- **Registro**: el cuerpo es `{ name, email, password }` (contraseña de 8 caracteres como mínimo; `role` no se acepta, todo usuario nuevo es `user`). Responde 201 con `{ user }` y **sin token**, 409
  si el email ya existe o 422 si el cuerpo no es válido. El frontend redirige entonces a la página de login.
- **Login**: el cuerpo es `{ email, password }`. Responde `{ token, user }` o 401. `user` es `{ _id, name, email, role, createdAt, updatedAt }`, sin contraseña. El refresh token **no va en el
  JSON**: se deja en la cookie `refreshToken` (HttpOnly, SameSite=Strict, Path=/auth, Max-Age de 7 días; Secure en producción).
- **Refresh**: sin cuerpo. Lee el refresh token de la cookie y responde `{ token }` (un access token nuevo), o 401 si no hay cookie, ha caducado o no es válida. El refresh token no cambia.
- **Logout**: sin cuerpo. Borra la cookie y responde 204. Después, `/auth/refresh` responde 401.
- **Cookies y CORS**: el frontend llama a `/auth/*` con `withCredentials: true`; el backend responde con `Access-Control-Allow-Credentials: true` y el origen exacto de `CORS_ORIGIN` (no vale `*`).
- **Token**: se envía en la cabecera `Authorization: Bearer <token>`. Su payload lleva los claims `sub` (id del usuario), `role` y `exp`. El access token dura 15 minutos y el refresh token 7 días.
  El frontend guarda el access token solo en memoria (una signal), nunca en `localStorage` ni `sessionStorage`; al recargar la página lo recupera llamando a `/auth/refresh` y después a `/users/me`.
- **Errores de autenticación**: 401 si falta el token, ha caducado (`{ message: 'El token ha caducado' }`) o no es válido (`{ message: 'Token no válido' }`); 403 si hay sesión pero no el rol
  necesario.
- **Usuario con sesión**: `GET /users/me` (con sesión, cualquier rol) responde `{ user: { _id, name, email, role } }`, a partir del token (`req.user`).
- **Con quién abrir un Date**: `GET /users/directory` (con sesión, cualquier rol) responde `{ users: [{ _id, name, degree?, photo? }] }`: los demás usuarios
  de rol `user` activos, ordenados por nombre.
- **Usuario**: `{ _id, name, email, role, birthDate?, degree?, lookingFor?, bio?, photo?, active, deleted, deletedAt?, createdAt, updatedAt }`, nunca con
  contraseña. `photo` es una imagen PNG o JPG en base64 (`data:image/...;base64,...`, 200 000 caracteres como mucho).
- **Usuarios inactivos y archivados**: no pueden iniciar sesión ni renovar el token (401 con el mensaje de siempre). Lo hace el prehook del modelo.
  Si ya tenían sesión, cualquier petición con su token responde 401 `{ message: 'Tu cuenta no está activa' }` y el frontend cierra la sesión.
- **Gestión de usuarios** (solo `admin`):
  - `GET /users?page=&limit=&search=&role=&active=&degree=&archived=` responde `{ users, total, page, pages }`, ordenados por nombre. `search` busca en
    nombre y email; `role` es `user` o `admin`; `active` es `true` o `false`; `degree` es una titulación entera; `archived=true` lista solo los
    archivados (por defecto no salen). 400 si un filtro no es válido.
  - `GET /users/:userId` responde `{ user }`, también si está inactivo o archivado; 404 si no existe.
  - `POST /users` con `{ name, email, password, role?, active?, birthDate?, degree?, lookingFor?, bio?, photo? }` responde 201 `{ user }`; 409 si el
    email existe, 422 si el cuerpo no vale.
  - `PUT /users/:userId` con lo mismo salvo `password` (`name` y `email` obligatorios) responde 200 `{ user }`; 404 si no existe o está archivado.
    `photo: ''` quita la foto.
  - `POST /users/:userId/archive` (borrado lógico) responde 200 `{ user }` con `deleted: true`; 404 si no existe o ya estaba archivado.
  - `POST /users/:userId/restore` responde 200 `{ user }`; 404 si no existe o no estaba archivado.
  - `DELETE /users/:userId` (borrado físico) responde 204. Solo con usuarios archivados: si no, 409 `{ message: 'Archiva el usuario antes de eliminarlo' }`.
  - Un admin no puede cambiarse su propio rol, desactivarse, archivarse ni eliminarse: 403 `{ message: 'No puedes hacer esto con tu propio usuario' }`.
  - Al eliminar un usuario para siempre se borran también sus votos de La Orla y sus Dates.
- **Voto de La Orla (Grade)**: `{ _id, from, to, value, createdAt, updatedAt }`. `from` (quien vota) y `to` (a quien) llegan como
  `{ _id, name, email, photo? }`, también si el usuario está inactivo. `value` es `'A+'` o `'F'`. Un solo voto por pareja (from, to).
- **Votos de La Orla** (solo `admin`):
  - `GET /grades?page=&limit=&value=&user=` responde `{ grades, total, page, pages }`, primero los más nuevos. `user` deja los votos en los que
    ese usuario vota o es votado. 400 si un filtro no es válido.
  - `GET /grades/:gradeId` responde `{ grade }`; 404 si no existe.
  - `POST /grades` con `{ from, to, value }` responde 201 `{ grade }`; 409 si la pareja ya tiene voto (`{ message: 'Este usuario ya ha votado ese perfil' }`); 422 si `from` y `to` son el mismo usuario
    (`{ message: 'Un usuario no se puede votar a sí mismo' }`) o el cuerpo no vale; 404 si `from` o `to` no existen.
  - `PUT /grades/:gradeId` con `{ value }` responde 200 `{ grade }`. `DELETE /grades/:gradeId` responde 204 (borrado físico).
  - Si al crear un A+ o al cambiar un voto a A+ ya existe el A+ contrario, se abre un Date entre los dos (si no lo había ya).
- **Date**: `{ _id, users, status, firstTurn, expiresAt, extended, createdAt, updatedAt }`. `users` son los dos usuarios como `{ _id, name, email,
  photo? }`; `status` es `'pending'` (Pendiente), `'ongoing'` (En curso) o `'closed'` (Cerrado); `firstTurn` es el id del usuario al que le toca
  escribir primero (sorteado); `expiresAt` es 24 horas después de abrirse; `extended` dice si ya se usó la prórroga. Un solo Date por pareja.
- **Dates** (cualquier usuario con sesión; el admin ve todos y un usuario normal solo los suyos):
  - `GET /dates?page=&limit=&status=&user=` responde `{ dates, total, page, pages }`, primero los más nuevos. `user` solo lo usa el admin.
  - `GET /dates/:dateId` responde `{ date }`; 404 si no existe o es de otros.
  - `POST /dates` con `{ users: [idA, idB] }` responde 201 `{ date }`; 403 si un usuario normal no es uno de los dos; 409 si ya hay un Date entre
    ellos (`{ message: 'Ya hay un Date entre estos dos usuarios' }`); 404 si alguno no existe; 422 si no son dos ids distintos.
  - `PUT /dates/:dateId` con `{ status }` responde 200 `{ date }`; 404 si no existe o es de otros.
  - `POST /dates/:dateId/extend` suma 24 horas a `expiresAt` y pone `extended: true`; 409 si ya se usó
    (`{ message: 'La prórroga de este Date ya se ha usado' }`).
  - `DELETE /dates/:dateId` (solo admin) responde 204.

## Tareas

### Sprint 1 (mínimo 1)

#### Estructura (`structure`)

- [x] Crear los dos repositorios a partir del Seminari 7 (README y ramas) · Diego
- [x] Montar el GitHub Project y cargar las tareas · María
- [x] Hoja de horas del equipo · Miguel Ángel
- [x] Quitar autores, libros y chat del backend · María

#### Usuarios (`users`)

- [x] Modelo User ampliado (perfil, activo, archivado) y datos de ejemplo · Diego
- [x] Prehook de Mongoose "está activo" · Diego
- [x] Gestión de usuarios: listado paginado, búsqueda, editar y cambiar rol · Diego
- [x] Archivar, restaurar y eliminar para siempre (usuarios) · Diego

#### La Orla (`grades`)

- [x] Modelo Grade (La Orla) con sus rutas de admin · María

#### Dates (`dates`)

- [x] Modelo Date (citas) con sus rutas · María

#### Documentación (`docs`)

- [x] Documentación de la API en Swagger · Diego
- [x] Pruebas de la API (se hacen al cerrar cada rama y se apuntan en la bitácora) · Diego

#### Scrum

- [ ] Planning, seguimiento y retrospectiva · los tres
- [ ] Preparar la demo del sprint · Diego y María

## Bitácora

La bitácora del Seminario 7, de donde viene este código, se conserva en el tag `seminari7-base`
(`git show seminari7-base:LOGS.md`).

### 2026-11-03 · Punto de partida y `structure`

- El repositorio nace como copia del backend del ejercicio del Seminario 7. Antes de tocar nada se guarda ese
  código en el tag `seminari7-base`, para poder consultarlo cuando lo vayamos quitando.
- Identidad: el paquete pasa a llamarse `studate-backend`, el README cuenta qué es Studate y qué pide el
  mínimo 1, la base de datos por defecto pasa a ser `studate` y los secretos de clase de `.env.example`
  cambian de nombre. Swagger se titula "Studate API".
- Este LOGS.md empieza de cero con las tareas del Sprint 1 agrupadas por la rama en la que se hacen. Del
  contrato del seminario solo se queda la autenticación, que no cambia; lo demás se irá escribiendo en cada rama.
- Prompt de IA usado: «Lo que hemos hecho ha sido copiar y pegar lo que teníamos del seminario 7. Ahora hay que
  adaptarlo a lo nuestro, que es Studate. Para eso hay que hacer limpieza y dejar el repo preparado [...] Dime
  el plan de acción.» (conversación completa en `prompts/sprint-1.md`, fuera del repositorio).

### 2026-11-03 · Limpieza: fuera autores, libros y chat

- Se borran los modelos, controllers, services y rutas de autores y libros, el modelo `Message`, la carpeta
  `sockets/` (chat y avisos del backoffice), el middleware `SocketAuth` y los dos scripts de migración del
  seminario (`migrate-authors` y `migrate-indexes`), con sus comandos de `package.json`. Se desinstala `socket.io`.
- `server.ts` deja de montar `/authors`, `/books` y socket.io; sigue creando el servidor con `http.createServer`.
- Desaparece `GET /users` (la lista de id y nombre para el chat directo). `GET /users/me` se queda: el frontend lo
  usa para recuperar la sesión.
- Se quedan las piezas genéricas que se van a reutilizar: `ValidatePagination` y el esquema de paginación de Joi,
  `ValidateId`, `ErrorHandler`, `RequireRole`, `VerifyToken`, `escapeRegExp` y las respuestas comunes de Swagger.
- El seed solo crea los dos usuarios; la rama `users` lo amplía.
- README: fuera las secciones del chat, de autores y libros y de las migraciones; la estructura del proyecto,
  los endpoints y la tabla de rutas protegidas quedan al día.
- Decisión: quitar en lugar de comentar. El código del seminario sigue entero en el tag `seminari7-base`
  (`git show seminari7-base:src/services/BookService.ts`), que es de donde se copiará la forma de la paginación y
  del borrado lógico.
- Validación ejecutada: `npm run build` y `npm run lint` sin errores; `npm run seed -- --reset`; con la API
  arrancada, 8 pruebas con curl: login 200, `/users/me` 200 con token y 401 sin él, `/authors`, `/books` y `GET /users`
  404, `/api-docs` y `/ping` 200, y el documento de Swagger ya no tiene ninguna ruta ni esquema de autores o libros.
- Prompt de IA usado: el mismo de la limpieza del repositorio (ver la entrada anterior).

### 2026-11-03 · Modelo User ampliado y datos de ejemplo

- `User` pasa de `name`, `email`, `password` y `role` a tener también:
  - Perfil (opcional, como en el blog): `birthDate`, `degree` (titulación), `lookingFor` ("Qué busco", 100
    caracteres como mucho), `bio` (500 como mucho) y `photo`.
  - Estado de la cuenta: `active` (`true` por defecto) y el borrado lógico `deleted` + `deletedAt`, con los mismos
    nombres que usaban autores y libros en el seminario.
- Decisión: el email sigue siendo único entre **todos** los usuarios, también los archivados (índice único normal,
  no parcial como el de autores). Así restaurar un usuario nunca choca con otro que se haya quedado su email.
- Decisión: la foto se guarda dentro del usuario como texto en base64, con un máximo de 200 000 caracteres
  (`PHOTO_MAX_LENGTH`). No hace falta guardar ficheros ni otra librería; el frontend la reduce antes de enviarla.
- Seed: 14 usuarios con perfiles de estudiantes de la EETAC (inventados), contraseña `studate26`. Dos están
  inactivos (`aina`, `iker`) y dos archivados (`sara`, `dani`), para probar las tareas siguientes.
- Swagger: el esquema `User` y su ejemplo llevan los campos nuevos. README: usuarios de ejemplo y campos del usuario.
- Validación ejecutada: `npm run build` y `npm run lint` sin errores; `npm run seed -- --reset` crea 14 usuarios, y
  con `mongosh` se comprueba que hay 2 con `active: false`, 2 con `deleted: true` y las 14 contraseñas cifradas
  (`scrypt:...`). Con la API arrancada, el login de `laia@example.com` devuelve el usuario con los campos nuevos y sin
  contraseña. Todavía un usuario inactivo puede iniciar sesión: lo resuelve el prehook (siguiente tarea).
- Prompt de IA usado: «Empezamos por el modelo User. Antes de tocar nada, dime qué campos tendría, cómo quedaría la
  estructura del modelo, y ponme ejemplos de cada campo para ver qué necesitamos de verdad.»

### 2026-11-03 · Prehook de Mongoose "está activo"

- Qué pide la tarea: que un usuario desactivado no pueda usar la aplicación, resuelto con un hook de Mongoose en
  lugar de repetir el filtro en cada consulta.
- `UserSchema.pre(['find', 'findOne', 'findOneAndUpdate', 'countDocuments'], ...)` añade
  `{ active: true, deleted: false }` a todas las consultas de usuarios. `findById` también queda filtrado, porque
  por dentro es un `findOne`. Se incluyen los archivados porque tampoco tienen que poder entrar.
- Para que el admin pueda ver y reactivar a todos, la consulta se salta el filtro con la opción propia
  `.setOptions({ withInactive: true })`, que el hook lee con `this.getOptions()`.
- Qué cambia sin tocar los services: el login (que busca por email) no encuentra al usuario inactivo o archivado
  y responde 401 con el mismo mensaje de siempre; el refresh (`findById`) también responde 401.
- Validación ejecutada: `npm run build` y `npm run lint` sin errores. Con un script de prueba con `tsx` (fuera del
  repositorio): `User.countDocuments()` da 10 y con `withInactive` da 14; `find()` igual; `findOne` de la usuaria
  inactiva da `null` y con `withInactive` la encuentra. Con la API arrancada, 6 logins: `laia` y `admin` 200; los
  inactivos `aina` e `iker` y los archivados `sara` y `dani`, 401 "Email o contraseña incorrectos".
- Prompt de IA usado: «Ahora el prehook de Mongoose de "está activo". No me acuerdo bien de en qué consistía.
  Explícame de qué va, por qué tiene sentido esta tarea, y dame el plan de acción.»

### 2026-11-03 · Gestión de usuarios: listado paginado, búsqueda, editar y cambiar rol

- Rutas de admin en `routes/Users.ts`, cada una con su cadena `VerifyToken` → `RequireRole('admin')` → validación →
  controller y su comentario de Swagger: `GET /users` (con filtros), `GET /users/:userId`, `POST /users` y `PUT /users/:userId`.
  `/me` va antes que `/:userId` para que Express no tome "me" por un id.
- El listado copia la forma de la paginación de libros del seminario (`skip`, `limit` y `countDocuments` con el mismo filtro,
  respuesta `{ users, total, page, pages }`) y le añade los filtros `role`, `active` y `archived`. Se validan con un esquema
  de Joi nuevo (`userList`) y el middleware `ValidateUserList`, que es igual que `ValidatePagination`: Joi convierte
  `"false"` de la URL en `false`.
- Las funciones del admin se saltan el prehook con `setOptions({ withInactive: true })`: si no, el admin no vería a los
  inactivos ni a los archivados.
- Joi: `user.create` y `user.update` comparten los campos del perfil (escritos una sola vez). La contraseña no está en
  `update`, así que enviarla da 422. La foto tiene que empezar por `data:image/png;base64,` o `data:image/jpeg;base64,`.
- Decisiones:
  - Un usuario archivado no se puede editar (404): primero hay que restaurarlo.
  - Un admin no puede cambiarse su propio rol ni desactivarse: 403 "No puedes hacer esto con tu propio usuario". Si se
    pudiera, el backoffice se podría quedar sin ningún admin.
- Contrato de la gestión de usuarios escrito arriba (y copiado al LOGS.md del frontend en su rama).
- Validación ejecutada: `npm run build` y `npm run lint` sin errores. Con la API arrancada y el seed recién hecho, 30 pruebas con
  curl, todas correctas: listado por defecto (12 no archivados, 3 páginas de 5, sin contraseñas), `limit=10&page=2`, búsqueda por
  nombre y por email, `role=admin`, `active=false` (Aina e Iker), `archived=true` (Sara y Dani), 400 con `page=0` y con un rol que
  no existe; GET de una inactiva y de una archivada (200), de un id inexistente (404) y mal formado (400); POST correcto (201, sin
  contraseña en la respuesta), con email repetido (409), sin contraseña (422) y con una foto que no es imagen (422); PUT cambiando
  el rol, reactivando a Aina (y después su login da 200), a una archivada (404), con contraseña (422), el admin quitándose el rol
  o desactivándose (403) y editando su nombre (200); como `user`, 403 en listado, detalle y creación; sin token, 401.
- Prompt de IA usado: «Siguiente: gestión de usuarios, listado paginado, búsqueda, editar y cambiar rol. Hay que montar esta
  funcionalidad. ¿Cómo lo harías? ¿Cuál sería el plan de acción?»

### 2026-11-03 · Archivar, restaurar y eliminar para siempre

- Soft delete y hard delete, como se explicó en clase: el borrado normal es lógico (archivar) y se puede deshacer; el
  borrado físico existe, pero solo para usuarios ya archivados.
- `POST /users/:userId/archive` pone `deleted: true` y `deletedAt`, igual que hacía `deleteBook` en el seminario.
  `POST /users/:userId/restore` lo deshace (con `$unset` se quita `deletedAt`). Los dos usan `findOneAndUpdate` con
  `deleted` en el filtro, así que archivar dos veces o restaurar uno que no está archivado da 404.
- `DELETE /users/:userId` borra el documento con `deleteOne`. El service devuelve qué ha pasado (`'deleted'`,
  `'not-found'` o `'not-archived'`) y el controller elige el código: 204, 404 o 409. Se ha elegido así para que el
  service no sepa nada de HTTP, como el resto de services.
- Un admin no puede archivarse ni eliminarse a sí mismo (403, el mismo mensaje que en la edición).
- Queda apuntado en `deleteUser` que, cuando existan los votos de La Orla y los Dates, también habrá que borrar los del usuario.
- README: sección "Borrado lógico y borrado físico" con el porqué de los dos pasos. Swagger: las tres rutas y la respuesta `NotArchived`.
- Validación ejecutada: `npm run build` y `npm run lint` sin errores. Con el seed recién hecho, 18 pruebas con curl, todas correctas:
  archivar a Laia (200, con `deleted` y `deletedAt`), ya no sale en el listado y sí en `archived=true`, su login da 401, archivarla
  otra vez 404, restaurarla (200, sin `deletedAt`) y su login vuelve a dar 200, restaurar una no archivada 404, `DELETE` sin
  archivar 409, archivar y `DELETE` 204, después su GET y otro `DELETE` 404, el admin archivándose o eliminándose 403, un `user`
  haciéndolo 403 e id mal formado 400. En MongoDB quedan 13 usuarios y ninguno con el email de Laia.
- Pruebas del bloque `users`: además de las de cada tarea (6 logins del prehook, 30 de la gestión y estas 18), se repite todo
  sobre una base de datos recién sembrada y sale igual.
- Prompt de IA usado: «Ahora archivar, restaurar y eliminar para siempre usuarios. ¿Cómo lo harías? Y recuérdame cómo era esto del
  soft delete y el hard delete [...] Dame el plan de acción.»

### 2026-11-03 · Filtro por titulación en el listado de usuarios

- Al montar la lista de usuarios del backoffice (frontend) propusimos filtrar por rol, estado, archivados y titulación, y el
  último no existía en la API. Se vuelve a la rama `users` y se añade `degree` a `GET /users`: Joi lo valida (texto de 100
  caracteres como mucho) y el service lo añade al filtro solo si viene. Tiene que coincidir entera, porque en el frontend se
  elige de una lista.
- Contrato, Swagger y README al día.
- Validación ejecutada: `npm run build` y `npm run lint`; con curl, `degree=Grau en Enginyeria Aeroespacial` devuelve solo los
  de Aeroespacial y combinado con `active=true` sigue funcionando.
- Prompt de IA usado: «Empezamos por la lista de usuarios paginada con búsqueda y filtros [...] quiero 10 usuarios por página y
  algunos filtros, los más típicos. ¿Qué filtros me sugieres?» (conversación del frontend).

### 2026-11-03 · Un usuario desactivado deja de poder usar la API al momento

- Al hacer el formulario de usuario (frontend) salió el problema: "si un usuario no está activo, no puede usar la API". El prehook solo
  actuaba en el login y en el refresh; un usuario con sesión al que el admin desactivaba seguía usando la API con su access token hasta
  que caducaba (15 minutos como mucho), que es justo el límite que se había dejado documentado. Se vuelve a la rama `users` para
  arreglarlo.
- `VerifyToken` pasa a ser `async` y, después de verificar el token, busca al usuario con `UserService.getUserById`. Como pasa por el
  prehook, no encuentra a los inactivos ni a los archivados: en ese caso responde 401 "Tu cuenta no está activa". El interceptor del
  frontend, con un 401 que no es de token caducado, ya cerraba la sesión y llevaba al login, así que allí no hay que tocar nada.
- Decisión: el rol sigue saliendo del token (es lo que pide el enunciado: el rol en el payload del JWT); solo se mira en la base de datos
  si la cuenta sigue activa.
- Validación ejecutada: `npm run build` y `npm run lint`; con curl, Laia con su token: `/users/me` 200; el admin la desactiva y con el
  mismo token responde 401 "Tu cuenta no está activa"; reactivada, 200 otra vez; archivada, 401; las rutas del admin siguen dando 200 y
  sin token 401.
- Prompt de IA usado: «Lo de activo es importante, porque todo lo que venga después tiene que saber si un usuario está activo o no: si
  no lo está, no puede usar la API.» (conversación del formulario de usuario, en el frontend).

### 2026-11-03 · Modelo Grade (La Orla) con sus rutas de admin

- Qué es un voto, según el blog: en La Orla cada estudiante ve perfiles (el "Expediente") y a cada uno le pone A+ (aprobado) o F
  (suspenso). Si dos se ponen A+ mutuamente se abre un Date (rama `dates`). Atributos: `from` (quien vota), `to` (a quien), `value`
  (`'A+'` o `'F'`, en `GRADE_VALUES`) y las fechas de `timestamps`. No hace falta nada más para el mínimo 1; lo del límite de 30 A+ al día y
  los 10 segundos para deshacer es de la app, no del backoffice.
- `from` y `to` son referencias a `User` (como los autores de un libro en el seminario). Índice único `{ from, to }`: un usuario solo vota una
  vez a cada perfil y el 409 sale solo del `ErrorHandler`.
- Cuidado encontrado con el prehook de usuarios: el `populate` de `from` y `to` también es una consulta a `User`, así que un usuario inactivo
  salía como `null`. Se hace el `populate` con `options: { withInactive: true }` y solo con `name`, `email` y `photo`.
- `createGrade` comprueba antes que no sea un voto a uno mismo y que los dos usuarios existan, y devuelve `{ error }` o `{ grade }` para que el
  controller elija 422, 404 o 201.
- Rutas de admin en `routes/Grade.ts` con su Swagger: listado paginado (filtros `value` y `user`, validados con `ValidateGradeList`), ver,
  crear, cambiar la nota y eliminar (borrado físico: un voto no se archiva).
- Al eliminar un usuario para siempre se borran también sus votos (en `UserService.deleteUser`), para que no queden votos de alguien que ya no
  existe.
- Seed: 25 votos entre usuarios activos, con 4 parejas de A+ mutuo (Laia y Pau, Nerea y Marc, Hugo y Júlia, Usuario y Oriol) para los Dates.
  Igual que los libros del seminario, cada voto se escribe con los emails y el script los cambia por ids.
- Validación ejecutada: `npm run build` y `npm run lint` sin errores; `npm run seed -- --reset` crea 14 usuarios y 25 votos. Con la API, 19
  pruebas con curl, todas correctas: listado (25 en 5 páginas, con nombres poblados), `value=A+` (16), `user` (los 7 de Laia), 400 con una nota
  o un id no válidos; GET de uno (200) y de uno inexistente (404); POST de una usuaria inactiva (201 y su nombre no sale `null`), pareja
  repetida (409), voto a sí misma (422), `from` inexistente (404 con su mensaje) y nota no válida (422); PUT a F (200) y con `from` en el body
  (422); DELETE (204) y otra vez (404); como `user` 403 y sin token 401. Además, eliminar para siempre a una usuaria archivada con un voto deja
  0 votos suyos en MongoDB.
- Prompt de IA usado: «Montamos lo mismo con el modelo Grade, el de La Orla. ¿Qué atributos necesita este modelo para lo que queremos montar
  en Studate? Dame el plan de acción.»

### 2026-11-03 · Modelo Date (citas) con sus rutas

- Qué es un Date, según el blog: si dos usuarios se aprueban mutuamente en La Orla se abre un Date; un sorteo decide quién escribe
  primero; hay 24 horas y una prórroga; y bandejas "Pendientes" y "En curso". Atributos: `users` (los dos, referencias a `User`),
  `status` (`pending`, `ongoing` o `closed`, en `DATE_STATUSES`), `firstTurn` (el sorteado), `expiresAt` y `extended` (la prórroga),
  más las fechas de `timestamps`.
- Problema de nombres: un modelo llamado `Date` tapa la clase `Date` de JavaScript en el fichero que lo importa (`new Date()` dejaría de
  funcionar). El modelo de Mongoose se llama `'Date'` (colección `dates`), pero en el código se importa como `DateModel`, con las
  interfaces `IDate` e `IDateModel`. Está explicado arriba del modelo.
- El "match": `openDateIfMutual(from, to)` en `DateService` busca el A+ contrario y, si existe y no hay ya un Date entre los dos, lo abre.
  La llama `GradeService` al crear un A+ y al cambiar un voto a A+. Cambiar un A+ a F no cierra el Date que ya estuviera abierto.
- `createDate` comprueba que los dos usuarios existen y que no hay ya un Date entre ellos (`users: { $all: [a, b] }`, sin importar el
  orden), sortea `firstTurn` con `Math.random()` y pone `expiresAt` a 24 horas (`DATE_DURATION_MS`). La prórroga suma 24 horas y solo se
  puede usar una vez (409).
- Decisión (del mockup): los Dates no son solo del backoffice. Cualquier usuario con sesión ve, cambia de bandeja, prorroga y abre **sus**
  Dates; el admin, todos. Lo hace el service con un filtro según `req.user` (`visibleTo`): un Date de otros le da 404 al usuario, para no
  revelar que existe. Un usuario normal solo puede abrir Dates en los que está él (403). Eliminar es solo del admin (`RequireRole`).
- Como en los votos, el `populate` de `users` lleva `withInactive` para que un usuario inactivo no salga `null`.
- Al eliminar un usuario para siempre se borran también sus Dates.
- Seed: los Dates salen de los votos con la misma regla que la API (`openDateIfMutual` por cada A+): 4 Dates, de los que uno pasa a "En
  curso" (con la prórroga usada) y otro a "Cerrado" (ya caducado), para que haya de todo. El `--reset` borra también los Dates.
- Validación ejecutada: `npm run build` y `npm run lint` sin errores; seed con 14 usuarios, 25 votos y 4 Dates. Con la API, 27 pruebas con curl:
  como admin, listado (4, con nombres), `status=pending` (2), `user` (1) y 400 con un estado que no existe; como `user`, solo ve el suyo (y el
  filtro `user` no le deja ver otros), GET y PUT de uno ajeno 404, de uno suyo 200, estado no válido 422, prórroga (200, exactamente 24 horas
  más) y otra vez 409, abrir un Date con Clara 201 y entre otros dos 403, `DELETE` 403; como admin, pareja repetida en otro orden 409, usuario
  inexistente 404, un solo usuario o el mismo dos veces 422, `DELETE` 204 y otra vez 404; sin token 401. Una prueba del match estaba mal
  planteada (Clara ya había votado a Hugo en el seed: el POST daba 409, que es lo correcto); se repite cambiando los dos votos a A+ y el
  Date se abre al formarse el A+ mutuo, y volver a poner A+ no abre un segundo Date. Eliminar a Laia (archivada) borra su Date.
- Prompt de IA usado: «Igual con el modelo Date, el de las citas. ¿Qué atributos necesita para lo que queremos en Studate? Dame el plan de acción.»

### 2026-11-03 · Con quién se puede abrir un Date

- Al hacer las pantallas de Dates (frontend) salió que un usuario normal no tiene de dónde sacar la lista de personas para "Nuevo Date": `GET /users`
  es solo del admin. Se añade `GET /users/directory` para cualquier usuario con sesión: los demás usuarios de rol `user` activos (el prehook ya quita
  a los inactivos y archivados), ordenados por nombre y solo con `name`, `degree` y `photo`, que es lo que se ve de alguien en la app (nada de email
  ni de rol). Va antes que `/:userId` en el router.
- Validación ejecutada: `npm run build` y `npm run lint`; con curl, como `user@example.com` devuelve 8 usuarios: sin él mismo, sin el admin, sin los
  inactivos y sin los archivados, y sin email; sin token, 401.
- Prompt de IA usado: «Las pantallas de Dates, igual que las de La Orla: primero el mockup para verlo, y responsive desde el principio [...]»
  (conversación del frontend).

### 2026-11-03 · Mensaje claro al repetir un voto de La Orla

- Al repasar Swagger salió que el 409 de un voto repetido decía `"from ya existe"`: lo construía el `ErrorHandler` con el primer campo del
  índice único `{ from, to }`. En el frontend se habría visto tal cual al cargar un voto repetido.
- `GradeService.createGrade` comprueba antes de guardar si la pareja ya tiene voto y devuelve `{ error: 'already-voted' }`; el controller
  responde 409 "Este usuario ya ha votado ese perfil", igual que hacen los Dates con su 409. El índice único se queda como red de seguridad.
- Validación ejecutada: `npm run build` y `npm run lint`; con curl, repetir el voto más reciente responde 409 con el mensaje nuevo (antes,
  "from ya existe").
- Prompt de IA usado: «Toca montar la documentación de la API en Swagger. Ya has visto cómo lo hacemos: Joi conectado con Swagger.
  Simplemente sería ampliarlo con todo lo nuevo.» (salió durante el repaso).

### 2026-11-03 · Repaso de la documentación de Swagger

- Cada ruta se documentó al crearla, con `@openapi` encima y los esquemas del body sacados de Joi con `joi-to-swagger`. En esta tarea se
  compara el documento generado (`/api-docs`) con las rutas reales: están las 25 rutas, con su etiqueta (Health, Auth, Users, Grades y
  Dates), y solo `/auth/*` y `/ping` van sin candado.
- Se revisa, ruta por ruta, que los códigos documentados sean los que responde cada controller. Arreglado:
  - El 401 (`Unauthorized`) ahora dice que también sale cuando la cuenta ya no está activa ("Tu cuenta no está activa"), y el login avisa de
    que un usuario inactivo o archivado recibe 401.
  - `POST /grades` 409, `POST /dates` 409 y `POST /dates` 403 usaban las respuestas genéricas (con el ejemplo "email ya existe" o "Necesitas
    el rol admin"): ahora tienen las suyas (`GradeConflict`, `DateConflict` y `NotYourDate`) con el mensaje real. Al revisar el de los votos
    salió que el mensaje real era "from ya existe", y se arregló en el backend (entrada anterior).
  - `DELETE /users/:userId` dice que borra también los votos y los Dates del usuario, y el tag Users menciona `/users/directory`.
- README: cómo se ha probado la API y qué tiene cada respuesta de error de Swagger.
- Pruebas de la API: no hay tests automáticos en el backend. Al cerrar cada rama se han hecho las pruebas con curl contra la API y el seed
  recién hecho, y están en la bitácora: 8 de la limpieza, 6 del prehook, 30 de la gestión de usuarios, 18 del archivado, 19 de La Orla y 27 de
  los Dates (más la del match repetida), además de las de cada arreglo. Se marca la tarea con eso; los tests automáticos quedan como mejora
  para el Sprint 2.
- Validación ejecutada: `npm run build` y `npm run lint` sin errores; el documento de Swagger generado tiene las 25 rutas y los esquemas User,
  Grade, Date y sus Input; la página `/api-docs` carga con las 5 etiquetas, las 25 rutas con su candado (o sin él en `/auth/*` y `/ping`) y
  los esquemas. Las llamadas se han probado con curl, no desde los botones de la página.
- Prompt de IA usado: «Toca montar la documentación de la API en Swagger. Ya has visto cómo lo hacemos: Joi conectado con Swagger.
  Simplemente sería ampliarlo con todo lo nuevo.»
