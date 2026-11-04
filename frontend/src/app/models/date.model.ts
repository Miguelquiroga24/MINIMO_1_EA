import { GradeUser } from './grade.model';

// Ojo con el nombre: en la app esto es un "Date" (una cita), pero Date ya es la clase de fechas de
// JavaScript. Si la interfaz se llamara Date, en los ficheros que la usan new Date() dejaría de ser una
// fecha. Por eso se llama StudateDate (en el backend pasa lo mismo y el modelo se importa como DateModel)

// Las bandejas del blog: Pendiente (nadie ha escrito), En curso y Cerrado
export type DateStatus = 'pending' | 'ongoing' | 'closed';

// El texto de cada estado en la pantalla
export const DATE_STATUS_LABELS: Record<DateStatus, string> = {
  pending: 'Pendiente',
  ongoing: 'En curso',
  closed: 'Cerrado',
};

export interface StudateDate {
  _id: string;
  // Los dos usuarios, con su nombre, email y foto (populate)
  users: GradeUser[];
  status: DateStatus;
  // Id del usuario al que el sorteo le ha dado el primer mensaje
  firstTurn: string;
  // Cuándo caduca (24 horas después de abrirse, o 48 con la prórroga)
  expiresAt: string;
  // Si ya se ha usado la prórroga
  extended: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Los filtros del listado (GET /dates). user solo lo puede usar el admin
export interface DateFilters {
  status: '' | DateStatus;
  user: string;
}

// GET /dates: una página de Dates y los datos de paginación
export interface DatesPage {
  dates: StudateDate[];
  total: number;
  page: number;
  pages: number;
}

// POST /dates: los ids de los dos usuarios
export interface CreateDate {
  users: [string, string];
}

// Respuesta de GET, POST, PUT y de la prórroga de un Date
export interface DateResponse {
  date: StudateDate;
}

// GET /users/directory: con quién puede abrir un Date el usuario con sesión
export interface DirectoryUser {
  _id: string;
  name: string;
  degree?: string;
  photo?: string;
}

export interface DirectoryResponse {
  users: DirectoryUser[];
}
