import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

// Un guard decide si se puede entrar en una ruta. Devuelve true para dejar pasar, o un UrlTree
// (una URL) para mandar a otra página. Se ponen en app.routes.ts con canActivate.
//
// Ojo: los guards solo deciden qué pantallas se ven. La seguridad de verdad está en el backend,
// que comprueba el token y el rol en cada petición. Un guard se puede saltar desde el navegador.

// Solo para usuarios con sesión. Si no hay sesión, al login, recordando a dónde iba
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true;
  }

  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

// Solo para admin. Va siempre después de authGuard. Un user con sesión vuelve a la página de entrada (sus Dates)
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isAdmin() ? true : router.createUrlTree(['/']);
};

// Solo para quien NO tiene sesión (login y registro). Si ya tiene sesión, a la página de inicio
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isLoggedIn() ? router.createUrlTree(['/']) : true;
};
