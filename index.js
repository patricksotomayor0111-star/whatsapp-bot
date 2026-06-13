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
  '51910795590','910795590','51910 795 590','910 795 590',
  '51934572456','934572456','51934 572 456','934 572 456',
  '51972077603','972077603','51972 077 603','972 077 603',
  '51972066872','972066872','51972 066 872','972 066 872',
  '51950006969','950006969','51950 006 969','950 006 969',
  '51957511240','957511240','51957 511 240','957 511 240',
  '51997186215','997186215','51997 186 215','997 186 215',
  '51966124285','966124285','51966 124 285','966 124 285',
  '51912699997','912699997','51912 699 997','912 699 997',
  '51924917366','924917366','51924 917 366','924 917 366',
  '51963936600','963936600','51963 936 600','963 936 600',
  '51976481032','976481032','51976 481 032','976 481 032',
  '51907413081','907413081','51907 413 081','907 413 081',
  '923938101','51923938101','923 938 101','51923 938 101',
  '51979397948','979397948','51979 397 948','979 397 948',
  '51955214645','955214645','51955 214 645','955 214 645',
  '51955794995','955794995','51955 794 995','955 794 995',
  '51932736288','932736288','51932 736 288','932 736 288',
  '51902425988','902425988','51902 425 988','902 425 988',
  '51973155047','973155047','51973 155 047','973 155 047',
  '34641095746','34641 09 57 46','34 641 09 57 46'
];

const NUMEROS_DUENO = [
  '51939610396','939610396','51939 610 396','939 610 396'
];

const GRUPOS_FOTO = [
  'CANTONES - BOX DELIVERY',
  'CHIFA LIU BOX DELIVERY',
  'CARTAS RESTAURANTES'
];

const KEYWORDS_ESPECIALES = {
  'AYABACA - BUMANGUESA II': ['listo'],
  'BUBATON BOX DELIVERY': ['ingrese'],
  'CARTAS RESTAURANTES': ['ingrese']
};

const KEYWORDS_GLOBALES = [
  'pedido listo','motorizado','un delivery','delivery para el local',
  'pedido en 5 minutos','pedido','pueden venir','ya esta listo el pedido',
  'acercarce','acercarse','motorizado en 5 minutos','10 minutos pedido listo',
  '5 minutos pedidos','en 5 minutos','5 min','10 min','5min','10min',
  'tenemos pedido','box','un box','un motorizado','venir','pedidi',
  'movilidad','movil','viniendo','moto','unidad',
  'vengan','venga','delivery','confirmado','recoger',
  'se pueden acercar','ptb a mega plaza','ptb a pds','ptb a plaza de sol',
  'ptb mega','pds a ptb','pds a mega','ptb a parcona',
  'se acerca al local','se acerca al local en estos momentos','acercandose al local',
  'hola uno por favor'
];

const KEYWORDS_EXCLUIR = [
  'cotizacion','cotización','precio','cuanto','cuánto',
  'cuanto sale','cuanto cuesta','cuánto sale','cuánto cuesta',
  'tarifa','tarifas','costo','cobran','cobras','cuanto cobran',
  'a cuanto','a cuánto','me pueden dar precio','precio del delivery',
  'cuanto es el delivery','cuanto me sale',
  'confirmo en unos minutos','confirmamos en unos minutos',
  'confirmo en un momento','confirmo en breve',
  '20 minutos','25 minutos','30 minutos','en 20 min','en 25 min','en 30 min',
  '20min','25min','30min','20 min','25 min','30 min'
];

const SIEMPRE_INACTIVOS = [
  'DRIBOX 🏍️',
  'Reporte Deliverys ICA!! 🏍️💨',
  'SERVICIO DELIVERY RUMI-WASI',
  'GRUPO DE MOTORIZADOS'
];

const GRUPO_GANANCIAS = ['GANANCIAS', 'GANANCIAS '];

// Mapa de abreviaciones y nombres completos de locales
const LOCALES_MAP = {
  // PTB
  'car': 'Cartas Restaurantes', 'cartas restaurantes': 'Cartas Restaurantes',
  'lab': 'La Bumanguesa', 'la bumanguesa': 'La Bumanguesa',
  'mon': 'Monkey Donuts', 'monkey donuts': 'Monkey Donuts',
  'piz': 'Pizzería Cardenatti', 'pizzeria cardenatti': 'Pizzería Cardenatti', 'cardenatti': 'Pizzería Cardenatti',
  'pen': 'Peñonetti', 'peñonetti': 'Peñonetti',
  'sha': 'Shawaburguer', 'shawaburguer': 'Shawaburguer',
  'bru': 'Bruces', 'bruces': 'Bruces',
  'pun': 'Punto Caliente', 'punto caliente': 'Punto Caliente',
  // San José
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
  // Moderna
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
  // Comodin
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
  // Angostura
  'bol': 'Boletas', 'boletas': 'Boletas',
  'don': 'Don Alejandro', 'don alejandro': 'Don Alejandro',
  'elb': 'El Borgo', 'el borgo': 'El Borgo',
  'oct': 'Octavia', 'octavia': 'Octavia',
  // Pedidos especiales
  'bas': 'Base', 'base': 'Base',
  'per': 'Personal', 'personal': 'Personal'
};

const SECTORES = {
  'Sector PTB': [
    'CARTAS RESTAURANTES',
    'LA BUMANGUESA BOX DELIVERY',
    'MONKEY DONUTS BOX DELIVERY',
    'MONKEY DONUTS BOX DELIVERY ',
    'Pizzería cardenatti box delivery',
    'Pizzería cardenatti box delivery ',
    'PEÑONETTI BOX DELIVERY',
    'SHAWABURGUER BOX DELIVERY',
    'BRUCES BOX DELIVERY',
    'BRUCES BOX DELIVERY ',
    'PUNTO CALIENTE - BOX DELIVERY'
  ],
  'Sector San José': [
    'Hola',
    'THE CROWN BOX DELIVERY',
    'HARVEST BOX DELIVERY',
    'RICOS PROTEIN - BOX DELIVERY',
    'AYABACA - BUMANGUESA II',
    'MISKY POLLERIA (dribox)',
    'KAM LONG PEDIDOS',
    'BOCHITOS BOX DELIVERY',
    'LAS NIEVES BOX DELIVERY',
    'HELADERÍA EL PINGÜINO',
    'MR. SUSHI BOX DELIVERY'
  ],
  'Sector Moderna': [
    'BUBATON BOX DELIVERY',
    'CRAZY CORN 🌭🧋🤗',
    'CHIFA LIU BOX DELIVERY',
    'McGrill Restaurante BOX DELIVERY',
    'REST CENTRO BOX DELIVERY',
    'REST CENTRO BOX DELIVERY ',
    'DELIVERY BOX / LAGUNILLA',
    'MISTER JUGO BOX DELIVERY',
    'MISTER JUGO BOX DELIVERY ',
    'CANTONES - BOX DELIVERY',
    'PIM PAM POLLO BOX DELIVERY',
    'Rincón del sabor BOX DELIVERY',
    'CHIFA CHANG KEE PEDIDOS',
    'MONO ALITAS BOX DELIVERY',
    'PUERTO RICO BOX DELIVERY',
    'PUERTO RICO BOX DELIVERY '
  ],
  'Sector La Angostura': [
    'Boletas locales',
    'Don Alejandro -BOX DELYBERY',
    'EL BORGO BOX DELIVERY',
    'OCTAVIA LA ANGOSTURA - BOX DELIVERY'
  ],
  'Sector Comodin': [
    'ARTIA PASTELERIA (dribox)',
    'PEPEFOD DELIVERY',
    'MIAS BOX DELIVERY',
    'ONEST BOX DELIVERY',
    'ONEST BOX DELIVERY ',
    'Hugo Restaurante BOX DELIVERY',
    'Hugo Restaurante BOX DELIVERY ',
    'Palacio Oriental BOX DELIVERY',
    'KANASTAS BOX DELIVERY',
    'KANASTAS BOX DELIVERY ',
    'ROCA STEAK HOUSE BOX DELIVERY',
    'PAPEADO SAN ISIDRO BOX DELIVERY',
    'SMART NUTRITION BOX DELIVERY',
    'DELIVERY BIEN PESCAO 🏍️',
    'PIO RICO BOX DELIVERY',
    'PIO RICO BOX DELIVERY '
  ],
  'Sector X (otros)': [
    'DRIBOX 🏍️',
    'Reporte Deliverys ICA!! 🏍️💨',
    'SERVICIO DELIVERY RUMI-WASI',
    'GRUPO DE MOTORIZADOS'
  ]
};

const ORDEN_GRUPOS = Object.values(SECTORES).flat();

function normalizar(texto) {
  return texto.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '');
}

function similarEnough(texto, keyword) {
  var t = normalizar(texto);
  var k = normalizar(keyword);
  if (t.includes(k)) return true;
  var words = k.split(' ');
  return words.every(function(w) {
    if (w.length <= 3) return t.includes(w);
    for (var i = 0; i <= t.length - w.length + 1; i++) {
      var sub = t.substr(i, w.length + 1);
      var diff = 0;
      for (var j = 0; j < w.length; j++) {
        if (w[j] !== (sub[j] || '')) diff++;
      }
      if (diff <= 1) return true;
    }
    return false;
  });
}

function tieneExclusion(texto) {
  var t = normalizar(texto);
  return KEYWORDS_EXCLUIR.some(function(k) {
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

function esDueno(numero) {
  return NUMEROS_DUENO.some(function(n) {
    return n.replace(/\s/g,'') === numero.replace(/\s/g,'');
  });
}

// Busca el nombre del local en el mapa por abreviacion o nombre completo
function buscarLocal(palabraClave) {
  var clave = normalizar(palabraClave).trim();
  // Buscar exacto primero
  if (LOCALES_MAP[clave]) return LOCALES_MAP[clave];
  // Buscar parcial
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
      var hoy = new Date().toLocaleDateString('es-PE');
      if (data.fecha !== hoy) return { fecha: hoy, ganancias: 0, gastos: 0 };
      return data;
    }
  } catch(e) {}
  return { fecha: new Date().toLocaleDateString('es-PE'), ganancias: 0, gastos: 0 };
}

function saveGanancias(data) {
  fs.writeFileSync(GANANCIAS_FILE, JSON.stringify(data));
}

function loadReporte() {
  try {
    if (fs.existsSync(REPORTE_FILE)) {
      return JSON.parse(fs.readFileSync(REPORTE_FILE, 'utf8'));
    }
  } catch(e) {}
  // semana: { locales: {NombreLocal: total}, gastos: {NombreGasto: total} }
  return { semana_inicio: getFechaLunesActual(), locales: {}, gastos: {} };
}

function saveReporte(data) {
  fs.writeFileSync(REPORTE_FILE, JSON.stringify(data));
}

function getFechaLunesActual() {
  var hoy = new Date();
  var dia = hoy.getDay(); // 0=dom, 1=lun...
  var diff = (dia === 0) ? -6 : 1 - dia;
  var lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + diff);
  return lunes.toLocaleDateString('es-PE');
}

// Extrae montos con formato: "local numero" o "menos numero descripcion"
// Retorna array de { tipo: 'local'|'gasto', nombre, monto }
function extraerEntradas(texto) {
  var entradas = [];
  var lineas = texto.split('\n');

  lineas.forEach(function(linea) {
    var trimmed = linea.trim();
    if (!trimmed) return;

    // Detectar gasto: "menos X descripcion"
    var mGasto = trimmed.match(/^menos\s+(\d{1,6}(?:\.\d{1,2})?)\s*(.*)?$/i);
    if (mGasto) {
      var monto = parseFloat(mGasto[1]);
      var desc = mGasto[2] ? mGasto[2].trim() : 'Otros';
      if (!desc) desc = 'Otros';
      if (monto > 0 && monto <= 99999) {
        entradas.push({ tipo: 'gasto', nombre: desc, monto: monto });
      }
      return;
    }

    // Detectar ganancia: "palabra(s) numero"
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

    // Detectar "numero palabra(s)" -> ganancia
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

    // Solo numero (ganancia sin etiqueta)
    var mSoloNum = trimmed.match(/^(\d{1,5}(?:\.\d{1,2})?)$/);
    if (mSoloNum) {
      var monto3 = parseFloat(mSoloNum[1]);
      if (monto3 > 0 && monto3 <= 99999) {
        entradas.push({ tipo: 'local', nombre: 'Sin etiqueta', monto: monto3 });
      }
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
  if (lineasLocales.length > 0) {
    texto += lineasLocales.join('\n') + '\n';
  } else {
    texto += '  (sin registros)\n';
  }
  texto += '💰 *Total ganancias: ' + totalLocales + ' soles*\n';
  texto += '─────────────────\n';
  texto += '📉 *GASTOS:*\n';
  if (lineasGastos.length > 0) {
    texto += lineasGastos.join('\n') + '\n';
  } else {
    texto += '  (sin registros)\n';
  }
  texto += '💸 *Total gastos: ' + totalGastos + ' soles*\n';
  texto += '─────────────────\n';
  texto += 'TOTAL LIQUIDO ' + emoji + ': *' + liquido + ' soles*';
  return texto;
}

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch(e) {}
  return { botActivo: false, gruposActivos: [], gruposCache: [], sectoresApagados: [] };
}

function saveConfig() {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({
    botActivo: botActivo,
    gruposActivos: GRUPOS_ACTIVOS,
    gruposCache: GRUPOS_CACHE,
    sectoresApagados: SECTORES_APAGADOS
  }));
}

function loadHistorial() {
  try {
    if (fs.existsSync(HISTORIAL_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORIAL_FILE, 'utf8'));
    }
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

function enviarNotificacion(grupo, hora) {
  var data = JSON.stringify({ grupo: grupo, hora: hora });
  sseClients = sseClients.filter(function(res) {
    try { res.write('data: ' + data + '\n\n'); return true; } catch(e) { return false; }
  });
}

var reporteDiarioEnviado = false;

// Verificar cada minuto para reporte diario y semanal
setInterval(async function() {
  if (!isReady) return;
  var ahora = new Date();
  var esDomingo = ahora.getDay() === 0;
  var esHora2359 = ahora.getHours() === 23 && ahora.getMinutes() === 59;

  // Reporte diario a las 23:59
  if (esHora2359 && !reporteDiarioEnviado) {
    reporteDiarioEnviado = true;
    try {
      var chats = await client.getChats();
      var grupoGan = chats.find(function(c) {
        return c.isGroup && esGrupoGanancias(c.name);
      });
      if (grupoGan) {
        var ganData = loadGanancias();
        var hoy = ahora.toLocaleDateString('es-PE');
        var rep = loadReporte();

        // Construir resumen del dia
        var textoDiario = '📋 *RESUMEN DEL DÍA - ' + hoy + '*\n';
        textoDiario += '─────────────────\n';
        textoDiario += '✅ *GANANCIAS POR LOCAL:*\n';
        var localesHoy = Object.keys(rep.localesHoy || {});
        if (localesHoy.length > 0) {
          localesHoy.forEach(function(nombre) {
            textoDiario += '  • ' + nombre + ': ' + rep.localesHoy[nombre] + ' soles\n';
          });
        } else {
          textoDiario += '  (sin registros)\n';
        }
        textoDiario += '💰 *Total ganancias: ' + ganData.ganancias + ' soles*\n';
        textoDiario += '─────────────────\n';
        textoDiario += '📉 *GASTOS:*\n';
        var gastosHoy = Object.keys(rep.gastosHoy || {});
        if (gastosHoy.length > 0) {
          gastosHoy.forEach(function(nombre) {
            textoDiario += '  • ' + nombre + ': ' + rep.gastosHoy[nombre] + ' soles\n';
          });
        } else {
          textoDiario += '  (sin registros)\n';
        }
        textoDiario += '💸 *Total gastos: ' + ganData.gastos + ' soles*\n';
        textoDiario += '─────────────────\n';
        var liquidoDiario = Math.round((ganData.ganancias - ganData.gastos) * 100) / 100;
        var emojiDiario = liquidoDiario >= 0 ? '🤑' : '😬';
        textoDiario += 'TOTAL LIQUIDO ' + emojiDiario + ': *' + liquidoDiario + ' soles*';

        await grupoGan.sendMessage(textoDiario);

        // Resetear localesHoy y gastosHoy para el dia siguiente
        rep.localesHoy = {};
        rep.gastosHoy = {};
        saveReporte(rep);
      }
    } catch(e) {
      console.log('Error reporte diario:', e.message);
    }

    // Reporte semanal solo el domingo
    if (esDomingo && !reporteEnviado) {
      reporteEnviado = true;
      try {
        var chats2 = await client.getChats();
        var grupoGan2 = chats2.find(function(c) {
          return c.isGroup && esGrupoGanancias(c.name);
        });
        if (grupoGan2) {
          var rep2 = loadReporte();
          var hoy2 = ahora.toLocaleDateString('es-PE');
          var lunes = rep2.semana_inicio || getFechaLunesActual();
          var textoReporte = generarTextoReporte(rep2, lunes, hoy2);
          await grupoGan2.sendMessage(textoReporte);
          saveReporte({ semana_inicio: getFechaLunesActual(), locales: {}, gastos: {}, localesHoy: {}, gastosHoy: {} });
        }
      } catch(e) {
        console.log('Error reporte semanal:', e.message);
      }
    }
  }

  // Resetear flags a medianoche
  if (ahora.getHours() === 0 && ahora.getMinutes() === 0) {
    reporteEnviado = false;
    reporteDiarioEnviado = false;
  }
}, 60 * 1000);

var client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

client.on('qr', function(qr) { qrCodeData = qr; isReady = false; });

client.on('disconnected', function(reason) {
  console.log('Desconectado:', reason);
  isReady = false;
  qrCodeData = '';
  botActivo = false;
  saveConfig();
  try {
    var sessionPath = './.wwebjs_auth';
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      console.log('Sesion borrada');
    }
  } catch(e) {
    console.error('Error borrando sesion:', e);
  }
  setTimeout(function() {
    try { client.initialize(); } catch(e) { process.exit(0); }
  }, 3000);
});

client.on('ready', async function() {
  isReady = true;
  qrCodeData = '';
  var chats = await client.getChats();
  var grupos = chats.filter(function(c) { return c.isGroup; });
  GRUPOS_CACHE = grupos.map(function(g) { return { id: g.id._serialized, name: g.name }; });
  GRUPOS_CACHE.sort(function(a, b) {
    var ia = ORDEN_GRUPOS.findIndex(function(n) { return n.trim().toLowerCase() === a.name.trim().toLowerCase(); });
    var ib = ORDEN_GRUPOS.findIndex(function(n) { return n.trim().toLowerCase() === b.name.trim().toLowerCase(); });
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  GRUPOS_CACHE.forEach(function(g) {
    var esInactivo = SIEMPRE_INACTIVOS.some(function(n) {
      return g.name.toLowerCase().includes(n.toLowerCase());
    });
    var esSectorX = getSectorDeGrupo(g.name) === 'Sector X (otros)';
    var esGanancias = esGrupoGanancias(g.name);
    if (esInactivo || (esSectorX && !esGanancias)) {
      GRUPOS_ACTIVOS = GRUPOS_ACTIVOS.filter(function(id) { return id !== g.id; });
      return;
    }
    if (!GRUPOS_ACTIVOS.includes(g.id)) GRUPOS_ACTIVOS.push(g.id);
  });
  saveConfig();
  console.log('Listo');
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

  console.log('DEBUG numero:', numero, '| author:', msg.author, '| contact.id.user:', contacto.id.user, '| chat:', chat.name);

  if (NUMEROS_IGNORADOS.includes(numero)) return;

  // ── Grupo GANANCIAS ──
  if (esGrupoGanancias(chat.name)) {

    // Comando reset
    if (texto.trim().toLowerCase() === 'reset') {
      var hoyReset = new Date().toLocaleDateString('es-PE');
      saveGanancias({ fecha: hoyReset, ganancias: 0, gastos: 0 });
      await chat.sendMessage('✅ Listo, nuevo día\n✅ GANANCIAS: Total hoy: 0 soles\n📉 GASTOS: Total hoy: -0 soles\nTOTAL LIQUIDO 🤑: 0 soles');
      return;
    }

    var entradas = extraerEntradas(texto);
    if (entradas.length > 0) {
      // Actualizar ganancias del dia
      var ganData = loadGanancias();
      var hoy = new Date().toLocaleDateString('es-PE');
      if (ganData.fecha !== hoy) ganData = { fecha: hoy, ganancias: 0, gastos: 0 };

      // Actualizar reporte semanal
      var rep = loadReporte();
      var lunesActual = getFechaLunesActual();
      if (rep.semana_inicio !== lunesActual) {
        rep = { semana_inicio: lunesActual, locales: {}, gastos: {} };
      }

      var totalGanancia = 0;
      var totalGasto = 0;

      entradas.forEach(function(entrada) {
        if (entrada.tipo === 'local') {
          totalGanancia += entrada.monto;
          rep.locales[entrada.nombre] = Math.round(((rep.locales[entrada.nombre] || 0) + entrada.monto) * 100) / 100;
          if (!rep.localesHoy) rep.localesHoy = {};
          rep.localesHoy[entrada.nombre] = Math.round(((rep.localesHoy[entrada.nombre] || 0) + entrada.monto) * 100) / 100;
        } else {
          totalGasto += entrada.monto;
          var nombreGasto = entrada.nombre.charAt(0).toUpperCase() + entrada.nombre.slice(1);
          rep.gastos[nombreGasto] = Math.round(((rep.gastos[nombreGasto] || 0) + entrada.monto) * 100) / 100;
          if (!rep.gastosHoy) rep.gastosHoy = {};
          rep.gastosHoy[nombreGasto] = Math.round(((rep.gastosHoy[nombreGasto] || 0) + entrada.monto) * 100) / 100;
        }
      });

      ganData.ganancias = Math.round((ganData.ganancias + totalGanancia) * 100) / 100;
      ganData.gastos = Math.round((ganData.gastos + totalGasto) * 100) / 100;
      saveGanancias(ganData);
      saveReporte(rep);

      var totalLiquido = Math.round((ganData.ganancias - ganData.gastos) * 100) / 100;
      var emojiLiquido = totalLiquido >= 0 ? '🤑' : '😬';
      var respuesta =
        '✅ GANANCIAS: Total hoy: ' + ganData.ganancias + ' soles\n' +
        '📉 GASTOS: Total hoy: -' + ganData.gastos + ' soles\n' +
        'TOTAL LIQUIDO ' + emojiLiquido + ': ' + totalLiquido + ' soles';
      await chat.sendMessage(respuesta);
    }
    return;
  }

  // ── Bot principal ──
  if (!botActivo) return;

  var chatId = chat.id._serialized;
  if (!GRUPOS_ACTIVOS.includes(chatId)) return;

  var sectorDelGrupo = getSectorDeGrupo(chat.name);
  if (SECTORES_APAGADOS.includes(sectorDelGrupo)) return;

  var esFotoGrupo = GRUPOS_FOTO.some(function(n) {
    return chat.name.toLowerCase().includes(n.toLowerCase());
  });

  if (tieneExclusion(texto)) return;

  var tieneKeyword = KEYWORDS_GLOBALES.find(function(k) { return similarEnough(texto, k); });
  if (!tieneKeyword) {
    var gruposEsp = Object.keys(KEYWORDS_ESPECIALES);
    for (var i = 0; i < gruposEsp.length; i++) {
      var nombreGrupo = gruposEsp[i];
      if (chat.name.toLowerCase().includes(nombreGrupo.toLowerCase())) {
        tieneKeyword = KEYWORDS_ESPECIALES[nombreGrupo].find(function(k) { return similarEnough(texto, k); });
        if (tieneKeyword) break;
      }
    }
  }

  if (!tieneKeyword && !(esFoto && esFotoGrupo)) return;

  var ahora = Date.now();
  if (lastReply[chatId] && ahora - lastReply[chatId] < COOLDOWN) return;
  lastReply[chatId] = ahora;
  await msg.reply(AUTO_REPLY);

  var now = new Date();
  var fecha = now.toLocaleDateString('es-PE');
  var hora = now.toLocaleTimeString('es-PE');

  HISTORIAL.unshift({
    grupo: chat.name,
    sector: sectorDelGrupo,
    mensaje: esFoto ? '📸 Foto' : texto.substring(0, 80),
    fecha: fecha,
    hora: hora
  });
  saveHistorial();
  enviarNotificacion(chat.name, hora);
  botActivo = false;
  saveConfig();
});

app.get('/eventos', function(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  sseClients.push(res);
  req.on('close', function() {
    sseClients = sseClients.filter(function(c) { return c !== res; });
  });
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

  res.send('<!DOCTYPE html><html><head>' +
    '<meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>Historial - WhatsApp Bot</title>' +
    '</head><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">' +
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">' +
    '<a href="/" style="text-decoration:none;font-size:22px">←</a>' +
    '<h2 style="margin:0">📋 Historial de respuestas</h2></div>' +
    '<p style="color:#888;font-size:13px;margin-bottom:16px">Total: <b>' + HISTORIAL.length + '</b> respuestas automaticas</p>' +
    '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;border:1px solid #eee">' +
    '<thead><tr style="background:#25D366;color:white">' +
    '<th style="padding:10px 8px;text-align:left;font-size:13px">Fecha / Hora</th>' +
    '<th style="padding:10px 8px;text-align:left;font-size:13px">Grupo</th>' +
    '<th style="padding:10px 8px;text-align:left;font-size:13px">Sector</th>' +
    '<th style="padding:10px 8px;text-align:left;font-size:13px">Mensaje</th>' +
    '</tr></thead><tbody>' + filas + '</tbody></table></div>' +
    '<button onclick="if(confirm(\'Borrar historial?\'))' +
    '{fetch(\'/historial\',{method:\'DELETE\'}).then(function(){location.reload()})}"' +
    ' style="margin-top:20px;padding:10px 20px;border-radius:10px;border:none;background:#e74c3c;color:white;cursor:pointer;font-size:14px">' +
    'Borrar historial</button></body></html>');
});

app.delete('/historial', function(req, res) {
  HISTORIAL = [];
  saveHistorial();
  res.json({ ok: true });
});

app.post('/cerrar-sesion', async function(req, res) {
  try {
    isReady = false;
    botActivo = false;
    saveConfig();
    await client.logout();
  } catch(e) {
    console.log('Error logout:', e.message);
  }
  try {
    var sessionPath = './.wwebjs_auth';
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }
  } catch(e) {}
  setTimeout(function() {
    try { client.initialize(); } catch(e) { process.exit(0); }
  }, 2000);
  res.json({ ok: true });
});

app.get('/', function(req, res) {
  if (!isReady) {
    if (!qrCodeData) {
      return res.send('<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WhatsApp Bot</title></head>' +
        '<body style="font-family:sans-serif;text-align:center;padding:40px">' +
        '<h2>⏳ Iniciando...</h2><p>Recarga en unos segundos</p>' +
        '<script>setTimeout(function(){location.reload()},4000)</script></body></html>');
    }
    return qrcode.toDataURL(qrCodeData).then(function(img) {
      res.send('<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WhatsApp Bot - QR</title></head>' +
        '<body style="font-family:sans-serif;text-align:center;padding:30px">' +
        '<h2>📱 Escanea con WhatsApp Business</h2>' +
        '<img src="' + img + '" style="width:280px;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.15)"/>' +
        '<p style="color:#888;font-size:13px">Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo</p>' +
        '<p style="color:#aaa;font-size:12px">Recarga si expira</p>' +
        '<script>setTimeout(function(){location.reload()},30000)</script>' +
        '</body></html>');
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
      var esInactivo = SIEMPRE_INACTIVOS.some(function(n) { return g.name.toLowerCase().includes(n.toLowerCase()); });
      var esSectorX = getSectorDeGrupo(g.name) === 'Sector X (otros)';
      var tagManual = (esInactivo || esSectorX) ? '<span style="font-size:10px;color:#e74c3c"> ⚠️ manual</span>' : '';
      var opacidad = !sectorActivo ? 'opacity:0.45;' : '';
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0 10px 16px;border-bottom:1px solid #f0f0f0;' + opacidad + '">' +
        '<span style="font-size:13px;color:#444">' + g.name + fotoTag + tagManual + cooldownInfo + '</span>' +
        '<button onclick="toggleGrupo(\'' + g.id + '\')" style="padding:5px 14px;border-radius:20px;border:none;background:' + (activo?'#25D366':'#ccc') + ';color:white;cursor:pointer;font-size:12px">' +
        (activo?'Activo':'Inactivo') + '</button></div>';
    }).join('');

    sectoresHtml += '<div style="margin-bottom:16px;border:2px solid ' + (sectorActivo?'#e0e0e0':'#e74c3c') + ';border-radius:12px;overflow:hidden">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:' + (sectorActivo?'#f7f7f7':'#fdecea') + '">' +
      '<span style="font-weight:600;font-size:15px">📍 ' + sector + '</span>' +
      '<button onclick="toggleSector(\'' + sector + '\')" style="padding:6px 16px;border-radius:20px;border:none;background:' + (sectorActivo?'#25D366':'#e74c3c') + ';color:white;cursor:pointer;font-size:13px">' +
      (sectorActivo?'Sector ON ✅':'Sector OFF ⛔') + '</button></div>' +
      gruposDelSector + '</div>';
  });

  var ganData = loadGanancias();
  var hoy = new Date().toLocaleDateString('es-PE');
  if (ganData.fecha !== hoy) ganData = { fecha: hoy, ganancias: 0, gastos: 0 };
  var totalLiquido = Math.round((ganData.ganancias - ganData.gastos) * 100) / 100;
  var ganColor = totalLiquido >= 0 ? '#e8f5e9' : '#fdecea';
  var emojiLiquido = totalLiquido >= 0 ? '🤑' : '😬';

  res.send('<!DOCTYPE html><html><head>' +
    '<meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>WhatsApp Bot</title>' +
    '</head><body style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">' +
    '<h2 style="margin:0">🤖 WhatsApp Bot</h2>' +
    '<button onclick="document.getElementById(\'menu\').classList.toggle(\'hidden\')" style="background:none;border:none;font-size:26px;cursor:pointer">☰</button></div>' +
    '<div id="menu" class="hidden" style="background:#f0f0f0;border-radius:10px;padding:10px;margin-bottom:16px">' +
    '<a href="/historial" style="display:block;padding:10px 14px;font-size:15px;text-decoration:none;color:#333;border-radius:8px;background:white;margin-bottom:6px">' +
    '📋 Historial de respuestas <span style="color:#888;font-size:12px">(' + HISTORIAL.length + ')</span></a>' +
    '<button onclick="if(confirm(\'¿Cerrar sesión de WhatsApp? Deberás escanear el QR nuevamente.\'))' +
    '{fetch(\'/cerrar-sesion\',{method:\'POST\'}).then(function(){location.reload()})}"' +
    ' style="width:100%;padding:10px 14px;font-size:15px;text-align:left;border:none;border-radius:8px;background:white;color:#e74c3c;cursor:pointer;margin-top:4px">' +
    '🚪 Cerrar sesión (escanear QR nuevo)</button></div>' +
    '<div style="padding:14px;background:' + ganColor + ';border-radius:10px;margin-bottom:12px;font-size:13px;line-height:1.8">' +
    '<div>✅ <b>GANANCIAS:</b> Total hoy: ' + ganData.ganancias + ' soles</div>' +
    '<div>📉 <b>GASTOS:</b> Total hoy: -' + ganData.gastos + ' soles</div>' +
    '<div><b>TOTAL LIQUIDO ' + emojiLiquido + ':</b> ' + totalLiquido + ' soles</div>' +
    '</div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px;background:' + (botActivo?'#e8f5e9':'#fdecea') + ';border-radius:10px;margin-bottom:16px">' +
    '<span style="font-weight:bold;font-size:16px">Bot ' + (botActivo?'✅ Activo':'⛔ Inactivo') + '</span>' +
    '<button onclick="toggleBot()" style="padding:8px 20px;border-radius:20px;border:none;background:' + (botActivo?'#25D366':'#e74c3c') + ';color:white;cursor:pointer;font-size:15px">' +
    (botActivo?'Desactivar':'Activar') + '</button></div>' +
    '<p style="color:#888;font-size:12px">⏱ Cooldown: 5 min | Respuesta: <b>"' + AUTO_REPLY + '"</b> | Se apaga solo al responder</p>' +
    '<p style="color:#888;font-size:11px">📸 = fotos | ⚠️ manual = solo activacion manual | Sector OFF = bloquea todo el sector</p>' +
    '<h3>Grupos (' + GRUPOS_CACHE.length + ')</h3>' +
    sectoresHtml +
    '<style>.hidden{display:none !important;}</style>' +
    '<script>' +
    'var evtSource = new EventSource("/eventos");' +
    'evtSource.onmessage = function(e) {' +
    '  var data = JSON.parse(e.data);' +
    '  mostrarNotificacion(data.grupo, data.hora);' +
    '};' +
    'function mostrarNotificacion(grupo, hora) {' +
    '  var toast = document.createElement("div");' +
    '  toast.style.cssText = "position:fixed;top:16px;right:16px;background:#25D366;color:white;padding:12px 18px;border-radius:12px;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.2);z-index:9999;max-width:280px";' +
    '  toast.innerHTML = "<b>✅ Bot respondio</b><br>" + grupo + "<br><span style=\'font-size:12px;opacity:0.85\'>" + hora + "</span>";' +
    '  document.body.appendChild(toast);' +
    '  setTimeout(function(){toast.remove();}, 6000);' +
    '}' +
    'async function toggleBot(){await fetch("/toggle",{method:"POST"});location.reload();}' +
    'async function toggleGrupo(id){await fetch("/grupo",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:id})});location.reload();}' +
    'async function toggleSector(sector){await fetch("/sector",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sector:sector})});location.reload();}' +
    '</script></body></html>');
});

app.post('/toggle', function(req, res) {
  botActivo = !botActivo;
  if (botActivo) Object.keys(lastReply).forEach(function(k) { delete lastReply[k]; });
  saveConfig();
  res.json({ activo: botActivo });
});

app.post('/grupo', function(req, res) {
  var id = req.body.id;
  if (GRUPOS_ACTIVOS.includes(id)) {
    GRUPOS_ACTIVOS = GRUPOS_ACTIVOS.filter(function(g) { return g !== id; });
  } else {
    GRUPOS_ACTIVOS.push(id);
  }
  saveConfig();
  res.json({ grupos: GRUPOS_ACTIVOS });
});

app.post('/sector', function(req, res) {
  var sector = req.body.sector;
  if (SECTORES_APAGADOS.includes(sector)) {
    SECTORES_APAGADOS = SECTORES_APAGADOS.filter(function(s) { return s !== sector; });
  } else {
    SECTORES_APAGADOS.push(sector);
  }
  saveConfig();
  res.json({ sectoresApagados: SECTORES_APAGADOS });
});

app.get('/grupos-raw', function(req, res) {
  var lista = GRUPOS_CACHE.map(function(g) {
    return g.name + '  →  sector: ' + getSectorDeGrupo(g.name);
  }).join('\n');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send('TOTAL: ' + GRUPOS_CACHE.length + ' grupos\n\n' + lista);
});

app.listen(3000, function() { console.log('Servidor activo'); });

setInterval(async function() {
  try {
    if (isReady) {
      var state = await client.getState();
      console.log('Estado WhatsApp:', state);
      if (state !== 'CONNECTED') {
        console.log('Reconectando...');
        isReady = false;
        qrCodeData = '';
        botActivo = false;
        saveConfig();
        process.exit(0);
      }
    }
  } catch(e) {
    console.log('Error ping:', e.message);
    process.exit(0);
  }
}, 30 * 60 * 1000);

client.initialize();
