# AI_LOG · Examen Mínimo 1

Herramienta: Claude Code (Anthropic). Modelo: Claude Sonnet 5.5, esfuerzo medio.

Ejercicio: sistema de valoraciones por criterios para una entidad del proyecto (que no sea el usuario), con
resumen estadístico calculado en la bd.

## 1. Plan y qué entidad valorar

- **Pregunta:** que entidad valorar y como encajarlo en lo que ya tenemos
- **Prompt:** "vale tenemos que hacer un sistema de valoraciones para una entidad que no sea el usuario,
  cada valoracion puntua varios criterios y hay que sacar un resumen estadistico calculado en la bd. antes
  de programar mira el proyecto, tenemos User, Grade (los votos de la orla) y  d ate (las citas). yo creo que
  lo que tiene sentido es valorar el Date, que los dos usuarios valoren como fue la cita. dime que piezas
  harian falta en back y front siguiendo las capas que ya tenemos (routes, middleware, controllers,
  services, models) y en que orden. solo el plan"
- **Incoherencias:** al principio planteaba valorar los Grade, que no tiene sentido porque un voto ya es una
  nota (A+ o F). Tambien queria meter el resumen calculandolo en el front con un reduce
- **Solución:** valoramos el Date y el resumen lo calcula mongo con un aggregate, que es lo que pide el
  enunciado

## 2. Modelo Review y validacion con joi

- **Pregunta:** el modelo nuevo con el vector de subdocumentos
- **Prompt:** "empezamos por el modelo. Review con referencia al Date y al usuario autor (ref: 'Date' y
  ref: 'User' como en Grade). un vector criteria de subdocumentos con criterion (enum: conversation,
  punctuality, chemistry, sincerity), score de 1 a 5 y met boolean, asi tenemos string number y boolean.
  ademas comment y wouldRepeat. una valoracion por usuario y Date con indice unico. la media que la calcule
  el servidor, no que venga en el body. y los esquemas de joi en Joi.ts como los demas, criterios sin
  repetir"
- **Incoherencias:** metia average en el esquema de joi como campo que se envia, y el author tambien iba
  en el body
- **Solución:** quitados los dos del esquema, si alguien manda author joi lo rechaza con 422. La media se
  calcula en un pre('validate') del modelo, y el subesquema con _id: false porque los criterios no
  necesitan id

## 3. CRUD, permisos y reglas de negocio

- **Pregunta:** service, controller y rutas con los codigos que pide el enunciado
- **Prompt:** "ahora el ReviewService y el controller. todas las rutas con VerifyToken, el autor sale de
  req.user nunca del body. reglas: solo pueden valorar los dos usuarios del Date (403), un Date pendiente
  no se puede valorar (409) y si ya lo has valorado 409. editar y borrar solo el autor o admin, si no 403.
  un usuario normal solo ve las valoraciones de sus Dates igual que pasa con visibleTo en Dateservice. el
  service devuelve { error } y el controller elige el codigo, como en GradeService. listado paginado en el
  servidor con populate del date y del author, y filtros combinables en la misma ruta, search en el
  comentario, date y minScore"
- **Incoherencias:** para borrar puso RequireRole('admin') en la ruta y entonces el autor no podia borrar
  la suya. Al editar usaba findOneAndUpdate que se salta el pre('validate') y no recalculaba la media. Y
  la query mala del listado daba 400 copiando ValidateDateList, pero el enunciado pide 422
- **Solución:** quitado el RequireRole, la comprobacion de autor o admin va en el service. Editar con
  findById + save() para que salte el hook. ValidateReviewList propio que responde 422, el 400 se queda
  solo para el id mal formado (ValidateId)

## 4. Endpoint del resumen estadistico

- **Pregunta:** el endpoint especifico con el resumen calculado en mongo
- **Prompt:** "ahora el endpoint del resumen, GET /reviews/stats/:dateId. hazlo con un aggregate, total de
  valoraciones, media, la mas baja y la mas alta, cuantos repetirian, y la media de cada criterio con
  $unwind del vector. que lo vean solo los del Date y el admin, si no 404. documentalo en swagger con su
  tag como las demas rutas"
- **Incoherencias:** la ruta la puso despues de /:reviewId y "stats" lo pillaba como id, daba 400. Ademas
  hacia dos aggregate separados
- **Solución:** /stats/:dateId antes de /:reviewId, igual que /me en Users. Un solo aggregate con $facet
  para sacar el general y el de por criterio a la vez

## 5. Que no queden valoraciones sueltas

- **Pregunta:** que pasa con las valoraciones si se borra el Date o el usuario
- **Prompt:** "oye si el admin elimina un Date o elimina para siempre un usuario se quedan valoraciones
  apuntando a cosas que no existen. añade el borrado en deleteDate y en deleteUser igual que ya se borran
  los votos y los dates. y mete unas valoraciones de ejemplo en el seed para el Date cerrado y el que esta
  en curso, que el --reset tambien las borre"
- **Incoherencias:** en el seed las insertaba con insertMany y asi no se calculaba la media
- **Solución:** cambiado a Review.create para que salte el hook. Las de ejemplo van referenciadas por la
  posicion del usuario en el Date porque los ids no se saben hasta que se crean

## 6. Front, modelos y servicio

- **Pregunta:** los modelos TS y el servicio para las valoraciones
- **Prompt:** "vamos con el front. modelos en models/review.model.ts para la valoracion, el subdocumento del
  criterio, la respuesta paginada { reviews, total, page, pages } y el resumen, y exportalos en index.ts.
  un ReviewService que tenga todas las peticiones con HttpParams y que solo mande los filtros con valor,
  como user.service. el token no lo pongas a mano que ya lo mete el interceptor"
- **Incoherencias:** queria instalar ngx-pagination para la paginacion y una libreria de graficos para el
  resumen, cosas que no usamos en el proyecto
- **Solución:** nada de librerias nuevas, se reutiliza nuestro componente Pagination y las barras del
  resumen son css con un width calculado

## 7. Componentes dentro de la vista de Dates

- **Pregunta:** donde meter los componentes y el formulario
- **Prompt:** "dos componentes nuevos integrados en dates-list, que es la vista que ya existe de los Dates.
  uno el resumen (review-stats) y otro el listado (reviews-list) con paginacion del servidor y busqueda,
  mismo patron Subject + switchMap que las otras listas. en cada fila un boton de Valoraciones que abra el
  panel debajo de la tabla. editar y eliminar solo si eres el autor o admin, y valorar solo si eres uno de
  los dos y el Date no esta pendiente, el admin no valora. para borrar usa el confirm-modal que ya tenemos.
  el formulario en una ruta nueva con authGuard, reactivo con un FormArray para los criterios"
- **Incoherencias:** primero monto una pagina nueva /reviews con su enlace en la navbar, y el enunciado
  dice integrado en una vista existente. Al guardar volvia a /dates con el panel cerrado. Y el codigo para
  actualizar el panel al cambiar el estado del Date le quedo muy enrevesado
- **Solución:** quitada la pagina, todo va en un panel dentro de dates-list. Al guardar se vuelve con
  ?reviews=<id> y como ya teniamos withComponentInputBinding llega como input y se abre el panel. Lo del
  estado simplificado, si la respuesta trae el Date abierto se actualiza y ya. En el form el campo
  included de cada criterio no se envia, solo se mandan los marcados como subdocumentos
