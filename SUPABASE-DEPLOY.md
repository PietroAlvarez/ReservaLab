# Activación de solicitudes y correos

1. Ejecuta primero `soporte-suite/supabase-suite.sql` y después `supabase-setup.sql` en **Supabase > SQL Editor**. Además del esquema inicial, estos archivos instalan roles privados, RLS, auditoría y la aprobación transaccional de reservas.
2. En **Authentication > Users**, crea el usuario de soporte con correo y contraseña.
3. En **Edge Functions > Secrets**, guarda `RESEND_API_KEY`. No la pongas en archivos `.env` del frontend.
4. Vuelve a desplegar `send-reservation-notification` con el contenido de `supabase/functions/send-reservation-notification/index.ts`. La función acepta una solicitud individual o un lote y envía un solo resumen por destinatario.
5. Configura `VITE_DATA_MODE=supabase` y `VITE_RESERVATION_DEMO=false`, y publica nuevamente la aplicación.

La aprobación del lote es atómica: si una solicitud ya fue revisada o un bloque está ocupado, no se agrega ninguna reserva del grupo.

Para enviar a correos reales de profesores debes verificar un dominio remitente en Resend y reemplazar `onboarding@resend.dev` por una dirección de ese dominio. Mientras uses el remitente de prueba de Resend, la entrega a destinatarios reales puede estar restringida.
