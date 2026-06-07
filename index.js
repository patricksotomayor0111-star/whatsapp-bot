const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode');
const fs = require('fs');

const app = express();
app.use(express.json());

const CONFIG_FILE = '/tmp/config.json';

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
const KEYWORDS = ['box', 'como estás', 'precio', 'disponible'];

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

client.on('qr', (qr) => { qrCodeData = qr; });
client.on('ready', async () => {
  isReady = true;
  const chats = await client.getChats();
  const todosGrupos = chats.filter(c => c.isGroup).map(c => c.id._serialized);
  if (GRUPOS_ACTIVOS.length === 0) {
    GRUPOS_ACTIVOS = todosGrupos;
    saveConfig();
  } else {
    todosGrupos.forEach(id => {
      if (!GRUPOS_ACTIVOS.includes(id)) {
        GRUPOS_ACTIVOS.push(id);
      }
    });
    saveConfig();
  }
  console.log('Listo');
});

client.on('message', async (msg) => {
  if (!botActivo) return;
  const chat = await msg.getChat();
  if (!chat.isGroup) return;
  if (!GRUPOS_ACTIVOS.includes(chat.id._serialized)) return;
  const texto = msg.body.toLowerCase();
  const found = KEYWORDS.find(k => texto.includes(k.toLowerCase()));
  if (!found) return;
  const ahora = Date.now();
  const key = chat.id._serialized;
  if (lastReply[key] && ahora - lastReply[key] < COOLDOWN) return;
  lastReply[key] = ahora;
  await msg.reply(AUTO_REPLY);
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
    <div style="display:flex;justify-content:space-between;align-items:center;padding:14px;background:#f5f5f5;border-radius:10px;margin-bottom:16px">
      <span style="font-weight:bold;font-size:16px">Bot ${botActivo?'✅ Activo':'⛔ Inactivo'}</span>
      <button onclick="toggleBot()" style="padding:8px 20px;border-radius:20px;border:none;background:${botActivo?'#25D366':'#e74c3c'};color:white;cursor:pointer;font-size:15px">
        ${botActivo?'Desactivar':'Activar'}
      </button>
    </div>
    <p style="color:#888;font-size:12px">⏱ Cooldown: 5 min por grupo | Respuesta: <b>"${AUTO_REPLY}"</b></p>
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
  if (botActivo) {
    Object.keys(lastReply).forEach(k => delete lastReply[k]);
  }
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
