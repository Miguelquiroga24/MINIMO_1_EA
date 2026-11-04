# Studate: frontend

Frontend en Angular de [Studate](https://studateapp.blogspot.com/), la app para conocer a gente de tu
propia universidad. Es el proyecto del Grupo 3 de EA (María Cazorla, Diego Soledispa y Miguel Ángel
Quiroga).

En el Sprint 1 (el mínimo 1) el objetivo es el **backoffice**: la zona de administración, en la que solo
entra un `admin`, para gestionar los usuarios y sus roles y los votos de La Orla. La app tiene dos zonas:

- **Dates**: la pantalla de entrada para cualquier usuario con sesión. Cada uno ve y gestiona sus Dates
  (las citas que se abren cuando dos usuarios se dan A+); el admin ve todos.
- **Backoffice** (Usuarios y La Orla): solo para `admin`.

El proyecto parte del ejercicio del Seminario 7 (login con JWT, refresh token en cookie HttpOnly,
interceptor, guards y paginación del servidor), que se guarda tal cual en el tag `seminari7-base`.

Consume la API de [STUDUDATE---BACKEND](https://github.com/mariacazorla/STUDUDATE---BACKEND).

Cómo funciona Angular por dentro (componentes, servicios, signals, routing, formularios...):
[GUIA.md](GUIA.md). Las tareas del sprint y la bitácora: [LOGS.md](LOGS.md). Cómo trabajamos (ramas,
commits, pull requests): [CONTRIBUTING.md](CONTRIBUTING.md). El tablero del sprint es el
[GitHub Project de Studate](https://github.com/users/mariacazorla/projects/2).

## Stack tecnológico

Lo que ya está instalado y funcionando:

| Tecnología | Versión | Para qué se usa |
|---|---|---|
| [Angular](https://angular.dev/) | 21.2 | Framework del frontend: componentes, router, formularios y cliente HTTP, todo oficial |
| [TypeScript](https://www.typescriptlang.org/) | 5.9 | JavaScript con tipos. Angular fija qué versiones admite, por eso no va en la 6.0 como el backend |
| [RxJS](https://rxjs.dev/) | 7.8 | Observables: lo que devuelve `HttpClient` y a lo que se hace `subscribe` |
| [Angular CLI](https://angular.dev/tools/cli) | 21.2 | El comando `ng`: servidor de desarrollo, build, tests, lint y generar componentes |
| [Vitest](https://vitest.dev/) | 4.1 | Ejecuta los tests (`*.spec.ts`). Es el runner por defecto de Angular desde que Karma quedó obsoleto |
| [jsdom](https://github.com/jsdom/jsdom) | 28.1 | Simula el navegador dentro de Node para que los tests puedan pintar componentes |
| [ESLint](https://eslint.org/) + [angular-eslint](https://github.com/angular-eslint/angular-eslint) | 10.12 / 21.4 | Linter: analiza el TypeScript y también las plantillas HTML, con reglas propias de Angular y de accesibilidad |
| [Prettier](https://prettier.io/) | 3.9 | Da formato al código (reglas en `.prettierrc`, con el parser de Angular para los `.html`) |

El token JWT no necesita librería: el interceptor y el guard se hacen con lo que ya trae Angular.

## Requisitos previos

- [Node.js](https://nodejs.org/) 24 LTS (mínimo 22.12, que es lo que exige Angular 21). Incluye
  [npm](https://www.npmjs.com/).
- El backend de Studate arrancado, con su MongoDB (ver abajo).
- [VS Code](https://code.visualstudio.com/) con la extensión *Angular Language Service* (recomendado) y
  [Angular DevTools](https://angular.dev/tools/devtools) en el navegador.

Angular CLI no hace falta instalarlo aparte: viene con las dependencias del proyecto (`npx ng ...`).

## Cómo arrancarlo

Hacen falta dos terminales: una para la API y otra para Angular.

**1. Backend**

Con MongoDB ya arrancado (o con la URL de Atlas puesta en el `.env`):

```
git clone https://github.com/mariacazorla/STUDUDATE---BACKEND.git
cd STUDUDATE---BACKEND
npm install
cp .env.example .env
npm run seed
npm run dev
```

La API queda en http://localhost:1337 y su documentación (Swagger) en http://localhost:1337/api-docs.
`npm run seed` mete los usuarios de ejemplo; con `npm run seed -- --reset` se vuelven a poner desde
cero.
Si ya tenías un `.env`, copia en él las variables `JWT_...` de `.env.example`.

**2. Frontend (este repo)**

```
git clone https://github.com/mariacazorla/STUDATE---FRONTEND.git
cd STUDATE---FRONTEND
npm install
npm start
```

Y se abre http://localhost:4200. La página se recarga sola cada vez que guardas un archivo.

**3. Iniciar sesión** con uno de los usuarios del seed (las contraseñas son públicas a propósito):

| Email | Contraseña | Qué ve |
|---|---|---|
| `admin@example.com` | `studate26` | Todos los Dates y el backoffice (Usuarios y La Orla) |
| `user@example.com` | `studate26` | Solo sus Dates: el backoffice es solo para administradores |
| `aina@example.com` | `studate26` | Nada: está inactiva y la API no la deja entrar |

También se puede crear una cuenta en "Registrarse". Las cuentas nuevas son siempre de rol `user`.

## Configuración: un solo fichero

El frontend no usa `.env`: lo que llega al navegador lo puede leer cualquiera, así que aquí no hay
secretos. Toda la configuración está en **un** fichero, y para cambiar la dirección de la API se toca
aquí y en ningún sitio más:

```typescript
// src/environments/environment.ts
export const environment = {
  // URL usada por las llamadas HTTP.
  apiUrl: 'http://localhost:1337',
};
```

## Scripts

| Comando | Qué hace |
|---|---|
| `npm start` | Servidor de desarrollo en http://localhost:4200. Se recarga solo al guardar |
| `npm test` | Pasa los tests con Vitest (16 ficheros, 60 tests) y se queda esperando cambios (`npm test -- --watch=false` para pasarlos una vez) |
| `npm run lint` | Pasa angular-eslint sobre los `.ts` y los `.html` de `src/` |
| `npm run build` | Compila la versión de producción en `dist/backoffice/browser` |
| `npx ng generate component components/<nombre>` | Crea un componente nuevo con el CLI del proyecto |

## Pantallas

| Ruta | Pantalla | Quién entra |
|---|---|---|
| `/login` | Iniciar sesión | Solo sin sesión |
| `/register` | Crear una cuenta | Solo sin sesión |
| `/dates` | La pantalla de entrada. Los Dates por bandejas (Pendientes, En curso, Cerrados, Todos): con quién, quién empieza, caducidad, cambiar de bandeja y prórroga. El admin ve todos (con filtro por usuario) y puede eliminar | Con sesión |
| `/dates/new` | Abrir un Date: el usuario elige con quién; el admin, a los dos | Con sesión |
| `/users` | Backoffice: lista de usuarios, 10 por página, con buscador y filtros (rol, estado, titulación y archivados). Archivar, restaurar y eliminar para siempre | Admin |
| `/users/new` | Backoffice: nuevo usuario, con rol, activo, perfil y foto | Admin |
| `/users/:id/edit` | Backoffice: editar usuario (sin contraseña) | Admin |
| `/grades` | Backoffice: La Orla, los votos (quién vota a quién, A+ o F), con filtros por nota y por usuario. Cambiar la nota y eliminar | Admin |
| `/grades/new` | Backoffice: nuevo voto | Admin |

Si se entra en una ruta sin permiso, el guard lleva al login (sin sesión) o a los Dates (un `user` que
intenta entrar en el backoffice).

## Estructura del proyecto

```
src/
  main.ts                  Punto de entrada: arranca Angular sobre <app-root> de index.html
  environments/
    environment.ts         La única configuración: la URL de la API
  app/
    app.config.ts          Providers de toda la app: router y HttpClient (con el interceptor)
    app.routes.ts          El mapa de rutas: qué URL pinta qué componente
    app.ts, app.html       Componente raíz: la barra de navegación y el <router-outlet>
    components/
      navbar/              Menú de arriba: enlaces según el rol, usuario con sesión y cerrar sesión
      login/               Iniciar sesión
      register/            Crear una cuenta
      dates-list/          Los Dates por bandejas (lo que ve cada uno depende del rol)
      date-form/           Abrir un Date
      users-list/          Backoffice: lista de usuarios con filtros, archivar, restaurar y eliminar
      user-form/           Backoffice: crear y editar usuarios (rol, activo, perfil y foto)
      grades-list/         Backoffice: La Orla, la lista de votos con filtros, cambiar la nota y eliminar
      grade-form/          Backoffice: crear un voto
      avatar/              Foto de perfil recortada en un círculo, o las iniciales si no hay foto
      pagination/          Paginación, componente hijo de las listas
      confirm-modal/       Ventana para confirmar antes de borrar
      view-toggle/         Botones para ver las listas en tabla o en tarjetas
    models/                Interfaces TypeScript con la forma de los datos de la API
      user.model.ts          User, UserRole, DEGREES, los filtros y las peticiones y respuestas de /auth y /users
      grade.model.ts         Grade, GradeValue y las peticiones y respuestas de /grades
      date.model.ts          StudateDate (no Date: taparía la clase Date de JavaScript), DateStatus y lo de /dates
    services/              Las únicas piezas que hablan con la API (HttpClient)
      auth.service.ts        register, login, refresh, restoreSession, logout; token y usuario en signals
      user.service.ts        getDirectory, getUsers, getUser, createUser, updateUser, archiveUser, restoreUser, deleteUser
      grade.service.ts       getGrades, createGrade, updateGrade, deleteGrade
      date.service.ts        getDates, createDate, updateStatus, extendDate, deleteDate
    pipes/                 Formatean datos en la plantilla
      truncate-pipe.ts       Corta textos largos con "..."
    interceptors/
      auth.interceptor.ts  Añade el token a cada petición y lo renueva si ha caducado
    guards/
      auth.guard.ts        authGuard, adminGuard y guestGuard: quién puede entrar en cada ruta
    utils/
      api-error.ts         Pasa un error de HttpClient a un texto para la pantalla
      remove-empty.ts      Quita los campos vacíos antes de enviar un formulario
      image-to-data-url.ts Reduce la foto elegida a 256 x 256 y la pasa a base64 para enviarla a la API
      password-match.ts    Validador: la contraseña y su repetición coinciden
```

Un dato viaja siempre por el mismo camino, igual que en el backend cada capa hace una sola cosa:

```
componente -> service (HttpClient) -> API -> respuesta -> subscribe -> signal -> la plantilla se repinta
```

Los componentes no saben de URLs ni de HTTP: piden los datos al service y guardan el resultado en una
signal. Tampoco saben del token: lo añade el interceptor a todas las peticiones.

## Autenticación

Cómo funciona por dentro (interceptor, guards, renovación del token) está en el
[apartado 13 de la GUIA](GUIA.md#13-autenticación-interceptor-y-guards). En resumen:

1. En el login, la API devuelve `{ token, user }` y `AuthService` lo guarda en dos signals, **solo en
   memoria**. El refresh token no llega al JSON: la API lo deja en una cookie HttpOnly que el navegador
   guarda él solo.
2. `authInterceptor` añade `Authorization: Bearer <token>` a cada petición.
3. El access token caduca a los 15 minutos. Cuando la API responde 401 con "El token ha caducado", el
   interceptor pide uno nuevo a `POST /auth/refresh` (sin body: la cookie va sola) y repite la
   petición, sin que el usuario lo note. Si la cookie también ha caducado (a los 7 días), cierra la
   sesión y lleva al login.
4. Al recargar la página el access token se ha perdido. Antes de pintar nada (`provideAppInitializer`),
   `restoreSession()` llama a `/auth/refresh` y a `GET /users/me` para recuperar la sesión; si la cookie
   no vale, la app arranca sin sesión y `authGuard` lleva al login.
5. "Cerrar sesión" llama a `POST /auth/logout`, que borra la cookie, y olvida el token de memoria.
6. Los guards deciden qué pantallas se pueden abrir según haya sesión y según el rol. El backoffice
   (todo lo que cuelga de `/users` y de `/grades`) lleva `authGuard` y `adminGuard`: solo entra un admin. En la barra
   de arriba, sus enlaces van detrás de la etiqueta "Backoffice" y un `user` no los ve. Los Dates
   (`/dates`) son para cualquier usuario con sesión y son la pantalla de entrada después del login.
7. Si un admin desactiva o archiva a alguien que tiene la sesión abierta, su siguiente petición recibe
   un 401 "Tu cuenta no está activa" y el interceptor le cierra la sesión.

### Dónde se guardan los tokens: localStorage o cookie HttpOnly

Las dos opciones que se suelen comparar:

| | localStorage | Cookie HttpOnly |
|---|---|---|
| Quién la guarda | El frontend, con JavaScript | El backend, con la cabecera `Set-Cookie` |
| Se puede leer desde JavaScript | Sí | No |
| Riesgo principal | **XSS**: si alguien consigue ejecutar un script en la página, puede leer el token y usarlo desde otro sitio | **CSRF**: el navegador envía la cookie solo, también en peticiones que provoca otra web; hay que protegerse (`SameSite`, token anti-CSRF) |
| Qué pide | Nada especial: encaja con una API que devuelve el token en el JSON | Cambiar el backend (enviar y leer cookies) y configurar CORS con `credentials` |

Al principio los tokens iban en localStorage. El problema es que un script inyectado en la página se
lleva los dos, y con el refresh token puede pedir access tokens nuevos durante 7 días. Ahora se aplica
el patrón recomendado:

- El **access token** vive solo en una signal de `AuthService`. Nunca en `localStorage` ni en
  `sessionStorage`. Dura 15 minutos y se pierde al recargar, pero se recupera con la cookie.
- El **refresh token** va en la cookie `refreshToken`, con `HttpOnly` (JavaScript no puede leerla:
  `document.cookie` no la muestra), `SameSite=Strict` (el navegador no la envía en peticiones que
  provoca otra web, que es la protección contra CSRF), `Path=/auth` (solo viaja a `/auth/refresh` y
  `/auth/logout`), la misma duración que el token y `Secure` en producción.
- Para que la cookie cruce de `localhost:4200` a `localhost:1337`, las llamadas a `/auth` llevan
  `withCredentials: true` y el backend acepta credenciales con el origen exacto del frontend.

Se puede comprobar en DevTools (F12): en Application, Local Storage no tiene ningún token; en
Application, Cookies, `refreshToken` aparece con la casilla HttpOnly marcada; y en la consola,
`document.cookie` devuelve una cadena vacía.

Los guards y el ocultar botones son solo comodidad: quien protege los datos es el backend, que
comprueba el token y el rol en cada petición. Desde las herramientas del navegador se puede saltar un
guard, pero la API seguiría respondiendo 401 o 403.

## Cosas de la API que hay que saber

- Editar es un PUT y la API pide siempre los campos obligatorios.
- Un campo opcional que se deja vacío al editar no se borra. La API rechaza los valores vacíos, así
  que el formulario no los envía (`utils/remove-empty.ts`) y la API deja el valor que tenía.
- Los mensajes de error de validación que devuelve la API (422) vienen en inglés, de Joi.
- Los usuarios no se borran de golpe: primero se archivan (borrado lógico, se pueden restaurar) y solo
  un usuario archivado se puede eliminar para siempre (borrado físico). Un admin no puede cambiarse el
  rol, desactivarse, archivarse ni eliminarse a sí mismo (403).
- Un Date se abre solo cuando dos usuarios se ponen A+ en La Orla, y también se puede abrir a mano. Un
  usuario normal solo ve y cambia sus Dates; la API filtra según el token. Para elegir "con quién" usa
  `GET /users/directory`, porque `GET /users` es del backoffice.
- La foto de perfil se guarda en el propio usuario como texto en base64. El formulario la reduce antes
  de enviarla para que no pase del límite de la API.

## Cómo contribuir

Ramas, commits y pull requests en [CONTRIBUTING.md](CONTRIBUTING.md). Tareas pendientes y bitácora en
[LOGS.md](LOGS.md).
