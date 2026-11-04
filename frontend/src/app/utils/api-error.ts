import { HttpErrorResponse } from '@angular/common/http';

// Paso el error de HttpClient a un texto que se pueda enseñar en la pantalla
export function apiErrorMessage(error: HttpErrorResponse): string {
  // status 0 quiere decir que la petición ni siquiera ha llegado a la API
  if (error.status === 0) {
    return 'No se puede conectar con la API. ¿Está arrancado el backend?';
  }

  // Si la API responde con error, su gestor de errores manda { message }
  return error.error?.message ?? `Error ${error.status}`;
}
