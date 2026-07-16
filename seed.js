// Carga datos de ejemplo para probar la app rapidamente.
const db = require('./db');

const p1 = db.crearPaciente({ nombre: 'Maria Gomez', cedula: '0102030405', edad: 68, sexo: 'F', telefono: '0991112233' });
const p2 = db.crearPaciente({ nombre: 'Juan Perez', cedula: '0605040302', edad: 45, sexo: 'M', telefono: '0987654321' });
const p3 = db.crearPaciente({ nombre: 'Ana Torres', cedula: '0109876543', edad: 30, sexo: 'F', telefono: '0961122334' });

// Registros normales y con alertas
db.crearSigno({ pacienteId: p1.id, sistolica: 150, diastolica: 95, frecuencia: 88, temperatura: 36.8, glucosa: 110, saturacion: 96, peso: 62 });
db.crearSigno({ pacienteId: p1.id, sistolica: 145, diastolica: 92, frecuencia: 90, temperatura: 37.0, glucosa: 160, saturacion: 94, peso: 62 });
db.crearSigno({ pacienteId: p2.id, sistolica: 120, diastolica: 80, frecuencia: 72, temperatura: 36.6, glucosa: 95, saturacion: 98, peso: 80 });
db.crearSigno({ pacienteId: p2.id, sistolica: 118, diastolica: 78, frecuencia: 110, temperatura: 38.2, glucosa: 90, saturacion: 97, peso: 80 });
db.crearSigno({ pacienteId: p3.id, sistolica: 110, diastolica: 70, frecuencia: 68, temperatura: 36.5, glucosa: 85, saturacion: 99, peso: 55 });

console.log('Datos de ejemplo cargados correctamente.');
