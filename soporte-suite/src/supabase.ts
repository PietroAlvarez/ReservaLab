import { createClient } from "@supabase/supabase-js";
import type { Asset, ManagedService, SupportTask } from "./types";

export const remoteMode = import.meta.env.VITE_DATA_MODE === "supabase";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = remoteMode && supabaseUrl && publishableKey
  ? createClient(supabaseUrl, publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

export const backendConfigured = !remoteMode || Boolean(supabase);

export const taskFromRow = (row: Record<string, unknown>): SupportTask => ({
  id: String(row.id),
  title: String(row.title),
  category: row.category as SupportTask["category"],
  priority: row.priority as SupportTask["priority"],
  status: row.status as SupportTask["status"],
  dueDate: String(row.due_date),
});

export const taskToRow = (task: SupportTask) => ({
  id: task.id,
  title: task.title,
  category: task.category,
  priority: task.priority,
  status: task.status,
  due_date: task.dueDate,
});

export const serviceFromRow = (row: Record<string, unknown>): ManagedService => ({
  id: String(row.id),
  name: String(row.name),
  description: String(row.description),
  status: row.status as ManagedService["status"],
  checkedAt: row.checked_at ? `Actualizado ${new Date(String(row.checked_at)).toLocaleString("es-CL")}` : "Sin revisión registrada",
});

export const serviceToRow = (service: ManagedService) => ({
  id: service.id,
  name: service.name,
  description: service.description,
  status: service.status,
  checked_at: new Date().toISOString(),
});

export const assetFromRow = (row: Record<string, unknown>): Asset => ({
  id: String(row.id),
  code: String(row.code),
  name: String(row.name),
  type: String(row.type),
  location: String(row.location),
  status: row.status as Asset["status"],
});

export const assetToRow = (asset: Asset) => ({
  id: asset.id,
  code: asset.code,
  name: asset.name,
  type: asset.type,
  location: asset.location,
  status: asset.status,
});
