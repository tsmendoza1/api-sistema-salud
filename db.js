// Persistencia sencilla en archivo JSON (sin dependencias nativas).
// Estructura: { pacientes: [], signos: [], seq: { paciente, signo } }
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data.json');

function _load() {
  if (!fs.existsSync(DB_FILE)) {
    const inicial = { pacientes: [], signos: [], seq: { paciente: 0, signo: 0 } };
    fs.writeFileSync(DB_FILE, JSON.stringify(inicial, null, 2));
    return inicial;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function _save(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// ----- Pacientes -----
function listarPacientes() {
  return _load().pacientes;
}

function obtenerPaciente(id) {
  return _load().pacientes.find((p) => p.id === id) || null;
}

function crearPaciente(datos) {
  const db = _load();
  db.seq.paciente += 1;
  const paciente = {
    id: db.seq.paciente,
    nombre: datos.nombre,
    cedula: datos.cedula || '',
    edad: Number(datos.edad) || 0,
    sexo: datos.sexo || 'N/D',
    telefono: datos.telefono || '',
    fotoUrl: datos.fotoUrl || '',
    creadoEn: datos.creadoEn || new Date().toISOString(),
  };
  db.pacientes.push(paciente);
  _save(db);
  return paciente;
}

function actualizarPaciente(id, datos) {
  const db = _load();
  const p = db.pacientes.find((x) => x.id === id);
  if (!p) return null;
  p.nombre = datos.nombre ?? p.nombre;
  p.cedula = datos.cedula ?? p.cedula;
  p.edad = datos.edad != null ? Number(datos.edad) : p.edad;
  p.sexo = datos.sexo ?? p.sexo;
  p.telefono = datos.telefono ?? p.telefono;
  _save(db);
  return p;
}

function actualizarFotoPaciente(id, fotoUrl) {
  const db = _load();
  const p = db.pacientes.find((x) => x.id === id);
  if (!p) return null;
  p.fotoUrl = fotoUrl;
  _save(db);
  return p;
}

function eliminarPaciente(id) {
  const db = _load();
  const antes = db.pacientes.length;
  db.pacientes = db.pacientes.filter((p) => p.id !== id);
  db.signos = db.signos.filter((s) => s.pacienteId !== id);
  _save(db);
  return db.pacientes.length < antes;
}

// ----- Signos vitales -----
function listarSignos(pacienteId) {
  const signos = _load().signos;
  const filtrados = pacienteId ? signos.filter((s) => s.pacienteId === pacienteId) : signos;
  return filtrados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

function crearSigno(datos) {
  const db = _load();
  db.seq.signo += 1;
  const signo = {
    id: db.seq.signo,
    pacienteId: Number(datos.pacienteId),
    fecha: datos.fecha || new Date().toISOString(),
    sistolica: Number(datos.sistolica) || 0,
    diastolica: Number(datos.diastolica) || 0,
    frecuencia: Number(datos.frecuencia) || 0,
    temperatura: Number(datos.temperatura) || 0,
    glucosa: Number(datos.glucosa) || 0,
    saturacion: Number(datos.saturacion) || 0,
    peso: Number(datos.peso) || 0,
  };
  db.signos.push(signo);
  _save(db);
  return signo;
}

function actualizarSigno(id, datos) {
  const db = _load();
  const s = db.signos.find((x) => x.id === id);
  if (!s) return null;
  ['sistolica', 'diastolica', 'frecuencia', 'temperatura', 'glucosa', 'saturacion', 'peso'].forEach((k) => {
    if (datos[k] != null) s[k] = Number(datos[k]);
  });
  if (datos.fecha) s.fecha = datos.fecha;
  _save(db);
  return s;
}

function eliminarSigno(id) {
  const db = _load();
  const antes = db.signos.length;
  db.signos = db.signos.filter((s) => s.id !== id);
  _save(db);
  return db.signos.length < antes;
}

module.exports = {
  listarPacientes,
  obtenerPaciente,
  crearPaciente,
  actualizarPaciente,
  actualizarFotoPaciente,
  eliminarPaciente,
  listarSignos,
  crearSigno,
  actualizarSigno,
  eliminarSigno,
};
