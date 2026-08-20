# Centro TI API

Backend Java 21 + Spring Boot para el centro de mando. La prueba local usa una base H2 persistente en `backend/data/`; el perfil `postgres` está preparado para el servidor Linux.

## Prueba local

Requisitos: JDK 21 y Maven 3.9.

```powershell
mvn spring-boot:run
```

Rutas disponibles:

- `GET http://localhost:8084/api/health`
- `GET http://localhost:8084/api/workspace`
- `PUT http://localhost:8084/api/workspace`
- `DELETE http://localhost:8084/api/workspace`
- `GET http://localhost:8084/api/tablets`
- `GET http://localhost:8084/api/tablets/summary`
- `GET http://localhost:8084/api/tablets/TAB-002`
- `GET http://localhost:8084/api/network/overview`

`/api/workspace` centraliza el estado operativo de reservas, tareas, activos, tablets y préstamos. La interfaz conserva además una copia local para tolerar desconexiones breves.

## UniFi en modo de sólo lectura

El conector utiliza únicamente `GET /v1/sites` de la API oficial de Site Manager. No existen métodos de escritura en `UniFiService`.

Define `UNIFI_API_KEY` como variable del servicio Linux. Nunca la guardes en Angular, GitHub ni `localStorage`.

Si la clave no está configurada, la API responde `NO_CONFIGURADO` en vez de inventar métricas.

## Límite actual de tablets

El backend ya modela aplicaciones instaladas, versión aprobada, apps no autorizadas, actualización y cumplimiento. Headwind MDM será el proveedor que aplica bloqueos, instalaciones, actualizaciones y modo kiosco mediante Device Owner. Hasta que su servidor y API estén conectados, el modo del Centro TI permanece como `REPORT_ONLY`; Microsoft Intune queda como alternativa futura.
