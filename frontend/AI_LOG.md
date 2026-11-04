# AI_LOG

Herramienta: Claude Code (Anthropic). Modelo: Claude Opus 5.5.

## 1. Limpieza del código del Seminario 7

- **Pregunta:** cómo quitar las pantallas de autores, libros y chat.
- **Prompt:** «Lo mismo que en el backend: esto es el frontend del seminario 7 copiado tal cual. Hay que limpiarlo para Studate: quitar las pantallas de autores, libros y chat y dejar la estructura simple para luego meter lo nuestro. Solo quitar y limpiar. Dime el plan de acción de cómo lo harías.»
- **Incoherencias:** algunos tests usaban `/books` como URL de ejemplo.
- **Solución:** cambiados a `/users`. Mantuvimos paginación, modal de confirmar, selector de vista y utils para reutilizarlos.

## 2. Lista de usuarios

- **Pregunta:** lista paginada con búsqueda y filtros.
- **Prompt:** «Empezamos por la lista de usuarios paginada con búsqueda y filtros. Primero quiero ver cómo está montada la paginación en el backend antes de decidir cómo hacer esto, explícamela. ...Vale, ahora que lo entiendo: quiero 10 usuarios por página y algunos filtros, los más típicos. ¿Qué filtros me sugieres? Dame el plan de acción.»
- **Incoherencias:** propuso filtrar por titulación y la API no tenía ese filtro. En el móvil, el select de titulaciones se salía de la pantalla.
- **Solución:** añadimos el filtro en el backend y limitamos el ancho del select.

## 3. Formulario de usuario

- **Pregunta:** crear y editar usuarios con rol y activo.
- **Prompt:** «Ahora el formulario de usuario: crear, editar, rol y activo. Es básicamente el register que ya tenemos, pero hecho bien y adaptado a los roles. Lo de activo es importante, porque todo lo que venga después tiene que saber si un usuario está activo o no: si no lo está, no puede usar la API. Dame el plan de acción.»
- **Incoherencias:** un usuario desactivado seguía usando la API con su token. El test del formulario navegaba a `/users` sin esa ruta y Vitest daba errores.
- **Solución:** arreglo en `VerifyToken` del backend (el interceptor ya cerraba la sesión con el 401) y una ruta vacía `users` en el test.

## 4. Archivar, restaurar y eliminar

- **Pregunta:** acciones de soft delete y hard delete en la lista.
- **Prompt:** «Ahora archivar, restaurar y eliminar desde el backoffice. Aquí ya hay un poco más de chicha. Como hacemos soft delete, primero se archiva y se puede restaurar; eliminar ya es el hard delete. Cuando quiera eliminar para siempre, que me salga un modal de "¿Estás seguro de que quieres eliminar esto?" y, si le doy, se elimina. ¿Cómo lo harías? Plan de acción.»
- **Incoherencias:** ninguna importante.
- **Solución:** un solo `confirm-modal` para archivar y eliminar, y sin botones en la fila del propio admin.

## 5. Backoffice solo para admin

- **Pregunta:** que el backoffice solo lo use el admin.
- **Prompt:** «Ahora que ya tenemos la zona de usuarios, esto lo tienen que administrar los administradores. Hay que rehacer el backoffice bien hecho: login y guards solo para admin, y adaptarlo a los modelos nuevos. Plan de acción.»
- **Incoherencias:** los tests seguían usando la contraseña del seminario.
- **Solución:** `adminGuard` en todas las rutas del backoffice, la etiqueta "Backoffice" en la barra y los tests con la contraseña nueva.

## 6. Pantallas de La Orla

- **Pregunta:** mockup y pantallas de los votos.
- **Prompt:** «Ahora las pantallas de La Orla (Grade). Antes de programar, hazme un mockup para ver cómo quedaría esta pantalla.» y «Y si luego hay que usarlo desde el teléfono, que esta pantalla sea responsive, que se vea bien en el móvil.»
- **Incoherencias:** puso la ayuda "si los dos se han dado A+, se abre un Date" cuando los Dates todavía no existían.
- **Solución:** la quitamos y la volvimos a poner al hacer los Dates.

## 7. Pantallas de Dates

- **Pregunta:** pantallas de Dates para el admin y para cada usuario.
- **Prompt:** «Las pantallas de Dates, igual que las de La Orla: primero el mockup para verlo, y responsive desde el principio para que se vea en el móvil.»
- **Incoherencias:** una interfaz llamada `Date` tapa el `Date` de JavaScript. Para elegir "con quién", un usuario normal no puede llamar a `GET /users`.
- **Solución:** la interfaz se llama `StudateDate` y se usa `GET /users/directory`, que añadimos en el backend.
