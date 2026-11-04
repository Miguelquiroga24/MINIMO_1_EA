### **Ejercicio: Soporte para el campo "Editorial" (*Publisher*)**

**Contexto:**

El backend ya soporta y almacena el campo opcional `publisher` en la entidad de los libros, pero actualmente el frontend no lo aprovecha.

**Objetivo:**

Integrar el campo `publisher` en el flujo de la aplicación cliente (BackOffice) para que sea editable, visible en el listado y localizable mediante el buscador.

**Requisitos:**

1. **Modelo de datos:**  
   Asegurar que las interfaces del modelo de libro contemplen la propiedad opcional `publisher`.  
2. **Formulario (`book-form`):**  
   * Permitir que el usuario pueda introducir o editar la editorial al crear o modificar un libro.  
   * Cargar el valor existente al editar un libro que ya disponga de editorial.  
3. **Listado y Búsqueda (`books-list`):**  
   * Mostrar la editorial en la vista de la tabla de libros.  
   * Ampliar la lógica del buscador para que las búsquedas por texto coincidan también con la editorial.  
4. **Validación:**  
   Comprobar que el proyecto compila limpiamente (`npm run build`) y verificar en el navegador el guardado, la visualización y el filtrado del nuevo dato.

