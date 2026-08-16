# ReservaLab — Panel de gestión TI

Este directorio contiene el panel React + TypeScript de ReservaLab. La documentación principal, las instrucciones de la demo y la configuración completa de Supabase están en [`../README.md`](../README.md).

Primera versión del centro de operaciones para soporte informático.

## Incluye

- Panel diario con tareas, avisos de servicios y activos.
- Gestión de tareas para red, correo, sitio web, reservas e inventario.
- Estado manual de red, correo institucional, sitio web y reservas.
- Inventario básico con búsqueda y registro de activos.
- Diseño responsive para escritorio y teléfono.
- Enlace configurable al sistema de reservas existente.

## Ejecutar

```powershell
npm install
npm run dev
```

Abre `http://localhost:5174`.

Para verificar producción:

```powershell
npm run typecheck
npm run build
npm run preview
```

## Configuración

Copia `.env.example` como `.env` y ajusta `VITE_RESERVAS_URL` cuando la app de reservas tenga una URL publicada.

## Modos de datos

- `VITE_DATA_MODE=local`: prototipo sin inicio de sesión; guarda datos en el navegador.
- `VITE_DATA_MODE=supabase`: exige autenticación, verifica el rol y sincroniza tareas, servicios y activos.

El archivo `.env` está inicialmente en modo `local` para que la aplicación continúe funcionando hasta terminar la configuración remota.

## Activar Supabase

1. Ejecuta `supabase-suite.sql` completo en **Supabase > SQL Editor**.
2. En **Authentication > Users**, confirma que tu usuario de soporte existe.
3. En SQL Editor ejecuta lo siguiente, reemplazando el correo:

```sql
insert into public.suite_profiles (id, display_name, role)
select id, coalesce(raw_user_meta_data->>'name', email), 'admin'
from auth.users
where email = 'TU_CORREO_DE_SOPORTE'
on conflict (id) do update set role = 'admin';
```

4. Cambia en `.env`:

```text
VITE_DATA_MODE=supabase
```

5. Reinicia `npm run dev` e inicia sesión.

Las tablas tienen RLS; sólo perfiles `admin` o `soporte` pueden leer y modificar los datos. Cada inserción, cambio o eliminación queda registrada en `suite_audit_logs`.

## Estado de seguridad

El modo local es un prototipo funcional y no debe guardar datos sensibles. El modo Supabase incorpora autenticación, roles, RLS y auditoría, pero aún requiere MFA, pruebas de recuperación y revisión de seguridad antes de considerarlo producción institucional.

Antes de producción se debe implementar:

1. MFA obligatorio para soporte.
2. Copias de seguridad y restauración probada.
3. Conectores de sólo lectura para los servicios externos.
4. PWA con caché controlada y notificaciones push.
5. Pruebas de accesibilidad WCAG 2.2 AA y seguridad OWASP ASVS.
