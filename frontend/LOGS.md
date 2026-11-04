# LOGS

Bitácora del frontend de Studate. Tiene dos partes:

- **Tareas**: lo que hay que hacer en este repositorio en el sprint, agrupado por ramas. Quien cierra
  una tarea la marca.
- **Bitácora**: lo que se ha hecho, las decisiones tomadas y qué prompts de IA se han usado.

Las tareas del backend, las de estructura y las de Scrum están en el LOGS.md de
[STUDUDATE---BACKEND](https://github.com/mariacazorla/STUDUDATE---BACKEND).

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
- [x] Quitar autores, libros y chat del frontend · Miguel Ángel

#### Backoffice (`backoffice`)

- [x] Lista de usuarios paginada con búsqueda y filtros · Miguel Ángel
- [x] Formulario de usuario: crear, editar, rol y activo · Miguel Ángel
- [x] Archivar, restaurar y eliminar desde el backoffice · Miguel Ángel
- [x] Acceso solo para admin (login y guards) · Miguel Ángel
- [x] Tests del frontend (dentro de cada rama) · Miguel Ángel
- [x] README del frontend (al cerrar cada rama) · Miguel Ángel

#### La Orla (`grades`)

- [x] Pantallas de Grade · María

#### Dates (`dates`)

- [x] Pantallas de Date · María

## Bitácora

La bitácora del Seminario 7, de donde viene este código, se conserva en el tag `seminari7-base`
(`git show seminari7-base:LOGS.md`).

### 2026-11-03 · Punto de partida y `structure`

- El repositorio nace como copia del frontend del ejercicio del Seminario 7. Antes de tocar nada se guarda
  ese código en el tag `seminari7-base`.
- Identidad: el paquete pasa a llamarse `studate-frontend`, la pestaña del navegador dice "Studate", el
  README cuenta qué es Studate y enlaza a los repos nuevos, y GUIA.md avisa de que sus ejemplos son del
  seminario (siguen en el tag).
- Este LOGS.md empieza de cero con las tareas del Sprint 1. Del contrato del seminario solo se queda la
  autenticación, que no cambia.
- Prompt de IA usado: «Lo mismo que en el backend: esto es el frontend del seminario 7 copiado tal cual. Hay
  que limpiarlo para Studate [...] Dime el plan de acción de cómo lo harías.» (conversación completa en
  `prompts/sprint-1.md`, fuera del repositorio).

### 2026-11-03 · Limpieza: fuera autores, libros y chat

- Se borran los componentes `authors-list`, `author-card`, `author-form`, `books-list`, `book-form` y `chat`,
  los services de autores, libros y chat (con sus tests), los modelos `author.model.ts` y `book.model.ts` y el
  pipe `languageName`. Se desinstala `socket.io-client` y desaparece `socketUrl` de `environment.ts`.
- Se quedan, porque los vamos a usar en las pantallas de usuarios: `pagination`, `confirm-modal`,
  `view-toggle`, el pipe `truncate` y las utilidades de `utils/`. Login, registro, interceptor y guards no cambian.
- Rutas: solo inicio, login y registro (las de Studate llegan en sus ramas). El navbar ya no tiene enlaces de
  backoffice ni de chat y la marca dice "Studate". La página de inicio saluda y explica lo que vendrá.
- Los tests que usaban `/books` o `/authors` como URL de ejemplo (login, guard e interceptor) pasan a usar
  `/users`; el test de `app` que comprobaba los enlaces del backoffice y del chat se cambia por uno que
  comprueba que con sesión ya no salen login y registro.
- README: fuera la sección del chat, las pantallas, ficheros y dependencias que ya no existen.
- Validación ejecutada: `npm run build`, `npm run lint` y `npm test -- --watch=false` en verde: 7 ficheros y 28
  tests (en el seminario eran 65; los que faltan eran de autores, libros y chat). Con la API y `ng serve`
  arrancados, en el navegador: el login de `admin@example.com` lleva a la página de inicio con el saludo; el único
  error de consola es el 401 de `/auth/refresh` al abrir la app sin sesión, que es lo esperado.
- Prompt de IA usado: el mismo de la limpieza del repositorio (ver la entrada anterior).

### 2026-11-03 · Lista de usuarios paginada con búsqueda y filtros

- Antes de empezar se revisa cómo pagina el backend (`skip` y `limit` con `countDocuments`, respuesta `{ users, total, page, pages }`)
  y se copia el contrato de la gestión de usuarios a este LOGS.md.
- Pantalla `/users` (`components/users-list`), solo para admin (`authGuard` + `adminGuard`), con el mismo patrón que la lista de libros
  del seminario: un `Subject` con `switchMap` pide cada página a la API y cancela la anterior si llega otra (por ejemplo, al escribir en
  el buscador), y el componente `app-pagination` se reutiliza tal cual.
- 10 usuarios por página. Filtros: buscador (nombre o email), rol, estado (activos o inactivos), titulación y "Ver archivados".
  Al cambiar un filtro se vuelve a la página 1. El de titulación no existía en la API: se añadió en la rama `users` del backend.
- `UserService.getUsers` solo envía los filtros que tienen valor (con `HttpParams`). El modelo `User` gana los campos del perfil y del
  estado, y hay una lista `DEGREES` con las titulaciones de la EETAC para el filtro (y luego el formulario).
- Componente nuevo `app-avatar`: la foto de perfil recortada en un círculo (`object-fit: cover`) o, si no hay foto, las iniciales sobre
  un color que sale del nombre. Se usará en todas las listas.
- `styles.css`: pastillas de estado (`.pill`) y tablas con la clase `stack`, que en el móvil se ven como tarjetas.
- Navbar: enlace "Usuarios" solo para admin; la página de inicio tiene un botón "Gestionar usuarios".
- Tests nuevos: `user.service.spec.ts` (que no se envían los filtros vacíos y sí los que tienen valor) y `users-list.spec.ts` (pinta una
  fila por usuario con su estado, pide la página elegida y vuelve a la 1 con los filtros). El de `app` comprueba que el admin ve
  "Usuarios" y un `user` no.
- Validación ejecutada: `npm run build`, `npm run lint` y `npm test -- --watch=false` en verde (9 ficheros, 34 tests). En el navegador con la
  API y el seed: como admin, 12 usuarios en 2 páginas, los inactivos en gris, y "Ver archivados" enseña a Sara y Dani.
- Prompt de IA usado: «Empezamos por la lista de usuarios paginada con búsqueda y filtros. Primero quiero ver cómo está montada la
  paginación en el backend [...] quiero 10 usuarios por página y algunos filtros, los más típicos. ¿Qué filtros me sugieres?»

### 2026-11-03 · Formulario de usuario: crear, editar, rol y activo

- Pantallas `/users/new` y `/users/:id/edit` (`components/user-form`), solo para admin, con la forma del formulario de autores del
  seminario: formulario reactivo con validadores, `removeEmpty` antes de enviar, modo crear o editar según haya `:id` y los errores de la
  API con `apiErrorMessage`.
- Es como el registro, pero el admin elige el rol, si el usuario está activo y el perfil (titulación de la lista `DEGREES`, qué busco, bio
  con contador de 500, fecha de nacimiento y foto). La contraseña y su repetición (validador `passwordMatch`) solo se piden al crear;
  desde el backoffice no se cambia la contraseña de nadie.
- Foto de perfil: se elige un PNG o JPG y `utils/image-to-data-url.ts` lo recorta en un cuadrado de 256 x 256 en un `<canvas>` y lo pasa a
  JPG en base64. Una foto del móvil de varios MB se queda en pocos KB (la de la prueba, 3747 caracteres). Se enseña ya recortada en el
  círculo de `app-avatar` antes de guardar, y "Quitar foto" envía `photo: ''`.
- Si el admin se edita a sí mismo, el rol y el activo salen deshabilitados con un aviso; además no se envían (la API respondería 403).
- La lista tiene ahora "Nuevo usuario" y un botón "Editar" en cada fila (no en los archivados: hay que restaurarlos antes).
- Problema encontrado: un usuario desactivado seguía pudiendo usar la API con su token hasta que caducaba. Se arregla en el backend
  (`VerifyToken` comprueba que la cuenta sigue activa y responde 401); aquí no hay que tocar nada, porque el interceptor ya cierra la
  sesión con ese 401.
- Tests nuevos en `user-form.spec.ts`: al crear pide contraseña y que coincida, al crear envía el rol y el activo, al editar no pide
  contraseña y hace un PUT sin ella, con el propio usuario el rol y el activo están bloqueados, y quitar la foto envía `photo: ''`.
- Validación ejecutada: `npm run build`, `npm run lint` y `npm test -- --watch=false` en verde (10 ficheros, 39 tests). En el navegador: se crea
  "Paula Ruiz" con titulación, qué busco y una foto PNG; la foto se ve recortada antes de guardar, el usuario sale en la lista y en MongoDB
  la foto está guardada como JPG en base64.
- Prompt de IA usado: «Ahora el formulario de usuario: crear, editar, rol y activo. Es básicamente el register que ya tenemos, pero hecho
  bien y adaptado a los roles. Lo de activo es importante [...] Dame el plan de acción.»

### 2026-11-03 · Archivar, restaurar y eliminar desde el backoffice

- Soft delete primero: en la lista normal cada usuario tiene "Archivar", que abre el `confirm-modal` del seminario ("no podrá
  iniciar sesión; podrás restaurarlo desde Ver archivados"). En "Ver archivados" salen "Restaurar" (sin modal: no se pierde nada) y
  "Eliminar para siempre" (hard delete), con el modal "¿Estás seguro de que quieres eliminar este usuario?" que avisa de que no se puede
  deshacer.
- Un solo modal para las dos acciones: la signal `pending` guarda el usuario y la acción, y los textos del modal son `computed` que
  cambian según la acción.
- En la fila del admin con sesión no sale "Archivar" (la API respondería 403). Si la API responde 409 o 403, se enseña su mensaje.
- Después de cada acción se recarga la página actual; si el usuario era el último de su página, se pasa a la anterior, como hacía la
  lista de libros del seminario.
- `UserService`: `archiveUser` y `restoreUser` (POST) y `deleteUser` (DELETE).
- Arreglo: el test del formulario navegaba a `/users` sin que el router de prueba tuviera esa ruta y Vitest avisaba de 3 errores no
  controlados (aunque los tests pasaban). Se le da una ruta vacía `users` y desaparecen.
- Tests nuevos: los tres métodos del service; en la lista, archivar después de confirmar recarga la página, en archivados salen
  "Restaurar" y "Eliminar para siempre" y el modal de eliminar avisa, y en la fila propia solo sale "Editar".
- Validación ejecutada: `npm run build`, `npm run lint` y `npm test -- --watch=false` en verde y sin avisos (10 ficheros, 43 tests). En el
  navegador con el seed recién hecho: archivar a Clara con el modal, verla en archivados, eliminarla para siempre con el modal de "¿Estás
  seguro?" (en MongoDB ya no está) y restaurar a Sara (en MongoDB vuelve a `deleted: false`).
- Prompt de IA usado: «Ahora archivar, restaurar y eliminar desde el backoffice [...] Cuando quiera eliminar para siempre, que me salga un
  modal de "¿Estás seguro de que quieres eliminar esto?" y, si le doy, se elimina. ¿Cómo lo harías? Plan de acción.»

### 2026-11-03 · Backoffice solo para admin y adaptado a Studate

- Con la zona de usuarios hecha, se repasa el backoffice entero para que solo lo use un admin: todas sus rutas (`/users`, `/users/new`,
  `/users/:id/edit`) llevan `authGuard` y `adminGuard`, y en la barra de arriba sus enlaces van detrás de la etiqueta "Backoffice", que un
  `user` no ve. El registro se queda: es por donde entra la gente normal; el backoffice es una zona aparte dentro de la misma app.
- Después del login, un admin va directo a `/users` y un `user` a la página de inicio, que le explica que el backoffice es solo para
  administradores. Con `returnUrl` se respeta a dónde iba.
- Aspecto de Studate (el del mockup), sin cambiar la estructura del seminario: la paleta en variables de `styles.css` (el índigo un poco más
  vivo, el coral de la marca y grises con un toque de azul), barra oscura con "Stu**date**" y la página actual subrayada en coral, radios de 8
  px y un contorno visible al moverse con el teclado.
- Móvil: la barra hace salto de línea y la sesión baja a su propia fila; en la lista de usuarios cada filtro ocupa toda la fila. Problema
  encontrado al probarlo con el ancho de un móvil: el select de titulaciones era más ancho que la pantalla y salía scroll horizontal; se
  limita su ancho.
- Tests: el de login comprueba que un admin va a `/users` y uno nuevo que un `user` va al inicio. Los specs dejan de usar la contraseña del
  seminario (`seminari7`) y usan la del seed nuevo.
- README: usuarios de ejemplo, pantallas del backoffice, estructura del proyecto (componentes, service y utilidad nuevos), qué protege cada
  guard y las reglas de la API que hay que saber (archivado, eliminar y foto).
- Pruebas del bloque `backoffice`: `npm run build`, `npm run lint` y `npm test -- --watch=false` en verde (10 ficheros, 44 tests). En el
  navegador, con el seed recién hecho: login de admin (va a Usuarios), lista con filtros y archivados, crear un usuario con foto, archivar,
  eliminar para siempre con el modal, restaurar, y la misma lista con 390 px de ancho (tarjetas, sin scroll horizontal).
- Prompt de IA usado: «Ahora que ya tenemos la zona de usuarios, esto lo tienen que administrar los administradores. Hay que rehacer el
  backoffice bien hecho: login y guards solo para admin, y adaptarlo a los modelos nuevos. Plan de acción.»

### 2026-11-03 · Pantallas de La Orla (Grade)

- El mockup de la pantalla ya estaba hecho y validado (la pantalla "La Orla" del artifact del backoffice): se implementa tal cual.
- `/grades` (`components/grades-list`), solo admin: tabla con quién vota y a quién (con `app-avatar`), la nota (A+ en verde, F en rojo, con
  class binding), la fecha (pipe `date`) y las acciones "Cambiar a F/A+" (PUT, sin confirmación porque se puede volver a cambiar) y
  "Eliminar" (con `confirm-modal`). Filtros por nota y por usuario, 10 por página, mismo patrón `Subject` + `switchMap` que los usuarios.
- `/grades/new` (`components/grade-form`): quién vota, a quién y la nota. En los selects solo salen los usuarios activos de rol `user`, y
  un validador de grupo (`differentUsersValidator`, como `passwordMatch`) no deja votarse a uno mismo. Un 409 (pareja repetida) enseña el
  mensaje de la API.
- Responsive desde el principio: la tabla lleva la clase `stack` y en el móvil cada voto es una tarjeta; los filtros ocupan toda la fila.
- El bloque `.person` (foto, nombre y email) se usaba ya en dos pantallas: pasa de los `.css` de cada componente a `styles.css`.
- `grade.model.ts` y `GradeService` (`getGrades`, `createGrade`, `updateGrade` y `deleteGrade`). Contrato de Grade copiado del backend.
- Navbar: "La Orla" en la zona del backoffice; la página de inicio del admin tiene el acceso.
- Tests nuevos: service (filtros, crear, cambiar nota y eliminar), lista (pinta el voto, cambia A+ a F y recarga, filtra por nota desde la
  página 1 y elimina tras confirmar) y formulario (no deja votarse a sí mismo, pide solo usuarios activos de rol user y envía el voto).
- Validación ejecutada: `npm run build`, `npm run lint` y `npm test -- --watch=false` en verde (13 ficheros, 52 tests). En el navegador: la
  lista con los 25 votos del seed en 3 páginas; en el formulario, el aviso al elegir el mismo usuario en los dos lados y un voto nuevo de
  Clara a Pau que aparece el primero; y la misma lista con 390 px de ancho (tarjetas).
- Prompt de IA usado: «Ahora las pantallas de La Orla (Grade). Antes de programar, hazme un mockup para ver cómo quedaría esta pantalla.» y
  «Y si luego hay que usarlo desde el teléfono, que esta pantalla sea responsive, que se vea bien en el móvil.»

### 2026-11-03 · Pantallas de Date

- Como en La Orla, el mockup ya estaba validado (pantalla "Dates" del artifact, con la vista del admin y la de "Mis Dates" del usuario) y se
  hace responsive desde el principio (tabla `stack`).
- `/dates` (`components/dates-list`) es la pantalla de entrada para todos después del login: la ruta `''` redirige allí y desaparece la página
  de inicio, que ya no tenía uso. Pestañas con las bandejas del blog (Pendientes, la de entrada, En curso, Cerrados y Todos), estado con un
  select que cambia de bandeja, caducidad (pipe `date`, con "caducado" si ya pasó), prórroga (+24 h, el botón se deshabilita cuando se usa y
  un 409 enseña el mensaje de la API) y paginación.
- Lo que se ve depende del rol (la API ya filtra por el token):
  - El admin ve "Dates": las dos personas de cada pareja, en negrita la que escribe primero, filtro por usuario y "Eliminar" con el modal.
  - Un usuario ve "Mis Dates": "Con" (la otra persona), "Empieza" ("Tú" o su nombre) y sin eliminar.
- `/dates/new` (`components/date-form`): el admin elige a los dos usuarios (validador de grupo para que no sean el mismo); un usuario normal
  elige solo "con quién", y él es el otro. Para la lista, el usuario normal no puede usar `GET /users` (es del backoffice): se añadió
  `GET /users/directory` en el backend (rama `dates`).
- El modelo se llama `StudateDate` y no `Date`: con `Date` como interfaz, `new Date()` dejaría de ser una fecha en los componentes que la usan
  (en `dates-list` se usa para saber si un Date ha caducado). En el backend pasa lo mismo con `DateModel`.
- Navbar: "Dates" para cualquiera con sesión, delante de la zona del backoffice. Después del login todos van a `/dates`. La ayuda del formulario
  de votos ("si los dos se han dado A+, se abre un Date") se añade ahora, que ya es verdad.
- Tests nuevos: service (filtro de estado, abrir, cambiar estado, prórroga y eliminar), lista (un `user` ve con quién y quién empieza y no tiene
  "Eliminar"; el admin ve a los dos y "Eliminar"; cambiar de pestaña pide desde la página 1; el 409 de la prórroga enseña el mensaje) y formulario
  (el `user` usa el directorio y es uno de los dos; el admin no puede elegir dos veces al mismo). Se actualizan los de login y app.
- Validación ejecutada: `npm run build`, `npm run lint` y `npm test -- --watch=false` en verde (16 ficheros, 60 tests). En el navegador: con una
  sesión abierta de antes del seed, la API responde 401 y la app lleva al login (el arreglo de usuarios inactivos funcionando); como `user`, solo su
  Date con Oriol ("Empieza: Tú"), la prórroga suma 24 horas y se deshabilita, abre un Date con Laia y `/users` lo devuelve a Dates; como admin,
  los 5 Dates con las dos personas, "caducado" en el cerrado y el filtro por usuario; y con 390 px de ancho, tarjetas.
- Prompt de IA usado: «Las pantallas de Dates, igual que las de La Orla: primero el mockup para verlo, y responsive desde el principio para que se
  vea en el móvil.»

### 2026-11-03 · README final y contrato al día

- Repaso final del README contra el código: la introducción explica las dos zonas de la app (Dates para todos y el backoffice solo para el
  admin), y los scripts dicen cuántos tests hay. Las pantallas, la estructura del proyecto y la autenticación ya se habían ido poniendo al día
  al cerrar cada rama; se comprueba que coinciden con `app.routes.ts` y con `src/app/`.
- Contrato copiado otra vez del backend: el 409 de un voto repetido ahora trae el mensaje "Este usuario ya ha votado ese perfil" (antes
  "from ya existe"), que es el que enseña el formulario de nuevo voto.
- Validación ejecutada: `npm run build`, `npm run lint` y `npm test -- --watch=false` en verde (16 ficheros, 60 tests); con la API, el formulario de
  nuevo voto con una pareja repetida enseña el mensaje nuevo.
- Prompt de IA usado: el README va "al final de cada rama, como continuación"; esta es la del cierre del sprint.
