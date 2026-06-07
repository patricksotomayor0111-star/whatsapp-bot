const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode');

const app = express();
let qrCodeData = '';
let isReady = false;

const KEYWORDS = ['box', 'como estás', 'precio', 'disponible'];
const AUTO_REPLY = 'Voy';

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

client.on('qr', (qr) => {
  qrCodeData = qr;
  console.log('QR generado');
});

client.on('ready', () => {
  isReady = true;
  console.log('WhatsApp conectado');
});

client.on('message', async (msg) => {
  const texto = msg.body.toLowerCase();
  const found = KEYWORDS.find(k => texto.includes(k.toLowerCase()));
  if (found) {
    await msg.reply(AUTO_REPLY);
  }
});

app.get('/', async (req, res) => {
  if (isReady) {
    res.send('<h1>Bot conectado y activo</h1>');
  } else if (qrCodeData) {
    const qrImg = await qrcode.toDataURL(qrCodeData);
    res.send(`<html><body style="text-align:center"><h2>Escanea con WhatsApp Business</h2><img src="${qrImg}" style="width:300px"/><p>Recarga si expira</p></body></html>`);
  } else {
    res.send('<h1>Iniciando bot, espera 10 segundos y recarga...</h1>');
  }
});

app.listen(3000, () => console.log('Servidor activo'));
client.initialize();
