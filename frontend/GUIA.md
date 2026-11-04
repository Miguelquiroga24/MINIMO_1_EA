# Guía del proyecto

> Esta guía explica Angular con el código del ejercicio del Seminario 7 (autores, libros y chat), del que
> parte Studate. Ese código ya no está en el proyecto, pero sigue entero en el tag `seminari7-base`
> (`git show seminari7-base:src/app/components/books-list/books-list.ts`). Los conceptos son los mismos
> que usan las pantallas de Studate.

Aquí explicamos cómo está hecho el backoffice y dónde se ve cada punto del seminario de Angular en el
código. Para instalarlo y arrancarlo, mira el [README](README.md).

## Índice

1. [Cómo arranca la app: CSR, SSR y SPA](#1-cómo-arranca-la-app-csr-ssr-y-spa)
2. [CLI, hot reload y environments](#2-cli-hot-reload-y-environments)
3. [Componentes](#3-componentes)
4. [Servicios e inyección de dependencias](#4-servicios-e-inyección-de-dependencias)
5. [Signals](#5-signals)
6. [Data binding](#6-data-binding)
7. [Directivas y control flow](#7-directivas-y-control-flow)
8. [Pipes](#8-pipes)
9. [Routing](#9-routing)
10. [HttpClient y Observables](#10-httpclient-y-observables)
11. [Formularios](#11-formularios)
12. [Depurar con Angular DevTools](#12-depurar-con-angular-devtools)
13. [Autenticación: interceptor y guards](#13-autenticación-interceptor-y-guards)
14. [Chat con WebSockets](#14-chat-con-websockets)

---

## 1. Cómo arranca la app: CSR, SSR y SPA

### CSR (Client-Side Rendering)

El servidor solo manda un HTML casi vacío y el JavaScript de Angular pinta la página en el navegador.
Es lo que hace este proyecto. En `src/index.html` solo está la etiqueta del componente raíz:

```html
<body>
  <app-root></app-root>
</body>
```

Y `src/main.ts` arranca Angular sobre esa etiqueta:

```ts
bootstrapApplication(App, appConfig)
```

Para verlo en clase: con la app abierta, "Ver código fuente" (Ctrl+U) enseña el `<app-root>` vacío, e
"Inspeccionar" (F12) enseña la tabla ya pintada. Lo que sale en la tabla lo ha pintado Angular en el
navegador.

### SSR (Server-Side Rendering)

El HTML ya llega pintado desde el servidor, lo que va mejor para el SEO y para la primera carga. Aquí no
lo usamos, pero se añade con:

```
npx ng add @angular/ssr
```

Ese comando crea un `server.ts` (un servidor Express que renderiza la app), un `app.config.server.ts` y
añade `provideClientHydration()`, que hace que el navegador aproveche el HTML que llega del servidor en
vez de pintarlo otra vez.

### SPA (Single Page Application)

Solo hay un `index.html`. Al pasar de Autores a Libros la página no se recarga: el router cambia el
componente que se ve (ver el [apartado 9](#9-routing)).

## 2. CLI, hot reload y environments

Los comandos para instalar, arrancar y compilar están en el [README](README.md#scripts). Aquí solo tres
cosas más:

- El CLI de Angular viene en las dependencias del proyecto, así que no hace falta instalarlo global: se
  usa con `npx ng ...`. Los componentes y el pipe de este repo están creados con él, por ejemplo
  `npx ng generate component components/books-list --skip-tests`.
- Hot reload: con `npm start` arrancado, al guardar un fichero la página se actualiza sola. Se puede
  enseñar cambiando un texto de `navbar.html`.
- Environments: hay un solo fichero, `src/environments/environment.ts`, con la URL de la API. Lo usan
  los servicios (y sus tests):

  ```ts
  private baseUrl = `${environment.apiUrl}/authors`;
  ```

  Si hicieran falta valores distintos para desarrollo y producción, `npx ng generate environments` crea
  un segundo fichero (`environment.development.ts`) y configura en `angular.json` que se cambie uno por
  otro según cómo se compile (`fileReplacements`). Lo dejamos en uno para que sea más sencillo.

## 3. Componentes

Un componente es una clase con `@Component` (el .ts) más su HTML y su CSS. Cada pantalla del backoffice
es un componente (`authors-list`, `author-form`, `books-list`...). Uno de los más sencillos, y el que
mejor enseña los inputs y outputs, es la paginación:

```ts
// src/app/components/pagination/pagination.ts
@Component({
  selector: 'app-pagination',
  imports: [],
  templateUrl: './pagination.html',
  styleUrl: './pagination.css',
})
export class Pagination {
  page = input.required<number>();
  totalPages = input.required<number>();
  pageChange = output<number>();
}
```

- `selector`: la etiqueta con la que se usa (`<app-pagination>`).
- `imports`: los componentes standalone importan directamente lo que usan en su HTML, ya no hacen falta
  los `NgModule`.
- `styleUrl`: su CSS solo afecta a este componente.

La lista (padre) le pasa datos a la paginación (hijo) con `input()`, y el hijo le avisa al padre con
`output()`:

```html
<!-- src/app/components/authors-list/authors-list.html -->
<app-pagination
  [page]="currentPage()"
  [totalPages]="totalPages()"
  (pageChange)="page.set($event)"
/>
```

Es lo mismo que antes se hacía con `@Input()` y `@Output() ... = new EventEmitter()`.

Si el padre y el hijo tienen que compartir un mismo valor en los dos sentidos, se usa `model()`. Es lo que
hace el selector de lista o tarjetas (`view-toggle`): el hijo cambia el modo al pulsar un botón y el
padre se entera solo, con la misma sintaxis `[( )]` que `ngModel`:

```ts
// view-toggle.ts
mode = model<ViewMode>('list');
```

```html
<!-- authors-list.html y books-list.html -->
<app-view-toggle [(mode)]="viewMode" />
```

Cada lista guarda el modo elegido en el navegador (`localStorage`) con un `effect()`, así al volver a la
pantalla sigue igual.

Ciclo de vida: las listas y los formularios piden los datos en `ngOnInit()`, que Angular llama cuando el
componente ya está creado y tiene sus inputs:

```ts
export class AuthorsList implements OnInit {
  ngOnInit(): void {
    this.authorService.getAuthors().subscribe(/* ... */);
  }
}
```

## 4. Servicios e inyección de dependencias

Un servicio es una clase con `@Injectable` para la lógica que no es de pantalla, aquí las llamadas a la
API. Con `providedIn: 'root'` Angular crea una sola instancia (singleton) para toda la app:

```ts
// src/app/services/author.service.ts
@Injectable({ providedIn: 'root' })
export class AuthorService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/authors`;

  getAuthors(): Observable<AuthorListResponse> {
    return this.http.get<AuthorListResponse>(this.baseUrl);
  }
}
```

Los componentes lo piden con `inject()`, sin crearlo ellos:

```ts
private authorService = inject(AuthorService);
```

Antes se hacía por el constructor (`constructor(private authorService: AuthorService) {}`), que sigue
funcionando. `inject()` es la forma moderna.

## 5. Signals

Una signal es un valor que avisa cuando cambia. Angular sabe qué partes de la pantalla dependen de ella
y solo actualiza esas.

```ts
// src/app/components/authors-list/authors-list.ts
authors = signal<Author[]>([]);     // se crea con un valor inicial
this.authors.set(response.authors); // se cambia
this.authors();                     // se lee (en el HTML también: authors())
```

Con `computed()` se crean valores que se recalculan solos. La búsqueda y la paginación están hechas así,
en el navegador, porque la API no pagina:

```ts
filteredAuthors = computed(() => {
  const text = this.search().trim().toLowerCase();
  return this.authors().filter(
    (author) =>
      author.name.toLowerCase().includes(text) || author.email.toLowerCase().includes(text),
  );
});

totalPages = computed(() => Math.max(1, Math.ceil(this.filteredAuthors().length / PAGE_SIZE)));

// Si borro el último autor de la última página, así no me quedo en una página vacía
currentPage = computed(() => Math.min(this.page(), this.totalPages()));
```

Y para cambiar una lista a partir de su valor anterior está `update()`, que es lo que se usa al borrar:

```ts
this.authors.update((authors) => authors.filter((a) => a._id !== author._id));
```

Por qué aquí son obligatorias: el proyecto es zoneless, no usa `zone.js` (la librería con la que Angular
detectaba antes cualquier cambio). Ahora la pantalla se actualiza cuando cambia una signal o hay un
evento del usuario. Si guardáramos la respuesta de la API en una variable normal, la tabla no se
enteraría de que han llegado los datos.

## 6. Data binding

Los cuatro tipos, con ejemplos del proyecto:

| Tipo | Dirección | Ejemplo | Dónde |
|---|---|---|---|
| Interpolación | TS -> HTML | `{{ author.name }}` | `authors-list.html` |
| Property binding | TS -> HTML | `[disabled]="form.invalid \|\| saving()"` | `author-form.html` |
| Event binding | HTML -> TS | `(click)="deleteAuthor(author)"` | `authors-list.html` |
| Two-way binding | las dos | `[(ngModel)]="search"` | buscador de `authors-list.html` |

El two-way binding es un property binding y un event binding a la vez (`[ ]` + `( )`). En el buscador,
lo que se escribe va a la signal `search` y, si `search` cambia, el input también.

## 7. Directivas y control flow

Desde Angular 17, en vez de las directivas `*ngIf` y `*ngFor` se usa el control flow con `@`. Desde la
versión 20, `*ngIf` y `*ngFor` están marcadas como obsoletas:

```html
<!-- Antes -->
<p *ngIf="loading">Cargando...</p>
<tr *ngFor="let author of authors">...</tr>

<!-- Ahora (authors-list.html) -->
@if (loading()) {
  <p class="muted">Cargando...</p>
} @else if (!error() || authors().length > 0) {
  <table>...</table>
}

@for (author of pageAuthors(); track author._id) {
  <tr>...</tr>
} @empty {
  <tr><td class="empty" colspan="7">...</td></tr>
}
```

- `track` le dice a Angular cómo identificar cada fila, para no repintarlas todas si la lista cambia.
- `@empty` se pinta cuando la lista está vacía. En `books-list.html` también se usa dentro de una celda
  para poner "Sin autores".

Siguen existiendo las directivas de atributo, que cambian cómo se ve un elemento:

```html
<!-- ngStyle: el color de la etiqueta depende de si el autor está activo -->
<span class="status" [ngStyle]="{ 'background-color': author.active ? '#e3f4e4' : '#eceff1' }">

<!-- class binding: la fila sale en gris si el autor no está activo -->
<tr [class.inactive]="!author.active">
```

## 8. Pipes

Un pipe transforma un valor solo para mostrarlo, sin cambiar el dato. Se escribe con `|`:

| Pipe | Ejemplo | Resultado |
|---|---|---|
| `date` | `{{ author.birthDate?.slice(0, 10) \| date: 'dd/MM/yyyy' }}` | `29/09/1547` |
| `currency` | `{{ book.price \| currency: 'EUR' }}` | `€19.90` |
| `uppercase` | `{{ (author.active ? 'Activo' : 'Inactivo') \| uppercase }}` | `ACTIVO` |
| `languageName` (propio) | `{{ book.language \| languageName }}` | `Castellano` |

Los que llevan `:` reciben parámetros (el formato de la fecha, la moneda...).

El pipe propio se crea con `npx ng generate pipe pipes/language-name`:

```ts
// src/app/pipes/language-name-pipe.ts
@Pipe({
  name: 'languageName',
})
export class LanguageNamePipe implements PipeTransform {
  transform(code: string | undefined): string {
    if (!code) {
      return '';
    }
    return LANGUAGE_NAMES[code] ?? code;
  }
}
```

Curiosidad: a la fecha de nacimiento le pasamos solo el día (`slice(0, 10)`). Si se le pasa la fecha
entera con hora, el pipe la convierte a la hora local, y a Cervantes y a Borges les salía un día menos:
son fechas de antes de 1901, cuando España tenía otra hora oficial.

## 9. Routing

Las rutas están en `src/app/app.routes.ts`. Cada URL tiene su componente:

```ts
export const routes: Routes = [
  { path: '', redirectTo: 'authors', pathMatch: 'full' },
  { path: 'authors', component: AuthorsList, title: 'Autores' },
  { path: 'authors/new', component: AuthorForm, title: 'Nuevo autor' },
  { path: 'authors/:id/edit', component: AuthorForm, title: 'Editar autor' },
  { path: 'books', component: BooksList, title: 'Libros' },
  // ...
  { path: '**', redirectTo: 'authors' },
];
```

- `<router-outlet />` (en `app.html`) es el hueco donde se pinta el componente de la ruta actual.
- `routerLink` navega sin recargar y `routerLinkActive` marca el enlace de la página actual (en
  `navbar.html`).
- `title` cambia el título de la pestaña del navegador.
- Desde el código se navega con el `Router`. Al guardar un formulario se vuelve a la lista con
  `this.router.navigate(['/authors'], { replaceUrl: true })`. El `replaceUrl` hace que el botón Atrás no
  vuelva al formulario que se acaba de guardar.

### Paso de datos entre pantallas

Hay dos formas, y las dos se usan.

La primera es por la URL (`:id`). Con `withComponentInputBinding()` en `app.config.ts`, el parámetro le
llega al componente como un input:

```ts
// author-form.ts
id = input<string>();
```

Sin esa opción, se leería con `ActivatedRoute`:

```ts
const id = inject(ActivatedRoute).snapshot.paramMap.get('id');
```

La segunda es por el `state` de la navegación. El botón "Editar" de la lista de autores manda el autor
entero, que no se ve en la URL:

```ts
// authors-list.ts
this.router.navigate(['/authors', author._id, 'edit'], { state: { author } });
```

Y el formulario lo recoge de `history.state`. Si no está (por ejemplo, si se entra pegando la URL o
desde otra pestaña), lo pide a la API con el id de la URL:

```ts
// author-form.ts
const author: Author | undefined = history.state?.author;
if (author?._id === id) {
  this.fillForm(author);
  return;
}
this.authorService.getAuthor(id).subscribe(/* ... */);
```

Ojo: al recargar con F5 el navegador conserva el `state`, así que no se hace la petición. Para enseñar
el caso de la API hay que pegar la URL de edición en otra pestaña.

En "Editar libro" solo se usa la URL, y el formulario siempre pide el libro a la API.

## 10. HttpClient y Observables

`HttpClient` se activa en `app.config.ts` con `provideHttpClient()` y lo usan los servicios
([apartado 4](#4-servicios-e-inyección-de-dependencias)). Sus métodos devuelven un Observable, y la
petición no se hace hasta que alguien se suscribe:

```ts
this.authorService.getAuthors().subscribe({
  next: (response) => {
    this.authors.set(response.authors);
    this.loading.set(false);
  },
  error: (err: HttpErrorResponse) => {
    this.error.set(apiErrorMessage(err));
    this.loading.set(false);
  },
});
```

No hace falta desuscribirse, porque el Observable de `HttpClient` se completa solo cuando llega la
respuesta.

Observable frente a Promise:

| | Observable (`subscribe`) | Promise (`then`) |
|---|---|---|
| Cuándo empieza | Al suscribirse (es lazy) | Nada más crearla |
| Valores | Puede emitir varios a lo largo del tiempo | Uno solo |
| Cancelar | Sí (`unsubscribe`) | No |
| Operadores | `map`, `filter`, `switchMap`... | `then`/`catch` |

Si se quiere trabajar con una Promise, se puede convertir:

```ts
const response = await firstValueFrom(this.authorService.getAuthors());
// o bien
firstValueFrom(this.authorService.getAuthors()).then((response) => { /* ... */ });
```

El recorrido de una petición, desde que se entra en Autores hasta MongoDB y vuelta:

```
AuthorsList (ngOnInit)
  -> AuthorService.getAuthors()
    -> HttpClient: GET http://localhost:1337/authors
      -> API (backend): router -> middleware -> controller -> service -> model
        -> MongoDB
      <- { authors: [...] }
  <- subscribe -> this.authors.set(...) -> la tabla se actualiza (signal)
```

Los errores también vuelven por el mismo camino. `utils/api-error.ts` los pasa a un texto: si la API no
responde (`status 0`) avisa de que hay que arrancar el backend, y si responde con error enseña su
`message` (por ejemplo, "email ya existe" con un 409).

## 11. Formularios

Angular tiene dos formas de hacer formularios, y el proyecto usa las dos.

### Template-driven (FormsModule)

Todo se hace desde el HTML con `ngModel`. Va bien para cosas pequeñas, como el buscador:

```html
<input [(ngModel)]="search" (ngModelChange)="page.set(1)" />
```

### Reactivos (ReactiveFormsModule)

El formulario se define en el TS con sus validadores. Es lo que usan `author-form` y `book-form`:

```ts
// author-form.ts
form = this.fb.group({
  name: ['', [Validators.required, Validators.pattern(/\S/)]],
  email: ['', [Validators.required, Validators.email]],
  birthDate: [''],
  nationality: [''],
  website: ['', Validators.pattern(/^https?:\/\/\S+$/)],
  active: [true],
});
```

```html
<!-- author-form.html -->
<form [formGroup]="form" (ngSubmit)="save()">
  <input type="text" formControlName="name" />
  @if (form.controls.name.touched && form.controls.name.invalid) {
    <small class="field-error">El nombre es obligatorio</small>
  }
  ...
  <button type="submit" [disabled]="form.invalid || saving()">...</button>
</form>
```

- Los mensajes salen cuando el campo está `touched` (se ha tocado) y es `invalid`.
- Angular añade clases como `ng-invalid` y `ng-touched` a los inputs. En `styles.css` las usamos para
  poner el borde en rojo.
- El `<select multiple>` de autores de `book-form` guarda una lista de ids, y `Validators.required`
  obliga a elegir al menos uno.

Los validadores de Angular son parecidos a los de Joi en el backend. Así casi todos los errores salen
antes de enviar, pero la API lo vuelve a validar igualmente. Un email repetido, por ejemplo, solo lo sabe
la API, y el formulario enseña su mensaje.

Antes de enviar, `utils/remove-empty.ts` quita los campos vacíos, porque Joi responde 422 si le llega un
`""` o un `null`:

```ts
const author = removeEmpty(this.form.getRawValue()) as CreateAuthor;
```

## 12. Depurar con Angular DevTools

[Angular DevTools](https://angular.dev/tools/devtools) es una extensión de Chrome y Firefox. Solo
funciona con la app en modo desarrollo (`npm start`, no con el build de producción) y aparece como una
pestaña más de F12:

- Components: el árbol de componentes (`App`, `Navbar`, `AuthorsList` con su `Pagination`...). Al
  elegir uno se ven sus propiedades y el valor de sus signals en ese momento, y se pueden cambiar a mano
  para probar.
- Profiler: graba qué componentes se actualizan y cuánto tardan.
- Injector tree: enseña dónde está cada servicio. Se ve que `AuthorService` está una sola vez, en el
  inyector raíz: es el singleton del [apartado 4](#4-servicios-e-inyección-de-dependencias).
- Router tree: las rutas de `app.routes.ts`.

En VS Code, además, la configuración "ng serve" de `.vscode/launch.json` abre Chrome con el depurador
enganchado, y así se pueden poner breakpoints en los `.ts` (F5).

Los tests se pasan con `npm test -- --watch=false` (Vitest): comprueban los servicios, el pipe y que
la app arranca con su menú.

## 13. Autenticación: interceptor y guards

La autenticación se reparte en cuatro piezas. Cada una hace una sola cosa:

| Pieza | Fichero | Qué hace |
|---|---|---|
| Servicio | `services/auth.service.ts` | Habla con `/auth`, guarda la sesión y la expone en signals |
| Interceptor | `interceptors/auth.interceptor.ts` | Pone el token en cada petición y lo renueva si caduca |
| Guards | `guards/auth.guard.ts` | Deciden si se puede abrir una pantalla |
| Pantallas | `components/login`, `register`, `home` | Formularios y página de inicio |

### La sesión en signals

`AuthService` guarda el access token y el usuario en dos signals privadas, solo en memoria, y expone
el usuario de solo lectura. Lo que depende de él se declara con `computed`, y se recalcula solo:

```ts
// auth.service.ts
private accessToken = signal<string | null>(null);
private currentUser = signal<User | null>(null);
readonly user = this.currentUser.asReadonly();
readonly isLoggedIn = computed(() => this.currentUser() !== null);
readonly isAdmin = computed(() => this.currentUser()?.role === 'admin');
```

Por eso la barra de navegación cambia sola al iniciar o cerrar sesión, sin que nadie le avise:

```html
<!-- navbar.html -->
@if (auth.isAdmin()) {
  <nav>...Autores y Libros...</nav>
}
```

El access token no se guarda en `localStorage` ni en `sessionStorage` (un script inyectado podría
leerlos), así que al recargar la página se pierde. Para que la sesión sobreviva, el refresh token vive
en una cookie HttpOnly que pone el backend y que JavaScript no puede leer, y al arrancar la app se
llama a `restoreSession()` antes de pintar nada:

```ts
// app.config.ts
provideAppInitializer(() => inject(AuthService).restoreSession()),

// auth.service.ts
restoreSession(): Observable<void> {
  return this.refresh().pipe(                     // POST /auth/refresh: la cookie va sola
    switchMap(() => this.http.get<MeResponse>(`${environment.apiUrl}/users/me`)),
    tap((response) => this.currentUser.set(response.user)),
    map(() => undefined),
    catchError(() => { this.clearSession(); return of(undefined); }), // sin cookie válida, sin sesión
  );
}
```

Las llamadas a `/auth` llevan `{ withCredentials: true }`: sin eso el navegador no envía ni acepta
la cookie entre `localhost:4200` y `localhost:1337`. Por qué cookie y no localStorage está en el
README, en el apartado Autenticación.

### El interceptor

Un interceptor es una función por la que pasan **todas** las peticiones de `HttpClient`. Se registra
una vez en `app.config.ts`:

```ts
provideHttpClient(withInterceptors([authInterceptor]))
```

Así ningún servicio (`AuthorService`, `BookService`...) tiene que acordarse de poner el token. El
interceptor recibe la petición (`request`) y la función que la envía (`next`):

```ts
// auth.interceptor.ts (resumido)
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(AuthService).getToken();

  // Las peticiones son inmutables: clone() hace una copia con la cabecera añadida
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
    catchError((error) => {
      // 401 por token caducado: pido otro y repito la petición
      // cualquier otro 401: cierro la sesión
      // cualquier otro error: lo dejo pasar al componente
    }),
  );
};
```

El recorrido cuando el token ha caducado (se puede ver en la pestaña Network de F12):

```
GET /books              401  { message: 'El token ha caducado' }
POST /auth/refresh      200  { token: <nuevo> }
GET /books              200  (la misma petición, con el token nuevo)
```

El componente solo ve la última respuesta: para él la petición ha ido bien. Esto se consigue con dos
operadores de RxJS: `catchError` atrapa el 401 y `switchMap` cambia la petición fallida por "renovar y
repetir".

Las peticiones a `/auth/*` no pasan por esta lógica: el login y el registro no necesitan token, y así
un 401 del login (contraseña incorrecta) no se confunde con una sesión caducada.

### Los guards

Un guard es una función que se ejecuta antes de abrir una ruta. Devuelve `true` para dejar pasar o
una URL (`UrlTree`) para mandar a otra pantalla:

```ts
// auth.guard.ts
export const authGuard: CanActivateFn = (route, state) => {
  if (inject(AuthService).isLoggedIn()) {
    return true;
  }
  // Al login, recordando a dónde iba: /login?returnUrl=/books
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
```

En `app.routes.ts` se ponen en `canActivate`, y se comprueban en orden:

```ts
{ path: 'books', component: BooksList, canActivate: [authGuard, adminGuard] },
```

Hay tres: `authGuard` (hace falta sesión), `adminGuard` (hace falta ser admin; un `user` vuelve al
inicio) y `guestGuard` (solo sin sesión, para que alguien con sesión no vea el login).

Después del login, `Login` lee `returnUrl` como un input (gracias a `withComponentInputBinding`, igual
que el `:id` de las rutas de editar) y vuelve a esa página. Solo acepta rutas que empiezan por `/`,
para que un enlace preparado no pueda mandar al usuario a otra web.

Un guard **no es seguridad**: solo decide qué pantallas se enseñan. Quien protege los datos es el
backend, que comprueba el token y el rol en cada petición.

### Probarlo

- Con `admin@example.com` y `user@example.com` (contraseña `seminari7`) se ve la diferencia entre roles.
- En F12, pestaña Application, Local Storage: no hay ningún token. En Application, Cookies,
  `http://localhost:1337`: está `refreshToken` con la casilla HttpOnly marcada, SameSite Strict y Path
  `/auth`. En la consola, `document.cookie` devuelve `""`.
- En Network, la respuesta de `POST /auth/login` trae la cabecera `Set-Cookie` y el JSON solo `token` y
  `user`. El token se puede pegar en https://jwt.io para ver su contenido (`sub`, `role`, `exp`).
- Recarga la página (F5): en Network salen `POST /auth/refresh` y `GET /users/me` y la sesión sigue.
  Pulsa "Cerrar sesión" y vuelve a entrar en `/books`: `/auth/refresh` responde 401 y la app va al login.
- Para ver la renovación sin esperar 15 minutos, arranca el backend con tokens cortos
  (`JWT_EXPIRES_IN=20s npm run dev`) y mira la pestaña Network.

## 14. Chat con WebSockets

Con `HttpClient` el cliente pregunta y el servidor responde. En un chat hace falta lo contrario: que
el servidor avise al cliente cuando otro usuario escribe. Para eso se usa un WebSocket, una conexión
que se queda abierta, con la librería `socket.io-client`. Todo son **eventos** con nombre: un lado los
envía con `emit` y el otro los recibe con `on`. Los nombres y los datos de cada evento están en el
Contrato de [LOGS.md](LOGS.md).

### El servicio: un solo socket para toda la app

`services/chat.service.ts` es la única pieza que conoce `socket.io-client`. Crea el socket enviando el
token en el handshake, igual que el interceptor lo pone en la cabecera de cada petición HTTP:

```ts
// chat.service.ts
this.socket = io(environment.socketUrl, {
  autoConnect: false,
  // Una función y no un objeto: cada intento de conexión lee el token más reciente
  auth: (send) => send({ token: this.authService.getToken() }),
});
```

El socket no pasa por el interceptor HTTP. Por eso, si el servidor rechaza la conexión porque el
token ha caducado (`connect_error` con `Authentication error`), el propio servicio lo renueva con
`authService.refresh()` y vuelve a conectar. Si tampoco puede renovarlo, cierra la sesión.

### Los eventos como Observables

El componente no habla con el socket: se suscribe a Observables del servicio. Cada evento del socket
se pasa a un `Subject`, que es un Observable al que se le pueden meter valores a mano:

```ts
// chat.service.ts
private readonly messageSubject = new Subject<ChatMessage>();
readonly messages$ = this.messageSubject.asObservable();

this.socket.on('chat:message', (message: ChatMessage) => {
  this.messageSubject.next(message);
});
```

El estado de la conexión es un `BehaviorSubject`: un `Subject` que recuerda su último valor, así quien
se suscribe tarde sabe al momento si está conectado. Lo mismo la lista de usuarios conectados
(`onlineUsers$`): el servidor envía `users:online` cada vez que alguien entra o sale, y el componente la
cruza con la lista de usuarios en un `computed` para pintar el punto verde o gris.

### El recorrido de un mensaje

```
Chat (componente)          ChatService                 servidor
sendMessage()      ->      emit('chat:message')  ->    guarda en MongoDB
                                                       io.to(sala).emit('chat:message')
messages.update()  <-      messageSubject.next()  <-   on('chat:message')  (a todos los de la sala)
```

Quien escribe no añade su mensaje a la lista directamente: espera a que el servidor se lo devuelva
como a los demás. Así todos ven exactamente lo que se ha guardado.

### Salas: general, grupo y directo

Para entrar en una sala, el componente llama a `joinRoom(sala)` y el servidor responde con el
historial (`chat:history`). El nombre de un chat directo se construye con los dos ids ordenados, para
que los dos usuarios lleguen a la misma sala sin ponerse de acuerdo:

```ts
// chat.ts
const [firstId, secondId] = [currentUserId, otherUserId].sort();
return `direct:${firstId}:${secondId}`;
```

El servidor comprueba que quien entra en un chat directo es uno de esos dos usuarios.

### Eventos que no son chat: avisos del backoffice

Por el mismo socket el servidor envía `books:changed` y `authors:changed` cuando un admin crea, edita o
borra un libro o un autor. Aquí el cliente no emite nada: solo escucha. El servicio los junta en un
único Observable y el componente guarda los últimos cinco en una signal:

```ts
// chat.service.ts
this.socket.on('books:changed', (change: BackofficeChange) => {
  this.backofficeSubject.next({ ...change, kind: 'book' });
});

// chat.ts
this.chatService.backofficeChanges$.subscribe((notice) => {
  this.notices.update((notices) => [notice, ...notices].slice(0, MAX_NOTICES));
});
```

En el servidor, el controller de libros llama a `notifyBooksChanged(...)` después de responder la
petición HTTP, y esa función hace `io.emit(...)` a todos los conectados (no a una sala).

### Limpieza en ngOnDestroy

Al salir de la página del chat hay que cerrar lo que se ha abierto. Si no, al volver se acumularían
suscripciones y conexiones repetidas, y cada mensaje se pintaría varias veces:

```ts
// chat.ts
ngOnDestroy(): void {
  this.subscriptions.unsubscribe(); // todas las suscripciones a la vez
  this.chatService.disconnect(); // cierra el socket
}
```

Las suscripciones se van añadiendo a un único `Subscription` con `this.subscriptions.add(...)`, para
poder cancelarlas todas con una sola llamada.

### Probarlo

- Abre dos sesiones a la vez (una ventana normal y otra de incógnito) con `admin@example.com` y
  `user@example.com`, y escribe en la sala general.
- Con el `user` en el chat, crea un libro con el admin en la otra ventana: en el chat del `user` aparece
  "Libro creado: ..." en la franja de avisos.
- En F12, pestaña Network, filtro WS: se ve la conexión del socket y, en Messages, cada evento que va
  y viene.
