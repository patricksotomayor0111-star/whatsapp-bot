const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode');
const fs = require('fs');

const app = express();
app.use(express.json());

const CONFIG_FILE    = '/tmp/config.json';
const HISTORIAL_FILE = '/tmp/historial.json';
const GANANCIAS_FILE = '/tmp/ganancias.json';
const REPORTE_FILE   = '/tmp/reporte_semanal.json';
const KEYWORDS_FILE  = '/tmp/keywords.json';
const SNAPSHOT_FILE  = '/tmp/snapshot.json';

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

const SECTOR_BASE_CONFIG = {
  'REPORTES BOX DELIVERY': {
    numerosAutorizados: ['51960186738','960186738','51960 186 738','960 186 738'],
    frases: ['pendiente recojo de cliente','pendiente compra de cliente']
  },
  'Hola': {
    numerosAutorizados: ['51910795590','910795590','51910 795 590','910 795 590'],
    frases: ['pendiente recojo de cliente','pendiente compra de cliente']
  }
};

const GRUPOS_FOTO = ['CANTONES - BOX DELIVERY','CHIFA LIU BOX DELIVERY','CARTAS RESTAURANTES'];

const GRUPOS_PRIORITARIOS = [
  'mcgrill restaurante box delivery','cartas restaurantes','ARTIA PASTELERIA (dribox)',
  'bochitos box delivery','pizzería cardenatti box delivery'
];

const FRASES_MCGRILL_CARTAS = [
  'hola me envias uno','me mandas uno','alguien cerca',
  'alguien disponible en 10min','alguien disponible en 5min','Me envia uno urgente',
  'me envia uno porfa','enviame uno porfa','enviame uno','manda uno','alguien disponible'
];

const KEYWORDS_ESPECIALES_BASE = {
  'AYABACA - BUMANGUESA II': ['listo'],
  'ARTIA PASTELERIA (dribox)': ['ya esta listo'],
  'PEPEFOD DELIVERY': ['por favor un recojo en raul porras barrenechea d4'],
  'CHIFA LIU BOX DELIVERY': ['Hola pedido'],
  'HARVEST BOX DELIVERY': ['Puede acercarce uno mas por favor para llevar otro?','chicos alguien se puede acercar para llevar un pedido a onest?'], 
  'BUBATON BOX DELIVERY': ['ingrese'],
  'CARTAS RESTAURANTES': [
    'ingrese','a tienda por favor','pedido','a tienda','tienda por favor','delivery','delivery a divino maestro',
    'manden a tienda','uno a tienda','uno a huacachina','uno para huacachina',...FRASES_MCGRILL_CARTAS
  ],
  'BRUCES BOX DELIVERY': ['uno','hola uno por favor','delivery a divino maestro','uno por favor'],
  'Pizzería cardenatti box delivery': ['delivery'],
  'LA PARRILLERIA BOX DELIVERY': ['a tienda por favor','a tienda','tienda por favor','manden a tienda','uno a tienda'],
  'MUELLE BOX DELIVERY': ['uno a huacachina','uno para huacachina'],
  'McGrill Restaurante BOX DELIVERY': [...FRASES_MCGRILL_CARTAS],
  'THE CROWN BOX DELIVERY': ['disculpe para que puedan venir por el delivery'],
  'BOCHITOS BOX DELIVERY': ['buenas tardes podrian enviarme un delivery porfa?']
};

const KEYWORDS_EXCLUIR_BASE = [
  'cuanto','cuánto','precio','costo','tarifa','cobran','cobras','Makro','plaza vea','tottus','compra','ica','ref','en la recta',
  'cuanto sale','cuanto cuesta','cuánto sale','cuánto cuesta','casa','piso','unidad vecinal','color','al frente','frente al','grifo',
  'a cuanto','a cuánto','me pueden dar precio','precio del delivery',
  'cuanto es el delivery','cuanto me sale','cuanto cobran',
  'cuanto es','cuanto sera','cuánto sera','a cuánto esta','a cuanto esta','tiene costo','tiene precio','free','gratis',
  'viene a recoger','va a recoger','pasa a recoger','pasar a recoger',
  'viene a recojerlo','viene a recogerlo','lo recoge','manda a recoger',
  'puede pasar','ya puede pasar','pasar por su pedido','viene por su pedido',
  'ya puedes recoger','puedes pasar a recogerlo','puedes pasar a recojerlo',
  'va a pasar','viene a pasar','pasa por su pedido',
  'su pedido esta listo','tu pedido esta listo','ya esta listo su pedido',
  'listo para recoger','pedido para recoger','ya tiene su pedido',
  'el pedido esta listo para recoger','pedido listo para recoger',
  'puede venir por su pedido','puede pasar por su pedido',
  'ya tiene su pedido listo','lo enviamos con otro delivery',
  'pedido pequeno','pedido pequeño','pedido grande',
  'a que hora vienes por tu pedido','a que hora viene por su pedido',
  'con pos','otro delivery con pos','digale que envio con otro delivery',
  'con otro delivery','otro delivery lleva','enviamos con otro',
  '20 minutos','25 minutos','30 minutos','40 minutos','45 minutos',
  '20min','25min','30min','40min','45min',
  'en 20 min','en 25 min','en 30 min','en 40 min','en 45 min',
  '20 min','25 min','30 min','40 min','45 min',
  'confirmo en unos minutos','confirmamos en unos minutos',
  'confirmo en un momento','confirmo en breve','confirmo en',
  'confirmamos en','les aviso cuando','le aviso cuando',
  'les mandaremos mensaje cuando','cuando este listo les',
  'buenas tardes por si sale','buenas noches por si sale','buenos dias por si sale',
  'por si sale algun pedido','por si sale otro pedido','por si sale otro',
  'emapica','municipalidad','hospital','banco','essalud','minsa',
  'universidad','iglesia','santo domingo','san francisco','san jose',
  'minedu','ministerio','comisaria','prefecture','prefectura',
  'mercado','supermercado','plaza vea','metro ','tottus',
  'para la urb','para urb','para jr','para av ','para calle',
  'para pasaje','manzana','mz ','lote ','lt ','etapa',
  '?','+51','del mas cercano','exclusivamente para delivery',
  'aqui esta amigo','puede recogerlo','ya puedes pasar',
  'ya puede recoger','compra','alguien disponible'
];

const KEYWORDS_GLOBALES_BASE = [
  'box','moto','motorizado','unidad','movil','movilidad','recoger','deli','dely',
  'pedido listo','tenemos pedido','hay pedido','pedido en camino',
  'ya esta listo el pedido','pedido listo en','venir',
  'pueden venir','vengan','venga','vayan','acercarse','acercarce',
  'acercandose','se pueden acercar','vayan a ptb','vayan a pds',
  'vayan a mega','ptb a mega plaza','ptb a pds','ptb a plaza de sol',
  'ptb mega','pds a ptb','pds a mega','ptb a parcona',
  'se acerca al local','acercandose al local','venor','movi','v3nir',
  '5 min','10 min','7 min','5min','10min','7min',
  'en 5 minutos','en 7 minutos','en 10 minutos',
  '5 minutos','7 minutos','10 minutos','amigo tengo pedido','buenas noches tengo pedido',
  'confirmo pedido','confirmado','confirmado pedido','venie',
  'una unidad','un motorizado','un box','un movil',
  'un delivery','delivery por favor','delivery porfa',
  'necesito delivery','manden delivery','me envia un delivery',
  'me envias un delivery','puede mandar un delivery',
  'enviar un delivery','delivery a tienda','delivery al local','necesito un delivery',
  'me envia uno porfa','me envias uno','puede mandar uno',
  'me podria enviar','me podrias enviar','podria enviar',
  'por favor me envia','por favor envien',
  'venir al local','pasar al local','acerquese al local',
  'alguien puede acercarse','alguien cerca','hay alguien','viniendo','recoger pedido',
  'el pedido esta listo pueden pasar por el',
  'pueden pasar por el pedido','pasen por el pedido'
];

const SIEMPRE_INACTIVOS = [
  'DRIBOX 🏍️','Reporte Deliverys ICA!! 🏍️💨',
  'SERVICIO DELIVERY RUMI-WASI','GRUPO DE MOTORIZADOS'
];

const GRUPO_GANANCIAS = ['GANANCIAS','GANANCIAS '];
const SECTOR_COMODIN  = 'Sector Comodin';
const SECTOR_BASE     = 'Sector Base';

const GRUPOS_SIN_REMARCAR = [
  'Don Alejandro -BOX DELYBERY','OCTAVIA LA ANGOSTURA - BOX DELIVERY',
  'FIDEL - BOX DELIVERY ICA','FIDEL - BOX DELIVERY ICA '
];

const LOCALES_MAP = {
  'car':'Cartas Restaurantes','cartas restaurantes':'Cartas Restaurantes',
  'lab':'La Bumanguesa','la bumanguesa':'La Bumanguesa','bum':'La Bumanguesa',
  'mon':'Monkey Donuts','monkey donuts':'Monkey Donuts',
  'piz':'Pizzería Cardenatti','pizzeria cardenatti':'Pizzería Cardenatti','cardenatti':'Pizzería Cardenatti',
  'pen':'Peñonetti','peñonetti':'Peñonetti','sha':'Shawaburguer','shawaburguer':'Shawaburguer',
  'bru':'Bruces','bruces':'Bruces','kaf':'Kaffa Coffee','kaffa':'Kaffa Coffee','kaffa coffee':'Kaffa Coffee',
  'fla':'Flamangos','flamangos':'Flamangos','mue':'Muelle','muelle':'Muelle',
  'the':'The Crown','the crown':'The Crown','har':'Harvest','harvest':'Harvest',
  'ric':'Ricos Protein','ricos protein':'Ricos Protein','aya':'Ayabaca','ayabaca':'Ayabaca',
  'mis':'Misky Polleria','misky':'Misky Polleria','misky polleria':'Misky Polleria',
  'kam':'Kam Long','kam long':'Kam Long','boc':'Bochitos','bochitos':'Bochitos',
  'las':'Las Nieves','las nieves':'Las Nieves',
  'hel':'Heladería El Pingüino','heladeria':'Heladería El Pingüino','pinguino':'Heladería El Pingüino',
  'mrs':'Mr. Sushi','mr sushi':'Mr. Sushi','mr. sushi':'Mr. Sushi',
  'bub':'Bubaton','bubaton':'Bubaton','cra':'Crazy Corn','crazy corn':'Crazy Corn',
  'chi':'Chifa Liu','chifa liu':'Chifa Liu','mcg':'McGrill','mcgrill':'McGrill',
  'res':'Rest Centro','rest centro':'Rest Centro','del':'Lagunilla','lagunilla':'Lagunilla',
  'mij':'Mister Jugo','mister jugo':'Mister Jugo','can':'Cantones','cantones':'Cantones',
  'pim':'Pim Pam Pollo','pim pam':'Pim Pam Pollo','pim pam pollo':'Pim Pam Pollo',
  'rin':'Rincón del Sabor','rincon':'Rincón del Sabor','rincon del sabor':'Rincón del Sabor',
  'chc':'Chifa Chang Kee','chifa chang':'Chifa Chang Kee','chifa chang kee':'Chifa Chang Kee',
  'moa':'Mono Alitas','mono alitas':'Mono Alitas','pue':'Puerto Rico','puerto rico':'Puerto Rico',
  'art':'Artia','artia':'Artia','pep':'Pepefod','pepefod':'Pepefod','mia':'Mias','mias':'Mias',
  'one':'Onest','onest':'Onest','hug':'Hugo Restaurante','hugo':'Hugo Restaurante','hugo restaurante':'Hugo Restaurante',
  'pal':'Palacio Oriental','palacio':'Palacio Oriental','palacio oriental':'Palacio Oriental',
  'kan':'Kanastas','kanastas':'Kanastas','roc':'Roca Steak House','roca':'Roca Steak House','roca steak':'Roca Steak House',
  'pap':'Papeado San Isidro','papeado':'Papeado San Isidro',
  'sma':'Smart Nutrition','smart':'Smart Nutrition','smart nutrition':'Smart Nutrition',
  'deb':'Delivery Bien Pescao','bien pescao':'Delivery Bien Pescao',
  'pio':'Pio Rico','pio rico':'Pio Rico','pun':'Punto Caliente','punto caliente':'Punto Caliente',
  'par2':'La Parrilleria','parrilleria':'La Parrilleria','la parrilleria':'La Parrilleria',
  'fid':'Fidel','fidel':'Fidel','hua':'Pollería El Huarango','huarango':'Pollería El Huarango',
  'par':'Paradero','paradero':'Paradero','sel':'Selah Coffe','selah':'Selah Coffe','selah coffe':'Selah Coffe',
  'bol':'Boletas','boletas':'Boletas','don':'Don Alejandro','don alejandro':'Don Alejandro',
  'elb':'El Borgo','el borgo':'El Borgo','oct':'Octavia','octavia':'Octavia',
  'bas':'Base','base':'Base','per':'Personal','personal':'Personal'
};

const SECTORES = {
  'Sector Base': ['REPORTES BOX DELIVERY','REPORTES BOX DELIVERY ','Hola','Hola '],
  'Sector PTB': [
    'CARTAS RESTAURANTES','LA BUMANGUESA BOX DELIVERY','PEÑONETTI BOX DELIVERY','SHAWABURGUER BOX DELIVERY',
    'BRUCES BOX DELIVERY','BRUCES BOX DELIVERY ','FLAMANGOS - BOX DELIVERY','FLAMANGOS- BOX DELIVERY',
    'KAFFA COFFEE - BOX DELIVERY','KAFFA COFFEE- BOX DELIVERY','KAFFA COFFEE BOX DELIVERY',
    'MUELLE BOX DELIVERY','MUELLE BOX DELIVERY '
  ],
  'Sector San José': [
    'THE CROWN BOX DELIVERY','HARVEST BOX DELIVERY','RICOS PROTEIN - BOX DELIVERY','AYABACA - BUMANGUESA II',
    'MISKY POLLERIA (dribox)','KAM LONG PEDIDOS','BOCHITOS BOX DELIVERY',
    'LAS NIEVES BOX DELIVERY','HELADERÍA EL PINGÜINO','MR. SUSHI BOX DELIVERY'
  ],
  'Sector Moderna': [
    'BUBATON BOX DELIVERY','CRAZY CORN 🌭🧋🤗','CHIFA LIU BOX DELIVERY',
    'McGrill Restaurante BOX DELIVERY','REST CENTRO BOX DELIVERY','REST CENTRO BOX DELIVERY ','PATRIA PEDIDOS   ','PATRIA PEDIDOS',
    'MISTER JUGO BOX DELIVERY','MISTER JUGO BOX DELIVERY ','CANTONES - BOX DELIVERY',
    'PIM PAM POLLO BOX DELIVERY','CHIFA CHANG KEE PEDIDOS','MONO ALITAS BOX DELIVERY','PIO RICO BOX DELIVERY','PIO RICO BOX DELIVERY ',
    'KANASTAS BOX DELIVERY','KANASTAS BOX DELIVERY ','PUERTO RICO BOX DELIVERY','PUERTO RICO BOX DELIVERY '
  ],
  'Sector La Angostura': [
    'Don Alejandro -BOX DELYBERY','EL BORGO BOX DELIVERY',
    'OCTAVIA LA ANGOSTURA - BOX DELIVERY','FIDEL - BOX DELIVERY ICA','FIDEL - BOX DELIVERY ICA '
  ],
  'Sector Comodin': [
    'ARTIA PASTELERIA (dribox)','PEPEFOD DELIVERY','MIAS BOX DELIVERY',
    'ONEST BOX DELIVERY','ONEST BOX DELIVERY ','Hugo Restaurante BOX DELIVERY','Hugo Restaurante BOX DELIVERY ',
    'Palacio Oriental BOX DELIVERY','ROCA STEAK HOUSE BOX DELIVERY','PAPEADO SAN ISIDRO BOX DELIVERY',
    'SMART NUTRITION BOX DELIVERY','DELIVERY BIEN PESCAO 🏍️','LAS CAÑAS BOX DELIVERY','LAS CAÑAS BOX DELIVERY   ', 
    'POLLERÍA EL HUARANGO - BOX DELIVERY','Paradero ','Paradero','Boletas locales',
    'Rincón del sabor BOX DELIVERY','PUNTO CALIENTE - BOX DELIVERY','BOX DELIVERY EL PESQUERO ','BOX DELIVERY EL PESQUERO',
    'MONKEY DONUTS BOX DELIVERY','MONKEY DONUTS BOX DELIVERY ',
    'Pizzería cardenatti box delivery','Pizzería cardenatti box delivery ',
    'LA PARRILLERIA BOX DELIVERY','LA PARRILLERIA BOX DELIVERY ',
    'Selah Coffe BOX DELIVERY','Selah Coffe BOX DELIVERY ','DELIVERY BOX / LAGUNILLA'
  ],
  'Sector X (otros)': [
    'DRIBOX 🏍️','Reporte Deliverys ICA!! 🏍️💨','SERVICIO DELIVERY RUMI-WASI','GRUPO DE MOTORIZADOS'
  ]
};

const ORDEN_GRUPOS = Object.values(SECTORES).flat();

// ════════════════════════════════════════════════════════════════════
// PERSISTENCIA
// ════════════════════════════════════════════════════════════════════

function loadKeywords() {
  try { if (fs.existsSync(KEYWORDS_FILE)) return JSON.parse(fs.readFileSync(KEYWORDS_FILE,'utf8')); } catch(e) {}
  return { globales:[], excluir:[], especiales:{}, frasesDesactivadas:{} };
}
function saveKeywords(data) { fs.writeFileSync(KEYWORDS_FILE, JSON.stringify(data)); }

function loadSnapshot() {
  try { if (fs.existsSync(SNAPSHOT_FILE)) return JSON.parse(fs.readFileSync(SNAPSHOT_FILE,'utf8')); } catch(e) {}
  return null;
}
function saveSnapshot(data) { fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(data)); }
function deleteSnapshot() { try { if (fs.existsSync(SNAPSHOT_FILE)) fs.unlinkSync(SNAPSHOT_FILE); } catch(e) {} }

function loadConfig() {
  try { if (fs.existsSync(CONFIG_FILE)) return JSON.parse(fs.readFileSync(CONFIG_FILE,'utf8')); } catch(e) {}
  return { botActivo:false, gruposActivos:[], gruposCache:[], sectoresApagados:[], delay:700 };
}
function saveConfig() {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({
    botActivo, gruposActivos:GRUPOS_ACTIVOS,
    gruposCache:GRUPOS_CACHE, sectoresApagados:SECTORES_APAGADOS, delay:DELAY
  }));
}
function loadHistorial() {
  try { if (fs.existsSync(HISTORIAL_FILE)) return JSON.parse(fs.readFileSync(HISTORIAL_FILE,'utf8')); } catch(e) {}
  return [];
}
function saveHistorial() {
  if (HISTORIAL.length > 200) HISTORIAL.splice(0, HISTORIAL.length - 200);
  fs.writeFileSync(HISTORIAL_FILE, JSON.stringify(HISTORIAL));
}
function loadGanancias() {
  try {
    if (fs.existsSync(GANANCIAS_FILE)) {
      var data = JSON.parse(fs.readFileSync(GANANCIAS_FILE,'utf8'));
      var hoy = getHoraPeru().toLocaleDateString('es-PE');
      if (data.fecha !== hoy) return { fecha:hoy, ganancias:0, gastos:0 };
      return data;
    }
  } catch(e) {}
  return { fecha:getHoraPeru().toLocaleDateString('es-PE'), ganancias:0, gastos:0 };
}
function saveGanancias(data) { fs.writeFileSync(GANANCIAS_FILE, JSON.stringify(data)); }
function loadReporte() {
  try { if (fs.existsSync(REPORTE_FILE)) return JSON.parse(fs.readFileSync(REPORTE_FILE,'utf8')); } catch(e) {}
  return { semana_inicio:getFechaLunesActual(), locales:{}, gastos:{}, localesHoy:{}, gastosHoy:{} };
}
function saveReporte(data) { fs.writeFileSync(REPORTE_FILE, JSON.stringify(data)); }

// ════════════════════════════════════════════════════════════════════
// ESTADO GLOBAL
// ════════════════════════════════════════════════════════════════════

var cfg               = loadConfig();
var botActivo         = false;
var GRUPOS_ACTIVOS    = cfg.gruposActivos    || [];
var GRUPOS_CACHE      = cfg.gruposCache      || [];
var SECTORES_APAGADOS = cfg.sectoresApagados || [];
var DELAY             = cfg.delay !== undefined ? cfg.delay : 700;
var HISTORIAL         = loadHistorial();
var KW                = loadKeywords();
var qrCodeData        = '';
var isReady           = false;
var lastReply         = {};
var COOLDOWN          = 5 * 60 * 1000;
var AUTO_REPLY        = 'Voy';
var sseClients        = [];
var reporteEnviado    = false;
var reporteDiarioEnviado = false;

// ════════════════════════════════════════════════════════════════════
// KEYWORDS DINÁMICAS
// ════════════════════════════════════════════════════════════════════

function getKeywordsGlobales()        { return KEYWORDS_GLOBALES_BASE.concat(KW.globales || []); }
function getKeywordsExcluir()         { return KEYWORDS_EXCLUIR_BASE.concat(KW.excluir   || []); }
function getKeywordsEspeciales(grupo) {
  return (KEYWORDS_ESPECIALES_BASE[grupo] || []).concat((KW.especiales && KW.especiales[grupo]) || []);
}
function getFrasesActivasSectorBase(nombreGrupo) {
  var cfg2 = null;
  Object.keys(SECTOR_BASE_CONFIG).forEach(function(k) {
    if (k.trim().toLowerCase() === nombreGrupo.trim().toLowerCase()) cfg2 = SECTOR_BASE_CONFIG[k];
  });
  if (!cfg2) return [];
  var desact = (KW.frasesDesactivadas && KW.frasesDesactivadas[nombreGrupo]) || [];
  return cfg2.frases.filter(function(f) { return !desact.includes(f); });
}

// ════════════════════════════════════════════════════════════════════
// UTILIDADES
// ════════════════════════════════════════════════════════════════════

function getHoraPeru() {
  return new Date(new Date().toLocaleString('en-US', { timeZone:'America/Lima' }));
}
function getFechaLunesActual() {
  var hoy = getHoraPeru(), dia = hoy.getDay();
  var diff = (dia === 0) ? -6 : 1 - dia;
  var lunes = new Date(hoy); lunes.setDate(hoy.getDate() + diff);
  return lunes.toLocaleDateString('es-PE');
}
function normalizar(texto) {
  return texto.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9 ?:]/g,' ').replace(/\s+/g,' ').trim();
}

// ── Detección de hora futura ─────────────────────────────────────────
// Formatos soportados: 10:45 | 10.45 | 10 45 | 1045 | 10:45am | 10.45pm
function tieneHoraFuturaLejana(texto) {
  var t = normalizar(texto);
  var ahora = getHoraPeru();
  var horaActualMin = ahora.getHours() * 60 + ahora.getMinutes();

  // Regex unificado que captura todos los formatos:
  // separador puede ser : . espacio o nada (solo si 4 dígitos juntos)
  var patrones = [
    // con separador : . o espacio entre horas y minutos  ej: 10:45 10.45 10 45
    /\b([0-2]?[0-9])(?:[:.\s])([0-5][0-9])\s*(am|pm)?\b/g,
    // 4 dígitos juntos sin separador ej: 1045
    /\b([0-2][0-9])([0-5][0-9])\s*(am|pm)?\b/g
  ];

  var encontrado = false;
  patrones.forEach(function(regex) {
    if (encontrado) return;
    var match;
    while ((match = regex.exec(t)) !== null) {
      var hh = parseInt(match[1], 10);
      var mm = parseInt(match[2], 10);
      var ampm = match[3];
      if (hh > 23 || mm > 59) continue;
      if (ampm === 'pm' && hh < 12) hh += 12;
      if (ampm === 'am' && hh === 12) hh = 0;
      var horaMencionadaMin = hh * 60 + mm;
      if (horaMencionadaMin - horaActualMin > 15) { encontrado = true; break; }
    }
  });
  return encontrado;
}

function tieneExclusion(texto) {
  var t = normalizar(texto);
  return getKeywordsExcluir().some(function(k) { return t.includes(normalizar(k)); });
}
function tieneKeywordPositiva(texto) {
  var t = normalizar(texto);
  return getKeywordsGlobales().some(function(k) { return t.includes(normalizar(k)); });
}
function buscarKeywordEspecial(texto, nombreGrupo) {
  var lista = getKeywordsEspeciales(nombreGrupo);
  if (!lista.length) return false;
  var t = normalizar(texto);
  return lista.some(function(k) { var kn = normalizar(k); return t === kn || t.includes(kn); });
}
function getSectorDeGrupo(nombreGrupo) {
  var keys = Object.keys(SECTORES);
  for (var i = 0; i < keys.length; i++) {
    if (keys[i] === 'Sector X (otros)') continue;
    var gs = SECTORES[keys[i]];
    for (var j = 0; j < gs.length; j++) {
      if (gs[j].trim().toLowerCase() === nombreGrupo.trim().toLowerCase()) return keys[i];
    }
  }
  return 'Sector X (otros)';
}
function esGrupoSinRemarcar(n) {
  if (getSectorDeGrupo(n) === SECTOR_COMODIN) return true;
  return GRUPOS_SIN_REMARCAR.some(function(x) { return x.trim().toLowerCase() === n.trim().toLowerCase(); });
}
function esGrupoGanancias(n) {
  return GRUPO_GANANCIAS.some(function(x) { return x.trim().toLowerCase() === n.trim().toLowerCase(); });
}
function procesarMensajeSectorBase(nombreGrupo, numero, texto) {
  var cfg2 = null;
  Object.keys(SECTOR_BASE_CONFIG).forEach(function(k) {
    if (k.trim().toLowerCase() === nombreGrupo.trim().toLowerCase()) cfg2 = SECTOR_BASE_CONFIG[k];
  });
  if (!cfg2) return false;
  var numLimpio = numero.replace(/\s/g,'');
  if (!cfg2.numerosAutorizados.some(function(n) { return n.replace(/\s/g,'') === numLimpio; })) return false;
  var frasesActivas = getFrasesActivasSectorBase(nombreGrupo);
  var t = normalizar(texto);
  return frasesActivas.some(function(f) { return t === normalizar(f) || t.includes(normalizar(f)); });
}
function buscarLocal(pk) {
  var clave = normalizar(pk).trim();
  if (LOCALES_MAP[clave]) return LOCALES_MAP[clave];
  var keys = Object.keys(LOCALES_MAP);
  for (var i = 0; i < keys.length; i++) { if (normalizar(keys[i]) === clave) return LOCALES_MAP[keys[i]]; }
  return null;
}
function extraerEntradas(texto) {
  var entradas = [];
  texto.split('\n').forEach(function(linea) {
    var tr = linea.trim(); if (!tr) return;
    var mG = tr.match(/^menos\s+(\d{1,6}(?:\.\d{1,2})?)\s*(.*)?$/i);
    if (mG) { var m=parseFloat(mG[1]),d=mG[2]?mG[2].trim():'Otros'; if(!d)d='Otros'; if(m>0&&m<=99999) entradas.push({tipo:'gasto',nombre:d,monto:m}); return; }
    var mL = tr.match(/^([a-zA-ZáéíóúÁÉÍÓÚñÑ][a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{0,40}?)\s+(\d{1,5}(?:\.\d{1,2})?)$/);
    if (mL) { var pk=mL[1].trim(),m2=parseFloat(mL[2]); if(m2>0&&m2<=99999) entradas.push({tipo:'local',nombre:buscarLocal(pk)||pk,monto:m2}); return; }
    var mI = tr.match(/^(\d{1,5}(?:\.\d{1,2})?)\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ][a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{0,40})$/);
    if (mI) { var m4=parseFloat(mI[1]),pk2=mI[2].trim(); if(m4>0&&m4<=99999) entradas.push({tipo:'local',nombre:buscarLocal(pk2)||pk2,monto:m4}); return; }
    var mN = tr.match(/^(\d{1,5}(?:\.\d{1,2})?)$/);
    if (mN) { var m3=parseFloat(mN[1]); if(m3>0&&m3<=99999) entradas.push({tipo:'local',nombre:'Sin etiqueta',monto:m3}); }
  });
  return entradas;
}
function generarTextoReporte(rep, fi, ff) {
  var tL=0,tG=0;
  var lL=Object.keys(rep.locales).map(function(n){tL+=rep.locales[n];return '  • '+n+': '+rep.locales[n]+' soles';});
  var lG=Object.keys(rep.gastos).map(function(n){tG+=rep.gastos[n];return '  • '+n+': '+rep.gastos[n]+' soles';});
  tL=Math.round(tL*100)/100; tG=Math.round(tG*100)/100;
  var liq=Math.round((tL-tG)*100)/100;
  var txt='📊 *REPORTE SEMANAL*\n📅 '+fi+' al '+ff+'\n─────────────────\n';
  txt+='✅ *GANANCIAS POR LOCAL:*\n'+(lL.length?lL.join('\n')+'\n':'  (sin registros)\n');
  txt+='💰 *Total ganancias: '+tL+' soles*\n─────────────────\n';
  txt+='📉 *GASTOS:*\n'+(lG.length?lG.join('\n')+'\n':'  (sin registros)\n');
  txt+='💸 *Total gastos: '+tG+' soles*\n─────────────────\n';
  txt+='TOTAL LIQUIDO '+(liq>=0?'🤑':'😬')+': *'+liq+' soles*';
  return txt;
}

function enviarNotificacion(grupo, hora) {
  var data = JSON.stringify({ grupo, hora });
  sseClients = sseClients.filter(function(res) {
    try { res.write('data: '+data+'\n\n'); return true; } catch(e) { return false; }
  });
}

// ════════════════════════════════════════════════════════════════════
// REPORTE AUTOMÁTICO
// ════════════════════════════════════════════════════════════════════

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
        var ganData = loadGanancias(), rep = loadReporte();
        var txt = '📋 *RESUMEN DEL DÍA - '+ahora.toLocaleDateString('es-PE')+'*\n─────────────────\n';
        txt += '✅ *GANANCIAS POR LOCAL:*\n';
        var lH = Object.keys(rep.localesHoy||{});
        if (lH.length) lH.forEach(function(n){txt+='  • '+n+': '+rep.localesHoy[n]+' soles\n';}); else txt+='  (sin registros)\n';
        txt += '💰 *Total ganancias: '+ganData.ganancias+' soles*\n─────────────────\n📉 *GASTOS:*\n';
        var gH = Object.keys(rep.gastosHoy||{});
        if (gH.length) gH.forEach(function(n){txt+='  • '+n+': '+rep.gastosHoy[n]+' soles\n';}); else txt+='  (sin registros)\n';
        txt += '💸 *Total gastos: '+ganData.gastos+' soles*\n─────────────────\n';
        var liq = Math.round((ganData.ganancias-ganData.gastos)*100)/100;
        txt += 'TOTAL LIQUIDO '+(liq>=0?'🤑':'😬')+': *'+liq+' soles*';
        await grupoGan.sendMessage(txt);
        rep.localesHoy={}; rep.gastosHoy={}; saveReporte(rep);
      }
    } catch(e) { console.log('Error reporte diario:',e.message); }
    if (esDomingo && !reporteEnviado) {
      reporteEnviado = true;
      try {
        var chats2 = await client.getChats();
        var gG2 = chats2.find(function(c){return c.isGroup&&esGrupoGanancias(c.name);});
        if (gG2) {
          var rep2 = loadReporte();
          await gG2.sendMessage(generarTextoReporte(rep2, rep2.semana_inicio||getFechaLunesActual(), ahora.toLocaleDateString('es-PE')));
          saveReporte({semana_inicio:getFechaLunesActual(),locales:{},gastos:{},localesHoy:{},gastosHoy:{}});
        }
      } catch(e) { console.log('Error reporte semanal:',e.message); }
    }
  }
  if (ahora.getHours()===0&&ahora.getMinutes()===0) { reporteEnviado=false; reporteDiarioEnviado=false; }
}, 60*1000);

// ════════════════════════════════════════════════════════════════════
// WHATSAPP CLIENT
// ════════════════════════════════════════════════════════════════════

var client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { args:['--no-sandbox','--disable-setuid-sandbox'], protocolTimeout:60000 }
});

client.on('qr', function(qr) { qrCodeData=qr; isReady=false; });
client.on('disconnected', function(reason) {
  console.log('Desconectado:',reason);
  isReady=false; qrCodeData=''; botActivo=false; saveConfig();
  try { var p='./.wwebjs_auth'; if(fs.existsSync(p)) fs.rmSync(p,{recursive:true,force:true}); } catch(e) {}
  setTimeout(function(){try{client.initialize();}catch(e){process.exit(0);}},3000);
});

client.on('ready', async function() {
  isReady=true; qrCodeData='';
  console.log('WhatsApp listo, esperando 5s...');
  await new Promise(function(r){setTimeout(r,5000);});
  try {
    var chats = await client.getChats();
    var grupos = chats.filter(function(c){return c.isGroup;});
    GRUPOS_CACHE = grupos.map(function(g){return {id:g.id._serialized,name:g.name};});
    GRUPOS_CACHE.sort(function(a,b){
      var ia=ORDEN_GRUPOS.findIndex(function(n){return n.trim().toLowerCase()===a.name.trim().toLowerCase();});
      var ib=ORDEN_GRUPOS.findIndex(function(n){return n.trim().toLowerCase()===b.name.trim().toLowerCase();});
      if(ia===-1&&ib===-1)return 0; if(ia===-1)return 1; if(ib===-1)return -1; return ia-ib;
    });
    GRUPOS_CACHE.forEach(function(g){
      var esInact=SIEMPRE_INACTIVOS.some(function(n){return g.name.toLowerCase().includes(n.toLowerCase());});
      var esSX=getSectorDeGrupo(g.name)==='Sector X (otros)';
      var esGan=esGrupoGanancias(g.name);
      if(esInact||(esSX&&!esGan)){GRUPOS_ACTIVOS=GRUPOS_ACTIVOS.filter(function(id){return id!==g.id;});return;}
      if(!GRUPOS_ACTIVOS.includes(g.id))GRUPOS_ACTIVOS.push(g.id);
    });
    saveConfig();
    console.log('Listo - '+grupos.length+' grupos cargados');
  } catch(e){console.log('Error cargando chats:',e.message);}
});

client.on('message', async function(msg) {
  if (!isReady) return;
  var esFoto=msg.hasMedia&&msg.type==='image', esTexto=msg.type==='chat';
  if (!esTexto&&!esFoto) return;
  var chat = await msg.getChat();
  if (!chat.isGroup) return;
  var texto=msg.body||'';
  var contacto=await msg.getContact();
  var numero=contacto.id.user||(msg.author?msg.author:msg.from).replace(/@.*/,'').replace(/[^0-9]/g,'');

  if (esGrupoGanancias(chat.name)) {
    if (msg.fromMe) return;
    if (texto.trim().toLowerCase()==='reset') {
      saveGanancias({fecha:getHoraPeru().toLocaleDateString('es-PE'),ganancias:0,gastos:0});
      await chat.sendMessage('✅ Listo, nuevo día\n✅ GANANCIAS: Total hoy: 0 soles\n📉 GASTOS: Total hoy: -0 soles\nTOTAL LIQUIDO 🤑: 0 soles');
      return;
    }
    var entradas=extraerEntradas(texto);
    if (entradas.length>0) {
      var ganData=loadGanancias(),hoy=getHoraPeru().toLocaleDateString('es-PE');
      if(ganData.fecha!==hoy)ganData={fecha:hoy,ganancias:0,gastos:0};
      var rep=loadReporte(),lA=getFechaLunesActual();
      if(rep.semana_inicio!==lA)rep={semana_inicio:lA,locales:{},gastos:{},localesHoy:{},gastosHoy:{}};
      var tGan=0,tGas=0;
      entradas.forEach(function(e){
        if(e.tipo==='local'){
          tGan+=e.monto;
          rep.locales[e.nombre]=Math.round(((rep.locales[e.nombre]||0)+e.monto)*100)/100;
          if(!rep.localesHoy)rep.localesHoy={};
          rep.localesHoy[e.nombre]=Math.round(((rep.localesHoy[e.nombre]||0)+e.monto)*100)/100;
        } else {
          tGas+=e.monto;
          var ng=e.nombre.charAt(0).toUpperCase()+e.nombre.slice(1);
          rep.gastos[ng]=Math.round(((rep.gastos[ng]||0)+e.monto)*100)/100;
          if(!rep.gastosHoy)rep.gastosHoy={};
          rep.gastosHoy[ng]=Math.round(((rep.gastosHoy[ng]||0)+e.monto)*100)/100;
        }
      });
      ganData.ganancias=Math.round((ganData.ganancias+tGan)*100)/100;
      ganData.gastos=Math.round((ganData.gastos+tGas)*100)/100;
      saveGanancias(ganData);saveReporte(rep);
      var liq=Math.round((ganData.ganancias-ganData.gastos)*100)/100;
      await chat.sendMessage('✅ GANANCIAS: Total hoy: '+ganData.ganancias+' soles\n📉 GASTOS: Total hoy: -'+ganData.gastos+' soles\nTOTAL LIQUIDO '+(liq>=0?'🤑':'😬')+': '+liq+' soles');
    }
    return;
  }

  var sectorDelGrupo=getSectorDeGrupo(chat.name);
  if (sectorDelGrupo===SECTOR_BASE) {
    if(!botActivo)return;
    var chatId=chat.id._serialized;
    if(!GRUPOS_ACTIVOS.includes(chatId))return;
    if(SECTORES_APAGADOS.includes(SECTOR_BASE))return;
    if(procesarMensajeSectorBase(chat.name,numero,texto)){
      var aSB=Date.now();
      if(lastReply[chatId]&&aSB-lastReply[chatId]<COOLDOWN)return;
      lastReply[chatId]=aSB;
      await new Promise(function(r){setTimeout(r,DELAY);});
      await msg.reply(AUTO_REPLY);
      var nSB=getHoraPeru();
      HISTORIAL.unshift({grupo:chat.name,sector:SECTOR_BASE,mensaje:texto.substring(0,80),fecha:nSB.toLocaleDateString('es-PE'),hora:nSB.toLocaleTimeString('es-PE')});
      saveHistorial();enviarNotificacion(chat.name,nSB.toLocaleTimeString('es-PE'));
      botActivo=false;saveConfig();
    }
    return;
  }

  if(NUMEROS_IGNORADOS.includes(numero))return;
  if(!botActivo)return;
  var chatIdP=chat.id._serialized;
  if(!GRUPOS_ACTIVOS.includes(chatIdP))return;
  if(SECTORES_APAGADOS.includes(sectorDelGrupo))return;
  if(esTexto&&tieneHoraFuturaLejana(texto))return;

  var esFotoGrupo=GRUPOS_FOTO.some(function(n){return chat.name.toLowerCase().includes(n.toLowerCase());});
  var esPrioritario=GRUPOS_PRIORITARIOS.includes(chat.name.trim().toLowerCase());
  var tieneKeyword=false;

  if(esPrioritario){
    if(buscarKeywordEspecial(texto,chat.name.trim())){tieneKeyword=true;}
    else{if(tieneExclusion(texto))return;tieneKeyword=tieneKeywordPositiva(texto);}
  } else {
    if(tieneExclusion(texto))return;
    tieneKeyword=tieneKeywordPositiva(texto);
    if(!tieneKeyword)tieneKeyword=buscarKeywordEspecial(texto,chat.name.trim());
  }
  if(!tieneKeyword&&!(esFoto&&esFotoGrupo))return;

  var ahora=Date.now();
  if(lastReply[chatIdP]&&ahora-lastReply[chatIdP]<COOLDOWN)return;
  lastReply[chatIdP]=ahora;
  await new Promise(function(r){setTimeout(r,DELAY);});
  if(esGrupoSinRemarcar(chat.name))await chat.sendMessage(AUTO_REPLY);
  else await msg.reply(AUTO_REPLY);

  var now=getHoraPeru();
  HISTORIAL.unshift({grupo:chat.name,sector:sectorDelGrupo,mensaje:esFoto?'📸 Foto':texto.substring(0,80),fecha:now.toLocaleDateString('es-PE'),hora:now.toLocaleTimeString('es-PE')});
  saveHistorial();enviarNotificacion(chat.name,now.toLocaleTimeString('es-PE'));
  botActivo=false;saveConfig();
});

// ════════════════════════════════════════════════════════════════════
// ENDPOINTS
// ════════════════════════════════════════════════════════════════════

app.get('/eventos', function(req,res){
  res.setHeader('Content-Type','text/event-stream');
  res.setHeader('Cache-Control','no-cache');
  res.setHeader('Connection','keep-alive');
  res.flushHeaders();sseClients.push(res);
  req.on('close',function(){sseClients=sseClients.filter(function(c){return c!==res;});});
});

app.get('/historial', function(req,res){
  var filas=HISTORIAL.length===0
    ?'<tr><td colspan="4" style="text-align:center;padding:20px;color:#aaa">Sin registros aun</td></tr>'
    :HISTORIAL.map(function(h,i){
      return '<tr style="background:'+(i%2===0?'#fff':'#f9f9f9')+'">'+
        '<td style="padding:10px 8px;font-size:13px">'+h.fecha+' '+h.hora+'</td>'+
        '<td style="padding:10px 8px;font-size:13px;font-weight:500">'+h.grupo+'</td>'+
        '<td style="padding:10px 8px;font-size:12px;color:#666">'+h.sector+'</td>'+
        '<td style="padding:10px 8px;font-size:12px;color:#888;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+h.mensaje+'</td></tr>';
    }).join('');
  res.send('<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Historial</title></head>'+
    '<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">'+
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px"><a href="/" style="text-decoration:none;font-size:22px">←</a><h2 style="margin:0">📋 Historial</h2></div>'+
    '<p style="color:#888;font-size:13px;margin-bottom:16px">Total: <b>'+HISTORIAL.length+'</b> respuestas</p>'+
    '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;border:1px solid #eee"><thead><tr style="background:#25D366;color:white">'+
    '<th style="padding:10px 8px;text-align:left;font-size:13px">Fecha / Hora</th><th style="padding:10px 8px;text-align:left;font-size:13px">Grupo</th>'+
    '<th style="padding:10px 8px;text-align:left;font-size:13px">Sector</th><th style="padding:10px 8px;text-align:left;font-size:13px">Mensaje</th>'+
    '</tr></thead><tbody>'+filas+'</tbody></table></div>'+
    '<button onclick="if(confirm(\'Borrar historial?\')){fetch(\'/historial\',{method:\'DELETE\'}).then(function(){location.reload()})}" style="margin-top:20px;padding:10px 20px;border-radius:10px;border:none;background:#e74c3c;color:white;cursor:pointer;font-size:14px">Borrar historial</button>'+
    '</body></html>');
});
app.delete('/historial',function(req,res){HISTORIAL=[];saveHistorial();res.json({ok:true});});

app.post('/cerrar-sesion',async function(req,res){
  try{isReady=false;botActivo=false;saveConfig();await client.logout();}catch(e){}
  try{var sp='./.wwebjs_auth';if(fs.existsSync(sp))fs.rmSync(sp,{recursive:true,force:true});}catch(e){}
  setTimeout(function(){try{client.initialize();}catch(e){process.exit(0);}},2000);
  res.json({ok:true});
});
app.post('/ajustes',function(req,res){
  var nd=parseInt(req.body.delay);
  if(!isNaN(nd)&&nd>=100&&nd<=1000){DELAY=nd;saveConfig();}
  res.json({delay:DELAY});
});
app.post('/toggle',function(req,res){
  botActivo=!botActivo;
  if(botActivo)Object.keys(lastReply).forEach(function(k){delete lastReply[k];});
  saveConfig();res.json({activo:botActivo});
});
app.post('/grupo',function(req,res){
  var id=req.body.id;
  if(GRUPOS_ACTIVOS.includes(id))GRUPOS_ACTIVOS=GRUPOS_ACTIVOS.filter(function(g){return g!==id;});
  else GRUPOS_ACTIVOS.push(id);
  saveConfig();res.json({grupos:GRUPOS_ACTIVOS});
});
app.post('/sector',function(req,res){
  var sector=req.body.sector;
  if(SECTORES_APAGADOS.includes(sector))SECTORES_APAGADOS=SECTORES_APAGADOS.filter(function(s){return s!==sector;});
  else SECTORES_APAGADOS.push(sector);
  saveConfig();res.json({sectoresApagados:SECTORES_APAGADOS});
});

// Keywords
app.get('/keywords',function(req,res){res.json(KW);});
app.post('/keywords/global',function(req,res){
  var kw=(req.body.keyword||'').trim(),accion=req.body.accion;
  if(!kw)return res.status(400).json({error:'keyword vacía'});
  KW=loadKeywords();
  if(accion==='agregar'){if(!KW.globales.includes(kw))KW.globales.push(kw);}
  else if(accion==='quitar'){KW.globales=KW.globales.filter(function(k){return k!==kw;});}
  saveKeywords(KW);res.json({ok:true,globales:KW.globales});
});
app.post('/keywords/excluir',function(req,res){
  var kw=(req.body.keyword||'').trim(),accion=req.body.accion;
  if(!kw)return res.status(400).json({error:'keyword vacía'});
  KW=loadKeywords();
  if(accion==='agregar'){if(!KW.excluir.includes(kw))KW.excluir.push(kw);}
  else if(accion==='quitar'){KW.excluir=KW.excluir.filter(function(k){return k!==kw;});}
  saveKeywords(KW);res.json({ok:true,excluir:KW.excluir});
});
app.post('/keywords/especial',function(req,res){
  var kw=(req.body.keyword||'').trim(),grupo=(req.body.grupo||'').trim(),accion=req.body.accion;
  if(!kw||!grupo)return res.status(400).json({error:'keyword o grupo vacío'});
  KW=loadKeywords();
  if(!KW.especiales)KW.especiales={};
  if(!KW.especiales[grupo])KW.especiales[grupo]=[];
  if(accion==='agregar'){if(!KW.especiales[grupo].includes(kw))KW.especiales[grupo].push(kw);}
  else if(accion==='quitar'){KW.especiales[grupo]=KW.especiales[grupo].filter(function(k){return k!==kw;});if(!KW.especiales[grupo].length)delete KW.especiales[grupo];}
  saveKeywords(KW);res.json({ok:true,especiales:KW.especiales});
});
app.post('/keywords/frase-base',function(req,res){
  var grupo=(req.body.grupo||'').trim(),frase=(req.body.frase||'').trim(),accion=req.body.accion;
  if(!grupo||!frase)return res.status(400).json({error:'grupo o frase vacío'});
  KW=loadKeywords();
  if(!KW.frasesDesactivadas)KW.frasesDesactivadas={};
  if(!KW.frasesDesactivadas[grupo])KW.frasesDesactivadas[grupo]=[];
  if(accion==='desactivar'){if(!KW.frasesDesactivadas[grupo].includes(frase))KW.frasesDesactivadas[grupo].push(frase);}
  else if(accion==='activar'){KW.frasesDesactivadas[grupo]=KW.frasesDesactivadas[grupo].filter(function(f){return f!==frase;});if(!KW.frasesDesactivadas[grupo].length)delete KW.frasesDesactivadas[grupo];}
  saveKeywords(KW);res.json({ok:true,frasesDesactivadas:KW.frasesDesactivadas});
});

// ── Modo enfoque MÚLTIPLE ────────────────────────────────────────────
// Al presionar 🎯 en un grupo:
//   - Si NO hay snapshot aún → guarda snapshot actual y desactiva todos
//   - Luego agrega ese grupo a los activos
// Restaurar → vuelve al snapshot original
app.post('/enfoque',function(req,res){
  var grupoId=(req.body.grupoId||'').trim(),grupoNombre=(req.body.grupoNombre||'').trim();
  if(!grupoId)return res.status(400).json({error:'grupoId requerido'});
  var snap=loadSnapshot();
  if(!snap){
    // Primera vez: guarda snapshot y limpia grupos activos
    saveSnapshot({gruposActivos:[...GRUPOS_ACTIVOS],gruposEnfoque:[grupoNombre]});
    GRUPOS_ACTIVOS=[];
  } else {
    // Ya hay enfoque activo: solo agrega el nombre al array de grupos en enfoque
    if(!snap.gruposEnfoque)snap.gruposEnfoque=[];
    if(!snap.gruposEnfoque.includes(grupoNombre))snap.gruposEnfoque.push(grupoNombre);
    saveSnapshot(snap);
  }
  // Agrega el grupo al enfoque si no está ya
  if(!GRUPOS_ACTIVOS.includes(grupoId))GRUPOS_ACTIVOS.push(grupoId);
  saveConfig();
  res.json({ok:true,gruposEnfoque:loadSnapshot().gruposEnfoque});
});

app.post('/enfoque/restaurar',function(req,res){
  var snap=loadSnapshot();
  if(snap){GRUPOS_ACTIVOS=snap.gruposActivos||[];saveConfig();}
  deleteSnapshot();
  res.json({ok:true});
});

app.get('/enfoque/estado',function(req,res){
  var snap=loadSnapshot();
  res.json(snap?{activo:true,gruposEnfoque:snap.gruposEnfoque||[]}:{activo:false,gruposEnfoque:[]});
});

app.get('/grupos-raw',function(req,res){
  var lista=GRUPOS_CACHE.map(function(g){return g.name+'  →  sector: '+getSectorDeGrupo(g.name);}).join('\n');
  res.setHeader('Content-Type','text/plain; charset=utf-8');
  res.send('TOTAL: '+GRUPOS_CACHE.length+' grupos\n\n'+lista);
});

// ════════════════════════════════════════════════════════════════════
// PANEL PRINCIPAL
// ════════════════════════════════════════════════════════════════════

app.get('/',function(req,res){
  if(!isReady){
    if(!qrCodeData)return res.send('<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>⏳ Iniciando...</h2><p>Recarga en unos segundos</p><script>setTimeout(function(){location.reload()},4000)</script></body></html>');
    return qrcode.toDataURL(qrCodeData).then(function(img){
      res.send('<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:sans-serif;text-align:center;padding:30px"><h2>📱 Escanea con WhatsApp Business</h2><img src="'+img+'" style="width:280px;border-radius:12px"/><p style="color:#888;font-size:13px">Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo</p><script>setTimeout(function(){location.reload()},30000)</script></body></html>');
    });
  }

  var ganData=loadGanancias(),hoy=getHoraPeru().toLocaleDateString('es-PE');
  if(ganData.fecha!==hoy)ganData={fecha:hoy,ganancias:0,gastos:0};
  var totalLiquido=Math.round((ganData.ganancias-ganData.gastos)*100)/100;
  var ganColor=totalLiquido>=0?'#e8f5e9':'#fdecea';
  var emojiLiquido=totalLiquido>=0?'🤑':'😬';

  var snap=loadSnapshot();
  var modoEnfoque=!!snap;
  var gruposEnfoqueNombres=snap?(snap.gruposEnfoque||[]):[];

  var delayOpts='';
  for(var ms=100;ms<=1000;ms+=100)delayOpts+='<option value="'+ms+'"'+(DELAY===ms?' selected':'')+'>'+ms+' ms</option>';

  var kwActual=loadKeywords();
  var kwGlobalesHtml=(kwActual.globales||[]).map(function(k){
    return '<span style="display:inline-flex;align-items:center;gap:4px;background:#e8f5e9;border:1px solid #a5d6a7;border-radius:16px;padding:3px 10px;font-size:12px;color:#2e7d32;margin:3px">'+k+'<button onclick="quitarKw(\'global\',\''+k.replace(/'/g,"\\'")+'\')" style="background:none;border:none;cursor:pointer;color:#e74c3c;font-size:14px;padding:0;line-height:1">×</button></span>';
  }).join('')||'<span style="color:#aaa;font-size:12px">Sin keywords extras</span>';

  var kwExcluirHtml=(kwActual.excluir||[]).map(function(k){
    return '<span style="display:inline-flex;align-items:center;gap:4px;background:#fdecea;border:1px solid #ef9a9a;border-radius:16px;padding:3px 10px;font-size:12px;color:#c62828;margin:3px">'+k+'<button onclick="quitarKw(\'excluir\',\''+k.replace(/'/g,"\\'")+'\')" style="background:none;border:none;cursor:pointer;color:#e74c3c;font-size:14px;padding:0;line-height:1">×</button></span>';
  }).join('')||'<span style="color:#aaa;font-size:12px">Sin keywords extras</span>';

  var kwEspecialesHtml='';
  var gCE=Object.keys(kwActual.especiales||{});
  if(!gCE.length){kwEspecialesHtml='<span style="color:#aaa;font-size:12px">Sin keywords extras por grupo</span>';}
  else{gCE.forEach(function(g){
    kwEspecialesHtml+='<div style="margin-bottom:8px"><div style="font-size:12px;font-weight:600;color:#555;margin-bottom:4px">📌 '+g+'</div>';
    kwEspecialesHtml+=(kwActual.especiales[g]||[]).map(function(k){
      return '<span style="display:inline-flex;align-items:center;gap:4px;background:#fff3e0;border:1px solid #ffcc80;border-radius:16px;padding:3px 10px;font-size:12px;color:#e65100;margin:2px">'+k+'<button onclick="quitarKwEspecial(\''+g.replace(/'/g,"\\'")+'\',\''+k.replace(/'/g,"\\'")+'\')\" style="background:none;border:none;cursor:pointer;color:#e74c3c;font-size:14px;padding:0;line-height:1">×</button></span>';
    }).join('')+'</div>';
  });}

  var frasesBaseHtml='';
  Object.keys(SECTOR_BASE_CONFIG).forEach(function(grupo){
    var desact=(kwActual.frasesDesactivadas&&kwActual.frasesDesactivadas[grupo])||[];
    frasesBaseHtml+='<div style="margin-bottom:12px"><div style="font-size:12px;font-weight:600;color:#555;margin-bottom:6px">🔒 '+grupo+'</div>';
    SECTOR_BASE_CONFIG[grupo].frases.forEach(function(frase){
      var activa=!desact.includes(frase);
      frasesBaseHtml+='<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:'+(activa?'#e8f5e9':'#f5f5f5')+';border-radius:8px;margin-bottom:4px">'+
        '<span style="font-size:12px;color:'+(activa?'#2e7d32':'#999')+'">'+frase+'</span>'+
        '<button onclick="toggleFraseBase(\''+grupo.replace(/'/g,"\\'")+'\',\''+frase.replace(/'/g,"\\'")+'\','+(activa?'true':'false')+')" style="padding:4px 12px;border-radius:14px;border:none;background:'+(activa?'#25D366':'#ccc')+';color:white;cursor:pointer;font-size:11px">'+(activa?'ON ✅':'OFF ⛔')+'</button></div>';
    });
    frasesBaseHtml+='</div>';
  });

  var gruposSelectOpts=GRUPOS_CACHE.map(function(g){return '<option value="'+g.name.replace(/"/g,'&quot;')+'">'+g.name+'</option>';}).join('');

  var porSector={};
  Object.keys(SECTORES).forEach(function(s){porSector[s]=[];});
  GRUPOS_CACHE.forEach(function(g){
    var s=getSectorDeGrupo(g.name);
    if(!porSector[s])porSector[s]=[];
    if(!esGrupoGanancias(g.name))porSector[s].push(g);
  });

  var sectoresHtml='';
  Object.keys(porSector).forEach(function(sector){
    var grupos=porSector[sector];if(!grupos.length)return;
    var sectorActivo=!SECTORES_APAGADOS.includes(sector);
    var esComodin=sector===SECTOR_COMODIN,esBase=sector===SECTOR_BASE;
    var gruposHtml=grupos.map(function(g){
      var activo=GRUPOS_ACTIVOS.includes(g.id);
      var ahoraT=Date.now();
      var tr=lastReply[g.id]?Math.max(0,Math.ceil((COOLDOWN-(ahoraT-lastReply[g.id]))/1000/60)):0;
      var cdInfo=tr>0?'<span style="font-size:11px;color:#e67e22"> ⏱ '+tr+' min</span>':'';
      var fotoTag=GRUPOS_FOTO.some(function(n){return g.name.toLowerCase().includes(n.toLowerCase());})?'<span style="font-size:10px;color:#3498db"> 📸</span>':'';
      var esSX=getSectorDeGrupo(g.name)==='Sector X (otros)';
      var esInact=SIEMPRE_INACTIVOS.some(function(n){return g.name.toLowerCase().includes(n.toLowerCase());});
      var tagM=(esInact||esSX)?'<span style="font-size:10px;color:#e74c3c"> ⚠️ manual</span>':'';
      var tagC=esGrupoSinRemarcar(g.name)?'<span style="font-size:10px;color:#9b59b6"> 🔇</span>':'';
      var tagB=esBase?'<span style="font-size:10px;color:#e67e22"> 🔒</span>':'';
      // Marca visual si está en modo enfoque
      var enEnfoque=modoEnfoque&&gruposEnfoqueNombres.includes(g.name);
      var tagEnf=enEnfoque?'<span style="font-size:10px;color:#e67e22"> 🎯</span>':'';
      var op=!sectorActivo?'opacity:0.45;':'';
      return '<div class="grupo-item" data-nombre="'+g.name.toLowerCase()+'" style="display:flex;justify-content:space-between;align-items:center;padding:10px 0 10px 16px;border-bottom:1px solid #f0f0f0;'+op+'">'+
        '<span style="font-size:13px;color:#444">'+g.name+fotoTag+tagM+tagC+tagB+tagEnf+cdInfo+'</span>'+
        '<div style="display:flex;gap:6px;flex-shrink:0">'+
        '<button onclick="toggleGrupo(\''+g.id+'\')" style="padding:5px 12px;border-radius:20px;border:none;background:'+(activo?'#25D366':'#ccc')+';color:white;cursor:pointer;font-size:12px">'+(activo?'Activo':'Inactivo')+'</button>'+
        '<button onclick="soloEste(\''+g.id+'\',\''+g.name.replace(/'/g,"\\'")+'\')" title="Agregar al enfoque" style="padding:5px 10px;border-radius:20px;border:none;background:'+(enEnfoque?'#e67e22':'#f0a500')+';color:white;cursor:pointer;font-size:12px">🎯</button>'+
        '</div></div>';
    }).join('');
    var labelS=sector+(esComodin?' 🔇':'')+(esBase?' 🔒':'');
    sectoresHtml+='<div class="sector-card" style="margin-bottom:16px;border:2px solid '+(sectorActivo?'#e0e0e0':'#e74c3c')+';border-radius:12px;overflow:hidden">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:'+(sectorActivo?'#f7f7f7':'#fdecea')+'">'+
      '<span style="font-weight:600;font-size:15px">📍 '+labelS+'</span>'+
      '<button onclick="toggleSector(\''+sector+'\')" style="padding:6px 16px;border-radius:20px;border:none;background:'+(sectorActivo?'#25D366':'#e74c3c')+';color:white;cursor:pointer;font-size:13px">'+(sectorActivo?'Sector ON ✅':'Sector OFF ⛔')+'</button></div>'+
      '<div class="sector-grupos">'+gruposHtml+'</div></div>';
  });

  // Banner enfoque: muestra todos los grupos en enfoque
  var bannerEnfoque='';
  if(modoEnfoque){
    var listaEnfoque=gruposEnfoqueNombres.length>0?gruposEnfoqueNombres.join(', '):'(ninguno)';
    bannerEnfoque='<div style="padding:12px 14px;background:#fff3e0;border:2px solid #ffcc80;border-radius:10px;margin-bottom:12px">'+
      '<div style="display:flex;justify-content:space-between;align-items:center">'+
      '<div><div style="font-size:12px;color:#e65100;font-weight:600">🎯 MODO ENFOQUE ('+gruposEnfoqueNombres.length+' grupo'+(gruposEnfoqueNombres.length!==1?'s':'')+')</div>'+
      '<div style="font-size:12px;color:#666;margin-top:3px">'+listaEnfoque+'</div></div>'+
      '<button onclick="restaurarConfig()" style="padding:8px 14px;border-radius:20px;border:none;background:#e67e22;color:white;cursor:pointer;font-size:13px;flex-shrink:0;margin-left:10px">Restaurar 🔄</button></div></div>';
  }

  res.send('<!DOCTYPE html><html><head>'+
    '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WhatsApp Bot</title>'+
    '<style>'+
    '.hidden{display:none !important;}'+
    '#drawer{position:fixed;top:0;right:-320px;width:300px;height:100%;background:white;box-shadow:-4px 0 20px rgba(0,0,0,.15);z-index:1000;transition:right .3s ease;overflow-y:auto;padding:20px;box-sizing:border-box;}'+
    '#drawer.open{right:0;}'+
    '#overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:999;}'+
    '#overlay.open{display:block;}'+
    '.menu-section{margin-bottom:20px;border-bottom:1px solid #f0f0f0;padding-bottom:16px;}'+
    '.menu-section:last-child{border-bottom:none;}'+
    '.menu-section h4{margin:0 0 10px 0;font-size:14px;color:#555;}'+
    '.menu-link{display:block;padding:11px 14px;font-size:14px;text-decoration:none;color:#333;border-radius:8px;background:#f7f7f7;margin-bottom:6px;}'+
    '.menu-btn{width:100%;padding:11px 14px;font-size:14px;text-align:left;border:none;border-radius:8px;background:#f7f7f7;color:#333;cursor:pointer;margin-bottom:6px;}'+
    '.kw-input{flex:1;padding:7px 10px;border-radius:8px;border:1px solid #ddd;font-size:13px;}'+
    '</style>'+
    '</head><body style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px">'+

    '<div id="overlay" onclick="cerrarMenu()"></div>'+

    '<div id="drawer">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">'+
    '<span style="font-weight:700;font-size:16px">⚙️ Opciones</span>'+
    '<button onclick="cerrarMenu()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#888">✕</button></div>'+
    '<div class="menu-section"><a href="/historial" class="menu-link">📋 Historial <span style="color:#888;font-size:12px">('+HISTORIAL.length+')</span></a></div>'+
    '<div class="menu-section"><h4>⏱ Delay de respuesta</h4>'+
    '<div style="display:flex;align-items:center;gap:8px">'+
    '<select id="delaySelect" style="flex:1;padding:8px 10px;border-radius:8px;border:1px solid #ddd;font-size:13px;background:white">'+delayOpts+'</select>'+
    '<button onclick="guardarDelay()" style="padding:8px 14px;border-radius:8px;border:none;background:#3498db;color:white;cursor:pointer;font-size:13px">Guardar</button></div></div>'+
    '<div class="menu-section"><h4>✅ Keywords globales</h4>'+
    '<div id="kwGlobalesWrap" style="margin-bottom:8px">'+kwGlobalesHtml+'</div>'+
    '<div style="display:flex;gap:6px"><input id="kwGlobalInput" type="text" placeholder="Nueva keyword..." class="kw-input"/>'+
    '<button onclick="agregarKw(\'global\')" style="padding:7px 12px;border-radius:8px;border:none;background:#25D366;color:white;cursor:pointer;font-size:13px">+</button></div></div>'+
    '<div class="menu-section"><h4>🚫 Keywords excluidas</h4>'+
    '<div id="kwExcluirWrap" style="margin-bottom:8px">'+kwExcluirHtml+'</div>'+
    '<div style="display:flex;gap:6px"><input id="kwExcluirInput" type="text" placeholder="Nueva keyword a excluir..." class="kw-input"/>'+
    '<button onclick="agregarKw(\'excluir\')" style="padding:7px 12px;border-radius:8px;border:none;background:#e74c3c;color:white;cursor:pointer;font-size:13px">+</button></div></div>'+
    '<div class="menu-section"><h4>📌 Keywords especiales por grupo</h4>'+
    '<div id="kwEspecialesWrap" style="margin-bottom:8px">'+kwEspecialesHtml+'</div>'+
    '<select id="kwEspecialGrupo" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid #ddd;font-size:13px;background:white;margin-bottom:6px">'+
    '<option value="">— Selecciona un grupo —</option>'+gruposSelectOpts+'</select>'+
    '<div style="display:flex;gap:6px"><input id="kwEspecialInput" type="text" placeholder="Keyword para ese grupo..." class="kw-input"/>'+
    '<button onclick="agregarKwEspecial()" style="padding:7px 12px;border-radius:8px;border:none;background:#e67e22;color:white;cursor:pointer;font-size:13px">+</button></div></div>'+
    '<div class="menu-section"><h4>🔒 Frases Sector Base</h4>'+
    '<p style="color:#888;font-size:11px;margin:0 0 10px 0">Activa o desactiva cada frase individualmente</p>'+
    frasesBaseHtml+'</div>'+
    '<div class="menu-section">'+
    '<button class="menu-btn" style="color:#e74c3c" onclick="if(confirm(\'¿Cerrar sesión?\')){fetch(\'/cerrar-sesion\',{method:\'POST\'}).then(function(){location.reload()})}">🚪 Cerrar sesión</button>'+
    '</div></div>'+

    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'+
    '<h2 style="margin:0">🤖 WhatsApp Bot</h2>'+
    '<button onclick="abrirMenu()" style="background:none;border:none;font-size:26px;cursor:pointer">☰</button></div>'+

    bannerEnfoque+

    '<div style="padding:14px;background:'+ganColor+';border-radius:10px;margin-bottom:12px;font-size:13px;line-height:1.8">'+
    '<div>✅ <b>GANANCIAS:</b> Total hoy: '+ganData.ganancias+' soles</div>'+
    '<div>📉 <b>GASTOS:</b> Total hoy: -'+ganData.gastos+' soles</div>'+
    '<div><b>TOTAL LIQUIDO '+emojiLiquido+':</b> '+totalLiquido+' soles</div></div>'+

    '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px;background:'+(botActivo?'#e8f5e9':'#fdecea')+';border-radius:10px;margin-bottom:8px">'+
    '<span style="font-weight:bold;font-size:16px">Bot '+(botActivo?'✅ Activo':'⛔ Inactivo')+'</span>'+
    '<button onclick="toggleBot()" style="padding:8px 20px;border-radius:20px;border:none;background:'+(botActivo?'#25D366':'#e74c3c')+';color:white;cursor:pointer;font-size:15px">'+(botActivo?'Desactivar':'Activar')+'</button></div>'+
    '<p style="color:#888;font-size:12px;margin-bottom:16px">⏱ Cooldown: 5 min | Respuesta: <b>"'+AUTO_REPLY+'"</b> | Se apaga solo al responder</p>'+

    '<div style="margin-bottom:14px">'+
    '<input id="buscador" type="text" placeholder="🔍 Buscar grupo..." oninput="buscarGrupo(this.value)" style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid #ddd;font-size:14px;box-sizing:border-box"/>'+
    '</div>'+
    '<h3 id="titulo-grupos">Grupos ('+GRUPOS_CACHE.length+')</h3>'+
    sectoresHtml+

    '<script>'+
    'var evtSource=new EventSource("/eventos");'+
    'evtSource.onmessage=function(e){var d=JSON.parse(e.data);toast("✅ Bot respondió\\n"+d.grupo,"#25D366");};'+
    'function abrirMenu(){document.getElementById("drawer").classList.add("open");document.getElementById("overlay").classList.add("open");}'+
    'function cerrarMenu(){document.getElementById("drawer").classList.remove("open");document.getElementById("overlay").classList.remove("open");}'+
    'function toast(msg,color){color=color||"#25D366";var t=document.createElement("div");t.style.cssText="position:fixed;top:16px;left:50%;transform:translateX(-50%);background:"+color+";color:white;padding:10px 18px;border-radius:12px;font-size:13px;box-shadow:0 4px 12px rgba(0,0,0,.2);z-index:9999;max-width:300px;text-align:center;white-space:pre-line";t.textContent=msg;document.body.appendChild(t);setTimeout(function(){t.remove()},3000);}'+
    'async function toggleBot(){await fetch("/toggle",{method:"POST"});location.reload();}'+
    'async function toggleGrupo(id){await fetch("/grupo",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:id})});location.reload();}'+
    'async function toggleSector(s){await fetch("/sector",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sector:s})});location.reload();}'+
    'async function soloEste(id,nombre){'+
    '  var r=await fetch("/enfoque",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({grupoId:id,grupoNombre:nombre})});'+
    '  var data=await r.json();'+
    '  toast("🎯 Enfoque: "+data.gruposEnfoque.join(", "),"#e67e22");'+
    '  setTimeout(function(){location.reload();},800);'+
    '}'+
    'async function restaurarConfig(){'+
    '  await fetch("/enfoque/restaurar",{method:"POST"});'+
    '  toast("✅ Configuración restaurada","#25D366");'+
    '  setTimeout(function(){location.reload();},800);'+
    '}'+
    'async function guardarDelay(){var v=parseInt(document.getElementById("delaySelect").value);await fetch("/ajustes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({delay:v})});toast("✅ Delay: "+v+"ms");}'+
    'function buscarGrupo(q){var qr=q.toLowerCase().trim();var cards=document.querySelectorAll(".sector-card");var tot=0;'+
    'cards.forEach(function(card){var items=card.querySelectorAll(".grupo-item");var hay=false;'+
    'items.forEach(function(item){var n=item.getAttribute("data-nombre")||"";var m=qr===""||n.includes(qr);item.style.display=m?"flex":"none";if(m){hay=true;tot++;}});'+
    'card.style.display=(qr===""||hay)?"block":"none";});'+
    'document.getElementById("titulo-grupos").textContent=qr?"Resultados: "+tot+" grupo(s)":"Grupos ('+GRUPOS_CACHE.length+')";}'+
    'async function agregarKw(tipo){var input=document.getElementById(tipo==="global"?"kwGlobalInput":"kwExcluirInput");var kw=input.value.trim();if(!kw){toast("Escribe una keyword","#e74c3c");return;}var r=await fetch("/keywords/"+tipo,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({accion:"agregar",keyword:kw})});if(r.ok){input.value="";toast("✅ Keyword agregada");setTimeout(function(){location.reload();},600);}else toast("Error","#e74c3c");}'+
    'async function quitarKw(tipo,kw){var r=await fetch("/keywords/"+tipo,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({accion:"quitar",keyword:kw})});if(r.ok){toast("🗑 Eliminada");setTimeout(function(){location.reload();},600);}else toast("Error","#e74c3c");}'+
    'async function agregarKwEspecial(){var g=document.getElementById("kwEspecialGrupo").value;var kw=document.getElementById("kwEspecialInput").value.trim();if(!g){toast("Selecciona un grupo","#e74c3c");return;}if(!kw){toast("Escribe una keyword","#e74c3c");return;}var r=await fetch("/keywords/especial",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({accion:"agregar",grupo:g,keyword:kw})});if(r.ok){document.getElementById("kwEspecialInput").value="";toast("✅ Keyword especial agregada");setTimeout(function(){location.reload();},600);}else toast("Error","#e74c3c");}'+
    'async function quitarKwEspecial(g,kw){var r=await fetch("/keywords/especial",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({accion:"quitar",grupo:g,keyword:kw})});if(r.ok){toast("🗑 Eliminada");setTimeout(function(){location.reload();},600);}else toast("Error","#e74c3c");}'+
    'async function toggleFraseBase(grupo,frase,estaActiva){var accion=estaActiva?"desactivar":"activar";var r=await fetch("/keywords/frase-base",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({grupo:grupo,frase:frase,accion:accion})});if(r.ok){toast(estaActiva?"⛔ Frase desactivada":"✅ Frase activada");setTimeout(function(){location.reload();},600);}else toast("Error","#e74c3c");}'+
    '</script></body></html>');
});

app.listen(3000,function(){console.log('Servidor activo');});

setInterval(async function(){
  try{if(isReady){var s=await client.getState();if(s!=='CONNECTED'){isReady=false;qrCodeData='';botActivo=false;saveConfig();process.exit(0);}}}catch(e){process.exit(0);}
},30*60*1000);

client.initialize();
