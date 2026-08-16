# ReservaLab

Aplicación web para coordinar un laboratorio de computación escolar. Reúne una agenda de reservas, solicitudes de uso, tareas de soporte, estado de servicios e inventario de activos en una sola experiencia.

## Funciones principales

- Agenda semanal con bloques disponibles y ocupados.
- Formulario de solicitudes con validación de datos.
- Panel TI con indicadores, prioridades y acciones rápidas.
- Gestión de tareas, servicios e inventario.
- Modo demostración seguro con persistencia local.
- Modo institucional con autenticación, PostgreSQL, RLS y auditoría mediante Supabase.
- Diseño adaptable para escritorio y dispositivos móviles.

## Tecnologías

- React 19 y TypeScript
- Vite
- HTML y CSS
- Supabase / PostgreSQL
- Row Level Security (RLS)
- Vercel

## Ejecutar la demo local

```bash
cd soporte-suite
npm install
npm run dev
```

Abre `http://localhost:5174`. La agenda se encuentra en `http://localhost:5174/reservas/index.html`.

El modo predeterminado es una demo segura: los cambios del panel y las solicitudes se guardan únicamente en el navegador y pueden restablecerse desde el menú lateral.

## Conectar Supabase

1. Ejecuta `soporte-suite/supabase-suite.sql` y luego `supabase-setup.sql` en el SQL Editor de Supabase.
2. Copia `soporte-suite/.env.example` como `soporte-suite/.env` y completa las variables públicas.
3. Cambia `VITE_DATA_MODE=supabase` y `VITE_RESERVATION_DEMO=false` cuando quieras conectar ambos módulos.
4. Configura y despliega la función `supabase/functions/send-reservation-notification` si necesitas notificaciones por correo.

Las credenciales administrativas y las claves `service_role` nunca deben exponerse en el repositorio ni en el navegador. La clave publishable sólo es segura cuando las políticas RLS y los permisos de columnas están correctamente aplicados.

## Verificación

```bash
cd soporte-suite
npm run typecheck
npm run build
npm audit
```

## Estructura

- `soporte-suite/`: panel de administración construido con React y TypeScript.
- `soporte-suite/reservas/` y `soporte-suite/src/reservation-main.jsx`: agenda pública de reservas.
- `supabase-setup.sql`: reservas, solicitudes, políticas y funciones transaccionales.
- `soporte-suite/supabase-suite.sql`: tareas, servicios, activos, roles y auditoría.
- `supabase/functions/`: notificaciones de reservas mediante una Edge Function.

## Autor

Desarrollado por [Pietro Alvarez](https://github.com/PietroAlvarez) como proyecto de portafolio.
