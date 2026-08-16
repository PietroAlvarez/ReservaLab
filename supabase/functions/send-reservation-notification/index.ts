import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type ReservationItem = {
  id: string;
  profesor: string;
  correo: string;
  curso: string;
  fecha: string;
  bloque: number;
  estado: "aprobada" | "rechazada";
  motivo_rechazo: string | null;
  correo_estado: "pendiente" | "enviado" | "error";
};

const escapeHtml = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const formatDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("es-CL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const reservationRows = (items: ReservationItem[]) => items
  .slice()
  .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.bloque - b.bloque)
  .map((item) => `<tr>
    <td style="padding:8px;border-bottom:1px solid #e5e7eb">${escapeHtml(formatDate(item.fecha))}</td>
    <td style="padding:8px;border-bottom:1px solid #e5e7eb">Bloque ${item.bloque}</td>
    <td style="padding:8px;border-bottom:1px solid #e5e7eb"><strong>${escapeHtml(item.curso)}</strong></td>
  </tr>`)
  .join("");

const emailContent = (items: ReservationItem[]) => {
  const approved = items[0].estado === "aprobada";
  const count = items.length;
  const subject = approved
    ? count === 1 ? "Tu reserva fue aprobada" : `Tus ${count} reservas fueron aprobadas`
    : count === 1 ? "Tu solicitud de reserva fue rechazada" : `Tus ${count} solicitudes fueron rechazadas`;

  const reason = !approved && items.some((item) => item.motivo_rechazo)
    ? `<p><strong>Motivo:</strong> ${escapeHtml(items.find((item) => item.motivo_rechazo)?.motivo_rechazo)}</p>`
    : "";

  return {
    subject,
    html: `<h2>Reserva de laboratorio</h2>
      <p>Hola ${escapeHtml(items[0].profesor)},</p>
      <p>${approved
        ? count === 1 ? "Tu reserva fue aprobada." : "Las siguientes reservas fueron aprobadas:"
        : count === 1 ? "Tu solicitud no fue aprobada." : "Las siguientes solicitudes no fueron aprobadas:"}</p>
      ${reason}
      <table style="width:100%;border-collapse:collapse">
        <thead><tr><th style="padding:8px;text-align:left">Fecha</th><th style="padding:8px;text-align:left">Horario</th><th style="padding:8px;text-align:left">Curso</th></tr></thead>
        <tbody>${reservationRows(items)}</tbody>
      </table>`,
  };
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) throw new Error("No autorizado");

    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: userData } = await caller.auth.getUser();
    if (!userData.user) throw new Error("No autorizado");

    const body = (await request.json()) as { requestId?: string; requestIds?: string[] };
    const requestIds = [...new Set([
      ...(Array.isArray(body.requestIds) ? body.requestIds : []),
      ...(body.requestId ? [body.requestId] : []),
    ].filter(Boolean))];
    if (!requestIds.length) throw new Error("Falta requestId o requestIds");
    if (requestIds.length > 200) throw new Error("El lote supera el máximo de 200 solicitudes");

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data, error: requestError } = await admin
      .from("solicitudes_reserva")
      .select("id, profesor, correo, curso, fecha, bloque, estado, motivo_rechazo, correo_estado")
      .in("id", requestIds);

    if (requestError) throw requestError;
    if (!data || data.length !== requestIds.length) throw new Error("No se encontraron todas las solicitudes");

    const items = data as ReservationItem[];
    if (items.some((item) => item.estado !== "aprobada" && item.estado !== "rechazada")) {
      throw new Error("Una o más solicitudes aún no fueron revisadas");
    }

    // Una repetición segura no reenvía correos ya registrados como enviados.
    const pendingItems = items.filter((item) => item.correo_estado !== "enviado");
    if (!pendingItems.length) {
      return Response.json({ ok: true, sent: 0, alreadySent: items.length }, {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const groups = new Map<string, ReservationItem[]>();
    for (const item of pendingItems) {
      const key = `${item.estado}:${item.correo.toLowerCase()}`;
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("Falta configurar RESEND_API_KEY");

    const failures: string[] = [];
    let sent = 0;

    for (const group of groups.values()) {
      const ids = group.map((item) => item.id);
      try {
        const content = emailContent(group);
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Laboratorio <onboarding@resend.dev>",
            to: [group[0].correo],
            subject: content.subject,
            html: content.html,
          }),
        });

        const resendResult = (await resendResponse.json()) as { message?: string };
        if (!resendResponse.ok) throw new Error(resendResult.message || "Resend no pudo enviar el correo");

        await admin.from("solicitudes_reserva").update({
          correo_estado: "enviado",
          correo_error: null,
          correo_enviado_en: new Date().toISOString(),
        }).in("id", ids);
        sent += group.length;
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo enviar el correo";
        failures.push(`${group[0].correo}: ${message}`);
        await admin.from("solicitudes_reserva").update({
          correo_estado: "error",
          correo_error: message,
        }).in("id", ids);
      }
    }

    if (failures.length) {
      return Response.json({ ok: false, sent, errors: failures }, {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return Response.json({ ok: true, sent, emails: groups.size }, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo enviar el correo";
    return Response.json({ ok: false, error: message }, {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
