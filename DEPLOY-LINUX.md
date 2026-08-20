# Despliegue privado en Linux

El backend queda enlazado a `127.0.0.1:8084`; no se expone directamente a Internet. La publicación definitiva debe hacerse detrás del proxy HTTPS y la autenticación del servidor.

1. Copiar `.env.example` a `.env` en el servidor.
2. Generar una contraseña de PostgreSQL larga.
3. Añadir la clave de UniFi Site Manager asociada a la cuenta de sólo lectura.
4. Ejecutar `docker compose up -d --build`.
5. Comprobar `curl http://127.0.0.1:8084/api/health`.
6. Comprobar `curl http://127.0.0.1:8084/api/network/overview`.

PostgreSQL mantiene el estado unificado del Centro TI en un volumen Docker. Antes de actualizar o migrar el servidor, genera un respaldo del volumen `centro_ti_postgres`.

La integración UniFi implementa únicamente `GET /v1/sites`. Aunque la cuenta cambie de permisos, este backend no posee métodos para reiniciar equipos, editar redes ni administrar usuarios.

No publiques `.env` ni pegues la clave UniFi dentro de archivos versionados.
