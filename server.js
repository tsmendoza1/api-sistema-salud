const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('./db');
const { RANGOS, evaluarSigno } = require('./alertas');
const realtime = require('./realtime');

const app = express();
const PORT = process.env.PORT || 3000;

// Carpeta para las fotos subidas.
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const almacenamiento = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `paciente-${req.params.id}-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage: almacenamiento,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});

app.use(cors());
app.use(express.json());
// Servir las fotos subidas.
app.use('/uploads', express.static(UPLOADS_DIR));

// Log simple de peticiones
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()}  ${req.method} ${req.url}`);
  next();
});

app.get('/', (_req, res) => {
  res.json({
    api: 'SaludMonitor',
    version: '1.0.0',
    endpoints: [
      'GET    /api/pacientes',
      'POST   /api/pacientes',
      'GET    /api/pacientes/:id',
      'PUT    /api/pacientes/:id',
      'DELETE /api/pacientes/:id',
      'POST   /api/pacientes/:id/foto  (multipart campo "foto")',
      'GET    /api/signos?pacienteId=',
      'POST   /api/signos',
      'PUT    /api/signos/:id',
      'DELETE /api/signos/:id',
      'GET    /api/alertas',
      'GET    /api/rangos',
      'GET    /api/resumen',
    ],
  });
});

app.get('/api/rangos', (_req, res) => res.json(RANGOS));

// ---------------- Pacientes ----------------
app.get('/api/pacientes', (_req, res) => res.json(db.listarPacientes()));

app.get('/api/pacientes/:id', (req, res) => {
  const p = db.obtenerPaciente(Number(req.params.id));
  if (!p) return res.status(404).json({ error: 'Paciente no encontrado' });
  res.json(p);
});

app.post('/api/pacientes', (req, res) => {
  if (!req.body.nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
  res.status(201).json(db.crearPaciente(req.body));
});

app.put('/api/pacientes/:id', (req, res) => {
  const p = db.actualizarPaciente(Number(req.params.id), req.body);
  if (!p) return res.status(404).json({ error: 'Paciente no encontrado' });
  res.json(p);
});

app.delete('/api/pacientes/:id', (req, res) => {
  const ok = db.eliminarPaciente(Number(req.params.id));
  if (!ok) return res.status(404).json({ error: 'Paciente no encontrado' });
  res.json({ ok: true });
});

// Subir/actualizar la foto de un paciente (campo multipart "foto")
app.post('/api/pacientes/:id/foto', upload.single('foto'), (req, res) => {
  const id = Number(req.params.id);
  const p = db.obtenerPaciente(id);
  if (!p) return res.status(404).json({ error: 'Paciente no encontrado' });
  if (!req.file) return res.status(400).json({ error: 'No se recibio la imagen (campo "foto")' });

  // Borrar la foto anterior si existia.
  if (p.fotoUrl) {
    const prev = path.join(__dirname, p.fotoUrl.replace(/^\//, ''));
    if (fs.existsSync(prev)) fs.unlink(prev, () => {});
  }

  const fotoUrl = `/uploads/${req.file.filename}`;
  const actualizado = db.actualizarFotoPaciente(id, fotoUrl);

  // Notificar a TODOS los clientes conectados para que actualicen en tiempo real.
  realtime.broadcast({
    type: 'foto',
    pacienteId: id,
    nombre: p.nombre,
    fotoUrl,
    fecha: new Date().toISOString(),
  });

  res.json(actualizado);
});

// ---------------- Signos vitales ----------------
app.get('/api/signos', (req, res) => {
  const pacienteId = req.query.pacienteId ? Number(req.query.pacienteId) : null;
  const signos = db.listarSignos(pacienteId).map((s) => ({ ...s, alertas: evaluarSigno(s) }));
  res.json(signos);
});

app.post('/api/signos', (req, res) => {
  if (!req.body.pacienteId) return res.status(400).json({ error: 'pacienteId es obligatorio' });
  const signo = db.crearSigno(req.body);
  res.status(201).json({ ...signo, alertas: evaluarSigno(signo) });
});

app.put('/api/signos/:id', (req, res) => {
  const s = db.actualizarSigno(Number(req.params.id), req.body);
  if (!s) return res.status(404).json({ error: 'Registro no encontrado' });
  res.json({ ...s, alertas: evaluarSigno(s) });
});

app.delete('/api/signos/:id', (req, res) => {
  const ok = db.eliminarSigno(Number(req.params.id));
  if (!ok) return res.status(404).json({ error: 'Registro no encontrado' });
  res.json({ ok: true });
});

// ---------------- Alertas y resumen ----------------
app.get('/api/alertas', (_req, res) => {
  const pacientes = db.listarPacientes();
  const resultado = [];
  for (const s of db.listarSignos()) {
    const alertas = evaluarSigno(s);
    if (alertas.length) {
      const p = pacientes.find((x) => x.id === s.pacienteId);
      resultado.push({
        signoId: s.id,
        pacienteId: s.pacienteId,
        paciente: p ? p.nombre : 'Desconocido',
        fecha: s.fecha,
        alertas,
      });
    }
  }
  res.json(resultado);
});

app.get('/api/resumen', (_req, res) => {
  const pacientes = db.listarPacientes();
  const signos = db.listarSignos();
  const alertas = signos.reduce((acc, s) => acc + evaluarSigno(s).length, 0);
  res.json({
    totalPacientes: pacientes.length,
    totalRegistros: signos.length,
    totalAlertas: alertas,
    ultimoRegistro: signos[0] ? signos[0].fecha : null,
  });
});

// Cargar datos de ejemplo si la "base" esta vacia (util en Render, disco efimero).
if (db.listarPacientes().length === 0) {
  require('./seed');
}

const server = app.listen(PORT, () => {
  console.log(`SaludMonitor API escuchando en http://localhost:${PORT}`);
});

// Activar el servidor WebSocket de tiempo real sobre el mismo puerto.
realtime.iniciar(server);
