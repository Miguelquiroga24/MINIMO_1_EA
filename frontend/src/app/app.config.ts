import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { AuthService } from './services/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // withComponentInputBinding: los parámetros de la ruta (como :id) y los de la URL (?returnUrl=)
    // llegan a los componentes como inputs
    provideRouter(routes, withComponentInputBinding()),
    // withInterceptors: todas las peticiones de HttpClient pasan por authInterceptor,
    // que les añade el token (ver interceptors/auth.interceptor.ts)
    provideHttpClient(withInterceptors([authInterceptor])),
    // Antes de pintar nada, intenta recuperar la sesión con la cookie del refresh token.
    // Angular espera a que termine, así los guards ya saben si hay sesión cuando se abre la
    // primera ruta. Si no hay cookie o ha caducado, la app arranca sin sesión y se va al login
    provideAppInitializer(() => inject(AuthService).restoreSession()),
  ],
};
