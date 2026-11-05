import { DateStatus } from './date.model';
import { GradeUser } from './grade.model';

// Una valoración de un Date: uno de los dos usuarios puntúa varios criterios del Date.
// Los criterios son un vector de subdocumentos dentro de la valoración

export type ReviewCriterion = 'conversation' | 'punctuality' | 'chemistry' | 'sincerity';

// El texto de cada criterio en la pantalla (el orden es el del formulario)
export const REVIEW_CRITERIA_LABELS: Record<ReviewCriterion, string> = {
  conversation: 'Conversación',
  punctuality: 'Puntualidad',
  chemistry: 'Química',
  sincerity: 'Sinceridad',
};

export const REVIEW_CRITERIA = Object.keys(REVIEW_CRITERIA_LABELS) as ReviewCriterion[];

// Las notas van de 1 a 5
export const REVIEW_SCORES = [1, 2, 3, 4, 5];

// El subdocumento: la nota de un criterio y si cumplió lo que esperaba
export interface CriterionScore {
  criterion: ReviewCriterion;
  score: number;
  met: boolean;
}

// Así llega el Date dentro de una valoración (populate): sus dos usuarios, solo con el nombre, y su estado
export interface ReviewDate {
  _id: string;
  users: { _id: string; name: string }[];
  status: DateStatus;
}

export interface Review {
  _id: string;
  date: ReviewDate;
  // Quien la ha escrito, con su nombre, email y foto (populate)
  author: GradeUser;
  criteria: CriterionScore[];
  comment?: string;
  wouldRepeat: boolean;
  // La media de los criterios: la calcula el servidor
  average: number;
  createdAt: string;
  updatedAt?: string;
}

// Los filtros del listado (GET /reviews). Los vacíos no se envían
export interface ReviewFilters {
  // Texto que se busca en el comentario
  search: string;
  // Solo las de este Date
  date: string;
  // Solo las que tienen una media igual o mayor ('' = sin filtro)
  minScore: '' | number;
}

// GET /reviews: una página de valoraciones y los datos de paginación
export interface ReviewsPage {
  reviews: Review[];
  total: number;
  page: number;
  pages: number;
}

// POST /reviews. El autor no se envía: la API lo saca del token
export interface CreateReview {
  date: string;
  criteria: CriterionScore[];
  comment?: string;
  wouldRepeat: boolean;
}

// PUT /reviews/:id: lo mismo sin el Date (no se cambia)
export type UpdateReview = Partial<Omit<CreateReview, 'date'>>;

// Respuesta de GET, POST y PUT de una valoración
export interface ReviewResponse {
  review: Review;
}

// Una fila del resumen por criterio
export interface CriterionStats {
  criterion: ReviewCriterion;
  average: number;
  // Cuántas valoraciones han puntuado este criterio
  count: number;
  // En cuántas se ha cumplido lo esperado
  met: number;
}

// GET /reviews/stats/:dateId: el resumen que calcula MongoDB
export interface ReviewStats {
  date: string;
  total: number;
  average: number;
  min: number;
  max: number;
  // Cuántos repetirían
  wouldRepeat: number;
  criteria: CriterionStats[];
}

export interface ReviewStatsResponse {
  stats: ReviewStats;
}
