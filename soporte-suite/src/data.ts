import type { Asset, ManagedService, SupportTask } from "./types";

const today = new Date();
const isoAfter = (days: number) => {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

export const initialTasks: SupportTask[] = [
  { id: crypto.randomUUID(), title: "Revisar conectividad del laboratorio", category: "Red", priority: "alta", status: "pendiente", dueDate: isoAfter(0) },
  { id: crypto.randomUUID(), title: "Publicar circular en el sitio del colegio", category: "Sitio web", priority: "media", status: "en_progreso", dueDate: isoAfter(1) },
  { id: crypto.randomUUID(), title: "Actualizar registro de notebooks", category: "Inventario", priority: "baja", status: "pendiente", dueDate: isoAfter(3) },
];

export const initialServices: ManagedService[] = [
  { id: "network", name: "Red e Internet", description: "Enlaces, Wi-Fi y conectividad interna", status: "operativo", checkedAt: "Revisión manual pendiente" },
  { id: "mail", name: "Correo institucional", description: "Cuentas, accesos y entregabilidad", status: "operativo", checkedAt: "Revisión manual pendiente" },
  { id: "website", name: "Sitio web", description: "Disponibilidad y contenido institucional", status: "atencion", checkedAt: "Contenido por publicar" },
  { id: "reservations", name: "Reservas", description: "Equipos y laboratorio de computación", status: "operativo", checkedAt: "Conectado al módulo existente" },
];

export const initialAssets: Asset[] = [
  { id: crypto.randomUUID(), code: "NB-001", name: "Notebook Lenovo", type: "Notebook", location: "Laboratorio", status: "disponible" },
  { id: crypto.randomUUID(), code: "PR-002", name: "Proyector Epson", type: "Proyector", location: "Sala multiuso", status: "asignado" },
  { id: crypto.randomUUID(), code: "AP-003", name: "Access Point pasillo", type: "Red", location: "Segundo piso", status: "mantencion" },
];
