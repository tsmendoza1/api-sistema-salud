// Servidor WebSocket: seguimiento en tiempo real de unidades (pacientes /
// ambulancias), geocerca (zona segura) y stream de signos vitales simulados.
const { WebSocketServer } = require('ws');
const { evaluarSigno } = require('./alertas');

// Centro de la zona segura (aprox. Azogues - UCACUE) y radio en metros.
const CENTRO = { lat: -2.7397, lng: -78.8467 };
const RADIO_M = 600;

// Distancia entre dos puntos (formula de Haversine) en metros.
function distanciaM(a, b) {
  const R = 6371000;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Unidades simuladas que se mueven solas.
const simulados = [
  { id: 'sim-amb-1', nombre: 'Ambulancia 01', tipo: 'ambulancia', lat: CENTRO.lat + 0.0012, lng: CENTRO.lng + 0.0010, vx: 0, vy: 0 },
  { id: 'sim-pac-1', nombre: 'Maria Gomez', tipo: 'paciente', lat: CENTRO.lat - 0.0015, lng: CENTRO.lng + 0.0008, vx: 0, vy: 0 },
  { id: 'sim-pac-2', nombre: 'Juan Perez', tipo: 'paciente', lat: CENTRO.lat + 0.0009, lng: CENTRO.lng - 0.0012, vx: 0, vy: 0 },
];

const reales = new Map(); // id -> unidad enviada por un dispositivo real
const estadoZona = new Map(); // id -> bool (para detectar cruce de geocerca)

let wss;

function broadcast(obj) {
  if (!wss) return;
  const msg = JSON.stringify(obj);
  wss.clients.forEach((c) => {
    if (c.readyState === 1) c.send(msg);
  });
}

function moverSimulados() {
  for (const u of simulados) {
    // Caminata aleatoria suave con limite de velocidad.
    u.vx += (Math.random() - 0.5) * 0.00010;
    u.vy += (Math.random() - 0.5) * 0.00010;
    u.vx = Math.max(-0.00022, Math.min(0.00022, u.vx));
    u.vy = Math.max(-0.00022, Math.min(0.00022, u.vy));
    u.lat += u.vy;
    u.lng += u.vx;
    // Si se aleja demasiado, tiende a volver al centro.
    if (distanciaM(CENTRO, u) > 900) {
      u.vx += (CENTRO.lng - u.lng) * 0.02;
      u.vy += (CENTRO.lat - u.lat) * 0.02;
    }
  }
}

function unidadesActuales() {
  const lista = [...simulados, ...reales.values()];
  return lista.map((u) => {
    const dist = distanciaM(CENTRO, u);
    return {
      id: u.id,
      nombre: u.nombre,
      tipo: u.tipo,
      lat: u.lat,
      lng: u.lng,
      distancia: Math.round(dist),
      fueraDeZona: dist > RADIO_M,
    };
  });
}

function chequeoGeocerca(unidades) {
  for (const u of unidades) {
    const antes = estadoZona.get(u.id) || false;
    if (u.fueraDeZona && !antes) {
      broadcast({
        type: 'alerta',
        origen: 'geocerca',
        unidad: u.nombre,
        mensaje: `${u.nombre} salio de la zona segura (${u.distancia} m del centro)`,
        fecha: new Date().toISOString(),
      });
    }
    estadoZona.set(u.id, u.fueraDeZona);
  }
}

function simularVital() {
  const pacientes = simulados.filter((u) => u.tipo === 'paciente');
  if (!pacientes.length) return;
  const p = pacientes[Math.floor(Math.random() * pacientes.length)];
  const signo = {
    sistolica: 100 + Math.round(Math.random() * 75),
    diastolica: 60 + Math.round(Math.random() * 40),
    frecuencia: 55 + Math.round(Math.random() * 75),
    temperatura: Number((36 + Math.random() * 2.6).toFixed(1)),
    glucosa: 70 + Math.round(Math.random() * 90),
    saturacion: 90 + Math.round(Math.random() * 10),
  };
  const alertas = evaluarSigno(signo);
  broadcast({
    type: 'vital',
    unidadId: p.id,
    paciente: p.nombre,
    signo,
    alertas,
    fecha: new Date().toISOString(),
  });
  if (alertas.length) {
    broadcast({
      type: 'alerta',
      origen: 'vital',
      unidad: p.nombre,
      mensaje: `${p.nombre}: ${alertas.map((a) => a.mensaje).join(' | ')}`,
      fecha: new Date().toISOString(),
    });
  }
}

function iniciar(server) {
  // noServer + manejo manual del upgrade: mas compatible detras de proxies
  // (Render, etc.) que el filtro por 'path' de WebSocketServer.
  wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    let pathname = '/';
    try {
      pathname = new URL(req.url, 'http://localhost').pathname;
    } catch (_) {}
    // Aceptar /ws y /ws/ (y la raiz, por si el proxy reescribe la ruta).
    if (pathname === '/ws' || pathname === '/ws/' || pathname === '/') {
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws) => {
    console.log('WS: cliente conectado');
    ws.send(JSON.stringify({ type: 'config', centro: CENTRO, radio: RADIO_M }));
    ws.send(JSON.stringify({ type: 'positions', data: unidadesActuales() }));

    ws.on('message', (raw) => {
      try {
        const m = JSON.parse(raw.toString());
        if (m.type === 'ubicacion' && m.id) {
          reales.set(m.id, {
            id: m.id,
            nombre: m.nombre || 'Mi dispositivo',
            tipo: m.tipo || 'yo',
            lat: m.lat,
            lng: m.lng,
          });
        } else if (m.type === 'desconectar' && m.id) {
          reales.delete(m.id);
          estadoZona.delete(m.id);
        }
      } catch (_) {
        // mensaje invalido, ignorar
      }
    });

    ws.on('close', () => console.log('WS: cliente desconectado'));
  });

  // Bucle de posiciones (1.5 s)
  setInterval(() => {
    moverSimulados();
    const unidades = unidadesActuales();
    chequeoGeocerca(unidades);
    broadcast({ type: 'positions', data: unidades });
  }, 1500);

  // Bucle de signos vitales en vivo (4 s)
  setInterval(simularVital, 4000);

  console.log(`WS de tiempo real activo en ws://localhost:<PORT>/ws`);
}

module.exports = { iniciar, broadcast, CENTRO, RADIO_M };
