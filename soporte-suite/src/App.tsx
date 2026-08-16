import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Activity,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  ExternalLink,
  Globe2,
  LayoutDashboard,
  Mail,
  Menu,
  Network,
  Plus,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { initialAssets, initialServices, initialTasks } from "./data";
import type { Asset, ManagedService, ReservationRequest, Section, SupportTask, TaskPriority } from "./types";
import { usePersistentState } from "./usePersistentState";
import {
  assetFromRow,
  assetToRow,
  backendConfigured,
  remoteMode,
  serviceFromRow,
  serviceToRow,
  supabase,
  taskFromRow,
  taskToRow,
} from "./supabase";

const sectionLabels: Record<Section, string> = {
  inicio: "Centro de operaciones",
  tareas: "Tareas y solicitudes",
  servicios: "Estado de servicios",
  inventario: "Inventario de activos",
};

const navItems = [
  { id: "inicio" as const, label: "Inicio", icon: LayoutDashboard },
  { id: "tareas" as const, label: "Tareas", icon: ClipboardList },
  { id: "servicios" as const, label: "Servicios", icon: Activity },
  { id: "inventario" as const, label: "Inventario", icon: Boxes },
];

const localDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const prettyDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("es-CL", {
  day: "2-digit",
  month: "short",
});
const formatFullDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("es-CL", { weekday: "short", day: "2-digit", month: "short" });
const reservationRequestFromRow = (row: Record<string, unknown>): ReservationRequest => ({ id: String(row.id), date: String(row.fecha), blockId: Number(row.bloque), teacher: String(row.profesor), email: String(row.correo), course: String(row.curso), comment: String(row.comentario || ""), createdAt: String(row.created_at) });

export default function App() {
  const [section, setSection] = useState<Section>("inicio");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tasks, setTasks] = usePersistentState("support-suite.tasks", initialTasks);
  const [services, setServices] = usePersistentState("support-suite.services", initialServices);
  const [assets, setAssets] = usePersistentState("support-suite.assets", initialAssets);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!remoteMode);
  const [backendLoading, setBackendLoading] = useState(false);
  const [backendError, setBackendError] = useState("");
  const [backendNotice, setBackendNotice] = useState("");
  const [reservationRequests, setReservationRequests] = useState<ReservationRequest[]>([]);

  useEffect(() => {
    if (!remoteMode || !supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!remoteMode || !supabase || !session) return;
    const client = supabase;
    let active = true;
    const loadRemoteData = async () => {
      setBackendLoading(true);
      setBackendError("");
      const profileResult = await client.from("suite_profiles").select("role").eq("id", session.user.id).maybeSingle();
      if (!active) return;
      if (profileResult.error || !profileResult.data || !["admin", "soporte"].includes(profileResult.data.role)) {
        setBackendError("Tu cuenta existe, pero aún no tiene el rol de soporte en suite_profiles.");
        setBackendLoading(false);
        return;
      }
      const [taskResult, serviceResult, assetResult, reservationResult] = await Promise.all([
        client.from("suite_tasks").select("*").order("due_date"),
        client.from("suite_services").select("*").order("name"),
        client.from("suite_assets").select("*").order("code"),
        client.from("solicitudes_reserva").select("id, fecha, bloque, profesor, correo, curso, comentario, created_at").eq("estado", "pendiente").order("created_at"),
      ]);
      if (!active) return;
      const firstError = taskResult.error || serviceResult.error || assetResult.error || reservationResult.error;
      if (firstError) setBackendError(`No se pudieron cargar los datos: ${firstError.message}`);
      else {
        setTasks((taskResult.data || []).map((row) => taskFromRow(row)));
        setServices((serviceResult.data || []).map((row) => serviceFromRow(row)));
        setAssets((assetResult.data || []).map((row) => assetFromRow(row)));
        setReservationRequests((reservationResult.data || []).map((row) => reservationRequestFromRow(row)));
      }
      setBackendLoading(false);
    };
    void loadRemoteData();
    return () => { active = false; };
  }, [session]);

  useEffect(() => {
    if (!remoteMode || !supabase || !session) return;
    const client = supabase;
    const refreshPending = async () => {
      const { data, error } = await client.from("solicitudes_reserva").select("id, fecha, bloque, profesor, correo, curso, comentario, created_at").eq("estado", "pendiente").order("created_at");
      if (!error) setReservationRequests((data || []).map((row) => reservationRequestFromRow(row)));
    };
    const timer = window.setInterval(() => void refreshPending(), 30000);
    window.addEventListener("focus", refreshPending);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshPending);
    };
  }, [session]);

  const sync = async <T extends { id: string }>(table: string, before: T[], after: T[], mapRow: (item: T) => Record<string, unknown>) => {
    if (!remoteMode || !supabase) return;
    const changed = after.filter((item) => JSON.stringify(before.find((old) => old.id === item.id)) !== JSON.stringify(item));
    const removed = before.filter((item) => !after.some((next) => next.id === item.id));
    if (changed.length) {
      const { error } = await supabase.from(table).upsert(changed.map(mapRow));
      if (error) setBackendError(`No se pudo sincronizar: ${error.message}`);
    }
    if (removed.length) {
      const { error } = await supabase.from(table).delete().in("id", removed.map((item) => item.id));
      if (error) setBackendError(`No se pudo eliminar: ${error.message}`);
    }
  };

  const updateTasks: Dispatch<SetStateAction<SupportTask[]>> = (action) => {
    const next = typeof action === "function" ? action(tasks) : action;
    setTasks(next);
    void sync("suite_tasks", tasks, next, taskToRow);
  };
  const updateServices: Dispatch<SetStateAction<ManagedService[]>> = (action) => {
    const next = typeof action === "function" ? action(services) : action;
    setServices(next);
    void sync("suite_services", services, next, serviceToRow);
  };
  const updateAssets: Dispatch<SetStateAction<Asset[]>> = (action) => {
    const next = typeof action === "function" ? action(assets) : action;
    setAssets(next);
    void sync("suite_assets", assets, next, assetToRow);
  };

  const reviewReservation = async (item: ReservationRequest, decision: "approve" | "reject") => {
    if (!supabase) return;
    let reason = "";
    if (decision === "reject") {
      const entered = window.prompt("Motivo del rechazo (opcional):");
      if (entered === null) return;
      reason = entered.trim();
    }
    setBackendLoading(true);
    setBackendError("");
    setBackendNotice("");
    const result = decision === "approve"
      ? await supabase.rpc("aprobar_solicitud_reserva", { solicitud_id: item.id })
      : await supabase.rpc("rechazar_solicitud_reserva", { solicitud_id: item.id, motivo: reason });
    if (result.error) {
      setBackendError(result.error.code === "23505" ? "Ese bloque ya fue reservado; recarga las solicitudes." : result.error.message);
      setBackendLoading(false);
      return;
    }
    const notification = await supabase.functions.invoke("send-reservation-notification", { body: { requestId: item.id } });
    setReservationRequests((current) => current.filter((request) => request.id !== item.id));
    setBackendNotice(notification.error
      ? `Solicitud ${decision === "approve" ? "aprobada" : "rechazada"}; el correo no pudo enviarse.`
      : `Solicitud ${decision === "approve" ? "aprobada" : "rechazada"} y correo procesado.`);
    setBackendLoading(false);
  };

  const approveReservationBatch = async (items: ReservationRequest[]) => {
    if (!supabase || !items.length) return false;
    const ids = items.map((item) => item.id);
    setBackendLoading(true);
    setBackendError("");
    setBackendNotice("");

    const result = await supabase.rpc("aprobar_solicitudes_reserva", { solicitud_ids: ids });
    if (result.error) {
      setBackendError(result.error.code === "23505"
        ? "No se aprobó el lote: uno de los bloques ya está reservado. La agenda no fue modificada."
        : result.error.message);
      setBackendLoading(false);
      return false;
    }

    const notification = await supabase.functions.invoke("send-reservation-notification", {
      body: { requestIds: ids },
    });
    setReservationRequests((current) => current.filter((request) => !ids.includes(request.id)));
    setBackendNotice(notification.error
      ? `Se aprobaron ${items.length} reservas, pero el correo resumen no pudo enviarse.`
      : `Se aprobaron ${items.length} reservas y se envió un correo resumen por profesor.`);
    setBackendLoading(false);
    return true;
  };

  const openTasks = tasks.filter((task) => task.status !== "completada");
  const incidents = services.filter((service) => service.status !== "operativo");
  const maintenanceAssets = assets.filter((asset) => asset.status === "mantencion");

  const goTo = (next: Section) => {
    setSection(next);
    setMobileMenu(false);
  };

  const openSidebar = () => {
    setSidebarCollapsed(false);
    setMobileMenu(true);
  };

  const closeSidebar = () => {
    setSidebarCollapsed(true);
    setMobileMenu(false);
  };

  if (!backendConfigured) return <SetupScreen />;
  if (remoteMode && !authReady) return <LoadingScreen text="Comprobando sesión segura..." />;
  if (remoteMode && !session) return <LoginScreen />;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "sidebar--open" : ""} ${sidebarCollapsed ? "sidebar--collapsed" : ""}`}>
        <div className="brand">
          <span className="brand__mark"><ShieldCheck size={22} /></span>
          <div><strong>ReservaLab</strong><small>Gestión de laboratorio TI</small></div>
          <button className="icon-button sidebar__close" onClick={closeSidebar} aria-label="Ocultar menú lateral" title="Ocultar menú"><X size={20} /></button>
        </div>
        <nav className="navigation" aria-label="Navegación principal">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={section === id ? "navigation__item navigation__item--active" : "navigation__item"} onClick={() => goTo(id)}>
              <Icon size={18} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar__footer">
          <span className={remoteMode ? "status-dot status-dot--online" : "status-dot"} />
          <div><strong>{remoteMode ? "Supabase conectado" : "Demo interactiva"}</strong><small>{remoteMode ? "Datos institucionales sincronizados" : "Los cambios se guardan sólo en este navegador"}</small></div>
        </div>
        {!remoteMode && <button className="signout-button" onClick={() => {
          ["support-suite.tasks", "support-suite.services", "support-suite.assets"].forEach((key) => window.localStorage.removeItem(key));
          window.location.reload();
        }}>Restablecer datos demo</button>}
        {remoteMode && <button className="signout-button" onClick={() => supabase?.auth.signOut()}>Cerrar sesión</button>}
      </aside>

      {mobileMenu && <button className="backdrop" onClick={() => setMobileMenu(false)} aria-label="Cerrar menú" />}

      <div className={sidebarCollapsed ? "workspace workspace--expanded" : "workspace"}>
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={openSidebar} aria-label="Abrir menú lateral" title="Abrir menú"><Menu size={21} /></button>
          <div><span className="eyebrow">{remoteMode ? "Panel privado" : "Portafolio · Demo funcional"}</span><h1>{sectionLabels[section]}</h1></div>
          <div className="topbar__meta"><span>{new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })}</span><div className="avatar" aria-label="ReservaLab">RL</div></div>
        </header>

        <main className="content">
          {backendError && <div className="error-banner" role="alert"><CircleAlert size={18} /><span>{backendError}</span>{session && <button onClick={() => supabase?.auth.signOut()}>Cerrar sesión</button>}</div>}
          {backendNotice && <div className="notice-banner" role="status"><CheckCircle2 size={18} /><span>{backendNotice}</span><button onClick={() => setBackendNotice("")} aria-label="Cerrar aviso"><X size={15} /></button></div>}
          {backendLoading && <div className="sync-banner"><Activity size={17} /> Sincronizando datos…</div>}
          {section === "inicio" && <Dashboard tasks={openTasks} services={services} assets={assets} incidents={incidents.length} maintenance={maintenanceAssets.length} reservationRequests={reservationRequests} onReviewReservation={reviewReservation} onApproveReservationBatch={approveReservationBatch} onNavigate={goTo} />}
          {section === "tareas" && <TasksView tasks={tasks} setTasks={updateTasks} />}
          {section === "servicios" && <ServicesView services={services} setServices={updateServices} />}
          {section === "inventario" && <InventoryView assets={assets} setAssets={updateAssets} />}
        </main>
      </div>
    </div>
  );
}

function Dashboard({ tasks, services, assets, incidents, maintenance, reservationRequests, onReviewReservation, onApproveReservationBatch, onNavigate }: {
  tasks: SupportTask[];
  services: ManagedService[];
  assets: Asset[];
  incidents: number;
  maintenance: number;
  reservationRequests: ReservationRequest[];
  onReviewReservation: (item: ReservationRequest, decision: "approve" | "reject") => void;
  onApproveReservationBatch: (items: ReservationRequest[]) => Promise<boolean>;
  onNavigate: (section: Section) => void;
}) {
  const today = localDate();
  const dueToday = tasks.filter((task) => task.dueDate <= today).length;
  const reservationUrl = import.meta.env.VITE_RESERVAS_URL || "/reservas/index.html";

  return <>
    <section className="hero">
      <div><span className="eyebrow eyebrow--cyan">Operación centralizada</span><h2>Reservas, soporte e inventario en un solo lugar.</h2><p>Una solución para coordinar el laboratorio y priorizar el trabajo diario del equipo TI.</p></div>
      <a className="primary-action" href={reservationUrl}><CalendarDays size={18} /> Abrir reservas <ExternalLink size={15} /></a>
    </section>

    {reservationRequests.length > 0 && <ReservationQueue items={reservationRequests} onReview={onReviewReservation} onApproveBatch={onApproveReservationBatch} />}

    <section className="metrics" aria-label="Indicadores principales">
      <Metric icon={ClipboardList} label="Tareas abiertas" value={tasks.length} note={`${dueToday} requieren atención hoy`} tone="cyan" />
      <Metric icon={CircleAlert} label="Servicios con aviso" value={incidents} note={`${services.length - incidents} operativos`} tone="amber" />
      <Metric icon={Boxes} label="Activos registrados" value={assets.length} note={`${maintenance} en mantención`} tone="violet" />
    </section>

    <div className="dashboard-grid">
      <Panel title="Prioridades" subtitle="Tareas abiertas más próximas" action="Ver todas" onAction={() => onNavigate("tareas")}>
        <div className="stack-list">
          {tasks.slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 4).map((task) => <TaskRow key={task.id} task={task} />)}
          {!tasks.length && <EmptyState text="No tienes tareas pendientes." />}
        </div>
      </Panel>
      <Panel title="Servicios esenciales" subtitle="Último estado registrado" action="Gestionar" onAction={() => onNavigate("servicios")}>
        <div className="stack-list">
          {services.map((service) => <ServiceRow key={service.id} service={service} />)}
        </div>
      </Panel>
    </div>

    <section className="quick-actions">
      <button onClick={() => onNavigate("tareas")}><Mail size={20} /><span><strong>Consultas y correos</strong><small>Registrar una nueva tarea</small></span><ChevronRight size={18} /></button>
      <button onClick={() => onNavigate("servicios")}><Network size={20} /><span><strong>Revisar la red</strong><small>Actualizar estado manual</small></span><ChevronRight size={18} /></button>
      <button onClick={() => onNavigate("inventario")}><Boxes size={20} /><span><strong>Registrar activo</strong><small>Agregar equipo al inventario</small></span><ChevronRight size={18} /></button>
    </section>
  </>;
}

function TasksView({ tasks, setTasks }: { tasks: SupportTask[]; setTasks: React.Dispatch<React.SetStateAction<SupportTask[]>> }) {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("todas");
  const visible = filter === "todas" ? tasks : tasks.filter((task) => task.status === filter);

  const toggleTask = (id: string) => setTasks((current) => current.map((task) => task.id === id ? { ...task, status: task.status === "completada" ? "pendiente" : "completada" } : task));

  return <>
    <ViewHeading title="Tareas y solicitudes" description="Correos, mantenimientos, publicaciones y trabajo diario." action="Nueva tarea" onAction={() => setShowForm(true)} />
    {showForm && <TaskForm onCancel={() => setShowForm(false)} onCreate={(task) => { setTasks((current) => [task, ...current]); setShowForm(false); }} />}
    <section className="panel">
      <div className="toolbar"><div className="filter-tabs">{[["todas", "Todas"], ["pendiente", "Pendientes"], ["en_progreso", "En progreso"], ["completada", "Completadas"]].map(([id, label]) => <button key={id} className={filter === id ? "active" : ""} onClick={() => setFilter(id)}>{label}</button>)}</div></div>
      <div className="task-table">
        {visible.map((task) => <div className="task-item" key={task.id}><button className={task.status === "completada" ? "task-check task-check--done" : "task-check"} onClick={() => toggleTask(task.id)} aria-label="Cambiar estado"><CheckCircle2 size={19} /></button><div className="task-item__main"><strong>{task.title}</strong><span>{task.category}</span></div><PriorityBadge priority={task.priority} /><time dateTime={task.dueDate}>{prettyDate(task.dueDate)}</time></div>)}
        {!visible.length && <EmptyState text="No hay tareas en esta categoría." />}
      </div>
    </section>
  </>;
}

function TaskForm({ onCreate, onCancel }: { onCreate: (task: SupportTask) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ title: "", category: "General" as SupportTask["category"], priority: "media" as TaskPriority, dueDate: localDate() });
  const submit = (event: FormEvent) => { event.preventDefault(); if (!form.title.trim()) return; onCreate({ id: crypto.randomUUID(), ...form, title: form.title.trim(), status: "pendiente" }); };
  return <form className="inline-form" onSubmit={submit}><div className="form-grid"><label>Tarea<input autoFocus required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej: Crear cuenta institucional" /></label><label>Categoría<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as SupportTask["category"] })}>{["Red", "Correo", "Sitio web", "Reservas", "Inventario", "General"].map((value) => <option key={value}>{value}</option>)}</select></label><label>Prioridad<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select></label><label>Fecha<input type="date" required value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></label></div><div className="form-actions"><button type="button" className="secondary-button" onClick={onCancel}>Cancelar</button><button className="primary-button">Guardar tarea</button></div></form>;
}

function ServicesView({ services, setServices }: { services: ManagedService[]; setServices: React.Dispatch<React.SetStateAction<ManagedService[]>> }) {
  const updateStatus = (id: string, status: ManagedService["status"]) => setServices((current) => current.map((service) => service.id === id ? { ...service, status, checkedAt: `Actualizado ${new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}` } : service));
  const icons = { network: Network, mail: Mail, website: Globe2, reservations: CalendarDays };
  return <><ViewHeading title="Estado de servicios" description="Un registro manual inicial; después conectaremos monitoreo automático." /><div className="service-grid">{services.map((service) => { const Icon = icons[service.id as keyof typeof icons] || Activity; return <article className="service-card" key={service.id}><div className="service-card__top"><span className="service-icon"><Icon size={22} /></span><StatusBadge status={service.status} /></div><h3>{service.name}</h3><p>{service.description}</p><label>Estado actual<select value={service.status} onChange={(e) => updateStatus(service.id, e.target.value as ManagedService["status"])}><option value="operativo">Operativo</option><option value="atencion">Requiere atención</option><option value="incidente">Incidente</option></select></label><small>{service.checkedAt}</small></article>; })}</div></>;
}

function InventoryView({ assets, setAssets }: { assets: Asset[]; setAssets: React.Dispatch<React.SetStateAction<Asset[]>> }) {
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => assets.filter((asset) => `${asset.code} ${asset.name} ${asset.location}`.toLowerCase().includes(query.toLowerCase())), [assets, query]);
  return <><ViewHeading title="Inventario de activos" description="Equipos, estado y ubicación dentro del establecimiento." action="Nuevo activo" onAction={() => setShowForm(true)} />{showForm && <AssetForm onCancel={() => setShowForm(false)} onCreate={(asset) => { setAssets((current) => [asset, ...current]); setShowForm(false); }} />}<section className="panel"><div className="toolbar"><label className="search-box"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por código, equipo o ubicación" /></label><span>{filtered.length} activos</span></div><div className="asset-table"><div className="asset-row asset-row--header"><span>Código</span><span>Equipo</span><span>Ubicación</span><span>Estado</span></div>{filtered.map((asset) => <div className="asset-row" key={asset.id}><strong>{asset.code}</strong><span><b>{asset.name}</b><small>{asset.type}</small></span><span>{asset.location}</span><AssetStatus status={asset.status} /></div>)}{!filtered.length && <EmptyState text="No se encontraron activos." />}</div></section></>;
}

function AssetForm({ onCreate, onCancel }: { onCreate: (asset: Asset) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ code: "", name: "", type: "", location: "", status: "disponible" as Asset["status"] });
  const submit = (event: FormEvent) => { event.preventDefault(); if (!form.code.trim() || !form.name.trim()) return; onCreate({ id: crypto.randomUUID(), ...form }); };
  return <form className="inline-form" onSubmit={submit}><div className="form-grid"><label>Código<input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="NB-001" /></label><label>Equipo<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Notebook Lenovo" /></label><label>Tipo<input required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="Notebook" /></label><label>Ubicación<input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Laboratorio" /></label></div><div className="form-actions"><button type="button" className="secondary-button" onClick={onCancel}>Cancelar</button><button className="primary-button">Guardar activo</button></div></form>;
}

function ViewHeading({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction?: () => void }) { return <div className="view-heading"><div><h2>{title}</h2><p>{description}</p></div>{action && <button className="primary-button" onClick={onAction}><Plus size={17} />{action}</button>}</div>; }
function ReservationQueue({ items, onReview, onApproveBatch }: {
  items: ReservationRequest[];
  onReview: (item: ReservationRequest, decision: "approve" | "reject") => void;
  onApproveBatch: (items: ReservationRequest[]) => Promise<boolean>;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);
  const visibleItems = expanded ? items : items.slice(0, 5);
  const selectedItems = items.filter((item) => selectedIds.has(item.id));
  const allSelected = items.length > 0 && selectedItems.length === items.length;

  useEffect(() => {
    const available = new Set(items.map((item) => item.id));
    setSelectedIds((current) => new Set([...current].filter((id) => available.has(id))));
  }, [items]);

  const toggleOne = (id: string) => setSelectedIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(items.map((item) => item.id)));

  const approveSelected = async () => {
    if (!selectedItems.length) return;
    const recipients = new Set(selectedItems.map((item) => item.email.toLowerCase())).size;
    const confirmed = window.confirm(
      `Se aprobarán ${selectedItems.length} reservas y se enviará ${recipients === 1 ? "un correo resumen" : `un correo resumen a cada uno de los ${recipients} profesores`}. ¿Continuar?`,
    );
    if (!confirmed) return;
    if (await onApproveBatch(selectedItems)) setSelectedIds(new Set());
  };

  return <section className="reservation-queue">
    <div className="reservation-queue__heading">
      <div><span className="reservation-count">{items.length}</span><div><h3>Reservas pendientes</h3><p>Selecciona varias para aprobarlas con una sola notificación.</p></div></div>
      <a href={import.meta.env.VITE_RESERVAS_URL || "/reservas/index.html"}>Ver agenda <ExternalLink size={14} /></a>
    </div>
    <div className="reservation-bulk">
      <button type="button" onClick={toggleAll}>{allSelected ? "Quitar selección" : "Seleccionar todas"}</button>
      <span>{selectedItems.length} seleccionadas</span>
      <button type="button" className="reservation-bulk__approve" disabled={!selectedItems.length} onClick={approveSelected}>Aprobar seleccionadas</button>
    </div>
    <div className="reservation-queue__list">
      {visibleItems.map((item) => <article key={item.id}>
        <label className="reservation-select" title="Seleccionar solicitud">
          <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleOne(item.id)} />
          <span className="sr-only">Seleccionar reserva de {item.course}, bloque {item.blockId}</span>
        </label>
        <div className="reservation-details"><strong>{item.teacher} <span>· {item.course}</span></strong><p>{formatFullDate(item.date)} · Bloque {item.blockId}</p><small>{item.email}{item.comment ? ` · “${item.comment}”` : ""}</small></div>
        <div className="reservation-actions"><button onClick={() => onReview(item, "reject")}>Rechazar</button><button className="approve" onClick={() => onReview(item, "approve")}>Aprobar</button></div>
      </article>)}
    </div>
    {items.length > 5 && <button type="button" className="reservation-queue__more" onClick={() => setExpanded((current) => !current)}>{expanded ? "Mostrar menos" : `Mostrar ${items.length - 5} solicitudes más`}</button>}
  </section>;
}
function Panel({ title, subtitle, action, onAction, children }: { title: string; subtitle: string; action: string; onAction: () => void; children: React.ReactNode }) { return <section className="panel"><div className="panel__heading"><div><h3>{title}</h3><p>{subtitle}</p></div><button onClick={onAction}>{action}<ChevronRight size={15} /></button></div>{children}</section>; }
function Metric({ icon: Icon, label, value, note, tone }: { icon: typeof Activity; label: string; value: number; note: string; tone: string }) { return <article className="metric"><span className={`metric__icon metric__icon--${tone}`}><Icon size={21} /></span><div><small>{label}</small><strong>{value}</strong><p>{note}</p></div></article>; }
function TaskRow({ task }: { task: SupportTask }) { return <div className="list-row"><span className={`priority-dot priority-dot--${task.priority}`} /><div><strong>{task.title}</strong><small>{task.category} · vence {prettyDate(task.dueDate)}</small></div><PriorityBadge priority={task.priority} /></div>; }
function ServiceRow({ service }: { service: ManagedService }) { return <div className="list-row"><span className={`health-dot health-dot--${service.status}`} /><div><strong>{service.name}</strong><small>{service.checkedAt}</small></div><StatusBadge status={service.status} /></div>; }
function PriorityBadge({ priority }: { priority: TaskPriority }) { return <span className={`badge badge--priority-${priority}`}>{priority}</span>; }
function StatusBadge({ status }: { status: ManagedService["status"] }) { const labels = { operativo: "Operativo", atencion: "Atención", incidente: "Incidente" }; return <span className={`badge badge--${status}`}>{labels[status]}</span>; }
function AssetStatus({ status }: { status: Asset["status"] }) { const labels = { disponible: "Disponible", asignado: "Asignado", mantencion: "Mantención", baja: "Baja" }; return <span className={`badge badge--asset-${status}`}>{labels[status]}</span>; }
function EmptyState({ text }: { text: string }) { return <div className="empty-state"><CheckCircle2 size={22} /><p>{text}</p></div>; }

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError("");
    const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (result.error) setError("No se pudo iniciar sesión. Revisa el correo y la contraseña.");
    setLoading(false);
  };
  return <main className="auth-screen"><section className="auth-card"><span className="brand__mark"><ShieldCheck size={24} /></span><span className="eyebrow eyebrow--cyan">Acceso privado</span><h1>ReservaLab</h1><p>Ingresa con la cuenta autorizada para gestionar las operaciones TI.</p><form onSubmit={submit}><label>Correo institucional<input type="email" required autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Contraseña<input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <div className="auth-error" role="alert">{error}</div>}<button className="primary-button" disabled={loading}>{loading ? "Ingresando…" : "Ingresar"}</button></form></section></main>;
}

function SetupScreen() { return <main className="auth-screen"><section className="auth-card"><span className="brand__mark"><CircleAlert size={24} /></span><h1>Falta configuración</h1><p>El modo Supabase está activo, pero faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en el archivo .env.</p></section></main>; }
function LoadingScreen({ text }: { text: string }) { return <main className="auth-screen"><section className="loading-card"><Activity size={24} /><p>{text}</p></section></main>; }
