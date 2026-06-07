const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode');
const fs = require('fs');

const app = express();
app.use(express.json());

const CONFIG_FILE = '/tmp/config.json';

const NUMEROS_IGNORADOS = [
  '51942535017','942535017',
  '51960186738','960186738',
  '51946043902','946043902',
  '51902955167','902955167',
  '51942008845','942008845',
  '51906459224','906459224',
  '51943103514','943103514',
  '51946847341','946847341',
  '51987140046','987140046',
  '51957185654','957185654',
  '51934983992','934983992',
  '51929744391','929744391',
  '51931235198','931235198',
  '51936711829','936711829',
  '51924047949','924047949',
  '51912675969','912675969',
  '51981290024','981290024',
  '51914352139','914352139',
  '51936899473','936899473',
  '51956856787','956856787',
  '51910795590','910795590'
];

const KEYWORDS = [
  'pedido listo','motorizado','un delivery','delivery para el local',
  'pedido en 5 minutos','pedido','pueden venir','ya esta listo el pedido',
  'acercarce','acercarse','motorizado en 5 minutos','10 minutos pedido listo',
  '5 minutos pedidos','en 5 minutos','5 min','10 min','5min','10min',
  'tenemos pedido','box','un box','un motorizado','venir','pedidi'
];

function similarEnough(texto, keyword) {
  texto = texto.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9 ]/g,'');
  keyword = keyword.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9 ]/g,'');
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
  return { botActivo: true, gruposActivos: [] };
}

function saveConfig() {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ botActivo, gruposActivos: GRUPOS_ACTIVOS }));
}

let cfg = loadConfig();
let botActivo = cfg.botActivo;
let GRUPOS_ACTIVOS = cfg.gruposActivos;
let qrCodeData = '';
let isReady = false;
const lastReply = {};
const COOLDOWN = 5 * 60 * 1000;
const AUTO_REPLY = 'Voy';

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

client.on('qr', (qr) => { qrCodeData = qr; });
client.on('ready', async () => {
  isReady = true;
  const chats = await client.getChats();
  const todosGrupos = chats.filter(c => c.isGroup).map(c => c.id._serialized);
  todosGrupos.forEach(id => {
    if (!GRUPOS_ACTIVOS.includes(id)) GRUPOS_ACTIVOS.push(id);
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
  const texto = msg.body;
  const found = KEYWORDS.find(k => similarEnough(texto, k));
  if (!found) return;
  const ahora = Date.now();
  const key = chat.id._serialized;
  if (lastReply[key] && ahora - lastReply[key] < COOLDOWN) return;
  lastReply[key] = ahora;
  await msg.reply(AUTO_REPLY);
  botActivo = false;
  saveConfig();
  console.log('Bot desactivado tras responder en: ' + chat.name);
});

app.get('/', async (req, res) => {
  if (!isReady && !qrCodeData) return res.send('<h1>Iniciando... recarga en 10 segundos</h1>');
  if (!isReady) {
    const img = await qrcode.toDataURL(qrCodeData);
    return res.send(`<html><body style="font-family:sans-serif;text-align:center"><h2>Escanea con WhatsApp Business</h2><img src="${img}" style="width:280px"/><p>Recarga si expira</p></body></html>`);
  }
  const chats = await client.getChats();
  const grupos = chats.filter(c => c.isGroup);
  const gruposHtml = grupos.map(g => {
    const activo = GRUPOS_ACTIVOS.includes(g.id._serialized);
    const ahora = Date.now();
    const key = g.id._serialized;
    const tiempoRestante = lastReply[key] ? Math.max(0, Math.ceil((COOLDOWN - (ahora - lastReply[key])) / 1000 / 60)) : 0;
    const cooldownInfo = tiempoRestante > 0 ? `<span style="font-size:11px;color:#e67e22"> ⏱ ${tiempoRestante} min</span>` : '';
    return `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #eee">
      <span style="font-size:14px">${g.name}${cooldownInfo}</span>
      <button onclick="toggleGrupo('${g.id._serialized}')" style="padding:6px 16px;border-radius:20px;border:none;background:${activo?'#25D366':'#ccc'};color:white;cursor:pointer;font-size:13px">
        ${activo?'Activo':'Inactivo'}
      </button>
    </div>`;
  }).join('');

  res.send(`<html><body style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px">
    <h2>🤖 WhatsApp Bot</h2>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:14px;background:${botActivo?'#e8f5e9':'#fdecea'};border-radius:10px;margin-bottom:16px">
      <span style="font-weight:bold;font-size:16px">Bot ${botActivo?'✅ Activo':'⛔ Inactivo'}</span>
      <button onclick="toggleBot()" style="padding:8px 20px;border-radius:20px;border:none;background:${botActivo?'#25D366':'#e74c3c'};color:white;cursor:pointer;font-size:15px">
        ${botActivo?'Desactivar':'Activar'}
      </button>
    </div>
    <p style="color:#888;font-size:12px">⏱ Cooldown: 5 min | Respuesta: <b>"${AUTO_REPLY}"</b> | Se apaga solo al responder</p>
    <h3>Grupos (${grupos.length})</h3>
    ${gruposHtml}
    <script>
      async function toggleBot(){await fetch('/toggle',{method:'POST'});location.reload();}
      async function toggleGrupo(id){await fetch('/grupo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});location.reload();}
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

app.listen(3000, () => console.log('Servidor activo'));
client.initialize();
