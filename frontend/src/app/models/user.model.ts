// Un usuario es quien inicia sesión en la aplicación. No es lo mismo que un autor:
// los autores son datos del backoffice, como los libros.
export type UserRole = 'user' | 'admin';

// El usuario tal como lo devuelve la API (nunca trae la contraseña).
// El login y /users/me solo traen lo básico; el listado del backoffice trae también el perfil
// y el estado de la cuenta, por eso esos campos son opcionales
export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  birthDate?: string;
  degree?: string;
  lookingFor?: string;
  bio?: string;
  // Foto en base64 ("data:image/jpeg;base64,..."): se puede poner tal cual en el src de un <img>
  photo?: string;
  // false si un admin lo ha desactivado
  active?: boolean;
  // true si está archivado (borrado lógico)
  deleted?: boolean;
  deletedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Titulaciones de la EETAC que se pueden elegir en el formulario y en el filtro del listado
export const DEGREES = [
  'Grau en Enginyeria Telemàtica',
  'Grau en Enginyeria de Sistemes de Telecomunicació',
  'Grau en Enginyeria Aeroespacial',
  'Grau en Enginyeria de Sistemes Aeroespacials',
];

// Los filtros del listado de usuarios (GET /users). Los vacíos no se envían
export interface UserFilters {
  search: string;
  role: '' | UserRole;
  // '' = todos, 'true' = solo activos, 'false' = solo inactivos (tal cual van en la URL)
  active: '' | 'true' | 'false';
  degree: string;
  archived: boolean;
}

// POST /users: lo que envía el formulario al crear un usuario desde el backoffice.
// A diferencia del registro, el admin elige el rol y si está activo
export interface CreateUser {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  active?: boolean;
  birthDate?: string;
  degree?: string;
  lookingFor?: string;
  bio?: string;
  photo?: string;
}

// PUT /users/:id: lo mismo sin la contraseña (desde el backoffice no se cambia)
export type UpdateUser = Omit<CreateUser, 'password'>;

// Respuesta de GET, POST y PUT de un usuario
export interface UserResponse {
  user: User;
}

// GET /users: una página de usuarios y los datos de paginación
export interface UsersPage {
  users: User[];
  total: number;
  page: number;
  pages: number;
}

// POST /auth/register
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  user: User;
}

// POST /auth/login
export interface LoginRequest {
  email: string;
  password: string;
}

// El refresh token no viene en el JSON: el backend lo deja en una cookie HttpOnly
export interface LoginResponse {
  token: string;
  user: User;
}

// POST /auth/refresh (sin body: el refresh token va en la cookie)
export interface RefreshResponse {
  token: string;
}

// GET /users/me: el usuario con sesión, para recuperarlo al recargar la página
export interface MeResponse {
  user: User;
}
