# Centro TI

Aplicación unificada para centralizar el trabajo diario de Soporte TI de un establecimiento educacional. Nació como **ReservaLab** y evolucionó hacia un centro de mando que reúne reservas, tareas, inventario, tablets y monitoreo de red.

## Funciones

- Dashboard operativo con indicadores de reservas, tareas, activos y tablets.
- Gestión de reservas del laboratorio de computación: creación, aprobación y cancelación.
- Gestión de tareas TI por área, prioridad, estado y avance.
- Inventario tecnológico con filtros y estados operativos.
- Registro, préstamo, devolución y mantenimiento de tablets.
- Evaluación de aplicaciones instaladas, versiones aprobadas y cumplimiento Android.
- Integración UniFi exclusivamente de lectura, con alertas de antenas apagadas o en estado anómalo en el resumen.
- Persistencia central mediante Spring Boot y PostgreSQL, con una base H2 durable para la prueba local.
- Copia local automática para seguir trabajando si el backend está temporalmente desconectado.
- Interfaz responsive con PrimeNG, barra lateral plegable y modos claro/oscuro persistentes.

## Tecnologías

- Angular 17, TypeScript, PrimeNG y PrimeFlex.
- Java 21, Spring Boot 3, Spring Data JPA y API REST.
- PostgreSQL en servidor y H2 persistente en desarrollo.
- Docker Compose para el despliegue privado en Linux.

## Ejecución local

Inicia primero el backend:

```powershell
cd backend
mvn spring-boot:run
```

En otra terminal inicia la interfaz:

```powershell
npm install
npm start
```

Abre `http://127.0.0.1:4300/`. El backend escucha en `http://127.0.0.1:8084/`.

La base local queda en `backend/data/` y no se versiona. Si el backend no está disponible, la interfaz cambia automáticamente a modo local y mantiene una copia en el navegador.

## Verificación

```powershell
npm run build:prod
cd backend
mvn test
```

## Despliegue

- La interfaz está preparada para GitHub Pages o Vercel.
- El backend y PostgreSQL se despliegan en el servidor Linux mediante `docker compose`.
- La clave de UniFi permanece únicamente en las variables privadas del backend.

Consulta [DEPLOY-LINUX.md](DEPLOY-LINUX.md) y [backend/README.md](backend/README.md) para la configuración.

## Historia de la fusión

La interfaz React/Supabase de ReservaLab fue retirada al consolidar el proyecto. Su historial completo y sus cambios previos permanecen recuperables en Git; la versión canónica es ahora Centro TI.

## Autor

Desarrollado por [Pietro Alvarez](https://github.com/PietroAlvarez).
