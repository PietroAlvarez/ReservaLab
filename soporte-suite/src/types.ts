export type Section = "inicio" | "tareas" | "servicios" | "inventario";

export type TaskStatus = "pendiente" | "en_progreso" | "completada";
export type TaskPriority = "alta" | "media" | "baja";

export interface SupportTask {
  id: string;
  title: string;
  category: "Red" | "Correo" | "Sitio web" | "Reservas" | "Inventario" | "General";
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
}

export type ServiceStatus = "operativo" | "atencion" | "incidente";

export interface ManagedService {
  id: string;
  name: string;
  description: string;
  status: ServiceStatus;
  checkedAt: string;
}

export interface Asset {
  id: string;
  code: string;
  name: string;
  type: string;
  location: string;
  status: "disponible" | "asignado" | "mantencion" | "baja";
}

export interface ReservationRequest {
  id: string;
  date: string;
  blockId: number;
  teacher: string;
  email: string;
  course: string;
  comment: string;
  createdAt: string;
}
