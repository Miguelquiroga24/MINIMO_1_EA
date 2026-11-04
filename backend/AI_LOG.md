# AI_LOG

Herramienta: Claude Code (Anthropic). Modelo: Claude Opus 5.5.

## 1. Limpieza del código del Seminario 7

- **Pregunta:** cómo quitar autores, libros y chat del seminario y dejar el repo preparado para Studate.
- **Prompt:** «Lo que hemos hecho ha sido copiar y pegar lo que teníamos del seminario 7. Ahora hay que adaptarlo a lo nuestro, que es Studate. Para eso hay que hacer limpieza y dejar el repo preparado: quitar los autores, los libros y el chat, y dejar la estructura simple, la cáscara, para luego poner lo nuestro. De momento solo quitar y limpiar, para tener una base sólida. Dime el plan de acción: cómo lo eliminarías y cuál sería la forma correcta de hacerlo.»
- **Incoherencias:** ninguna importante.
- **Solución:** guardamos el código del seminario en el tag `seminari7-base` antes de borrar y mantuvimos las piezas genéricas (paginación, Joi, ErrorHandler, VerifyToken, RequireRole).

## 2. Modelo User

- **Pregunta:** qué campos necesita el usuario de Studate.
- **Prompt:** «Empezamos por el modelo User. Antes de tocar nada, dime qué campos tendría, cómo quedaría la estructura del modelo, y ponme ejemplos de cada campo para ver qué necesitamos de verdad. Luego me pasas el plan de acción y lo vemos.»
- **Incoherencias:** no decía dónde guardar la foto de perfil.
- **Solución:** la foto se guarda en el propio usuario en base64 con un límite de tamaño. El email sigue siendo único también para los archivados.

## 3. Prehook "está activo"

- **Pregunta:** qué es el prehook de usuarios activos y cómo hacerlo.
- **Prompt:** «Ahora el prehook de Mongoose de "está activo". No me acuerdo bien de en qué consistía. Explícame de qué va, por qué tiene sentido esta tarea, y dame el plan de acción.»
- **Incoherencias:** el prehook solo frenaba el login y el refresh. Un usuario desactivado seguía usando la API con su token hasta que caducaba.
- **Solución:** `VerifyToken` comprueba en cada petición que el usuario sigue activo y si no responde 401.

## 4. Gestión de usuarios

- **Pregunta:** listado paginado con búsqueda, editar y cambiar rol.
- **Prompt:** «Siguiente: gestión de usuarios, listado paginado, búsqueda, editar y cambiar rol. Hay que montar esta funcionalidad. ¿Cómo lo harías? ¿Cuál sería el plan de acción?»
- **Incoherencias:** faltaba el filtro por titulación que luego pedía la pantalla del frontend.
- **Solución:** añadimos el filtro `degree` a `GET /users` (Joi, service y Swagger).

## 5. Archivar, restaurar y eliminar

- **Pregunta:** soft delete y hard delete de usuarios.
- **Prompt:** «Ahora archivar, restaurar y eliminar para siempre usuarios. ¿Cómo lo harías? Y recuérdame cómo era esto del soft delete y el hard delete, porque nos lo comentaron en clase y si no me equivoco había que usar soft delete: para gestionarlo bien, los usuarios se archivan más que eliminarse. Dame el plan de acción.»
- **Incoherencias:** ninguna importante.
- **Solución:** solo se puede eliminar un usuario archivado (409 si no) y un admin no se puede archivar ni eliminar a sí mismo.

## 6. Modelo Grade (La Orla)

- **Pregunta:** qué atributos necesita un voto de La Orla.
- **Prompt:** «Montamos lo mismo con el modelo Grade, el de La Orla. ¿Qué atributos necesita este modelo para lo que queremos montar en Studate? Dame el plan de acción.»
- **Incoherencias:** con el `populate`, un usuario inactivo salía como `null` (pasaba por el prehook). Y el 409 de un voto repetido decía "from ya existe".
- **Solución:** `populate` con `withInactive: true`, y comprobar antes de guardar si la pareja ya tiene voto para responder "Este usuario ya ha votado ese perfil".

## 7. Modelo Date

- **Pregunta:** qué atributos necesita un Date y cómo abrirlo con el A+ mutuo.
- **Prompt:** «Igual con el modelo Date, el de las citas. ¿Qué atributos necesita para lo que queremos en Studate? Dame el plan de acción.»
- **Incoherencias:** un modelo llamado `Date` tapa el `Date` de JavaScript. Y un usuario normal no tenía forma de sacar la lista de usuarios para abrir un Date (`GET /users` es solo del admin).
- **Solución:** el modelo se importa como `DateModel`. Añadimos `GET /users/directory` para cualquier usuario con sesión.

## 8. Swagger

- **Pregunta:** ampliar la documentación de Swagger con todo lo nuevo.
- **Prompt:** «Toca montar la documentación de la API en Swagger. Ya has visto cómo lo hacemos: Joi conectado con Swagger. Simplemente sería ampliarlo con todo lo nuevo.»
- **Incoherencias:** algunos errores usaban ejemplos genéricos que no eran los mensajes reales de la API.
- **Solución:** respuestas propias con el mensaje real (`GradeConflict`, `DateConflict`, `NotYourDate`) y el 401 de cuenta no activa.
