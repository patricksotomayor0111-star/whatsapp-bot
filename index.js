const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode');
const fs = require('fs');

const app = express();
app.use(express.json());

const CONFIG_FILE = '/tmp/config.json';
const HISTORIAL_FILE = '/tmp/historial.json';
const GANANCIAS_FILE = '/tmp/ganancias.json';
const REPORTE_FILE = '/tmp/reporte_semanal.json';

const NUMEROS_IGNORADOS = [
  '272984178720993',
  '51942535017','942535017','51952696865','952696865',
  '51960186738','960186738','51946043902','946043902',
  '51902955167','902955167','51942008845','942008845',
  '51906459224','906459224','51943103514','943103514',
  '51946847341','946847341','51987140046','987140046',
  '51957185654','957185654','51934983992','934983992',
  '51929744391','929744391','51931235198','931235198',
  '51936711829','936711829','51924047949','924047949',
  '51912675969','912675969','51981290024','981290024',
  '51914352139','914352139','51936899473','936899473',
  '51956856787','956856787','51910795590','910795590',
  '51934572456','934572456','51972077603','972077603',
  '51972066872','972066872','51950006969','950006969',
  '51957511240','957511240','51997186215','997186215',
  '51966124285','966124285','51912699997','912699997',
  '51924917366','924917366','51963936600','963936600',
  '51976481032','976481032','51907413081','907413081',
  '923938101','51923938101','51979397948','979397948',
  '51955214645','955214645','51955794995','955794995',
  '51932736288','932736288','51902425988','902425988',
  '51973155047','973155047','34641095746',
  '51956640522','956640522'
];

const NUMEROS_DUENO = ['51939610396','939610396'];

const GRUPOS_FOTO = [
  'CANTONES - BOX DELIVERY',
  'CHIFA LIU BOX DELIVERY',
  'CARTAS RESTAURANTES'
];

const KEYWORDS_ESPECIALES = {
  'AYABACA - BUMANGUESA II': ['listo'],
  'BUBATON BOX DELIVERY': ['ingrese'],
  'CARTAS RESTAURANTES': [
    'ingrese','a tienda por favor','a tienda','tienda por favor',
    'manden a tienda','uno a tienda','uno a huacachina','uno para huacachina'
  ],
  'BRUCES BOX DELIVERY': ['uno','hola uno por favor','uno por favor'],
  'LA PARRILLERIA BOX DELIVERY': [
    'a tienda por favor','a tienda','tienda por favor','manden a tienda','uno a tienda'
  ],
  'MUELLE BOX DELIVERY': ['uno a huacachina','uno para huacachina']
};

// ============================================================
// 🔴 LISTA NEGATIVA — si el mensaje contiene CUALQUIERA de estas
// frases o palabras, el bot NO responde sin importar qué más diga
// ============================================================
const KEYWORDS_EXCLUIR = [
  // Consultas de precio
  'cuanto','cuánto','precio','costo','tarifa','cobran','cobras',
  'cuanto sale','cuanto cuesta','cuánto sale','cuánto cuesta',
  'a cuanto','a cuánto','me pueden dar precio','precio del delivery',
  'cuanto es el delivery','cuanto me sale','cuanto cobran',
  'cuanto es','cuanto sera','cuánto sera','a cuánto esta',
  'a cuanto esta','tiene costo','tiene precio','free','gratis',

  // Cliente viene a recoger
  'viene a recoger','va a recoger','pasa a recoger','pasar a recoger',
  'viene a recojerlo','viene a recogerlo','lo recoge','manda a recoger',
  'puede pasar','ya puede pasar','pasar por su pedido','viene por su pedido',
  'ya puedes recoger','puedes pasar a recogerlo','puedes pasar a recojerlo',
  'va a pasar','viene a pasar','pasa por su pedido',

  // Pedido del cliente / aviso interno
  'su pedido esta listo','tu pedido esta listo','ya esta listo su pedido',
  'listo para recoger','pedido para recoger','ya tiene su pedido',
  'el pedido esta listo para recoger','pedido listo para recoger',
  'puede venir por su pedido','puede pasar por su pedido',
  'ya tiene su pedido listo','lo enviamos con otro delivery',
  'pedido pequeno','pedido pequeño','pedido grande',
  'a que hora vienes por tu pedido','a que hora viene por su pedido',

  // Otro delivery / con POS
  'con pos','otro delivery con pos','digale que envio con otro delivery',
  'con otro delivery','otro delivery lleva','enviamos con otro',

  // Tiempos largos (no es urgente)
  '20 minutos','25 minutos','30 minutos','40 minutos','45 minutos',
  '20min','25min','30min','40min','45min',
  'en 20 min','en 25 min','en 30 min','en 40 min','en 45 min',
  '20 min','25 min','30 min','40 min','45 min',

  // Confirmación futura (aún no está listo)
  'confirmo en unos minutos','confirmamos en unos minutos',
  'confirmo en un momento','confirmo en breve','confirmo en',
  'confirmamos en','les aviso cuando','le aviso cuando',
  'les mandaremos mensaje cuando','cuando este listo les',
  'buenas tardes por si sale','buenas noches por si sale',
  'buenos dias por si sale','por si sale algun pedido',
  'por si sale otro pedido','por si sale otro',

  // Lugares / direcciones (para no confundir con "para el local")
  'emapica','municipalidad','hospital','banco','essalud','minsa',
  'universidad','iglesia','santo domingo','san francisco','san jose',
  'minedu','ministerio','comisaria','prefecture','prefectura',
  'mercado','supermercado','plaza vea','metro ','tottus',
  'para la urb','para urb','para jr','para av ','para calle',
  'para pasaje','manzana','mz ','lote ','lt ','etapa',

  // Signo de pregunta (casi siempre es consulta)
  '?',

  // Otros falsos positivos conocidos
  '+51','del mas cercano','exclusivamente para delivery',
  'aqui esta amigo','puede recogerlo','ya puedes pasar',
  'ya puede recoger'
];

// ============================================================
// 🟢 LISTA POSITIVA — palabras/frases que activan el bot
// Se verifican SOLO si el mensaje no tiene ninguna palabra negativa
// ============================================================
const KEYWORDS_GLOBALES = [
  // Vehículo / motorizado
  'box','moto','motorizado','unidad','movil','movilidad',

  // Pedido listo
  'pedido listo','tenemos pedido','hay pedido','pedido en camino',
  'ya esta listo el pedido','pedido listo en',

  // Solicitudes de presencia
  'pueden venir','vengan','venga','vayan','acercarse','acercarce',
  'acercandose','se pueden acercar','vayan a ptb','vayan a pds',
  'vayan a mega','ptb a mega plaza','ptb a pds','ptb a plaza de sol',
  'ptb mega','pds a ptb','pds a mega','ptb a parcona',
  'se acerca al local','acercandose al local',

  // Tiempo corto (urgente)
  '5 min','10 min','7 min','5min','10min','7min',
  'en 5 minutos','en 7 minutos','en 10 minutos',
  '5 minutos','7 minutos','10 minutos',

  // Confirmacion real de pedido
  'confirmo pedido','confirmado','confirmado pedido',

  // Unidades específicas
  'una unidad','un motorizado','un box','un movil',

  // Delivery con contexto positivo
  'un delivery','delivery por favor','delivery porfa',
  'necesito delivery','manden delivery','me envia un delivery',
  'me envias un delivery','puede mandar un delivery',
  'enviar un delivery','delivery a tienda','delivery al local',
  'necesito un delivery','delivery por favor',
  'me envia uno porfa','me envias uno','puede mandar uno',
  'me podria enviar','me podrias enviar','podria enviar',
  'por favor me envia','por favor envien',

  // Frases directas comunes de locales
  'venir al local','pasar al local','acerquese al local',
  'alguien puede acercarse','alguien disponible',
  'alguien cerca','hay alguien','viniendo','recoger pedido'
];

const SIEMPRE_INACTIVOS = [
  'DRIBOX 🏍️',
  'Reporte Deliverys ICA!! 🏍️💨',
  'SERVICIO DELIVERY RUMI-WASI',
  'GRUPO DE MOTORIZADOS'
];

const GRUPO_GANANCIAS = ['GANANCIAS', 'GANANCIAS '];

const LOCALES_MAP = {
  'car': 'Cartas Restaurantes', 'cartas restaurantes': 'Cartas Restaurantes',
  'lab': 'La Bumanguesa', 'la bumanguesa': 'La Bumanguesa', 'bum': 'La Bumanguesa',
  'mon': 'Monkey Donuts', 'monkey donuts': 'Monkey Donuts',
  'piz': 'Pizzería Cardenatti', 'pizzeria cardenatti': 'Pizzería Cardenatti', 'cardenatti': 'Pizzería Cardenatti',
  'pen': 'Peñonetti', 'peñonetti': 'Peñonetti',
  'sha': 'Shawaburguer', 'shawaburguer': 'Shawaburguer',
  'bru': 'Bruces', 'bruces': 'Bruces',
  'kaf': 'Kaffa Coffee', 'kaffa': 'Kaffa Coffee', 'kaffa coffee': 'Kaffa Coffee',
  'fla': 'Flamangos', 'flamangos': 'Flamangos',
  'mue': 'Muelle', 'muelle': 'Muelle',
  'hol': 'Hola', 'hola': 'Hola',
  'the': 'The Crown', 'the crown': 'The Crown',
  'har': 'Harvest', 'harvest': 'Harvest',
  'ric': 'Ricos Protein', 'ricos protein': 'Ricos Protein',
  'aya': 'Ayabaca', 'ayabaca': 'Ayabaca',
  'mis': 'Misky Polleria', 'misky': 'Misky Polleria', 'misky polleria': 'Misky Polleria',
  'kam': 'Kam Long', 'kam long': 'Kam Long',
  'boc': 'Bochitos', 'bochitos': 'Bochitos',
  'las': 'Las Nieves', 'las nieves': 'Las Nieves',
  'hel': 'Heladería El Pingüino', 'heladeria': 'Heladería El Pingüino', 'pinguino': 'Heladería El Pingüino',
  'mrs': 'Mr. Sushi', 'mr sushi': 'Mr. Sushi', 'mr. sushi': 'Mr. Sushi',
  'bub': 'Bubaton', 'bubaton': 'Bubaton',
  'cra': 'Crazy Corn', 'crazy corn': 'Crazy Corn',
  'chi': 'Chifa Liu', 'chifa liu': 'Chifa Liu',
  'mcg': 'McGrill', 'mcgrill': 'McGrill',
  'res': 'Rest Centro', 'rest centro': 'Rest Centro',
  'del': 'Lagunilla', 'lagunilla': 'Lagunilla',
  'mij': 'Mister Jugo', 'mister jugo': 'Mister Jugo',
  'can': 'Cantones', 'cantones': 'Cantones',
  'pim': 'Pim Pam Pollo', 'pim pam': 'Pim Pam Pollo', 'pim pam pollo': 'Pim Pam Pollo',
  'rin': 'Rincón del Sabor', 'rincon': 'Rincón del Sabor', 'rincon del sabor': 'Rincón del Sabor',
  'chc': 'Chifa Chang Kee', 'chifa chang': 'Chifa Chang Kee', 'chifa chang kee': 'Chifa Chang Kee',
  'moa': 'Mono Alitas', 'mono alitas': 'Mono Alitas',
  'pue': 'Puerto Rico', 'puerto rico': 'Puerto Rico',
  'art': 'Artia', 'artia': 'Artia',
  'pep': 'Pepefod', 'pepefod': 'Pepefod',
  'mia': 'Mias', 'mias': 'Mias',
  'one': 'Onest', 'onest': 'Onest',
  'hug': 'Hugo Restaurante', 'hugo': 'Hugo Restaurante', 'hugo restaurante': 'Hugo Restaurante',
  'pal': 'Palacio Oriental', 'palacio': 'Palacio Oriental', 'palacio oriental': 'Palacio Oriental',
  'kan': 'Kanastas', 'kanastas': 'Kanastas',
  'roc': 'Roca Steak House', 'roca': 'Roca Steak House', 'roca steak': 'Roca Steak House',
  'pap': 'Papeado San Isidro', 'papeado': 'Papeado San Isidro',
  'sma': 'Smart Nutrition', 'smart': 'Smart Nutrition', 'smart nutrition': 'Smart Nutrition',
  'deb': 'Delivery Bien Pescao', 'bien pescao': 'Delivery Bien Pescao',
  'pio': 'Pio Rico', 'pio rico': 'Pio Rico',
  'pun': 'Punto Caliente', 'punto caliente': 'Punto Caliente',
  'par2': 'La Parrilleria', 'parrilleria': 'La Parrilleria', 'la parrilleria': 'La Parrilleria',
  'fid': 'Fidel', 'fidel': 'Fidel',
  'hua': 'Pollería El Huarango', 'huarango': 'Pollería El Huarango',
  'par': 'Paradero', 'paradero': 'Paradero',
  'sel': 'Selah Coffe', 'selah': 'Selah Coffe', 'selah coffe': 'Selah Coffe',
  'bol': 'Boletas', 'boletas': 'Boletas',
  'don': 'Don Alejandro', 'don alejandro': 'Don Alejandro',
  'elb': 'El Borgo', 'el borgo': 'El Borgo',
  'oct': 'Octavia', 'octavia': 'Octavia',
  'bas': 'Base', 'base': 'Base',
  'per': 'Personal', 'personal': 'Personal'
};

const SECTORES = {
  'Sector PTB': [
    'CARTAS RESTAURANTES','LA BUMANGUESA BOX DELIVERY',
    'MONKEY DONUTS BOX DELIVERY','MONKEY DONUTS BOX DELIVERY ',
    'Pizzería cardenatti box delivery','Pizzería cardenatti box delivery ',
    'PEÑONETTI BOX DELIVERY','SHAWABURGUER BOX DELIVERY',
    'BRUCES BOX DELIVERY','BRUCES BOX DELIVERY ',
    'FLAMANGOS - BOX DELIVERY','FLAMANGOS- BOX DELIVERY',
    'KAFFA COFFEE - BOX DELIVERY','KAFFA COFFEE- BOX DELIVERY',
    'KAFFA COFFEE BOX DELIVERY','MUELLE BOX DELIVERY','MUELLE BOX DELIVERY '
  ],
  'Sector San José': [
    'Hola','THE CROWN BOX DELIVERY','HARVEST BOX DELIVERY',
    'RICOS PROTEIN - BOX DELIVERY','AYABACA - BUMANGUESA II',
    'MISKY POLLERIA (dribox)','KAM LONG PEDIDOS','BOCHITOS BOX DELIVERY',
    'LAS NIEVES BOX DELIVERY','HELADERÍA EL PINGÜINO','MR. SUSHI BOX DELIVERY'
  ],
  'Sector Moderna': [
    'BUBATON BOX DELIVERY','CRAZY CORN 🌭🧋🤗','CHIFA LIU BOX DELIVERY',
    'McGrill Restaurante BOX DELIVERY','REST CENTRO BOX DELIVERY',
    'REST CENTRO BOX DELIVERY ','DELIVERY BOX / LAGUNILLA',
    'MISTER JUGO BOX DELIVERY','MISTER JUGO BOX DELIVERY ',
    'CANTONES - BOX DELIVERY','PIM PAM POLLO BOX DELIVERY',
    'CHIFA CHANG KEE PEDIDOS','MONO ALITAS BOX DELIVERY',
    'KANASTAS BOX DELIVERY','KANASTAS BOX DELIVERY ',
    'PUERTO RICO BOX DELIVERY','PUERTO RICO BOX DELIVERY '
  ],
  'Sector La Angostura': [
    'Boletas locales','Don Alejandro -BOX DELYBERY','EL BORGO BOX DELIVERY',
    'OCTAVIA LA ANGOSTURA - BOX DELIVERY',
    'FIDEL - BOX DELIVERY ICA','FIDEL - BOX DELIVERY ICA '
  ],
  'Sector Comodin': [
    'ARTIA PASTELERIA (dribox)','PEPEFOD DELIVERY','MIAS BOX DELIVERY',
    'ONEST BOX DELIVERY','ONEST BOX DELIVERY ',
    'Hugo Restaurante BOX DELIVERY','Hugo Restaurante BOX DELIVERY ',
    'Palacio Oriental BOX DELIVERY','ROCA STEAK HOUSE BOX DELIVERY',
    'PAPEADO SAN ISIDRO BOX DELIVERY','SMART NUTRITION BOX DELIVERY',
    'DELIVERY BIEN PESCAO 🏍️','PIO RICO BOX DELIVERY','PIO RICO BOX DELIVERY ',
    'POLLERÍA EL HUARANGO - BOX DELIVERY','Paradero ','Paradero',
    'Rincón del sabor BOX DELIVERY','PUNTO CALIENTE - BOX DELIVERY',
    'LA PARRILLERIA BOX DELIVERY','LA PARRILLERIA BOX DELIVERY ',
    'Selah Coffe BOX DELIVERY','Selah Coffe BOX DELIVERY '
  ],
  'Sector X (otros)': [
    'DRIBOX 🏍️','Reporte Deliverys ICA!! 🏍️💨',
    'SERVICIO DELIVERY RUMI-WASI','GRUPO DE MOTORIZADOS'
  ]
};

const ORDEN_GRUPOS = Object.values(SECTORES).flat();

function getHoraPeru() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Lima' }));
}

function normalizar(texto) {
  return texto.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================
// 🔴 Verifica si el mensaje tiene alguna palabra/frase negativa
// Si encuentra UNA sola → el bot NO responde
// ============================================================
function tieneExclusion(texto) {
  var t = normalizar(texto);
  return KEYWORDS_EXCLUIR.some(function(k) {
    return t.includes(normalizar(k));
  });
}

// ============================================================
// 🟢 Verifica si el mensaje tiene alguna palabra/frase positiva
// Se llama SOLO si tieneExclusion() devolvió false
// ============================================================
function tieneKeywordPositiva(texto) {
  var t = normalizar(texto);
  return KEYWORDS_GLOBALES.some(function(k) {
    return t.includes(normalizar(k));
  });
}

function getSectorDeGrupo(nombreGrupo) {
  var sectores = Object.keys(SECTORES);
  for (var i = 0; i < sectores.length; i++) {
    var sector = sectores[i];
    if (sector === 'Sector X (otros)') continue;
    var grupos = SECTORES[sector];
    for (var j = 0; j < grupos.length; j++) {
      if (grupos[j].trim().toLowerCase() === nombreGrupo.trim().toLowerCase()) return sector;
    }
  }
  return 'Sector X (otros)';
}

function esGrupoGanancias(nombreGrupo) {
  return GRUPO_GANANCIAS.some(function(n) {
    return n.trim().toLowerCase() === nombreGrupo.trim().toLowerCase();
  });
}

function buscarLocal(palabraClave) {
  var clave = normalizar(palabraClave).trim();
  if (LOCALES_MAP[clave]) return LOCALES_MAP[clave];
  var keys = Object.keys(LOCALES_MAP);
  for (var i = 0; i < keys.length; i++) {
    if (normalizar(keys[i]) === clave) return LOCALES_MAP[keys[i]];
  }
  return null;
}

function loadGanancias() {
  try {
    if (fs.existsSync(GANANCIAS_FILE)) {
      var data = JSON.parse(fs.readFileSync(GANANCIAS_FILE, 'utf8'));
      var hoy = getHoraPeru().toLocaleDateString('es-PE');
      if (data.fecha !== hoy) return { fecha: hoy, ganancias: 0, gastos: 0 };
      return data;
    }
  } catch(e) {}
  return { fecha: getHoraPeru().toLocaleDateString('es-PE'), ganancias: 0, gastos: 0 };
}

function saveGanancias(data) {
  fs.writeFileSync(GANANCIAS_FILE, JSON.stringify(data));
}

function loadReporte() {
  try {
    if (fs.existsSync(REPORTE_FILE)) return JSON.parse(fs.readFileSync(REPORTE_FILE, 'utf8'));
  } catch(e) {}
  return { semana_inicio: getFechaLunesActual(), locales: {}, gastos: {}, localesHoy: {}, gastosHoy: {} };
}

function saveReporte(data) {
  fs.writeFileSync(REPORTE_FILE, JSON.stringify(data));
}

function getFechaLunesActual() {
  var hoy = getHoraPeru();
  var dia = hoy.getDay();
  var diff = (dia === 0) ? -6 : 1 - dia;
  var lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + diff);
  return lunes.toLocaleDateString('es-PE');
}

function extraerEntradas(texto) {
  var entradas = [];
  var lineas = texto.split('\n');
  lineas.forEach(function(linea) {
    var trimmed = linea.trim();
    if (!trimmed) return;
    var mGasto = trimmed.match(/^menos\s+(\d{1,6}(?:\.\d{1,2})?)\s*(.*)?$/i);
    if (mGasto) {
      var monto = parseFloat(mGasto[1]);
      var desc = mGasto[2] ? mGasto[2].trim() : 'Otros';
      if (!desc) desc = 'Otros';
      if (monto > 0 && monto <= 99999) entradas.push({ tipo: 'gasto', nombre: desc, monto: monto });
      return;
    }
    var mGanancia = trimmed.match(/^([a-zA-ZáéíóúÁÉÍÓÚñÑ][a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{0,40}?)\s+(\d{1,5}(?:\.\d{1,2})?)$/);
    if (mGanancia) {
      var palabraClave = mGanancia[1].trim();
      var monto2 = parseFloat(mGanancia[2]);
      if (monto2 > 0 && monto2 <= 99999) {
        var localNombre = buscarLocal(palabraClave) || palabraClave;
        entradas.push({ tipo: 'local', nombre: localNombre, monto: monto2 });
      }
      return;
    }
    var mGananciaInv = trimmed.match(/^(\d{1,5}(?:\.\d{1,2})?)\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ][a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{0,40})$/);
    if (mGananciaInv) {
      var monto4 = parseFloat(mGananciaInv[1]);
      var palabraClave2 = mGananciaInv[2].trim();
      if (monto4 > 0 && monto4 <= 99999) {
        var localNombre2 = buscarLocal(palabraClave2) || palabraClave2;
        entradas.push({ tipo: 'local', nombre: localNombre2, monto: monto4 });
      }
      return;
    }
    var mSoloNum = trimmed.match(/^(\d{1,5}(?:\.\d{1,2})?)$/);
    if (mSoloNum) {
      var monto3 = parseFloat(mSoloNum[1]);
      if (monto3 > 0 && monto3 <= 99999) entradas.push({ tipo: 'local', nombre: 'Sin etiqueta', monto: monto3 });
    }
  });
  return entradas;
}

function generarTextoReporte(rep, fechaInicio, fechaFin) {
  var totalLocales = 0;
  var totalGastos = 0;
  var lineasLocales = Object.keys(rep.locales).map(function(nombre) {
    totalLocales += rep.locales[nombre];
    return '  • ' + nombre + ': ' + rep.locales[nombre] + ' soles';
  });
  var lineasGastos = Object.keys(rep.gastos).map(function(nombre) {
    totalGastos += rep.gastos[nombre];
    return '  • ' + nombre + ': ' + rep.gastos[nombre] + ' soles';
  });
  totalLocales = Math.round(totalLocales * 100) / 100;
  totalGastos = Math.round(totalGastos * 100) / 100;
  var liquido = Math.round((totalLocales - totalGastos) * 100) / 100;
  var emoji = liquido >= 0 ? '🤑' : '😬';
  var texto = '📊 *REPORTE SEMANAL*\n';
  texto += '📅 ' + fechaInicio + ' al ' + fechaFin + '\n';
  texto += '─────────────────\n';
  texto += '✅ *GANANCIAS POR LOCAL:*\n';
  texto += (lineasLocales.length > 0 ? lineasLocales.join('\n') + '\n' : '  (sin registros)\n');
  texto += '💰 *Total ganancias: ' + totalLocales + ' soles*\n';
  texto += '─────────────────\n';
  texto += '📉 *GASTOS:*\n';
  texto += (lineasGastos.length > 0 ? lineasGastos.join('\n') + '\n' : '  (sin registros)\n');
  texto += '💸 *Total gastos: ' + totalGastos + ' soles*\n';
  texto += '─────────────────\n';
  texto += 'TOTAL LIQUIDO ' + emoji + ': *' + liquido + ' soles*';
  return texto;
}

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch(e) {}
  return { botActivo: false, gruposActivos: [], gruposCache: [], sectoresApagados: [] };
}

function saveConfig() {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({
    botActivo: botActivo, gruposActivos: GRUPOS_ACTIVOS,
    gruposCache: GRUPOS_CACHE, sectoresApagados: SECTORES_APAGADOS
  }));
}

function loadHistorial() {
  try {
    if (fs.existsSync(HISTORIAL_FILE)) return JSON.parse(fs.readFileSync(HISTORIAL_FILE, 'utf8'));
  } catch(e) {}
  return [];
}

function saveHistorial() {
  if (HISTORIAL.length > 200) HISTORIAL.splice(0, HISTORIAL.length - 200);
  fs.writeFileSync(HISTORIAL_FILE, JSON.stringify(HISTORIAL));
}

var cfg = loadConfig();
var botActivo = false;
var GRUPOS_ACTIVOS = cfg.gruposActivos || [];
var GRUPOS_CACHE = cfg.gruposCache || [];
var SECTORES_APAGADOS = cfg.sectoresApagados || [];
var HISTORIAL = loadHistorial();
var qrCodeData = '';
var isReady = false;
var lastReply = {};
var COOLDOWN = 5 * 60 * 1000;
var AUTO_REPLY = 'Voy';
var sseClients = [];
var reporteEnviado = false;
var reporteDiarioEnviado = false;

function enviarNotificacion(grupo, hora) {
  var data = JSON.stringify({ grupo: grupo, hora: hora });
  sseClients = sseClients.filter(function(res) {
    try { res.write('data: ' + data + '\n\n'); return true; } catch(e) { return false; }
  });
}

setInterval(async function() {
  if (!isReady) return;
  var ahora = getHoraPeru();
  var esDomingo = ahora.getDay() === 0;
  var esHora2359 = ahora.getHours() === 23 && ahora.getMinutes() === 59;

  if (esHora2359 && !reporteDiarioEnviado) {
    reporteDiarioEnviado = true;
    try {
      var chats = await client.getChats();
      var grupoGan = chats.find(function(c) { return c.isGroup && esGrupoGanancias(c.name); });
      if (grupoGan) {
        var ganData = loadGanancias();
        var hoy = ahora.toLocaleDateString('es-PE');
        var rep = loadReporte();
        var textoDiario = '📋 *RESUMEN DEL DÍA - ' + hoy + '*\n─────────────────\n';
        textoDiario += '✅ *GANANCIAS POR LOCAL:*\n';
        var localesHoy = Object.keys(rep.localesHoy || {});
        if (localesHoy.length > 0) {
          localesHoy.forEach(function(n) { textoDiario += '  • ' + n + ': ' + rep.localesHoy[n] + ' soles\n'; });
        } else { textoDiario += '  (sin registros)\n'; }
        textoDiario += '💰 *Total ganancias: ' + ganData.ganancias + ' soles*\n─────────────────\n';
        textoDiario += '📉 *GASTOS:*\n';
        var gastosHoy = Object.keys(rep.gastosHoy || {});
        if (gastosHoy.length > 0) {
          gastosHoy.forEach(function(n) { textoDiario += '  • ' + n + ': ' + rep.gastosHoy[n] + ' soles\n'; });
        } else { textoDiario += '  (sin registros)\n'; }
        textoDiario += '💸 *Total gastos: ' + ganData.gastos + ' soles*\n─────────────────\n';
        var liquidoDiario = Math.round((ganData.ganancias - ganData.gastos) * 100) / 100;
        textoDiario += 'TOTAL LIQUIDO ' + (liquidoDiario >= 0 ? '🤑' : '😬') + ': *' + liquidoDiario + ' soles*';
        await grupoGan.sendMessage(textoDiario);
        rep.localesHoy = {};
        rep.gastosHoy = {};
        saveReporte(rep);
      }
    } catch(e) { console.log('Error reporte diario:', e.message); }

    if (esDomingo && !reporteEnviado) {
      reporteEnviado = true;
      try {
        var chats2 = await client.getChats();
        var grupoGan2 = chats2.find(function(c) { return c.isGroup && esGrupoGanancias(c.name); });
        if (grupoGan2) {
          var rep2 = loadReporte();
          var textoReporte = generarTextoReporte(rep2, rep2.semana_inicio || getFechaLunesActual(), ahora.toLocaleDateString('es-PE'));
          await grupoGan2.sendMessage(textoReporte);
          saveReporte({ semana_inicio: getFechaLunesActual(), locales: {}, gastos: {}, localesHoy: {}, gastosHoy: {} });
        }
      } catch(e) { console.log('Error reporte semanal:', e.message); }
    }
  }

  if (ahora.getHours() === 0 && ahora.getMinutes() === 0) {
    reporteEnviado = false;
    reporteDiarioEnviado = false;
  }
}, 60 * 1000);

// ✅ FIX: protocolTimeout aumentado
var client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    protocolTimeout: 60000
  }
});

client.on('qr', function(qr) { qrCodeData = qr; isReady = false; });

client.on('disconnected', function(reason) {
  console.log('Desconectado:', reason);
  isReady = false; qrCodeData = ''; botActivo = false;
  saveConfig();
  try {
    var sessionPath = './.wwebjs_auth';
    if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true, force: true });
  } catch(e) {}
  setTimeout(function() { try { client.initialize(); } catch(e) { process.exit(0); } }, 3000);
});

// ✅ FIX: delay + try/catch en ready
client.on('ready', async function() {
  isReady = true; qrCodeData = '';
  console.log('WhatsApp listo, esperando 5s...');
  await new Promise(function(resolve) { setTimeout(resolve, 5000); });
  try {
    var chats = await client.getChats();
    var grupos = chats.filter(function(c) { return c.isGroup; });
    GRUPOS_CACHE = grupos.map(function(g) { return { id: g.id._serialized, name: g.name }; });
    GRUPOS_CACHE.sort(function(a, b) {
      var ia = ORDEN_GRUPOS.findIndex(function(n) { return n.trim().toLowerCase() === a.name.trim().toLowerCase(); });
      var ib = ORDEN_GRUPOS.findIndex(function(n) { return n.trim().toLowerCase() === b.name.trim().toLowerCase(); });
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1; if (ib === -1) return -1;
      return ia - ib;
    });
    GRUPOS_CACHE.forEach(function(g) {
      var esInactivo = SIEMPRE_INACTIVOS.some(function(n) { return g.name.toLowerCase().includes(n.toLowerCase()); });
      var esSectorX = getSectorDeGrupo(g.name) === 'Sector X (otros)';
      var esGanancias = esGrupoGanancias(g.name);
      if (esInactivo || (esSectorX && !esGanancias)) {
        GRUPOS_ACTIVOS = GRUPOS_ACTIVOS.filter(function(id) { return id !== g.id; });
        return;
      }
      if (!GRUPOS_ACTIVOS.includes(g.id)) GRUPOS_ACTIVOS.push(g.id);
    });
    saveConfig();
    console.log('Listo - ' + grupos.length + ' grupos cargados');
  } catch(e) {
    console.log('Error cargando chats:', e.message);
  }
});

client.on('message', async function(msg) {
  if (!isReady) return;
  var esFoto = msg.hasMedia && msg.type === 'image';
  var esTexto = msg.type === 'chat';
  if (!esTexto && !esFoto) return;
  var chat = await msg.getChat();
  if (!chat.isGroup) return;
  var texto = msg.body || '';
  var contacto = await msg.getContact();
  var numero = contacto.id.user || (msg.author ? msg.author : msg.from).replace(/@.*/, '').replace(/[^0-9]/g, '');
  if (NUMEROS_IGNORADOS.includes(numero)) return;

  if (esGrupoGanancias(chat.name)) {
    if (msg.fromMe) return;
    if (texto.trim().toLowerCase() === 'reset') {
      var hoyReset = getHoraPeru().toLocaleDateString('es-PE');
      saveGanancias({ fecha: hoyReset, ganancias: 0, gastos: 0 });
      await chat.sendMessage('✅ Listo, nuevo día\n✅ GANANCIAS: Total hoy: 0 soles\n📉 GASTOS: Total hoy: -0 soles\nTOTAL LIQUIDO 🤑: 0 soles');
      return;
    }
    var entradas = extraerEntradas(texto);
    if (entradas.length > 0) {
      var ganData = loadGanancias();
      var hoy = getHoraPeru().toLocaleDateString('es-PE');
      if (ganData.fecha !== hoy) ganData = { fecha: hoy, ganancias: 0, gastos: 0 };
      var rep = loadReporte();
      var lunesActual = getFechaLunesActual();
      if (rep.semana_inicio !== lunesActual) rep = { semana_inicio: lunesActual, locales: {}, gastos: {}, localesHoy: {}, gastosHoy: {} };
      var totalGanancia = 0; var totalGasto = 0;
      entradas.forEach(function(entrada) {
        if (entrada.tipo === 'local') {
          totalGanancia += entrada.monto;
          rep.locales[entrada.nombre] = Math.round(((rep.locales[entrada.nombre] || 0) + entrada.monto) * 100) / 100;
          if (!rep.localesHoy) rep.localesHoy = {};
          rep.localesHoy[entrada.nombre] = Math.round(((rep.localesHoy[entrada.nombre] || 0) + entrada.monto) * 100) / 100;
        } else {
          totalGasto += entrada.monto;
          var ng = entrada.nombre.charAt(0).toUpperCase() + entrada.nombre.slice(1);
          rep.gastos[ng] = Math.round(((rep.gastos[ng] || 0) + entrada.monto) * 100) / 100;
          if (!rep.gastosHoy) rep.gastosHoy = {};
          rep.gastosHoy[ng] = Math.round(((rep.gastosHoy[ng] || 0) + entrada.monto) * 100) / 100;
        }
      });
      ganData.ganancias = Math.round((ganData.ganancias + totalGanancia) * 100) / 100;
      ganData.gastos = Math.round((ganData.gastos + totalGasto) * 100) / 100;
      saveGanancias(ganData); saveReporte(rep);
      var totalLiquido = Math.round((ganData.ganancias - ganData.gastos) * 100) / 100;
      var emojiLiquido = totalLiquido >= 0 ? '🤑' : '😬';
      await chat.sendMessage('✅ GANANCIAS: Total hoy: ' + ganData.ganancias + ' soles\n📉 GASTOS: Total hoy: -' + ganData.gastos + ' soles\nTOTAL LIQUIDO ' + emojiLiquido + ': ' + totalLiquido + ' soles');
    }
    return;
  }

  if (!botActivo) return;
  var chatId = chat.id._serialized;
  if (!GRUPOS_ACTIVOS.includes(chatId)) return;
  var sectorDelGrupo = getSectorDeGrupo(chat.name);
  if (SECTORES_APAGADOS.includes(sectorDelGrupo)) return;
  var esFotoGrupo = GRUPOS_FOTO.some(function(n) { return chat.name.toLowerCase().includes(n.toLowerCase()); });

  // ============================================================
  // 🧠 NUEVA LÓGICA: Primero excluir, luego buscar positivo
  // Si el mensaje tiene CUALQUIER palabra negativa → ignorar
  // Si no tiene negativas → buscar si tiene alguna positiva
  // ============================================================
  if (tieneExclusion(texto)) return;

  var tieneKeyword = tieneKeywordPositiva(texto);

  // Si no encontró keyword global, revisar keywords especiales del grupo
  if (!tieneKeyword) {
    var gruposEsp = Object.keys(KEYWORDS_ESPECIALES);
    for (var i = 0; i < gruposEsp.length; i++) {
      var nombreGrupo = gruposEsp[i];
      if (chat.name.trim().toLowerCase() === nombreGrupo.trim().toLowerCase()) {
        var encontrado = KEYWORDS_ESPECIALES[nombreGrupo].find(function(k) {
          var t = normalizar(texto);
          var kn = normalizar(k);
          return t === kn || t.includes(kn);
        });
        if (encontrado) { tieneKeyword = true; break; }
      }
    }
  }

  if (!tieneKeyword && !(esFoto && esFotoGrupo)) return;

  var ahora = Date.now();
  if (lastReply[chatId] && ahora - lastReply[chatId] < COOLDOWN) return;
  lastReply[chatId] = ahora;
  await msg.reply(AUTO_REPLY);
  var now = getHoraPeru();
  HISTORIAL.unshift({
    grupo: chat.name, sector: sectorDelGrupo,
    mensaje: esFoto ? '📸 Foto' : texto.substring(0, 80),
    fecha: now.toLocaleDateString('es-PE'), hora: now.toLocaleTimeString('es-PE')
  });
  saveHistorial();
  enviarNotificacion(chat.name, now.toLocaleTimeString('es-PE'));
  botActivo = false; saveConfig();
});

app.get('/eventos', function(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  sseClients.push(res);
  req.on('close', function() { sseClients = sseClients.filter(function(c) { return c !== res; }); });
});

app.get('/historial', function(req, res) {
  var filas = HISTORIAL.length === 0
    ? '<tr><td colspan="4" style="text-align:center;padding:20px;color:#aaa">Sin registros aun</td></tr>'
    : HISTORIAL.map(function(h, i) {
        return '<tr style="background:' + (i%2===0?'#fff':'#f9f9f9') + '">' +
          '<td style="padding:10px 8px;font-size:13px">' + h.fecha + ' ' + h.hora + '</td>' +
          '<td style="padding:10px 8px;font-size:13px;font-weight:500">' + h.grupo + '</td>' +
          '<td style="padding:10px 8px;font-size:12px;color:#666">' + h.sector + '</td>' +
          '<td style="padding:10px 8px;font-size:12px;color:#888;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + h.mensaje + '</td>' +
          '</tr>';
      }).join('');
  res.send('<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Historial</title></head>' +
    '<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">' +
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px"><a href="/" style="text-decoration:none;font-size:22px">←</a><h2 style="margin:0">📋 Historial de respuestas</h2></div>' +
    '<p style="color:#888;font-size:13px;margin-bottom:16px">Total: <b>' + HISTORIAL.length + '</b> respuestas automaticas</p>' +
    '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;border:1px solid #eee"><thead><tr style="background:#25D366;color:white">' +
    '<th style="padding:10px 8px;text-align:left;font-size:13px">Fecha / Hora</th><th style="padding:10px 8px;text-align:left;font-size:13px">Grupo</th>' +
    '<th style="padding:10px 8px;text-align:left;font-size:13px">Sector</th><th style="padding:10px 8px;text-align:left;font-size:13px">Mensaje</th>' +
    '</tr></thead><tbody>' + filas + '</tbody></table></div>' +
    '<button onclick="if(confirm(\'Borrar historial?\')){fetch(\'/historial\',{method:\'DELETE\'}).then(function(){location.reload()})}" style="margin-top:20px;padding:10px 20px;border-radius:10px;border:none;background:#e74c3c;color:white;cursor:pointer;font-size:14px">Borrar historial</button>' +
    '</body></html>');
});

app.delete('/historial', function(req, res) { HISTORIAL = []; saveHistorial(); res.json({ ok: true }); });

app.post('/cerrar-sesion', async function(req, res) {
  try { isReady = false; botActivo = false; saveConfig(); await client.logout(); } catch(e) {}
  try { var sp = './.wwebjs_auth'; if (fs.existsSync(sp)) fs.rmSync(sp, { recursive: true, force: true }); } catch(e) {}
  setTimeout(function() { try { client.initialize(); } catch(e) { process.exit(0); } }, 2000);
  res.json({ ok: true });
});

app.get('/', function(req, res) {
  if (!isReady) {
    if (!qrCodeData) return res.send('<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>⏳ Iniciando...</h2><p>Recarga en unos segundos</p><script>setTimeout(function(){location.reload()},4000)</script></body></html>');
    return qrcode.toDataURL(qrCodeData).then(function(img) {
      res.send('<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:sans-serif;text-align:center;padding:30px"><h2>📱 Escanea con WhatsApp Business</h2><img src="' + img + '" style="width:280px;border-radius:12px"/><p style="color:#888;font-size:13px">Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo</p><script>setTimeout(function(){location.reload()},30000)</script></body></html>');
    });
  }

  var porSector = {};
  Object.keys(SECTORES).forEach(function(s) { porSector[s] = []; });
  GRUPOS_CACHE.forEach(function(g) {
    var sector = getSectorDeGrupo(g.name);
    if (!porSector[sector]) porSector[sector] = [];
    if (!esGrupoGanancias(g.name)) porSector[sector].push(g);
  });

  var sectoresHtml = '';
  Object.keys(porSector).forEach(function(sector) {
    var grupos = porSector[sector];
    if (grupos.length === 0) return;
    var sectorActivo = !SECTORES_APAGADOS.includes(sector);
    var gruposDelSector = grupos.map(function(g) {
      var activo = GRUPOS_ACTIVOS.includes(g.id);
      var ahora = Date.now();
      var tiempoRestante = lastReply[g.id] ? Math.max(0, Math.ceil((COOLDOWN - (ahora - lastReply[g.id])) / 1000 / 60)) : 0;
      var cooldownInfo = tiempoRestante > 0 ? '<span style="font-size:11px;color:#e67e22"> ⏱ ' + tiempoRestante + ' min</span>' : '';
      var esFotoGrupo = GRUPOS_FOTO.some(function(n) { return g.name.toLowerCase().includes(n.toLowerCase()); });
      var fotoTag = esFotoGrupo ? '<span style="font-size:10px;color:#3498db"> 📸</span>' : '';
      var esSectorX = getSectorDeGrupo(g.name) === 'Sector X (otros)';
      var esInact = SIEMPRE_INACTIVOS.some(function(n) { return g.name.toLowerCase().includes(n.toLowerCase()); });
      var tagManual = (esInact || esSectorX) ? '<span style="font-size:10px;color:#e74c3c"> ⚠️ manual</span>' : '';
      var opacidad = !sectorActivo ? 'opacity:0.45;' : '';
      return '<div class="grupo-item" data-nombre="' + g.name.toLowerCase() + '" style="display:flex;justify-content:space-between;align-items:center;padding:10px 0 10px 16px;border-bottom:1px solid #f0f0f0;' + opacidad + '">' +
        '<span style="font-size:13px;color:#444">' + g.name + fotoTag + tagManual + cooldownInfo + '</span>' +
        '<button onclick="toggleGrupo(\'' + g.id + '\')" style="padding:5px 14px;border-radius:20px;border:none;background:' + (activo?'#25D366':'#ccc') + ';color:white;cursor:pointer;font-size:12px">' +
        (activo?'Activo':'Inactivo') + '</button></div>';
    }).join('');
    sectoresHtml += '<div class="sector-card" style="margin-bottom:16px;border:2px solid ' + (sectorActivo?'#e0e0e0':'#e74c3c') + ';border-radius:12px;overflow:hidden">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:' + (sectorActivo?'#f7f7f7':'#fdecea') + '">' +
      '<span style="font-weight:600;font-size:15px">📍 ' + sector + '</span>' +
      '<button onclick="toggleSector(\'' + sector + '\')" style="padding:6px 16px;border-radius:20px;border:none;background:' + (sectorActivo?'#25D366':'#e74c3c') + ';color:white;cursor:pointer;font-size:13px">' +
      (sectorActivo?'Sector ON ✅':'Sector OFF ⛔') + '</button></div>' +
      '<div class="sector-grupos">' + gruposDelSector + '</div></div>';
  });

  var ganData = loadGanancias();
  var hoy = getHoraPeru().toLocaleDateString('es-PE');
  if (ganData.fecha !== hoy) ganData = { fecha: hoy, ganancias: 0, gastos: 0 };
  var totalLiquido = Math.round((ganData.ganancias - ganData.gastos) * 100) / 100;
  var ganColor = totalLiquido >= 0 ? '#e8f5e9' : '#fdecea';
  var emojiLiquido = totalLiquido >= 0 ? '🤑' : '😬';

  res.send('<!DOCTYPE html><html><head>' +
    '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WhatsApp Bot</title>' +
    '</head><body style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">' +
    '<h2 style="margin:0">🤖 WhatsApp Bot</h2>' +
    '<button onclick="document.getElementById(\'menu\').classList.toggle(\'hidden\')" style="background:none;border:none;font-size:26px;cursor:pointer">☰</button></div>' +
    '<div id="menu" class="hidden" style="background:#f0f0f0;border-radius:10px;padding:10px;margin-bottom:16px">' +
    '<a href="/historial" style="display:block;padding:10px 14px;font-size:15px;text-decoration:none;color:#333;border-radius:8px;background:white;margin-bottom:6px">📋 Historial <span style="color:#888;font-size:12px">(' + HISTORIAL.length + ')</span></a>' +
    '<button onclick="if(confirm(\'¿Cerrar sesión?\')){fetch(\'/cerrar-sesion\',{method:\'POST\'}).then(function(){location.reload()})}" style="width:100%;padding:10px 14px;font-size:15px;text-align:left;border:none;border-radius:8px;background:white;color:#e74c3c;cursor:pointer;margin-top:4px">🚪 Cerrar sesión (escanear QR nuevo)</button></div>' +
    '<div style="padding:14px;background:' + ganColor + ';border-radius:10px;margin-bottom:12px;font-size:13px;line-height:1.8">' +
    '<div>✅ <b>GANANCIAS:</b> Total hoy: ' + ganData.ganancias + ' soles</div>' +
    '<div>📉 <b>GASTOS:</b> Total hoy: -' + ganData.gastos + ' soles</div>' +
    '<div><b>TOTAL LIQUIDO ' + emojiLiquido + ':</b> ' + totalLiquido + ' soles</div></div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px;background:' + (botActivo?'#e8f5e9':'#fdecea') + ';border-radius:10px;margin-bottom:16px">' +
    '<span style="font-weight:bold;font-size:16px">Bot ' + (botActivo?'✅ Activo':'⛔ Inactivo') + '</span>' +
    '<button onclick="toggleBot()" style="padding:8px 20px;border-radius:20px;border:none;background:' + (botActivo?'#25D366':'#e74c3c') + ';color:white;cursor:pointer;font-size:15px">' + (botActivo?'Desactivar':'Activar') + '</button></div>' +
    '<p style="color:#888;font-size:12px">⏱ Cooldown: 5 min | Respuesta: <b>"' + AUTO_REPLY + '"</b> | Se apaga solo al responder</p>' +
    '<p style="color:#888;font-size:11px">📸 = fotos | ⚠️ manual = solo activacion manual | Sector OFF = bloquea todo el sector</p>' +
    '<div style="margin-bottom:14px">' +
    '<input id="buscador" type="text" placeholder="🔍 Buscar grupo..." oninput="buscarGrupo(this.value)" style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid #ddd;font-size:14px;box-sizing:border-box"/>' +
    '</div>' +
    '<h3 id="titulo-grupos">Grupos (' + GRUPOS_CACHE.length + ')</h3>' +
    sectoresHtml +
    '<style>.hidden{display:none !important;}</style>' +
    '<script>' +
    'var evtSource = new EventSource("/eventos");' +
    'evtSource.onmessage = function(e){var data=JSON.parse(e.data);mostrarNotificacion(data.grupo,data.hora);};' +
    'function mostrarNotificacion(grupo,hora){var t=document.createElement("div");t.style.cssText="position:fixed;top:16px;right:16px;background:#25D366;color:white;padding:12px 18px;border-radius:12px;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.2);z-index:9999;max-width:280px";t.innerHTML="<b>✅ Bot respondio</b><br>"+grupo+"<br><span style=\'font-size:12px;opacity:0.85\'>"+hora+"</span>";document.body.appendChild(t);setTimeout(function(){t.remove()},6000);}' +
    'async function toggleBot(){await fetch("/toggle",{method:"POST"});location.reload();}' +
    'async function toggleGrupo(id){await fetch("/grupo",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:id})});location.reload();}' +
    'async function toggleSector(sector){await fetch("/sector",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sector:sector})});location.reload();}' +
    'function buscarGrupo(q){' +
    '  var query = q.toLowerCase().trim();' +
    '  var cards = document.querySelectorAll(".sector-card");' +
    '  var totalVisible = 0;' +
    '  cards.forEach(function(card){' +
    '    var items = card.querySelectorAll(".grupo-item");' +
    '    var hayVisible = false;' +
    '    items.forEach(function(item){' +
    '      var nombre = item.getAttribute("data-nombre") || "";' +
    '      var mostrar = query === "" || nombre.includes(query);' +
    '      item.style.display = mostrar ? "flex" : "none";' +
    '      if(mostrar){ hayVisible = true; totalVisible++; }' +
    '    });' +
    '    card.style.display = (query === "" || hayVisible) ? "block" : "none";' +
    '  });' +
    '  document.getElementById("titulo-grupos").textContent = query ? "Resultados: " + totalVisible + " grupo(s)" : "Grupos (' + GRUPOS_CACHE.length + ')";' +
    '}' +
    '</script></body></html>');
});

app.post('/toggle', function(req, res) {
  botActivo = !botActivo;
  if (botActivo) Object.keys(lastReply).forEach(function(k) { delete lastReply[k]; });
  saveConfig(); res.json({ activo: botActivo });
});

app.post('/grupo', function(req, res) {
  var id = req.body.id;
  if (GRUPOS_ACTIVOS.includes(id)) { GRUPOS_ACTIVOS = GRUPOS_ACTIVOS.filter(function(g) { return g !== id; }); }
  else { GRUPOS_ACTIVOS.push(id); }
  saveConfig(); res.json({ grupos: GRUPOS_ACTIVOS });
});

app.post('/sector', function(req, res) {
  var sector = req.body.sector;
  if (SECTORES_APAGADOS.includes(sector)) { SECTORES_APAGADOS = SECTORES_APAGADOS.filter(function(s) { return s !== sector; }); }
  else { SECTORES_APAGADOS.push(sector); }
  saveConfig(); res.json({ sectoresApagados: SECTORES_APAGADOS });
});

app.get('/grupos-raw', function(req, res) {
  var lista = GRUPOS_CACHE.map(function(g) { return g.name + '  →  sector: ' + getSectorDeGrupo(g.name); }).join('\n');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send('TOTAL: ' + GRUPOS_CACHE.length + ' grupos\n\n' + lista);
});

app.listen(3000, function() { console.log('Servidor activo'); });

setInterval(async function() {
  try {
    if (isReady) {
      var state = await client.getState();
      if (state !== 'CONNECTED') { isReady = false; qrCodeData = ''; botActivo = false; saveConfig(); process.exit(0); }
    }
  } catch(e) { process.exit(0); }
}, 30 * 60 * 1000);

client.initialize();
