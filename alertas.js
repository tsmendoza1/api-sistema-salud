// Reglas de rango normal para cada signo vital.
// Si un valor sale del rango se genera una alerta.
const RANGOS = {
  sistolica: { min: 90, max: 140, etiqueta: 'Presion sistolica', unidad: 'mmHg' },
  diastolica: { min: 60, max: 90, etiqueta: 'Presion diastolica', unidad: 'mmHg' },
  frecuencia: { min: 60, max: 100, etiqueta: 'Frecuencia cardiaca', unidad: 'bpm' },
  temperatura: { min: 36.0, max: 37.5, etiqueta: 'Temperatura', unidad: 'C' },
  glucosa: { min: 70, max: 140, etiqueta: 'Glucosa', unidad: 'mg/dL' },
  saturacion: { min: 95, max: 100, etiqueta: 'Saturacion O2', unidad: '%' },
};

// Devuelve un arreglo de alertas para un registro de signos.
function evaluarSigno(signo) {
  const alertas = [];
  for (const clave of Object.keys(RANGOS)) {
    const r = RANGOS[clave];
    const valor = Number(signo[clave]);
    if (!valor) continue; // valor 0 = no registrado
    if (valor < r.min) {
      alertas.push({
        campo: clave,
        etiqueta: r.etiqueta,
        valor,
        unidad: r.unidad,
        tipo: 'BAJO',
        mensaje: `${r.etiqueta} baja: ${valor} ${r.unidad} (min ${r.min})`,
      });
    } else if (valor > r.max) {
      alertas.push({
        campo: clave,
        etiqueta: r.etiqueta,
        valor,
        unidad: r.unidad,
        tipo: 'ALTO',
        mensaje: `${r.etiqueta} alta: ${valor} ${r.unidad} (max ${r.max})`,
      });
    }
  }
  return alertas;
}

module.exports = { RANGOS, evaluarSigno };
