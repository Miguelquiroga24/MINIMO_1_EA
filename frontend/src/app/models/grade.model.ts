// Un voto de La Orla: la nota que un usuario (from) le pone al perfil de otro (to).
// A+ es aprobado (me interesa) y F es suspenso. Si dos usuarios se ponen A+, se abre un Date
export type GradeValue = 'A+' | 'F';

export const GRADE_VALUES: GradeValue[] = ['A+', 'F'];

// Así llegan from y to en un voto: la API los rellena con los datos del usuario (populate)
export interface GradeUser {
  _id: string;
  name: string;
  email: string;
  photo?: string;
}

export interface Grade {
  _id: string;
  from: GradeUser;
  to: GradeUser;
  value: GradeValue;
  createdAt: string;
  updatedAt?: string;
}

// Los filtros del listado (GET /grades). Los vacíos no se envían
export interface GradeFilters {
  value: '' | GradeValue;
  // id del usuario: votos en los que vota o es votado
  user: string;
}

// GET /grades: una página de votos y los datos de paginación
export interface GradesPage {
  grades: Grade[];
  total: number;
  page: number;
  pages: number;
}

// POST /grades: al crear se envían los ids de los dos usuarios
export interface CreateGrade {
  from: string;
  to: string;
  value: GradeValue;
}

// Respuesta de GET, POST y PUT de un voto
export interface GradeResponse {
  grade: Grade;
}
