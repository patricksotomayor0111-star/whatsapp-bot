const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

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
  qrcode.generate(qr, { small: true });
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
    console.log('Respondido: ' + msg.body);
  }
});

app.get('/', (req, res) => {
  res.send(isReady ? 'Bot conectado' : `QR: ${qrCodeData}`);
});

app.get('/qr', (req, res) => {
  res.json({ qr: qrCodeData, ready: isReady });
});

app.listen(3000, () => console.log('Servidor en puerto 3000'));

client.initialize();
