const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode');
const fs = require('fs');

const app = express();
app.use(express.json());

const CONFIG_FILE = '/tmp/config.json';

const NUMEROS_IGNORADOS = [
  '51942535017','942535017','51942 535 017','942 535 017',
  '51960186738','960186738','51960 186 738','960 186 738',
  '51946043902','946043902','51946 043 902','946 043 902',
  '51902955167','902955167','51902 955 167','902 955 167',
  '51942008845','942008845','51942 008 845','942 008 845',
  '51906459224','906459224','51906 459 224','906 459 224',
  '51943103514','943103514','51943 103 514','943 103 514',
  '51946847341','946847341','51946 847 341','946 847 341',
  '51987140046','987140046','51987 140 046','987 140 046',
  '51957185654','957185654','51957 185 654','957 185 654',
  '51934983992','934983992','51934 983 992','934 983 992',
  '51929744391','929744391','51929 744 391','929 744 391',
  '51931235198','931235198','51931 235 198','931 235 198',
  '51936711829','936711829','51936 711 829','936 711 829',
  '51924047949','924047949','51924 047 949','924 047 949',
  '51912675969','912675969','51912 675 969','912 675 969',
  '51981290024','981290024','51981 290 024','981 290 024',
  '51914352139','914352139','51914 352 139','914 352 139',
  '51936899473','936899473','51936 899 473','936 899 473',
  '51956856787','956856787','51956 856 787','956 856 787',
  '51910795590','910795590','51910 795 590','910 795 590'
];

const GRUPOS_FOTO = [
  'CANTONES - BOX DELIVERY',
  'CHIFA LIU BOX DELIVERY',
  'CARTAS RESTAURANTES'
];

const KEYWORDS_ESPECIALES = {
  'AYABACA - BUMANGUESA II': ['listo']
};

const KEYWORDS_GLOBALES = [
  'pedido listo','motorizado','un delivery','delivery para el local',
  'pedido en 5 minutos','pedido','pueden venir','ya esta listo el pedido',
  'acercarce','acercarse','motorizado en 5 minutos','10 minutos pedido listo',
  '5 minutos pedidos','en 5 minutos','5 min','10 min','5min','10min',
  'tenemos pedido','box','un box','un motorizado','venir','pedidi',
  'movilidad','movil','viniendo'
];

// Grupos que arrancan siempre desactivados (solo activación manual)
const SIEMPRE_INACTIVOS = [
  'DRIBOX 🏍️',
  'Reporte Deliverys ICA!! 🏍️💨',
  'SERVICIO DELIVERY RUMI-WASI',
  'GRUPO DE MOTORIZADOS'
];

const SECTORES = {
  'Sector PTB': [
    'CARTAS RESTAURANTES','LA BUMANGUESA BOX DELIVERY','MONKEY DONUTS BOX DELIVERY',
    'PEÑONETTI BOX DELIVERY','SHAWABURGUER BOX DELIVERY','BRUCES BOX DELIVERY',
    'PUNTO CALIENTE - BOX DELIVERY'
  ],
  'Sector San José': [
    'Hola','THE CROWN BOX DELIVERY','HARVEST BOX DELIVERY','RICOS PROTEIN - BOX DELIVERY',
    'AYABACA - BUMANGUESA II','MISKY POLLERIA (dribox)','KAM LONG PEDIDOS',
    'BOCHITOS BOX DELIVERY','LAS NIEVES BOX DELIVERY'
  ],
  'Sector Moderna': [
    'BUBATON BOX DELIVERY','CRAZY CORN 🌭🧋🤗','CHIFA LIU BOX DELIVERY',
    'McGrill Restaurante BOX DELIVERY','REST CENTRO BOX DELIVERY','DELIVERY BOX / LAGUNILLA',
    'MISTER JUGO BOX DELIVERY','ARTIA PASTELERIA (dribox)','CANTONES - BOX DELIVERY',
    'Hugo Restaurante BOX DELIVERY','KANASTAS BOX DELIVERY','PIM PAM POLLO BOX DELIVERY'
  ],
  'Sector La Angostura': [
    'Boletas locales','Don Alejandro -BOX DELYBERY','EL BORGO BOX DELIVERY'
  ],
  // Los SIEMPRE_INACTIVOS van primero en Sector X
  'Sector X (otros)': [
    'DRIBOX 🏍️',
    'Reporte Deliverys ICA!! 🏍️💨',
    'SERVICIO DELIVERY RUMI-WASI',
    'GRUPO DE MOTORIZADOS'
  ]
};

const ORDEN_GRUPOS = Object.values(SECTORES).flat();

function similarEnough(texto, keyword) {
  texto = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,'');
  keyword = keyword.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,'');
  if (texto.includes(keyword)) return true;
  const words = keyword.split(' ');
  return words.every(w => {
    if (w.length <= 3) return texto.includes(w);
    for (let i = 0; i <= texto.length - w.length + 1; i++) {
      const sub = texto.substr(i, w.length + 1);
      let diff = 0;
      for (let j = 0; j < w.length; j++) if (w[j] !== (sub[j]||'')) diff++;
      if (diff <= 1) return true;
    }
    return false;
  });
}

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) return JSON.parse(fs.readFileSync(CONFIG_FILE));
  } catch(e) {}
  // ✅ Bot arranca siempre APAGADO
  return { botActivo: false, gruposActivos: [], gruposCache: [], sectoresApagados: [] };
}

function saveConfig() {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({
    botActivo, gruposActivos: GRUPOS_ACTIVOS,
    gruposCache: GRUPOS_CACHE, sectoresApagados: SECTORES_APAGADOS
  }));
}

let cfg = loadConfig();
// ✅ Siempre forzar bot apagado al iniciar, ignorar lo que diga el config
let botActivo = false;
let GRUPOS_ACTIVOS = cfg.gruposActivos;
let GRUPOS_CACHE = cfg.gruposCache || [];
let SECTORES_APAGADOS = cfg.sectoresApagados || [];
let qrCodeData = '';
let isReady = false;
const lastReply = {};
const COOLDOWN = 5 * 60 * 1000;
const AUTO_REPLY = 'Voy';

let sseClients = [];

function enviarNotificacion(grupo, hora) {
  const data = JSON.stringify({ grupo, hora });
  sseClients = sseClients.filter(res => {
    try { res.write(`data: ${data}\n\n`); return true; } catch(e) { return false; }
  });
}

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

client.on('qr', (qr) => { qrCodeData = qr; });

client.on('ready', async () => {
  isReady = true;
  const chats = await client.getChats();
  const grupos = chats.filter(c => c.isGroup);
  GRUPOS_CACHE = grupos.map(g => ({ id: g.id._serialized, name: g.name }));
  GRUPOS_CACHE.sort((a, b) => {
    const ia = ORDEN_GRUPOS.indexOf(a.name);
    const ib = ORDEN_GRUPOS.indexOf(b.name);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  GRUPOS_CACHE.forEach(g => {
    const esInactivo = SIEMPRE_INACTIVOS.some(n => g.name.toLowerCase().includes(n.toLowerCase()));
    if (esInactivo) {
      // Forzar siempre desactivado al iniciar
      GRUPOS_ACTIVOS = GRUPOS_ACTIVOS.filter(id => id !== g.id);
      return;
    }
    if (!GRUPOS_ACTIVOS.includes(g.id)) GRUPOS_ACTIVOS.push(g.id);
  });

  saveConfig();
  console.log('Listo');
});

client.on('message', async (msg) => {
  if (!botActivo) return;
  const chat = await msg.getChat();
  if (!chat.isGroup) return;
  if (!GRUPOS_ACTIVOS.includes(chat.id._serialized)) return;

  const numero = msg.author ? msg.author.replace('@c.us','') : msg.from.replace('@c.us','');
  if (NUMEROS_IGNORADOS.includes(numero)) return;

  const esFoto = msg.hasMedia && msg.type === 'image';
  const esFotoGrupo = GRUPOS_FOTO.some(n => chat.name.toLowerCase().includes(n.toLowerCase()));
  const texto = msg.body || '';

  let tieneKeyword = KEYWORDS_GLOBALES.find(k => similarEnough(texto, k));
  if (!tieneKeyword) {
    for (const [nombreGrupo, keywords] of Object.entries(KEYWORDS_ESPECIALES)) {
      if (chat.name.toLowerCase().includes(nombreGrupo.toLowerCase())) {
        tieneKeyword = keywords.find(k => similarEnough(texto, k));
        if (tieneKeyword) break;
      }
    }
  }

  if (!tieneKeyword && !(esFoto && esFotoGrupo)) return;

  const ahora = Date.now();
  const key = chat.id._serialized;
  if (lastReply[key] && ahora - lastReply[key] < COOLDOWN) return;
  lastReply[key] = ahora;
  await msg.reply(AUTO_REPLY);

  const hora = new Date().toLocaleTimeString('es-PE');
  enviarNotificacion(chat.name, hora);

  botActivo = false;
  saveConfig();
});

function getSectorDeGrupo(nombreGrupo) {
  for (const [sector, grupos] of Object.entries(SECTORES)) {
    if (sector === 'Sector X (otros)') continue;
    if (grupos.some(g => g.toLowerCase() === nombreGrupo.toLowerCase())) return sector;
  }
  return 'Sector X (otros)';
}

app.get('/manifest.json', (req, res) => {
  res.sendFile(__dirname + '/manifest.json');
});

app.get('/sw.js', (req, res) => {
  res.setHeader('Service-Worker-Allowed', '/');
  res.sendFile(__dirname + '/sw.js');
});

app.get('/eventos', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  sseClients.push(res);
  req.on('close', () => {
    sseClients = sseClients.filter(c => c !== res);
  });
});

app.get('/', (req, res) => {
  if (!isReady && !qrCodeData) return res.send('<h1>Iniciando... recarga en 10 segundos</h1>');
  if (!isReady) {
    qrcode.toDataURL(qrCodeData).then(img => {
      res.send(`<html><body style="font-family:sans-serif;text-align:center">
        <h2>Escanea con WhatsApp Business</h2>
        <img src="${img}" style="width:280px"/>
        <p>Recarga si expira</p>
      </body></html>`);
    });
    return;
  }

  const porSector = {};
  for (const sector of Object.keys(SECTORES)) porSector[sector] = [];
  GRUPOS_CACHE.forEach(g => {
    const sector = getSectorDeGrupo(g.name);
    if (!porSector[sector]) porSector[sector] = [];
    porSector[sector].push(g);
  });

  let sectoresHtml = '';
  for (const [sector, grupos] of Object.entries(porSector)) {
    if (grupos.length === 0) continue;
    const todoActivo = grupos.every(g => GRUPOS_ACTIVOS.includes(g.id));
    const gruposDelSector = grupos.map(g => {
      const activo = GRUPOS_ACTIVOS.includes(g.id);
      const ahora = Date.now();
      const tiempoRestante = lastReply[g.id] ? Math.max(0, Math.ceil((COOLDOWN - (ahora - lastReply[g.id])) / 1000 / 60)) : 0;
      const cooldownInfo = tiempoRestante > 0 ? `<span style="font-size:11px;color:#e67e22"> ⏱ ${tiempoRestante} min</span>` : '';
      const esFotoGrupo = GRUPOS_FOTO.some(n => g.name.toLowerCase().includes(n.toLowerCase()));
      const fotoTag = esFotoGrupo ? `<span style="font-size:10px;color:#3498db"> 📸</span>` : '';
      const esInactivo = SIEMPRE_INACTIVOS.some(n => g.name.toLowerCase().includes(n.toLowerCase()));
      const tagManual = esInactivo ? `<span style="font-size:10px;color:#e74c3c"> ⚠️ manual</span>` : '';
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0 10px 16px;border-bottom:1px solid #f0f0f0">
          <span style="font-size:13px;color:#444">${g.name}${fotoTag}${tagManual}${cooldownInfo}</span>
          <button onclick="toggleGrupo('${g.id}')" style="padding:5px 14px;border-radius:20px;border:none;background:${activo?'#25D366':'#ccc'};color:white;cursor:pointer;font-size:12px">
            ${activo?'Activo':'Inactivo'}
          </button>
        </div>`;
    }).join('');

    sectoresHtml += `
      <div style="margin-bottom:16px;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:#f7f7f7">
          <span style="font-weight:600;font-size:15px">📍 ${sector}</span>
          <button onclick="toggleSector('${sector}')" style="padding:6px 16px;border-radius:20px;border:none;background:${todoActivo?'#25D366':'#e74c3c'};color:white;cursor:pointer;font-size:13px">
            ${todoActivo?'Desactivar sector':'Activar sector'}
          </button>
        </div>
        ${gruposDelSector}
      </div>`;
  }

  res.send(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>WhatsApp Bot</title>
    <link rel="manifest" href="/manifest.json">
  </head>
  <body style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px">
    <h2>🤖 WhatsApp Bot</h2>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:14px;background:${botActivo?'#e8f5e9':'#fdecea'};border-radius:10px;margin-bottom:16px">
      <span style="font-weight:bold;font-size:16px">Bot ${botActivo?'✅ Activo':'⛔ Inactivo'}</span>
      <button onclick="toggleBot()" style="padding:8px 20px;border-radius:20px;border:none;background:${botActivo?'#25D366':'#e74c3c'};color:white;cursor:pointer;font-size:15px">
        ${botActivo?'Desactivar':'Activar'}
      </button>
    </div>
    <p style="color:#888;font-size:12px">⏱ Cooldown: 5 min | Respuesta: <b>"${AUTO_REPLY}"</b> | Se apaga solo al responder</p>
    <p style="color:#888;font-size:11px">📸 = responde también a fotos | ⚠️ manual = solo se activa manualmente</p>
    <h3>Grupos (${GRUPOS_CACHE.length})</h3>
    ${sectoresHtml}

    <script>
      async function pedirPermiso() {
        if (!('serviceWorker' in navigator) || !('Notification' in window)) return;
        try {
          await navigator.serviceWorker.register('/sw.js');
          if (Notification.permission === 'default') {
            await Notification.requestPermission();
          }
        } catch(e) {
          console.error('Error SW:', e);
        }
      }
      pedirPermiso();

      const evtSource = new EventSource('/eventos');
      evtSource.onmessage = (e) => {
        const data = JSON.parse(e.data);
        mostrarNotificacion(data.grupo, data.hora);
      };

      function mostrarNotificacion(grupo, hora) {
        if ('serviceWorker' in navigator && Notification.permission === 'granted') {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification('✅ Bot respondió', {
              body: grupo + ' · ' + hora,
              icon: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg',
              vibrate: [200, 100, 200],
              tag: 'bot-reply'
            });
          });
        }
        const toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;top:16px;right:16px;background:#25D366;color:white;padding:12px 18px;border-radius:12px;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.2);z-index:9999;max-width:280px';
        toast.innerHTML = '<b>✅ Bot respondió</b><br>' + grupo + '<br><span style="font-size:12px;opacity:0.85">' + hora + '</span>';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 6000);
      }

      async function toggleBot(){await fetch('/toggle',{method:'POST'});location.reload();}
      async function toggleGrupo(id){await fetch('/grupo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});location.reload();}
      async function toggleSector(sector){await fetch('/sector',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sector})});location.reload();}
    </script>
  </body></html>`);
});

app.post('/toggle', (req, res) => {
  botActivo = !botActivo;
  if (botActivo) Object.keys(lastReply).forEach(k => delete lastReply[k]);
  saveConfig();
  res.json({activo: botActivo});
});

app.post('/grupo', (req, res) => {
  const {id} = req.body;
  if (GRUPOS_ACTIVOS.includes(id)) GRUPOS_ACTIVOS = GRUPOS_ACTIVOS.filter(g => g !== id);
  else GRUPOS_ACTIVOS.push(id);
  saveConfig();
  res.json({grupos: GRUPOS_ACTIVOS});
});

app.post('/sector', (req, res) => {
  const {sector} = req.body;
  const gruposDelSector = GRUPOS_CACHE.filter(g => getSectorDeGrupo(g.name) === sector);
  const todosActivos = gruposDelSector.every(g => GRUPOS_ACTIVOS.includes(g.id));
  if (todosActivos) {
    gruposDelSector.forEach(g => { GRUPOS_ACTIVOS = GRUPOS_ACTIVOS.filter(id => id !== g.id); });
  } else {
    gruposDelSector.forEach(g => { if (!GRUPOS_ACTIVOS.includes(g.id)) GRUPOS_ACTIVOS.push(g.id); });
  }
  saveConfig();
  res.json({grupos: GRUPOS_ACTIVOS});
});

app.listen(3000, () => console.log('Servidor activo'));
client.initialize();
