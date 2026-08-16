import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import "./reservation.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const demoMode = import.meta.env.VITE_RESERVATION_DEMO !== "false" || !supabaseUrl || !publishableKey;
const sb = demoMode ? null : createClient(supabaseUrl, publishableKey);

const BLOCKS = [
  [1, "8:00 - 8:45"], [2, "8:45 - 9:30"], [3, "9:30 - 10:15"],
  [4, "10:40 - 11:25"], [5, "11:25 - 12:10"], [6, "12:30 - 13:15"],
  [7, "13:15 - 14:00"], [8, "14:55 - 15:40"], [9, "15:40 - 16:25"],
].map(([id, label]) => ({ id, label }));
const DAY_NAMES = { 1: "Lun", 2: "Mar", 3: "Mié", 4: "Jue", 5: "Vie" };
const pad = (n) => String(n).padStart(2, "0");
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const copy = new Date(d); copy.setDate(copy.getDate() + n); return copy; };
const startOfWeek = (d) => { const copy = new Date(d); copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7)); copy.setHours(0, 0, 0, 0); return copy; };
const currentWeek = () => {
  const now = new Date();
  const localToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (localToday.getDay() === 6) return startOfWeek(addDays(localToday, 2));
  if (localToday.getDay() === 0) return startOfWeek(addDays(localToday, 1));
  return startOfWeek(localToday);
};
const demoReservations = () => {
  const week = currentWeek();
  return [
    { id: "demo-1", date: toISO(addDays(week, 1)), blockId: 2, course: "2B", createdAt: new Date().toISOString() },
    { id: "demo-2", date: toISO(addDays(week, 2)), blockId: 5, course: "4A", createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: "demo-3", date: toISO(addDays(week, 4)), blockId: 7, course: "3C", createdAt: new Date(Date.now() - 172800000).toISOString() },
  ];
};
const formatDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" });
const emptyRequest = () => ({ teacher: "", email: "", course: "", date: toISO(new Date()), blockId: "", comment: "" });

function App() {
  const [tab, setTab] = useState("agenda");
  const [weekAnchor, setWeekAnchor] = useState(currentWeek);
  const [reservations, setReservations] = useState([]);
  const [request, setRequest] = useState(emptyRequest);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const teacherIsValid = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]{3,60}$/.test(request.teacher.trim());
  const courseIsValid = /^\d{1,2}[A-Z]$/.test(request.course.trim());
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email.trim());
  const requestIsValid = teacherIsValid && courseIsValid && emailIsValid && request.date && request.blockId;

  const weekDays = useMemo(() => [0, 1, 2, 3, 4].map((offset) => addDays(weekAnchor, offset)), [weekAnchor]);
  const reservationMap = useMemo(() => new Map(reservations.map((r) => [`${r.date}-${r.blockId}`, r])), [reservations]);

  useEffect(() => { loadReservations(); }, []);
  useEffect(() => {
    if (demoMode || !sb) return undefined;
    const checkAdmin = async (session) => {
      if (!session) { setIsAdmin(false); return; }
      const { data } = await sb.from("suite_profiles").select("role").eq("id", session.user.id).maybeSingle();
      setIsAdmin(data?.role === "admin");
    };
    sb.auth.getSession().then(({ data }) => checkAdmin(data.session));
    const { data: listener } = sb.auth.onAuthStateChange((_event, next) => checkAdmin(next));
    return () => listener.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => setMessage(""), 5000);
    return () => window.clearTimeout(timer);
  }, [message]);

  async function loadReservations() {
    setLoading(true);
    if (demoMode || !sb) {
      setReservations(demoReservations());
      setLoading(false);
      return;
    }
    const { data, error } = await sb.from("reservas").select("id, fecha, bloque, curso, created_at").order("fecha").order("bloque");
    if (error) setMessage("No se pudo cargar la agenda: " + error.message);
    else setReservations((data || []).map((r) => ({ id: r.id, date: r.fecha, blockId: r.bloque, course: r.curso, createdAt: r.created_at })));
    setLoading(false);
  }

  function chooseSlot(date, blockId) {
    if (reservationMap.has(`${date}-${blockId}`)) return;
    setRequest((current) => ({ ...current, date, blockId: String(blockId) }));
    openRequest();
    setMessage("Bloque seleccionado. Completa y envía tu solicitud.");
  }

  function openAgenda() {
    setWeekAnchor(currentWeek());
    setTab("agenda");
    window.history.replaceState(null, "", window.location.pathname);
  }

  function openRequest() {
    setTab("solicitar");
    window.history.replaceState(null, "", window.location.pathname);
  }

  async function submitRequest(event) {
    event.preventDefault();
    if (!requestIsValid) { setMessage("Revisa los datos de la solicitud."); return; }
    setSaving(true);
    if (demoMode || !sb) {
      await new Promise((resolve) => window.setTimeout(resolve, 450));
      const saved = JSON.parse(window.localStorage.getItem("reservalab.demoRequests") || "[]");
      window.localStorage.setItem("reservalab.demoRequests", JSON.stringify([{ ...request, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...saved].slice(0, 10)));
      setSaving(false);
      setRequest(emptyRequest());
      setTab("agenda");
      setMessage("Solicitud demo registrada en este navegador. No se enviaron datos personales.");
      return;
    }
    const { error } = await sb.from("solicitudes_reserva").insert({
      fecha: request.date, bloque: Number(request.blockId), profesor: request.teacher.trim(),
      correo: request.email.trim().toLowerCase(), curso: request.course.trim(), comentario: request.comment.trim(),
    });
    setSaving(false);
    if (error) { setMessage("No se pudo enviar: " + error.message); return; }
    setRequest(emptyRequest());
    setTab("agenda");
    setMessage("Solicitud enviada. Recibirás un correo cuando sea revisada.");
  }

  const today = toISO(new Date());
  const upcomingReservations = reservations.filter((item) => item.date >= today).sort((a, b) => `${a.date}-${a.blockId}`.localeCompare(`${b.date}-${b.blockId}`)).slice(0, 4);
  const recentReservations = [...reservations].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))).slice(0, 4);

  return <div className="min-h-screen bg-[#081321] p-4 text-slate-100 md:p-6">
    <main className="mx-auto max-w-7xl space-y-4">
      <header className="rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl shadow-slate-950/30">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div><p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">Laboratorio de computación</p><h1 className="text-2xl font-bold text-white">ReservaLab</h1><p className="text-sm text-slate-400">Consulta la disponibilidad y envía tu solicitud.</p>{demoMode && <p className="mt-2 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-200">Demo segura · sin envíos externos</p>}</div>
          <nav className="flex flex-wrap gap-2">
            <button onClick={openAgenda} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === 'agenda' ? 'bg-cyan-300 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>Agenda</button>
            <button onClick={openRequest} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === 'solicitar' ? 'bg-cyan-300 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>Solicitar reserva</button>
            {(demoMode || isAdmin) && <a href="../index.html" className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-300/20">← Panel de gestión</a>}
          </nav>
        </div>
      </header>

      {tab === "agenda" && <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="overflow-x-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-slate-950/30">
          <div className="flex min-w-[700px] items-center justify-between border-b border-slate-700 px-3 py-3">
            <button onClick={() => setWeekAnchor((week) => addDays(week, -7))} className="rounded-lg px-2 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800">← Anterior</button>
            <div className="text-center"><p className="text-sm font-semibold text-white">Semana del {weekDays[0].getDate()}/{weekDays[0].getMonth() + 1} al {weekDays[4].getDate()}/{weekDays[4].getMonth() + 1}</p><button onClick={() => setWeekAnchor(currentWeek())} className="mt-1 text-xs font-semibold text-cyan-300 hover:text-cyan-100">Semana actual</button></div>
            <button onClick={() => setWeekAnchor((week) => addDays(week, 7))} className="rounded-lg px-2 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800">Siguiente →</button>
          </div>
          <div className="min-w-[700px]">
            <div className="grid grid-cols-[125px_repeat(5,1fr)] border-b border-slate-700 bg-slate-800/70 text-sm"><div className="p-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">Horario</div>{weekDays.map((day) => <div key={toISO(day)} className="p-2 text-center"><div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{DAY_NAMES[day.getDay()]}</div><div className="mt-1 text-base font-semibold leading-none tabular-nums text-white">{day.getDate()}<span className="ml-0.5 text-[11px] font-medium text-slate-400">/{day.getMonth() + 1}</span></div></div>)}</div>
            {BLOCKS.map((block) => <div key={block.id} className="grid grid-cols-[125px_repeat(5,1fr)] border-b border-slate-800"><div className="border-r border-slate-700 bg-slate-800/40 p-2"><div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Bloque {block.id}</div><div className="mt-1 font-mono text-xs font-semibold tabular-nums text-slate-200">{block.label}</div></div>{weekDays.map((day) => { const key = `${toISO(day)}-${block.id}`; const item = reservationMap.get(key); return <div key={key} className={`min-h-[70px] border-r border-slate-800 p-1.5 ${item ? 'bg-amber-400/10' : 'bg-emerald-400/5'}`}>{item ? <div className="p-1 text-[11px] text-slate-200"><p className="font-semibold text-white">Bloque ocupado</p><p>{item.course}</p><span className="mt-2 block font-medium text-amber-300">Reservado</span></div> : <button onClick={() => chooseSlot(toISO(day), block.id)} className="flex h-full w-full flex-col justify-between rounded-md p-1 text-left text-[11px] transition hover:bg-emerald-400/10 focus:outline-none focus:ring-1 focus:ring-cyan-300"><span className="font-medium text-emerald-200">Disponible</span><span className="text-slate-500">Solicitar</span></button>}</div>; })}</div>)}
          </div>
          <div className="border-t border-slate-800 p-3 text-center text-xs text-slate-400">{loading ? "Cargando agenda..." : "Los bloques disponibles se solicitan para revisión de soporte."}</div>
        </section>
        <aside className="space-y-4">
          <AgendaSummary title="Próximas reservas" subtitle="Los siguientes bloques a utilizar" items={upcomingReservations} empty="No hay próximas reservas." />
          <AgendaSummary title="Actividad reciente" subtitle="Últimas reservas registradas" items={recentReservations} empty="Aún no hay reservas registradas." />
        </aside>
      </div>}

      {tab === "solicitar" && <section className="mx-auto max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl shadow-slate-950/30"><h2 className="text-xl font-bold text-white">Solicitar una reserva</h2><p className="mt-1 text-sm text-slate-400">{demoMode ? "Esta demostración guarda la solicitud sólo en tu navegador. Usa datos ficticios." : "La reserva se confirmará por correo después de ser revisada."}</p><form onSubmit={submitRequest} className="mt-5 space-y-4">
        <Field label="Nombre del profesor" error={request.teacher && !teacherIsValid} hint="Mínimo 3 letras."><input required maxLength="60" value={request.teacher} onChange={(e) => setRequest({...request, teacher:e.target.value})} placeholder="Ej: Ana González" className={inputClass(request.teacher && !teacherIsValid)} /></Field>
        <Field label="Correo" error={request.email && !emailIsValid} hint="Aquí recibirás la respuesta."><input required type="email" value={request.email} onChange={(e) => setRequest({...request, email:e.target.value})} placeholder="nombre@correo.cl" className={inputClass(request.email && !emailIsValid)} /></Field>
        <Field label="Curso" error={request.course && !courseIsValid} hint="Formato: número y letra, por ejemplo 4E."><input required maxLength="3" value={request.course} onChange={(e) => setRequest({...request, course:e.target.value.toUpperCase()})} placeholder="4E" className={inputClass(request.course && !courseIsValid)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Fecha"><input required type="date" min={toISO(new Date())} value={request.date} onChange={(e) => setRequest({...request, date:e.target.value})} className={inputClass(false)} /></Field><Field label="Bloque"><select required value={request.blockId} onChange={(e) => setRequest({...request, blockId:e.target.value})} className={inputClass(false)}><option value="">Selecciona</option>{BLOCKS.map((block) => <option key={block.id} value={block.id}>Bloque {block.id} · {block.label}</option>)}</select></Field></div>
        <Field label="Comentario" hint="Opcional."><textarea maxLength="300" value={request.comment} onChange={(e) => setRequest({...request, comment:e.target.value})} className={inputClass(false)} rows="3" /></Field>
        <button disabled={saving || !requestIsValid} className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white">{saving ? "Enviando..." : "Enviar solicitud"}</button>
      </form></section>}

    </main>
    {message && <div role="status" className="fixed bottom-5 right-5 z-40 max-w-sm rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl">{message}</div>}
  </div>;
}

function AgendaSummary({ title, subtitle, items, empty }) { return <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-xl shadow-slate-950/20"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300">{title}</p><p className="mt-1 text-xs text-slate-400">{subtitle}</p><div className="mt-4 space-y-3">{items.length ? items.map((item) => <div key={`${title}-${item.id}`} className="border-l-2 border-cyan-300 pl-3"><p className="text-sm font-semibold text-white">Reserva confirmada <span className="font-medium text-cyan-200">· {item.course}</span></p><p className="mt-0.5 text-xs text-slate-400">{formatDate(item.date)} · Bloque {item.blockId}</p></div>) : <p className="rounded-lg bg-slate-800/70 p-3 text-sm text-slate-400">{empty}</p>}</div></section>; }
function inputClass(hasError) { return `mt-1 w-full rounded-xl border bg-slate-800 px-3 py-2 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-cyan-300 ${hasError ? "border-rose-500" : "border-slate-600"}`; }
function Field({ label, hint, error, children }) { return <label className="block text-sm font-medium text-slate-200">{label}{children}{hint && <span className={`mt-1 block text-xs ${error ? "text-rose-400" : "text-slate-500"}`}>{error ? "Revisa este campo." : hint}</span>}</label>; }

createRoot(document.getElementById("root")).render(<App />);
