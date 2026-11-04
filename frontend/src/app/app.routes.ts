import { Routes } from '@angular/router';

import { DateForm } from './components/date-form/date-form';
import { DatesList } from './components/dates-list/dates-list';
import { GradeForm } from './components/grade-form/grade-form';
import { GradesList } from './components/grades-list/grades-list';
import { Login } from './components/login/login';
import { Register } from './components/register/register';
import { UserForm } from './components/user-form/user-form';
import { UsersList } from './components/users-list/users-list';
import { adminGuard, authGuard, guestGuard } from './guards/auth.guard';

// canActivate: los guards que se comprueban, en orden, antes de entrar en la ruta.
//   guestGuard            solo sin sesión (login y registro)
//   authGuard             solo con sesión; si no, al login
//   authGuard, adminGuard con sesión y además rol admin; un user vuelve a sus Dates
export const routes: Routes = [
  // La pantalla de entrada, para el admin y para un usuario normal, son los Dates
  { path: '', redirectTo: 'dates', pathMatch: 'full' },
  { path: 'login', component: Login, canActivate: [guestGuard], title: 'Iniciar sesión' },
  { path: 'register', component: Register, canActivate: [guestGuard], title: 'Crear cuenta' },

  // Dates: cualquier usuario con sesión (cada uno ve los suyos; el admin, todos)
  { path: 'dates', component: DatesList, canActivate: [authGuard], title: 'Dates' },
  { path: 'dates/new', component: DateForm, canActivate: [authGuard], title: 'Nuevo Date' },

  // Backoffice: solo admin
  { path: 'users', component: UsersList, canActivate: [authGuard, adminGuard], title: 'Usuarios' },
  {
    path: 'users/new',
    component: UserForm,
    canActivate: [authGuard, adminGuard],
    title: 'Nuevo usuario',
  },
  {
    path: 'users/:id/edit',
    component: UserForm,
    canActivate: [authGuard, adminGuard],
    title: 'Editar usuario',
  },
  { path: 'grades', component: GradesList, canActivate: [authGuard, adminGuard], title: 'La Orla' },
  {
    path: 'grades/new',
    component: GradeForm,
    canActivate: [authGuard, adminGuard],
    title: 'Nuevo voto',
  },

  // Cualquier otra URL vuelve a los Dates (o al login, si no hay sesión)
  { path: '**', redirectTo: 'dates' },
];
