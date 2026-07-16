# API SaludMonitor

API REST + WebSocket para la app móvil **SaludMonitor** (gestión y monitoreo de signos vitales,
seguimiento en tiempo real y fotos de pacientes). Node.js + Express + `ws` + `multer`.

## Ejecutar localmente
```bash
npm install
npm run seed     # (opcional) datos de ejemplo
npm start        # http://localhost:3000
```

## Ejecutar con Docker
```bash
docker build -t api-sistema-salud .
docker run -p 3000:3000 api-sistema-salud
```

## Desplegar en Render
1. Sube este repositorio a GitHub.
2. En Render: **New + → Web Service** (o **Blueprint** si detecta `render.yaml`).
3. Runtime **Docker** (usa el `Dockerfile`). Render inyecta la variable `PORT` automáticamente.
4. Health check: `/`.

> Nota: el disco de Render (plan free) es **efímero**: `data.json` y las fotos de `uploads/`
> se reinician en cada redeploy. Suficiente para demo; para persistencia real usar una base de
> datos y almacenamiento de objetos (S3/Cloudinary).

## Endpoints
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Info y lista de endpoints |
| GET | `/api/pacientes` | Lista de pacientes |
| POST | `/api/pacientes` | Crear paciente |
| GET | `/api/pacientes/:id` | Obtener paciente |
| PUT | `/api/pacientes/:id` | Actualizar paciente |
| DELETE | `/api/pacientes/:id` | Eliminar paciente y sus registros |
| POST | `/api/pacientes/:id/foto` | Subir foto (multipart, campo `foto`) |
| GET | `/api/signos?pacienteId=` | Signos vitales (con alertas) |
| POST | `/api/signos` | Registrar signos vitales |
| PUT | `/api/signos/:id` | Actualizar registro |
| DELETE | `/api/signos/:id` | Eliminar registro |
| GET | `/api/alertas` | Registros fuera de rango |
| GET | `/api/resumen` | Totales para el dashboard |
| GET | `/api/rangos` | Rangos clínicos usados |
| GET | `/uploads/<archivo>` | Fotos servidas estáticamente |

## WebSocket (tiempo real)
Ruta `ws://<host>/ws` (usa `wss://` cuando el host es HTTPS, p. ej. Render).

Mensajes del servidor: `config`, `positions`, `vital`, `alerta`, `foto`.
Mensajes del cliente: `{type:"ubicacion", id, nombre, lat, lng}`, `{type:"desconectar", id}`.
