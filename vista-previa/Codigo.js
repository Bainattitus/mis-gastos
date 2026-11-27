/**
 * @OnlyCurrentDoc
 *
 * GASTOS · código de la hoja de Google (Apps Script)
 * Versión 3.3 · 27/11/2026
 *  - 3.3: lo que se apunta a mano en la app (un gasto o dinero que entra) puede llevar otro día, el que elijas.
 *  - 3.2: el objetivo de gasto del mes de la app se guarda aquí, en Config B9 a B11 (uno para cada vista).
 *  - 3.1: crear categorías desde la app, con su emoji (columna C de Categorías), y la categoría «Viajes».
 *  - 3.0: la app «ByCash» es una página propia (APP_WEB) que habla con esta hoja. Cada persona tiene su hoja.
 *  - 2.2: suscripciones, gastos que se repiten cada mes o cada año desde la app.
 *
 * Qué hace:
 *  - Recibe los pagos que manda el iPhone con Apple Pay y los apunta arriba del todo en Gastos.
 *  - Lee los avisos de pago de Revolut, también los de la cuenta conjunta, sin apuntar nada dos veces.
 *  - No apunta los traspasos entre tus cuentas (por ejemplo, pasar dinero de ABANCA a Revolut).
 *  - Lee los avisos de Bizum del banco y apunta en Ingresos el dinero que te llega.
 *  - Pone la categoría con las reglas y aprende cuando cambias una a mano.
 *  - Apunta solos los gastos fijos de cada mes.
 *  - Separa tus gastos de los de la cuenta conjunta.
 *  - Atiende a la app «ByCash»: le da los datos y apunta lo que se haga en ella.
 *
 * Montaje y actualizaciones: ver GUIA.md. Tras pegar una versión nueva, ejecuta «preparar»
 * y publica una versión nueva en la misma implementación.
 */

// ─────────────────────────── Ajustes ───────────────────────────

const HOJAS = {
  gastos: 'Gastos',
  ingresos: 'Ingresos',
  fijos: 'Fijos',
  categorias: 'Categorías',
  reglas: 'Reglas',
  avisos: 'Avisos',
  config: 'Config'
};
const HOJA_RESUMEN_VIEJA = 'Resumen';
const SIN_CATEGORIA = 'Sin categoría';
const APRENDIDA = 'Aprendida';
const PALABRA_CLAVE = 'Palabra clave';
const PERSONAL = 'Personal';
const CONJUNTA = 'Conjunta';
const INGRESO = 'Ingreso';
const DEVOLUCION = 'Devolución';
// La app «ByCash». Su enlace lleva detrás de # la dirección de esta hoja y su clave.
const APP_WEB = 'https://bainattitus.github.io/mis-gastos/';
// Tus bancos, si no se cambian en Config B8: un pago a uno de ellos con otra tarjeta es un traspaso, no un gasto.
const MIS_CUENTAS = ['revolut', 'imagin', 'abanca'];
const BANCOS_INICIALES = 'Revolut, Imagin, ABANCA';
// Config B9 a B11: lo máximo que quieres gastar al mes en cada vista de la app. Se cambian desde la app o aquí.
const OBJETIVOS = [
  { vista: 'mio', fila: 9, nombre: 'Objetivo al mes: Mío' },
  { vista: 'conjunta', fila: 10, nombre: 'Objetivo al mes: Conjunta' },
  { vista: 'todo', fila: 11, nombre: 'Objetivo al mes: Todo' }
];
// Bancos cuyo nombre puede salir como título de un aviso en vez del comercio.
const BANCOS_CONOCIDOS = ['revolut', 'imagin', 'abanca', 'bbva', 'santander', 'caixabank', 'ing', 'sabadell',
  'bankinter', 'unicaja', 'kutxabank', 'ibercaja', 'openbank', 'evo', 'myinvestor', 'n26', 'wise', 'trade republic'];
// Orígenes que no son avisos de un banco.
const ORIGENES_PROPIOS = ['Apple Pay', 'Manual', 'Fijo', 'Bizum'];
const ZONA = 'Europe/Madrid';
// La versión de este código. La app la mira para saber qué sabe hacer la hoja (desde la 3.3, apuntar con otro día).
const VERSION_HOJA = '3.3';
const CABECERA_GASTOS = ['Fecha', 'Importe', 'Comercio', 'Categoría', 'Tarjeta', 'Origen', 'Nota', 'Id', 'Cuenta'];
const COL = { fecha: 1, importe: 2, comercio: 3, categoria: 4, tarjeta: 5, origen: 6, nota: 7, id: 8, cuenta: 9 };
const CABECERA_INGRESOS = ['Fecha', 'Importe', 'De', 'Concepto', 'Tipo', 'Categoría', 'Origen', 'Cuenta', 'Nota', 'Id'];
const COLI = { fecha: 1, importe: 2, de: 3, concepto: 4, tipo: 5, categoria: 6, origen: 7, cuenta: 8, nota: 9, id: 10 };
const CABECERA_AVISOS = ['Fecha', 'App', 'Título', 'Texto', 'Qué pasó'];
const CABECERA_FIJOS = ['Concepto', 'Importe', 'Día del mes', 'Categoría', 'Pausado', 'Último mes apuntado',
  'Cuenta', 'Cada', 'Mes (si es al año)'];
const COLF = { concepto: 1, importe: 2, dia: 3, categoria: 4, pausado: 5, ultimo: 6, cuenta: 7, cada: 8, mesAnio: 9 };
const CADA_MES = 'Mes';
const CADA_ANIO = 'Año';
const EUROS = '#,##0.00 "€"';
const FECHA_HORA = 'dd/mm/yyyy hh:mm';
const COLOR_CABECERA = '#e8eaed';
const COLOR_AVISO = '#fde2c4';
const COLOR_RELLENAR = '#fff4c2';
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const CATEGORIAS_INICIALES = ['Supermercado', 'Comer fuera', 'Tomar algo', 'Transporte', 'Gasolina',
  'Compras', 'Ropa', 'Ocio', 'Salud', 'Hogar', 'Recibos', 'Suscripciones', 'Viajes',
  'Regalos', 'Otros'];
// Categorías que llegaron después. «preparar» las mete una sola vez en las hojas que ya existían
// (con sus palabras clave); si luego las quitas de la hoja, no vuelven.
const CATEGORIAS_NUEVAS = ['Tomar algo', 'Viajes'];

// Palabras clave de inicio. No importan mayúsculas ni tildes.
// Si varias coinciden, gana la más larga («uber eats» antes que «uber»).
// Las de 4 letras o menos tienen que ser palabra entera («zara» no vale para «Zaragoza»).
const REGLAS_INICIALES = {
  'Supermercado': 'mercadona, carrefour, lidl, aldi, dia, eroski, alcampo, hipercor, supercor, ' +
    'consum, caprabo, bonpreu, ahorramas, condis, gadis, froiz, masymas, spar, coviran, supermercado',
  'Comer fuera': 'glovo, just eat, justeat, uber eats, ubereats, deliveroo, bolt food, mcdonald, ' +
    'burger king, telepizza, domino, kfc, starbucks, foster, vips, goiko, montaditos, tagliatella, ' +
    'five guys, taco bell, popeyes, rodilla, pans company, tgb, llaollao, restaurante, cafeteria, ' +
    'pizzeria, sushi, kebab, bar, cafe',
  'Tomar algo': 'cerveceria, cerveza, cervezas, beer, brewery, pub, irish, taberna, tasca, vermuteria, ' +
    'cocteleria, coctel, chiringuito, bodega',
  'Transporte': 'renfe, cabify, uber, bolt, freenow, free now, taxi, metro, emt, tmb, alsa, ' +
    'blablacar, ouigo, iryo, parking, aparcamiento, telpark, empark, saba, bicing, lime, cooltra, ' +
    'autopista, peaje',
  'Gasolina': 'repsol, cepsa, moeve, galp, shell, bp, petronor, ballenoil, plenoil, petroprix, ' +
    'esclatoil, avia, disa, gasolinera, carburantes, estacion de servicio, estacion servicio, eess, ' +
    'carrefour eess',
  'Compras': 'amazon, amzn, aliexpress, temu, ebay, wallapop, vinted, media markt, mediamarkt, ' +
    'el corte ingles, fnac, worten, pccomponentes, decathlon, primor, druni, sephora, tiger, miniso, ' +
    'casa del libro, apple store',
  'Ropa': 'zara, pull bear, bershka, stradivarius, mango, primark, h m, massimo dutti, oysho, ' +
    'lefties, shein, springfield, kiabi, jack jones, uniqlo, cortefiel, desigual, calzedonia, ' +
    'women secret, nike, adidas, foot locker, sprinter',
  'Ocio': 'cines, cinesa, yelmo, kinepolis, ocine, ticketmaster, entradas, teatro, museo, ' +
    'concierto, steam, playstation, nintendo, xbox, loteria',
  'Salud': 'farmacia, clinica, dental, dentista, optica, hospital, fisioterapia, sanitas, adeslas, ' +
    'dkv, gimnasio, gym, basic fit, basicfit, mcfit, anytime fitness, synergym, altafit, vivagym, go fit',
  'Hogar': 'ikea, leroy merlin, bricomart, brico depot, bauhaus, conforama, jysk, zara home, ' +
    'maisons du monde, ferreteria',
  'Recibos': 'iberdrola, endesa, naturgy, holaluz, movistar, vodafone, orange, digi, simyo, lowi, ' +
    'pepephone, yoigo, masmovil, jazztel, o2, canal de isabel, mapfre, mutua, linea directa, ' +
    'allianz, axa, seguros',
  'Suscripciones': 'netflix, spotify, hbo, hbomax, disney, prime video, amazon prime, ' +
    'apple com bill, icloud, youtube, google one, dazn, movistar plus, filmin, audible, ' +
    'playstation plus, chatgpt, openai, anthropic, claude ai, duolingo, patreon',
  'Viajes': 'booking, airbnb, ryanair, vueling, iberia, easyjet, air europa, volotea, binter, ' +
    'edreams, expedia, logitravel, hotel, hostal, parador, europcar, hertz, avis, sixt, goldcar',
  'Regalos': 'regalo, floristeria, interflora, smartbox, wonderbox',
  'Otros': 'correos, estanco'
};


// ─────────────────── Lo que se ejecuta a mano ───────────────────

/** Menú «ByCash» de la hoja. Sirve para instalarla desde la plantilla sin abrir el código (guía instalar.html). */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('ByCash')
    .addItem('Instalar o reparar', 'instalar')
    .addItem('Ver mis enlaces', 'verEnlaces')
    .addToUi();
}

/** Lo mismo que «preparar», y al acabar dice el paso siguiente. */
function instalar() {
  preparar();
  verEnlaces();
}

/** Ventana con el paso siguiente: publicar la hoja o abrir la app, que enseña un QR para llevarla al iPhone. */
function verEnlaces() {
  const config = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJAS.config);
  const app = config ? limpiarTexto_(config.getRange('B5').getValue()) : '';
  const lista = app.indexOf(APP_WEB) === 0;
  const estilo = '<style>body{font:15px/1.5 Arial,sans-serif;color:#202124;margin:4px 6px}b{font-weight:700}' +
    '.boton{display:inline-block;margin-top:14px;padding:11px 18px;border-radius:10px;background:#1a73e8;color:#fff;' +
    'text-decoration:none;font-weight:700}ol{padding-left:20px}li{margin:6px 0}</style>';
  const html = lista
    ? '<p style="font-size:18px">✅ <b>ByCash está instalado.</b></p>' +
      '<p>Abre tu app en este ordenador: te enseña un código QR para llevarla al iPhone. Después sigue la guía en el iPhone.</p>' +
      '<a class="boton" href="' + app + '" target="_blank" rel="noopener">Abrir mi app</a>'
    : '<p style="font-size:18px">Falta un paso: <b>publicar tu hoja</b>.</p><ol>' +
      '<li>Menú <b>Extensiones</b> → <b>Apps Script</b>.</li>' +
      '<li>Botón azul <b>Implementar</b> → <b>Nueva implementación</b> → rueda → <b>Aplicación web</b>.</li>' +
      '<li>«Ejecutar como»: <b>Yo</b>. «Quién tiene acceso»: <b>Cualquier usuario</b>. Pulsa <b>Implementar</b>.</li>' +
      '<li>Copia la <b>URL de la aplicación web</b>, vuelve aquí y pégala en la pestaña <b>Config</b>, celda amarilla <b>B3</b>.</li>' +
      '<li>Pulsa otra vez <b>ByCash → Instalar o reparar</b>.</li></ol>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(estilo + html).setWidth(440).setHeight(lista ? 230 : 380), 'ByCash');
}

/** Crea y ordena las pestañas, el aviso diario de los fijos y lanza las pruebas. Se puede repetir sin perder datos. */
function preparar() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone(ZONA);
  ss.setSpreadsheetLocale('es_ES');
  prepararCategorias_(ss);
  prepararGastos_(ss);
  prepararIngresos_(ss);
  prepararReglasHoja_(ss);
  prepararFijos_(ss);
  prepararAvisos_(ss);
  const config = prepararConfig_(ss);
  quitarResumenViejo_(ss);
  ordenarPestanas_(ss);
  borrarHojasVacias_(ss);
  crearDisparador_();
  const resultado = probar();
  ss.setActiveSheet(config);
  ss.toast(resultado, 'Gastos preparado', 10);
  return resultado;
}

/** Comprueba que importes, categorías, avisos y resúmenes salen bien. Deja el resultado en Config. */
function probar() {
  const r = ejecutarPruebas_();
  const texto = r.fallos.length
    ? 'Fallan ' + r.fallos.length + ' de ' + r.total + ': ' + r.fallos.join(' | ')
    : 'Pruebas OK (' + r.total + ' casos)';
  const config = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJAS.config);
  if (config) config.getRange('B6').setValue(texto);
  console.log(texto);
  return texto;
}

/** Apunta los gastos fijos que tocan este mes y aún no están. Se ejecuta solo cada mañana. */
function apuntarFijos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = ss.getSpreadsheetTimeZone() || ZONA;
  const ahora = new Date();
  const hoy = {
    anio: Number(Utilities.formatDate(ahora, tz, 'yyyy')),
    mes: Number(Utilities.formatDate(ahora, tz, 'M')),
    dia: Number(Utilities.formatDate(ahora, tz, 'd'))
  };
  const mesActual = claveMes_(hoy.anio, hoy.mes);
  const hojaF = ss.getSheetByName(HOJAS.fijos);
  const hojaG = ss.getSheetByName(HOJAS.gastos);
  if (!hojaF || !hojaG || hojaF.getLastRow() < 2) return 0;

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  let apuntados = 0;
  try {
    const filas = hojaF.getRange(2, 1, hojaF.getLastRow() - 1, CABECERA_FIJOS.length).getValues();
    let reglas = null;
    filas.forEach(function (f, i) {
      const fijo = leerFijo_(f, tz);
      if (!fijo || fijo.pausado) return;                     // vacío o pausado
      if (!fijoToca_(fijo.dia, hoy, fijo.ultimo, fijo.cada, fijo.mesAnio)) return;
      const dia = diaQueToca_(fijo.dia, hoy.anio, hoy.mes);
      const fecha = Utilities.parseDate(mesActual + '-' + String(dia).padStart(2, '0') + ' 09:00', tz, 'yyyy-MM-dd HH:mm');
      let categoria = fijo.categoria;
      if (!categoria) {
        reglas = reglas || leerReglas_(ss);
        categoria = categorizar_(fijo.concepto, reglas);
      }
      escribirGasto_(hojaG, [fecha, fijo.importe, fijo.concepto, categoria, '', 'Fijo', ''], fijo.cuenta);
      hojaF.getRange(i + 2, COLF.ultimo).setValue(mesActual);
      apuntados++;
    });
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  console.log('Fijos apuntados: ' + apuntados);
  return apuntados;
}

/** Cambia la clave secreta. Después hay que volver a poner el enlace de Config B4 en el iPhone. */
function nuevaClave() {
  const clave = Utilities.getUuid().replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty('CLAVE', clave);
  const config = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJAS.config);
  if (config) {
    config.getRange('B2').setValue(clave);
    escribirEnlaces_(config);
  }
  return clave;
}


// ─────────────────── Lo que llama el iPhone ───────────────────

/**
 * Recibe datos de los atajos del iPhone, en JSON o como formulario.
 *  - Pago con Apple Pay: importe, comercio, tarjeta, origen, nota, categoria, cuenta.
 *  - Aviso del banco: aviso (el texto), titulo, app, cuenta.
 * También atiende a la app: {"accion": "datos", "args": [...]}, y contesta en JSON.
 */
function doPost(e) {
  const app = leerPeticionApp_(e);
  if (app) return respuestaJson_(atenderApp_(e.parameter && e.parameter.t, app));
  try {
    if (!claveCorrecta_(e)) return respuesta_('Error: la clave del enlace no es correcta');
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const datos = leerDatos_(e);
    if (limpiarTexto_(datos.aviso)) return respuesta_(procesarAviso_(ss, datos));
    return respuesta_(apuntarGasto_(ss, datos));
  } catch (err) {
    return respuesta_('Error: ' + mensajeError_(err));
  }
}

/** El icono viejo de la app abría esta dirección: con la clave buena enseña el enlace de la app nueva. Sin ella, «OK». */
function doGet(e) {
  const t = e && e.parameter && e.parameter.t;
  if (!claveValida_(t)) return respuesta_('OK');
  const config = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJAS.config);
  const enlace = config ? limpiarTexto_(config.getRange('B5').getValue()) : '';
  const boton = /^https:\/\//.test(enlace)
    ? '<p><a href="' + escaparHtml_(enlace) + '" target="_top" style="display:inline-block;background:#2a5fe0;color:#fff;' +
      'padding:14px 22px;border-radius:14px;font-weight:700;text-decoration:none">Abrir la app nueva</a></p>'
    : '<p>Abre la hoja y copia el enlace de la pestaña Config, celda B5.</p>';
  return HtmlService.createHtmlOutput('<div style="font:17px/1.45 -apple-system,Segoe UI,Roboto,sans-serif;padding:24px;max-width:480px">' +
    '<h2 style="margin:0 0 8px">«ByCash» se ha mudado</h2>' +
    '<p>Ahora es una app propia: se abre más rápido y sin la franja de Google.</p>' + boton +
    '<p style="color:#6b7280">Después, añádela a la pantalla de inicio y borra este icono viejo.</p></div>')
    .setTitle('ByCash')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Al cambiar a mano una categoría en Gastos, guarda la regla de ese comercio y corrige sus «Sin categoría».
 * Al pegar la dirección en Config B3, escribe en B4 el enlace para el iPhone.
 */
function onEdit(e) {
  if (!e || !e.range) return;
  const hoja = e.range.getSheet();
  if (hoja.getName() === HOJAS.config) {
    const r = e.range;
    if (r.getRow() <= 3 && r.getLastRow() >= 3 && r.getColumn() <= 2 && r.getLastColumn() >= 2) escribirEnlaces_(hoja);
    return;
  }
  if (hoja.getName() !== HOJAS.gastos) return;
  const ini = Math.max(2, e.range.getRow());
  const fin = e.range.getLastRow();
  if (fin < ini || e.range.getColumn() > COL.categoria || e.range.getLastColumn() < COL.categoria) return;
  let lock = null;
  try {
    lock = LockService.getScriptLock();
    lock.waitLock(10000);
  } catch (err) {
    lock = null;
  }
  try {
    aprenderDeFilas_(hoja, ini, fin);
  } finally {
    if (lock) lock.releaseLock();
  }
}


// ─────────────────── Lo que llama la app «ByCash» ───────────────────

/** Lo que la app puede pedir. Cada función recibe primero la clave y luego sus datos. */
function accionesApp_() {
  return {
    datos: appDatos, apuntar: appApuntar, apuntarIngreso: appApuntarIngreso, cambiar: appCambiar,
    cambiarIngreso: appCambiarIngreso, cuenta: appCambiarCuenta, borrar: appBorrar, repetir: appRepetir,
    cambiarFijo: appCambiarFijo, dejarFijo: appDejarFijo, editar: appEditar, crearCategoria: appCrearCategoria,
    guardarObjetivo: appGuardarObjetivo
  };
}

/** Ejecuta lo que pide la app. Devuelve {r: resultado} o {error: texto}; con la clave mala, también clave: false. */
function atenderApp_(clave, peticion) {
  if (!claveValida_(clave)) return { error: 'La clave no es correcta', clave: false };
  const acciones = accionesApp_();
  if (!Object.prototype.hasOwnProperty.call(acciones, peticion.accion)) {
    return { error: 'La app ha pedido algo que esta hoja no conoce («' + peticion.accion + '»). Pega el código nuevo.' };
  }
  try {
    return { r: acciones[peticion.accion].apply(null, [clave].concat(peticion.args)) };
  } catch (err) {
    return { error: mensajeError_(err) };
  }
}

function respuestaJson_(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(ContentService.MimeType.JSON);
}

/** Resumen de un mes ('2026-10') en tres vistas: lo mío, la cuenta conjunta y todo junto. */
function appDatos(clave, mes) {
  comprobarClave_(clave);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = ss.getSpreadsheetTimeZone() || ZONA;
  const ahora = new Date();
  const hoy = { mes: Utilities.formatDate(ahora, tz, 'yyyy-MM'), dia: Number(Utilities.formatDate(ahora, tz, 'd')) };
  const elegido = /^\d{4}-\d{2}$/.test(String(mes || '')) ? String(mes) : hoy.mes;
  const gastos = leerGastos_(ss, tz, elegido);
  const ingresos = leerIngresos_(ss, tz, elegido);
  const presupuestos = leerPresupuestos_(ss);
  const sinPresupuesto = presupuestos.map(function (c) { return { nombre: c.nombre, presupuesto: 0 }; });
  const deCuenta = function (cuenta) {
    return function (x) { return cuenta === CONJUNTA ? x.cuenta === CONJUNTA : x.cuenta !== CONJUNTA; };
  };
  return {
    ok: true,
    versionHoja: VERSION_HOJA,
    mes: elegido,
    hoja: ss.getUrl(),
    hayConjunta: gastos.concat(ingresos).some(function (x) { return x.cuenta === CONJUNTA; }),
    listaCategorias: presupuestos.map(function (c) { return c.nombre; }),
    emojis: emojisDeCategorias_(presupuestos),
    objetivos: leerObjetivos_(ss),
    fijos: leerFijos_(ss, tz),
    vistas: {
      mio: resumirMes_(gastos.filter(deCuenta(PERSONAL)), ingresos.filter(deCuenta(PERSONAL)), presupuestos, elegido, hoy),
      conjunta: resumirMes_(gastos.filter(deCuenta(CONJUNTA)), ingresos.filter(deCuenta(CONJUNTA)), sinPresupuesto, elegido, hoy),
      todo: resumirMes_(gastos, ingresos, sinPresupuesto, elegido, hoy)
    }
  };
}

/**
 * Apunta un gasto desde la app. Con «repetir» (mes o año) además lo deja en Fijos para que se apunte solo.
 * «fecha» (aaaa-mm-dd): si se repite, es el día en que lo cobran: si ya pasó, se apunta con esa fecha; si aún no
 * ha llegado, no se apunta ahora, sino solo ese día. Si no se repite, es el día en que fue (desde la 3.3).
 */
function appApuntar(clave, gasto) {
  comprobarClave_(clave);
  const g = gasto || {};
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = ss.getSpreadsheetTimeZone() || ZONA;
  const comercio = limpiarTexto_(g.comercio);
  const cada = g.repetir ? normalizarCada_(g.repetir) : '';
  if (cada && !comercio) return 'Error: para que se repita, escribe dónde (por ejemplo, Netflix)';
  const cobro = cada ? diaDeCobro_(g.fecha, tz) : null;
  const otroDia = cada ? null : diaDeApunte_(g.fecha, tz);
  const datosFijo = function () {
    return {
      concepto: comercio, importe: leerImporte_(g.importe), fecha: cobro ? cobro.fecha : new Date(), cada: cada,
      categoria: buscarCategoria_(g.categoria, leerCategorias_(ss)) || '', cuenta: normalizarCuenta_(g.cuenta)
    };
  };
  if (cobro && cobro.futuro) {
    const fijo = datosFijo();
    if (!isFinite(fijo.importe) || fijo.importe === 0) return 'Error: no entiendo el importe «' + limpiarTexto_(g.importe) + '»';
    fijo.ultimo = ultimoAntesDeCobro_(cobro.texto, cada);
    const hecho = crearFijo_(ss, fijo);
    if (esError_(hecho)) return hecho;
    if (hecho === 'ya se repetía') return 'Ya lo tenías en Fijos: no se ha cambiado nada';
    return 'Hecho: se apuntará solo el ' + cobro.dia + ' de ' + MESES[cobro.mes - 1] +
      (cada === CADA_ANIO ? ' de ' + cobro.anio + ' y después cada año' : ' y después el día ' + cobro.dia + ' de cada mes');
  }
  const r = apuntarGasto_(ss, {
    importe: g.importe, comercio: comercio, categoria: g.categoria, nota: g.nota, tarjeta: '',
    origen: /^bizum\b/i.test(comercio) ? 'Bizum' : 'Manual', cuenta: g.cuenta, fecha: cobro ? cobro.fecha : otroDia
  });
  if (!cada) return otroDia && /^Apuntado/.test(r) ? r + ' · ' + textoDelDia_(otroDia, tz) : r;
  if (!/^Apuntado/.test(r)) return r;
  const fijo = crearFijo_(ss, datosFijo());
  return esError_(fijo) ? r + '. ' + fijo : r + ' · ' + fijo;
}

/** Lee un día de la app (aaaa-mm-dd): {texto, anio, mes, dia}, o null si no es un día que exista. */
function leerDia_(texto) {
  const t = limpiarTexto_(texto);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return null;
  const anio = Number(m[1]), mes = Number(m[2]), dia = Number(m[3]);
  if (anio < 2000 || mes < 1 || mes > 12 || dia < 1 || dia > diaQueToca_(31, anio, mes)) return null;
  return { texto: t, anio: anio, mes: mes, dia: dia };
}

/** Lee el día en que cobran un fijo (aaaa-mm-dd). Sin día, con uno que no vale o con el de hoy, null: se apunta ahora. */
function diaDeCobro_(texto, tz) {
  const d = leerDia_(texto);
  if (!d) return null;
  const hoy = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  if (d.texto === hoy) return null;
  d.futuro = d.texto > hoy;
  d.fecha = Utilities.parseDate(d.texto + ' 09:00', tz, 'yyyy-MM-dd HH:mm');
  return d;
}

/**
 * Fecha de algo que se apunta a mano con otro día (aaaa-mm-dd): ese día, a la hora de ahora.
 * Sin día, con uno que no vale, con el de hoy o con uno que aún no ha llegado, null: se apunta ahora.
 */
function diaDeApunte_(texto, tz, ahora) {
  const d = leerDia_(texto);
  const momento = ahora || new Date();
  if (!d || d.texto >= Utilities.formatDate(momento, tz, 'yyyy-MM-dd')) return null;
  return Utilities.parseDate(d.texto + ' ' + Utilities.formatDate(momento, tz, 'HH:mm'), tz, 'yyyy-MM-dd HH:mm');
}

/** «el 25 de noviembre», con el año si no es este: para decir en la app con qué día se ha apuntado. */
function textoDelDia_(fecha, tz, ahora) {
  const anio = Utilities.formatDate(fecha, tz, 'yyyy');
  return 'el ' + Utilities.formatDate(fecha, tz, 'd') + ' de ' + MESES[Number(Utilities.formatDate(fecha, tz, 'M')) - 1] +
    (anio === Utilities.formatDate(ahora || new Date(), tz, 'yyyy') ? '' : ' de ' + anio);
}

/** Mes que se deja como ya apuntado para que el primer cobro sea el del día elegido: el mes (o el año) anterior. */
function ultimoAntesDeCobro_(texto, cada) {
  return moverMes_(String(texto).slice(0, 7), cada === CADA_ANIO ? -12 : -1);
}

/** Hace que un gasto ya apuntado se repita cada mes o cada año, desde su fecha. */
function appRepetir(clave, id, repetir) {
  comprobarClave_(clave);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJAS.gastos);
  const fila = buscarFilaPorId_(hoja, id, COL.id);
  if (!fila) return 'Error: no encuentro ese gasto. Actualiza la pantalla.';
  const v = hoja.getRange(fila, 1, 1, CABECERA_GASTOS.length).getValues()[0];
  const categoria = limpiarTexto_(v[COL.categoria - 1]);
  const r = crearFijo_(ss, {
    concepto: limpiarTexto_(v[COL.comercio - 1]), importe: leerImporte_(v[COL.importe - 1]),
    fecha: v[COL.fecha - 1] instanceof Date ? v[COL.fecha - 1] : new Date(), cada: normalizarCada_(repetir),
    categoria: categoria === SIN_CATEGORIA ? '' : categoria, cuenta: normalizarCuenta_(v[COL.cuenta - 1])
  });
  return esError_(r) ? r : 'Hecho: ' + r;
}

/** Cambia el importe de un fijo, por ejemplo si sube el precio de una suscripción. */
function appCambiarFijo(clave, fila, concepto, importe) {
  comprobarClave_(clave);
  const nuevo = leerImporte_(importe);
  if (!isFinite(nuevo) || nuevo === 0) return 'Error: no entiendo el importe';
  return cambiarFijo_(fila, concepto, function (hoja, n, nombre) {
    hoja.getRange(n, COLF.importe).setValue(nuevo);
    return 'Hecho: «' + nombre + '» ahora es ' + formatoEuros_(nuevo);
  });
}

/** Deja de apuntar solo un fijo: lo marca como «Pausado» en la hoja. Lo ya apuntado no se toca. */
function appDejarFijo(clave, fila, concepto) {
  comprobarClave_(clave);
  return cambiarFijo_(fila, concepto, function (hoja, n, nombre) {
    hoja.getRange(n, COLF.pausado).insertCheckboxes().setValue(true);
    return 'Listo: «' + nombre + '» ya no se apuntará solo';
  });
}

/** Comprueba que la fila de Fijos sigue siendo la que ve la app y le aplica el cambio. */
function cambiarFijo_(fila, concepto, cambio) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJAS.fijos);
  const n = Math.floor(Number(fila));
  if (!hoja || !(n >= 2) || n > hoja.getLastRow()) return 'Error: no lo encuentro. Actualiza la pantalla.';
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const actual = limpiarTexto_(hoja.getRange(n, COLF.concepto).getValue());
    if (!actual || normalizar_(actual) !== normalizar_(concepto)) return 'Error: la hoja ha cambiado. Actualiza la pantalla.';
    const r = cambio(hoja, n, actual);
    SpreadsheetApp.flush();
    return r;
  } finally {
    lock.releaseLock();
  }
}

/** Apunta dinero que entra desde la app: un ingreso o una devolución de una categoría. «fecha», como en appApuntar. */
function appApuntarIngreso(clave, ingreso) {
  comprobarClave_(clave);
  const i = ingreso || {};
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = ss.getSpreadsheetTimeZone() || ZONA;
  const otroDia = diaDeApunte_(i.fecha, tz);
  const r = apuntarIngreso_(ss, {
    importe: i.importe, de: i.de, concepto: i.concepto, tipo: i.tipo, categoria: i.categoria,
    origen: 'Manual', cuenta: i.cuenta, fecha: otroDia
  });
  return otroDia && / apuntada: /.test(r) ? r + ' · ' + textoDelDia_(otroDia, tz) : r;
}

/** Cambia la categoría de un gasto y la recuerda para ese comercio. */
function appCambiar(clave, id, categoria) {
  comprobarClave_(clave);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cat = buscarCategoria_(categoria, leerCategorias_(ss));
  if (!cat) return 'Error: esa categoría no existe';
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const hoja = ss.getSheetByName(HOJAS.gastos);
    const fila = buscarFilaPorId_(hoja, id, COL.id);
    if (!fila) return 'Error: no encuentro ese gasto. Actualiza la pantalla.';
    hoja.getRange(fila, COL.categoria).setValue(cat);
    aprenderDeFilas_(hoja, fila, fila);
    SpreadsheetApp.flush();
    return 'Hecho: «' + limpiarTexto_(hoja.getRange(fila, COL.comercio).getValue()) + '» irá siempre a ' + cat;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Crea una categoría desde la app, al final de Categorías y sin presupuesto, con su emoji en la columna C.
 * Devuelve {nombre, emoji, nueva}. Si ya existía, devuelve la de la hoja con nueva: false y no toca nada.
 */
function appCrearCategoria(clave, nombre, emoji) {
  comprobarClave_(clave);
  const limpio = nombreCategoriaNueva_(nombre);
  if (!limpio) return 'Error: escribe un nombre para la categoría';
  const icono = emojiCategoria_(emoji);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const hoja = ss.getSheetByName(HOJAS.categorias);
    if (!hoja) return 'Error: no encuentro la pestaña Categorías. Ejecuta «preparar» en la hoja.';
    const existente = buscarCategoria_(limpio, leerCategorias_(ss));
    if (existente) return { nombre: existente, emoji: '', nueva: false };
    const fila = ultimaCategoria_(hoja).ultima + 1;
    if (fila > hoja.getMaxRows()) hoja.insertRowsAfter(hoja.getMaxRows(), 1);
    hoja.getRange(fila, 1, 1, 3).setValues([[limpio, '', icono]]);
    SpreadsheetApp.flush();
    return { nombre: limpio, emoji: icono, nueva: true };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Guarda el objetivo de gasto del mes de una vista de la app ('mio', 'conjunta' o 'todo') en Config.
 * Con 0 o vacío, lo quita. Escribe también el nombre de la fila, por si aún no se ha ejecutado «preparar».
 */
function appGuardarObjetivo(clave, vista, importe) {
  comprobarClave_(clave);
  const ob = OBJETIVOS.filter(function (o) { return o.vista === vista; })[0];
  if (!ob) return 'Error: no conozco esa vista';
  const n = numeroObjetivo_(importe);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const config = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJAS.config);
    if (!config) return 'Error: no encuentro la pestaña Config. Ejecuta «preparar» en la hoja.';
    config.getRange(ob.fila, 1).setValue(ob.nombre).setFontWeight('bold');
    config.getRange(ob.fila, 2).setValue(n || '').setNumberFormat(EUROS);
    SpreadsheetApp.flush();
    return n ? 'Objetivo guardado' : 'Objetivo quitado';
  } finally {
    lock.releaseLock();
  }
}

/** Los objetivos de Config B9 a B11, como {mio, conjunta, todo}. Los que no están puestos van a 0. */
function leerObjetivos_(ss) {
  const config = ss.getSheetByName(HOJAS.config);
  return objetivosDeFilas_(config ? config.getRange(OBJETIVOS[0].fila, 1, OBJETIVOS.length, 2).getValues() : []);
}

/** De las filas [[nombre, importe], …] de Config a {mio, conjunta, todo}. Si la fila no es la del objetivo, cuenta 0. */
function objetivosDeFilas_(filas) {
  const objetivos = {};
  OBJETIVOS.forEach(function (ob, i) {
    const f = filas[i] || [];
    objetivos[ob.vista] = limpiarTexto_(f[0]) === ob.nombre ? numeroObjetivo_(f[1]) : 0;
  });
  return objetivos;
}

/** «800», «1.200,50 €» o 800 → número. Si no se entiende o no es mayor que 0, 0. */
function numeroObjetivo_(valor) {
  const n = leerImporte_(valor);
  return isFinite(n) && n > 0 && n < 1e7 ? redondear_(n) : 0;
}

/** Marca una entrada de dinero como ingreso o como devolución de una categoría. */
function appCambiarIngreso(clave, id, tipo, categoria) {
  comprobarClave_(clave);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const esDevolucion = normalizarTipo_(tipo) === DEVOLUCION;
  const cat = esDevolucion ? buscarCategoria_(categoria, leerCategorias_(ss)) : '';
  if (esDevolucion && !cat) return 'Error: esa categoría no existe';
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const hoja = ss.getSheetByName(HOJAS.ingresos);
    const fila = buscarFilaPorId_(hoja, id, COLI.id);
    if (!fila) return 'Error: no encuentro esa entrada. Actualiza la pantalla.';
    hoja.getRange(fila, COLI.tipo, 1, 2).setValues([[esDevolucion ? DEVOLUCION : INGRESO, cat]]);
    SpreadsheetApp.flush();
    return esDevolucion ? 'Hecho: se resta de ' + cat : 'Hecho: cuenta como dinero que entra';
  } finally {
    lock.releaseLock();
  }
}

/** Pasa un gasto o una entrada a tu cuenta o a la conjunta. */
function appCambiarCuenta(clave, id, cuenta) {
  comprobarClave_(clave);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const nueva = normalizarCuenta_(cuenta);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sitio = buscarMovimiento_(ss, id);
    if (!sitio) return 'Error: no lo encuentro. Actualiza la pantalla.';
    sitio.hoja.getRange(sitio.fila, sitio.colCuenta).setValue(nueva);
    SpreadsheetApp.flush();
    return nueva === CONJUNTA ? 'Hecho: ahora está en la cuenta conjunta' : 'Hecho: ahora está en lo tuyo';
  } finally {
    lock.releaseLock();
  }
}

/**
 * Cambia el importe, el nombre (comercio o de quién) o la nota de un gasto o de una entrada de dinero.
 * Solo toca lo que llega. Si un gasto sin categoría cambia de nombre, se le busca categoría con el nombre nuevo.
 */
function appEditar(clave, id, cambios) {
  comprobarClave_(clave);
  const c = cambios || {};
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hayImporte = c.importe !== undefined && c.importe !== null && String(c.importe).trim() !== '';
  const importe = hayImporte ? leerImporte_(c.importe) : null;
  if (hayImporte && (!isFinite(importe) || importe === 0)) return 'Error: no entiendo el importe';
  const nombre = c.nombre === undefined ? null : limpiarTexto_(c.nombre);
  if (nombre === '') return 'Error: escribe el nombre';
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sitio = buscarMovimiento_(ss, id);
    if (!sitio) return 'Error: no lo encuentro. Actualiza la pantalla.';
    const col = sitio.esIngreso
      ? { importe: COLI.importe, nombre: COLI.de, nota: COLI.nota }
      : { importe: COL.importe, nombre: COL.comercio, nota: COL.nota };
    const celda = function (columna) { return sitio.hoja.getRange(sitio.fila, columna); };
    if (hayImporte) celda(col.importe).setValue(sitio.esIngreso ? Math.abs(importe) : importe);
    if (nombre !== null) {
      celda(col.nombre).setValue(nombre);
      if (!sitio.esIngreso && limpiarTexto_(celda(COL.categoria).getValue()) === SIN_CATEGORIA) {
        celda(COL.categoria).setValue(categorizar_(nombre, leerReglas_(ss)));
      }
    }
    if (c.nota !== undefined) celda(col.nota).setValue(limpiarTexto_(c.nota));
    SpreadsheetApp.flush();
    return 'Hecho: cambios guardados';
  } finally {
    lock.releaseLock();
  }
}

/** Borra un gasto o una entrada de dinero. */
function appBorrar(clave, id) {
  comprobarClave_(clave);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sitio = buscarMovimiento_(ss, id);
    if (!sitio) return 'Error: no lo encuentro. Actualiza la pantalla.';
    sitio.hoja.deleteRow(sitio.fila);
    SpreadsheetApp.flush();
    return sitio.esIngreso ? 'Entrada borrada' : 'Gasto borrado';
  } finally {
    lock.releaseLock();
  }
}


// ─────────────────── Funciones puras (se prueban en el PC) ───────────────────

/** Minúsculas, sin tildes y sin signos: «MERCADONA, S.A.» → «mercadona s a». */
function normalizar_(texto) {
  return String(texto == null ? '' : texto)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function limpiarTexto_(valor) {
  return String(valor == null ? '' : valor).replace(/\s+/g, ' ').trim().slice(0, 200);
}

/** El nombre de una categoría nueva: como mucho 30 letras, con alguna letra o número y sin ser «Sin categoría». Si no vale, ''. */
function nombreCategoriaNueva_(texto) {
  const limpio = limpiarTexto_(texto).slice(0, 30).trim();
  const n = normalizar_(limpio);
  if (!n || n === normalizar_(SIN_CATEGORIA)) return '';
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

/** El emoji de una categoría: corto y sin letras, números ni símbolos de código. Si no vale, ''. */
function emojiCategoria_(texto) {
  const e = limpiarTexto_(texto);
  return e && e.length <= 16 && !/[\w<>"'=&]/.test(e) ? e : '';
}

/** {categoría: emoji} con las que tienen emoji en la columna C de Categorías. */
function emojisDeCategorias_(presupuestos) {
  const emojis = {};
  presupuestos.forEach(function (c) { if (c.emoji) emojis[c.nombre] = c.emoji; });
  return emojis;
}

function redondear_(n) {
  return Math.round(n * 100) / 100;
}

function mensajeError_(err) {
  return err && err.message ? err.message : String(err);
}

/** Convierte «12,50 €», «1.234,56 €», «€12.50» o 12.5 en número. Si no puede, NaN. */
function leerImporte_(valor) {
  if (typeof valor === 'number') return isFinite(valor) ? redondear_(valor) : NaN;
  const texto = String(valor == null ? '' : valor);
  const negativo = /[-−]/.test(texto);
  let s = texto.replace(/[^\d.,]/g, '');
  if (!/\d/.test(s)) return NaN;
  const coma = s.lastIndexOf(',');
  const punto = s.lastIndexOf('.');
  let decimal = null;
  if (coma >= 0 && punto >= 0) {
    decimal = coma > punto ? ',' : '.';
  } else if (coma >= 0 || punto >= 0) {
    const sep = coma >= 0 ? ',' : '.';
    const partes = s.split(sep);
    // Un solo separador seguido de 3 cifras es de miles («1.234»); si no, es el decimal.
    if (partes.length === 2 && partes[1].length !== 3) decimal = sep;
  }
  if (decimal) {
    s = s.split(decimal === ',' ? '.' : ',').join('');
    const i = s.lastIndexOf(decimal);
    s = s.slice(0, i).split(decimal).join('') + '.' + s.slice(i + 1);
  } else {
    s = s.replace(/[.,]/g, '');
  }
  const n = parseFloat(s);
  if (!isFinite(n)) return NaN;
  return redondear_(negativo ? -n : n);
}

/** true si el importe trae otra moneda («$12.50», «USD 5»). Sin símbolo se asume euros. */
function monedaExtranjera_(valor) {
  if (typeof valor === 'number' || valor == null) return false;
  const t = String(valor);
  if (/€|eur/i.test(t)) return false;
  return /[^\d\s.,\-−+]/.test(t);
}

/** 1234.5 → «1.234,50 €» */
function formatoEuros_(n) {
  const s = Math.abs(n).toFixed(2).split('.');
  return (n < 0 ? '-' : '') + s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + s[1] + ' €';
}

/** «conjunta», «Compartida»... → «Conjunta». Cualquier otra cosa, o vacío → «Personal». */
function normalizarCuenta_(valor) {
  return /^(conjunta|compartida|joint|pareja|comun)/.test(normalizar_(valor)) ? CONJUNTA : PERSONAL;
}

/** «devolución», «Devolucion»... → «Devolución». Cualquier otra cosa → «Ingreso». */
function normalizarTipo_(valor) {
  return /^devol/.test(normalizar_(valor)) ? DEVOLUCION : INGRESO;
}

/** «año», «anual», «Año»... → «Año». Cualquier otra cosa, o vacío → «Mes». */
function normalizarCada_(valor) {
  return /^(ano|anual|year)/.test(normalizar_(valor)) ? CADA_ANIO : CADA_MES;
}

/** 11, «11» o «noviembre» → 11. Si no es un mes, 0. */
function mesDelAnio_(valor) {
  const n = Math.floor(Number(valor));
  if (n >= 1 && n <= 12) return n;
  const t = normalizar_(valor);
  if (t.length < 3) return 0;
  for (let i = 0; i < MESES.length; i++) {
    if (MESES[i].indexOf(t) === 0 || t.indexOf(MESES[i].slice(0, 3)) === 0) return i + 1;
  }
  return 0;
}

/** «el día 9 de cada mes» o «cada 9 de noviembre». */
function textoRepite_(cada, dia, mesAnio) {
  return cada === CADA_ANIO && mesAnio ? 'cada ' + dia + ' de ' + MESES[mesAnio - 1] : 'el día ' + dia + ' de cada mes';
}

function esError_(texto) {
  return /^Error/.test(String(texto || ''));
}

/** Filas [texto, categoría, tipo] → reglas listas para usar. */
function prepararReglas_(filas) {
  const reglas = [];
  (filas || []).forEach(function (f) {
    const clave = normalizar_(f[0]);
    const categoria = limpiarTexto_(f[1]);
    if (!clave || !categoria) return;
    reglas.push({ clave: clave, categoria: categoria, aprendida: normalizar_(f[2]) === normalizar_(APRENDIDA) });
  });
  return reglas;
}

function reglasIniciales_() {
  const filas = [];
  Object.keys(REGLAS_INICIALES).forEach(function (categoria) {
    REGLAS_INICIALES[categoria].split(',').forEach(function (palabra) {
      if (palabra.trim()) filas.push([palabra.trim(), categoria, PALABRA_CLAVE]);
    });
  });
  return filas;
}

/** Primero las aprendidas (comercio exacto); luego la palabra clave más larga que aparezca. */
function categorizar_(comercio, reglas) {
  const m = normalizar_(comercio);
  if (!m) return SIN_CATEGORIA;
  let aprendida = '';
  reglas.forEach(function (r) {
    if (r.aprendida && r.clave === m) aprendida = r.categoria;
  });
  if (aprendida) return aprendida;
  const conEspacios = ' ' + m + ' ';
  let mejor = '';
  let largo = 0;
  reglas.forEach(function (r) {
    if (r.aprendida || r.clave.length <= largo) return;
    const coincide = r.clave.length <= 4
      ? conEspacios.indexOf(' ' + r.clave + ' ') >= 0
      : m.indexOf(r.clave) >= 0;
    if (coincide) {
      mejor = r.categoria;
      largo = r.clave.length;
    }
  });
  return mejor || SIN_CATEGORIA;
}

/** Devuelve la categoría de la lista que coincide con el texto, o '' si no hay. */
function buscarCategoria_(texto, lista) {
  const n = normalizar_(texto);
  if (!n) return '';
  for (let i = 0; i < lista.length; i++) {
    if (normalizar_(lista[i]) === n) return lista[i];
  }
  return '';
}

/**
 * Lee un aviso del banco. Devuelve null si no lo entiende.
 *  - Bizum: «Bizum: Ana G.L. le ha enviado 1.00 EUR por Bizum de ANA»
 *    → {tipo: 'recibido' o 'enviado', importe, persona, concepto}
 *  - Pago con tarjeta (Revolut): título «Estanco» o «Conjunta · Mercadona»,
 *    texto «Has gastado 6,75 €», «Gasto de 8,70 €» o «Ana ha gastado 8,70 €», y «Saldo de EUR: 104,76 €»
 *    → {tipo: 'gasto', importe, comercio, cuenta, quien, saldo}
 */
function leerAviso_(titulo, texto) {
  const tit = limpiarTexto_(titulo);
  const cuerpo = limpiarTexto_(texto);
  if (/bizum/i.test(tit + ' ' + cuerpo)) return leerBizum_(cuerpo);
  return leerPagoTarjeta_(tit, cuerpo);
}

function leerPagoTarjeta_(titulo, cuerpo) {
  const euros = '(\\d[\\d.,]*)\\s*(?:EUR|€)';
  let quien = '';
  let cantidad = cuerpo.match(new RegExp('has\\s+gastado\\s+' + euros, 'i'));
  if (!cantidad) {
    const otro = cuerpo.match(new RegExp('^(.+?)\\s+ha\\s+gastado\\s+' + euros, 'i'));
    if (otro) {
      quien = limpiarPersona_(otro[1].replace(/^[^\p{L}\p{N}]+/u, ''));
      cantidad = [otro[0], otro[2]];
    }
  }
  if (!cantidad) cantidad = cuerpo.match(new RegExp('gasto\\s+de\\s+' + euros, 'i'));
  if (!cantidad) return null;
  const importe = leerImporte_(cantidad[1]);
  if (!isFinite(importe) || importe <= 0) return null;
  const partes = titulo.split(/\s+[·•]\s+/);
  const cuentaTexto = partes.length > 1 ? partes[0] : '';
  let comercio = partes.length > 1 ? partes.slice(1).join(' · ') : titulo;
  const enTexto = cuerpo.match(/gast\S*\s+(?:de\s+)?[\d.,]+\s*(?:EUR|€)\s+en\s+(.+?)(?=\s+saldo\b|\.\s|$)/i);
  if (enTexto && (!comercio || esTraspaso_(comercio, BANCOS_CONOCIDOS))) comercio = limpiarTexto_(enTexto[1]);
  const saldo = cuerpo.match(/saldo\b\D*(\d[\d.,]*)/i);
  return {
    tipo: 'gasto',
    importe: importe,
    comercio: comercio || '(sin comercio)',
    cuenta: /conjunt|compartid|joint/i.test(cuentaTexto) ? CONJUNTA : PERSONAL,
    quien: quien,
    saldo: saldo ? leerImporte_(saldo[1]) : NaN
  };
}

/**
 * true si el comercio es uno de tus bancos («Revolut», «REVOLUT*1234»): pasar dinero entre tus cuentas no es un gasto.
 * Sin lista, usa los bancos de Config B8.
 */
function esTraspaso_(comercio, bancos) {
  const n = normalizar_(comercio);
  return (bancos || misCuentas_()).some(function (c) { return n === c || n.indexOf(c + ' ') === 0; });
}

/** «Revolut, Imagin; ABANCA» → ['revolut', 'imagin', 'abanca']. Vacío → los de siempre. */
function leerBancos_(texto) {
  const lista = String(texto == null ? '' : texto).split(/[,;\n]/).map(normalizar_).filter(function (b) { return b; });
  return lista.length ? lista : MIS_CUENTAS;
}

/** Si el cuerpo es una llamada de la app ({"accion": "...", "args": [...]}), la devuelve. Si no, null. */
function leerPeticionApp_(e) {
  const contenido = e && e.postData && e.postData.contents;
  if (!contenido) return null;
  try {
    const j = JSON.parse(contenido);
    if (!j || typeof j !== 'object' || typeof j.accion !== 'string') return null;
    return { accion: j.accion, args: Array.isArray(j.args) ? j.args : [] };
  } catch (err) {
    return null;
  }
}

function escaparHtml_(texto) {
  return String(texto).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Enlace de la app: la página con el código de esta hoja (u) y su clave (t) detrás de #, que no viaja a la página. */
function enlaceApp_(direccion, clave) {
  const atajos = enlaceIphone_(direccion, clave);
  const m = atajos.match(/\/s\/([\w-]+)\/exec\?t=(\w+)$/);
  return m ? APP_WEB + '#u=' + m[1] + '&t=' + m[2] : atajos;
}

function leerBizum_(cuerpo) {
  const cantidad = cuerpo.match(/(\d[\d.,]*)\s*(?:EUR|€)/i) || cuerpo.match(/(?:EUR|€)\s*(\d[\d.,]*)/i);
  if (!cantidad) return null;
  const importe = leerImporte_(cantidad[1]);
  if (!isFinite(importe) || importe <= 0) return null;
  const fin = '(?=\\s+de\\s+\\d|\\s+\\d|\\s+por\\s+bizum\\b|[.,]|$)';
  let p = cuerpo.match(/^(.+?)\s+(?:te|le)\s+ha\s+enviado\b/i);
  if (p) return { tipo: 'recibido', importe: importe, persona: limpiarPersona_(p[1]), concepto: conceptoBizum_(cuerpo) };
  p = cuerpo.match(new RegExp('(?:has|ha)\\s+recibido\\b.*?\\bde\\s+([^\\d\\s.,][^.,]*?)' + fin, 'i'));
  if (p) return { tipo: 'recibido', importe: importe, persona: limpiarPersona_(p[1]), concepto: conceptoBizum_(cuerpo) };
  p = cuerpo.match(new RegExp('(?:has|ha)\\s+enviado\\b.*?\\ba\\s+([^\\d\\s.,][^.,]*?)' + fin, 'i'));
  if (p) return { tipo: 'enviado', importe: importe, persona: limpiarPersona_(p[1]), concepto: conceptoBizum_(cuerpo) };
  return null;
}

function limpiarPersona_(texto) {
  const t = limpiarTexto_(texto).replace(/^(?:bizum\b\s*:?\s*)+/i, '').replace(/[\s:;,-]+$/, '').trim();
  return t.slice(0, 60) || 'Bizum';
}

function conceptoBizum_(texto) {
  let m = texto.match(/concepto\s*:?\s*(.+?)\s*\.?$/i);
  if (m) return limpiarTexto_(m[1]).replace(/^["«']+|["»']+$/g, '');
  m = texto.match(/por\s+bizum\s+(?:de\s+|con\s+)?(.+?)\s*\.?$/i);
  return m ? limpiarTexto_(m[1]) : '';
}

/** Dirección de la aplicación web + clave. Si la dirección no parece buena, explica qué falta. */
function enlaceIphone_(direccion, clave) {
  const d = limpiarTexto_(direccion).split('?')[0];
  if (!d) return '(primero pega en B3 la dirección de la aplicación web)';
  if (!/^https:\/\/script\.google\.com\/\S*\/exec$/.test(d)) {
    return '(esa dirección no vale: tiene que empezar por https://script.google.com/ y acabar en /exec)';
  }
  return d + '?t=' + limpiarTexto_(clave);
}

function claveMes_(anio, mes) {
  return anio + '-' + String(mes).padStart(2, '0');
}

/** '2026-01' y -1 → '2025-12' */
function moverMes_(mes, delta) {
  const p = String(mes).split('-').map(Number);
  const total = p[0] * 12 + (p[1] - 1) + delta;
  return claveMes_(Math.floor(total / 12), ((total % 12) + 12) % 12 + 1);
}

/** Día real del fijo en ese mes: si pide el 31 y el mes tiene 30, el 30. */
function diaQueToca_(dia, anio, mes) {
  const ultimo = new Date(anio, mes, 0).getDate();
  let d = Math.floor(Number(dia));
  if (!(d >= 1)) d = 1;
  return Math.min(d, ultimo);
}

/**
 * true si el fijo ya toca y aún no se ha apuntado.
 * Cada mes: si no está apuntado este mes. Cada año: solo en su mes y si no está apuntado este año.
 */
function fijoToca_(dia, hoy, ultimo, cada, mesAnio) {
  const actual = claveMes_(hoy.anio, hoy.mes);
  const u = /^\d{4}-\d{2}$/.test(String(ultimo || '')) ? String(ultimo) : '';
  if (cada === CADA_ANIO) {
    const mes = mesAnio || (u ? Number(u.slice(5)) : hoy.mes);
    if (hoy.mes !== mes) return false;
    if (u && Number(u.slice(0, 4)) >= hoy.anio) return false;
  } else if (u && u >= actual) {
    return false;
  }
  return hoy.dia >= diaQueToca_(dia, hoy.anio, hoy.mes);
}

/** Junta lo que llega por JSON o por formulario y acepta nombres en español o inglés. */
function leerDatos_(e) {
  let cuerpo = {};
  const contenido = e && e.postData && e.postData.contents;
  if (contenido) {
    try {
      const j = JSON.parse(contenido);
      if (j && typeof j === 'object' && !Array.isArray(j)) cuerpo = j;
    } catch (err) {
      // No era JSON: se usan los campos de formulario.
    }
  }
  const todo = Object.assign({}, (e && e.parameter) || {}, cuerpo);
  const datos = {};
  Object.keys(todo).forEach(function (k) {
    datos[normalizar_(k)] = todo[k];
  });
  const primero = function (nombres) {
    for (let i = 0; i < nombres.length; i++) {
      const v = datos[nombres[i]];
      if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }
    return '';
  };
  return {
    importe: primero(['importe', 'amount', 'cantidad', 'precio']),
    comercio: primero(['comercio', 'merchant', 'tienda', 'nombre', 'name']),
    tarjeta: primero(['tarjeta', 'card', 'tarjeta o pase', 'card or pass']),
    origen: primero(['origen']),
    nota: primero(['nota', 'notas', 'note']),
    categoria: primero(['categoria', 'category']),
    cuenta: primero(['cuenta', 'account']),
    aviso: primero(['aviso', 'notificacion', 'mensaje', 'texto', 'cuerpo', 'message', 'body']),
    titulo: primero(['titulo', 'title']),
    app: primero(['app', 'banco'])
  };
}

/**
 * Prepara lo que enseña la app para un mes.
 * gastos: [{id, fecha (ms), mes 'yyyy-MM', dia, importe, comercio, categoria, tarjeta, origen, nota, cuenta}]
 * ingresos: [{id, fecha, mes, dia, importe, de, concepto, tipo, categoria, origen, cuenta}]
 * presupuestos: [{nombre, presupuesto}] · hoy: {mes, dia}
 * Las devoluciones restan de su categoría y del total gastado.
 */
function resumirMes_(gastos, ingresos, presupuestos, mes, hoy) {
  const suma = function (lista) {
    return redondear_(lista.reduce(function (a, g) { return a + g.importe; }, 0));
  };
  const esDevolucion = function (i) { return i.tipo === DEVOLUCION; };
  const neto = function (m, hastaDia) {
    const dentro = function (x) { return x.mes === m && (!hastaDia || x.dia <= hastaDia); };
    return redondear_(suma(gastos.filter(dentro)) - suma(ingresos.filter(esDevolucion).filter(dentro)));
  };
  const delMes = gastos.filter(function (g) { return g.mes === mes; })
    .sort(function (a, b) { return b.fecha - a.fecha; });
  const entranMes = ingresos.filter(function (i) { return i.mes === mes; })
    .sort(function (a, b) { return b.fecha - a.fecha; });
  const devolucionesMes = entranMes.filter(esDevolucion);

  const porCat = {};
  delMes.forEach(function (g) { porCat[g.categoria] = (porCat[g.categoria] || 0) + g.importe; });
  devolucionesMes.forEach(function (i) { porCat[i.categoria] = (porCat[i.categoria] || 0) - i.importe; });
  const nombres = presupuestos.map(function (c) { return c.nombre; });
  const categorias = presupuestos.map(function (c) {
    return { nombre: c.nombre, gastado: redondear_(porCat[c.nombre] || 0), presupuesto: c.presupuesto || 0 };
  });
  Object.keys(porCat).forEach(function (nombre) {
    if (nombre && nombres.indexOf(nombre) < 0) categorias.push({ nombre: nombre, gastado: redondear_(porCat[nombre]), presupuesto: 0 });
  });
  categorias.sort(function (a, b) { return b.gastado - a.gastado || b.presupuesto - a.presupuesto; });

  // Mes anterior: si miras el mes en curso, solo hasta el mismo día, para comparar igual con igual.
  const mesAnterior = moverMes_(mes, -1);

  const com = {};
  delMes.forEach(function (g) {
    const k = normalizar_(g.comercio) || g.comercio;
    if (!com[k]) com[k] = { nombre: g.comercio, gastado: 0, veces: 0 };
    com[k].gastado += g.importe;
    com[k].veces++;
  });
  const comercios = Object.keys(com).map(function (k) {
    return { nombre: com[k].nombre, gastado: redondear_(com[k].gastado), veces: com[k].veces };
  }).sort(function (a, b) { return b.gastado - a.gastado; }).slice(0, 5);

  const tar = {};
  delMes.forEach(function (g) {
    const t = g.tarjeta || (g.origen === 'Fijo' ? 'Recibos fijos' : g.origen === 'Bizum' ? 'Bizum' : 'Apuntados a mano');
    tar[t] = (tar[t] || 0) + g.importe;
  });
  const tarjetas = Object.keys(tar).map(function (t) { return { nombre: t, gastado: redondear_(tar[t]) }; })
    .sort(function (a, b) { return b.gastado - a.gastado; });

  const meses = [];
  for (let i = 5; i >= 0; i--) {
    const m = moverMes_(mes, -i);
    meses.push({ mes: m, total: neto(m, 0) });
  }

  return {
    ok: true,
    mes: mes,
    total: neto(mes, 0),
    presupuesto: redondear_(presupuestos.reduce(function (a, c) { return a + (c.presupuesto || 0); }, 0)),
    anterior: { nombre: MESES[Number(mesAnterior.slice(5)) - 1], total: neto(mesAnterior, mes === hoy.mes ? hoy.dia : 0) },
    categorias: categorias,
    gastos: delMes.map(function (g) {
      return { id: g.id, fecha: g.fecha, importe: g.importe, comercio: g.comercio, categoria: g.categoria,
        tarjeta: g.tarjeta, origen: g.origen, nota: g.nota, cuenta: g.cuenta };
    }),
    ingresos: {
      total: suma(entranMes.filter(function (i) { return !esDevolucion(i); })),
      devoluciones: suma(devolucionesMes),
      lista: entranMes.map(function (i) {
        return { id: i.id, fecha: i.fecha, importe: i.importe, de: i.de, concepto: i.concepto, tipo: i.tipo,
          categoria: i.categoria, origen: i.origen, cuenta: i.cuenta };
      })
    },
    comercios: comercios,
    tarjetas: tarjetas,
    meses: meses
  };
}

function ejecutarPruebas_() {
  const fallos = [];
  let total = 0;
  const igual = function (nombre, obtenido, esperado) {
    total++;
    const ok = (typeof esperado === 'number' && isNaN(esperado))
      ? (typeof obtenido === 'number' && isNaN(obtenido))
      : obtenido === esperado;
    if (!ok) fallos.push(nombre + ' → «' + obtenido + '» (esperaba «' + esperado + '»)');
  };

  [['12,50 €', 12.5], ['1.234,56 €', 1234.56], ['€12.50', 12.5], ['12.5', 12.5],
    ['1,234.56', 1234.56], ['12 €', 12], ['EUR 7,05', 7.05], ['12,50 €', 12.5],
    ['12,50 €', 12.5], ['-3,20 €', -3.2], ['1.234 €', 1234], ['1 234,56 €', 1234.56],
    ['0,99', 0.99], ['$12.50', 12.5], [9.99, 9.99], ['1.00 EUR', 1], ['abc', NaN], ['', NaN], [null, NaN]
  ].forEach(function (c) { igual('importe ' + c[0], leerImporte_(c[0]), c[1]); });

  [['12,50 €', false], ['$12.50', true], ['12.50', false], ['USD 5', true], ['EUR 5', false],
    [9.99, false], ['£3', true]
  ].forEach(function (c) { igual('moneda ' + c[0], monedaExtranjera_(c[0]), c[1]); });

  [[12.5, '12,50 €'], [1234.56, '1.234,56 €'], [0.5, '0,50 €'], [1234567.8, '1.234.567,80 €'], [-3.2, '-3,20 €']
  ].forEach(function (c) { igual('euros ' + c[0], formatoEuros_(c[0]), c[1]); });

  const reglas = prepararReglas_(reglasIniciales_());
  [['MERCADONA VALENCIA', 'Supermercado'], ['Supermercados DIA', 'Supermercado'],
    ['Media Markt Valencia', 'Compras'], ['UBER *EATS', 'Comer fuera'], ['UBER *TRIP', 'Transporte'],
    ['ZARA ESPAÑA', 'Ropa'], ['Gasolinera Zaragoza', 'Gasolina'], ['Farmacia López', 'Salud'],
    ['Amazon Prime*1A2B3', 'Suscripciones'], ['AMZN Mktp ES', 'Compras'], ['APPLE.COM/BILL', 'Suscripciones'],
    ['Bar Manolo', 'Comer fuera'], ['Iberdrola Clientes', 'Recibos'], ['Carrefour Estación de Servicio', 'Gasolina'],
    ['H&M Hennes', 'Ropa'], ['Zara Home', 'Hogar'], ['Comercio raro 123', SIN_CATEGORIA], ['', SIN_CATEGORIA]
  ].forEach(function (c) { igual('categoría ' + c[0], categorizar_(c[0], reglas), c[1]); });

  const conAprendida = prepararReglas_(reglasIniciales_().concat([['Bar Manolo', 'Ocio', APRENDIDA]]));
  igual('aprendida exacta', categorizar_('BAR MANOLO', conAprendida), 'Ocio');
  igual('aprendida solo exacta', categorizar_('Bar Manolo 2', conAprendida), 'Comer fuera');
  igual('cervecería es tomar algo', categorizar_('CERVECERIA LA SUREÑA', prepararReglas_(reglasIniciales_())), 'Tomar algo');
  igual('pub es tomar algo', categorizar_('The Irish Rover Pub', prepararReglas_(reglasIniciales_())), 'Tomar algo');

  igual('buscar categoría', buscarCategoria_('comer FUERA', CATEGORIAS_INICIALES), 'Comer fuera');
  igual('buscar categoría inexistente', buscarCategoria_('Mascotas', CATEGORIAS_INICIALES), '');
  igual('categoría nueva', nombreCategoriaNueva_('  mascotas   y   veterinario '), 'Mascotas y veterinario');
  igual('categoría nueva larga', nombreCategoriaNueva_('Una categoría con un nombre larguísimo de verdad'), 'Una categoría con un nombre la');
  igual('categoría nueva vacía', nombreCategoriaNueva_('   '), '');
  igual('categoría nueva solo signos', nombreCategoriaNueva_('🐶 !!'), '');
  igual('categoría nueva no puede ser Sin categoría', nombreCategoriaNueva_('sin categoria'), '');
  igual('emoji de categoría', emojiCategoria_(' 🐶 '), '🐶');
  igual('emoji compuesto', emojiCategoria_('🏋️‍♀️'), '🏋️‍♀️');
  igual('emoji con letras no vale', emojiCategoria_('perro'), '');
  igual('emoji con código no vale', emojiCategoria_('<b>'), '');
  igual('emoji vacío', emojiCategoria_(null), '');
  [['800', 800], ['1.200,50 €', 1200.5], [300, 300], [0, 0], ['', 0], [null, 0], ['-50', 0], ['mucho', 0], [150.5, 150.5]
  ].forEach(function (c) { igual('objetivo ' + c[0], numeroObjetivo_(c[0]), c[1]); });
  igual('objetivos de Config', JSON.stringify(objetivosDeFilas_([['Objetivo al mes: Mío', 800], ['Objetivo al mes: Conjunta', ''], ['Objetivo al mes: Todo', '1.500 €']])),
    '{"mio":800,"conjunta":0,"todo":1500}');
  igual('objetivos con la Config vieja', JSON.stringify(objetivosDeFilas_([['', ''], ['Cómo se usa', ''], ['1. Implementa el código…', '']])),
    '{"mio":0,"conjunta":0,"todo":0}');
  igual('objetivos sin Config', JSON.stringify(objetivosDeFilas_([])), '{"mio":0,"conjunta":0,"todo":0}');
  igual('emojis de las categorías', JSON.stringify(emojisDeCategorias_([{ nombre: 'Viajes', emoji: '✈️' }, { nombre: 'Otros', emoji: '' }])),
    '{"Viajes":"✈️"}');
  igual('Viajes está entre las nuevas', CATEGORIAS_NUEVAS.indexOf('Viajes') >= 0 && CATEGORIAS_INICIALES.indexOf('Viajes') >= 0, true);
  igual('vuelo es Viajes', categorizar_('RYANAIR 123456', prepararReglas_(reglasIniciales_())), 'Viajes');
  igual('cuenta conjunta', normalizarCuenta_('conjunta'), CONJUNTA);
  igual('cuenta vacía', normalizarCuenta_(''), PERSONAL);
  igual('tipo devolución', normalizarTipo_('devolucion'), DEVOLUCION);
  igual('tipo vacío', normalizarTipo_(''), INGRESO);

  const a1 = leerAviso_('Bizum', 'Bizum: Ana G.L. le ha enviado 1.00 EUR por Bizum de ANA');
  igual('aviso ABANCA', a1 && [a1.tipo, a1.importe, a1.persona, a1.concepto].join('|'), 'recibido|1|Ana G.L.|ANA');
  const a2 = leerAviso_('', 'Has recibido un Bizum de 25,50 € de JUAN PÉREZ');
  igual('aviso recibido de otro banco', a2 && [a2.tipo, a2.importe, a2.persona].join('|'), 'recibido|25.5|JUAN PÉREZ');
  const a3 = leerAviso_('Bizum', 'Has enviado 10,00 € a Ana por Bizum');
  igual('aviso enviado', a3 && [a3.tipo, a3.importe, a3.persona].join('|'), 'enviado|10|Ana');
  const a4 = leerAviso_('Bizum', 'Bizum: Juan le ha enviado 1.234,56 EUR. Concepto: alquiler');
  igual('aviso con concepto', a4 && [a4.importe, a4.persona, a4.concepto].join('|'), '1234.56|Juan|alquiler');
  igual('aviso sin Bizum', leerAviso_('ABANCA', 'Tu nómina ya está disponible'), null);
  igual('aviso sin importe', leerAviso_('Bizum', 'Ana le ha enviado un Bizum'), null);

  const rv = function (a) { return a && [a.tipo, a.importe, a.comercio, a.cuenta, a.quien, a.saldo].join('|'); };
  igual('Revolut personal', rv(leerAviso_('Estanco', '🛒 Has gastado 6,75 € Saldo de EUR: 104,76 €')),
    'gasto|6.75|Estanco|Personal||104.76');
  igual('Revolut conjunta con nombre', rv(leerAviso_('Cuenta Conjunta · Mercadona', 'El Pepe ha gastado 8,70 € Saldo de EUR: 1.234,56 €')),
    'gasto|8.7|Mercadona|Conjunta|El Pepe|1234.56');
  igual('Revolut conjunta sin nombre', rv(leerAviso_('Conjunta · Mercadona', 'Gasto de 8,70 € Saldo de EUR: 1.234,56 €')),
    'gasto|8.7|Mercadona|Conjunta||1234.56');
  igual('Revolut con el comercio en el texto', rv(leerAviso_('Revolut', 'Has gastado 3,10 € en Café Central. Saldo de EUR: 50,00 €')),
    'gasto|3.1|Café Central|Personal||50');
  igual('dinero que entra en Revolut no es gasto', leerAviso_('Revolut', 'Has recibido 100,00 € de Alejandro'), null);
  igual('pago rechazado no es gasto', leerAviso_('Estanco', 'Pago rechazado: 6,75 €'), null);
  igual('traspaso a Revolut', esTraspaso_('Revolut', MIS_CUENTAS), true);
  igual('traspaso con número', esTraspaso_('REVOLUT**1234', MIS_CUENTAS), true);
  igual('traspaso a Imagin', esTraspaso_('Imagin', MIS_CUENTAS), true);
  igual('comercio parecido no es traspaso', esTraspaso_('Revolution Burger', MIS_CUENTAS), false);
  igual('comercio normal no es traspaso', esTraspaso_('Mercadona', MIS_CUENTAS), false);
  igual('bancos de Config', leerBancos_('BBVA; ING,  Banco Sabadell ').join('|'), 'bbva|ing|banco sabadell');
  igual('bancos vacíos', leerBancos_('').join('|'), MIS_CUENTAS.join('|'));
  igual('traspaso con otros bancos', esTraspaso_('ING DIRECT', leerBancos_('BBVA, ING')), true);
  igual('aviso con el título del banco', rv(leerAviso_('BBVA', 'Has gastado 4,00 € en Panadería Sol. Saldo: 10,00 €')),
    'gasto|4|Panadería Sol|Personal||10');

  const pApp = leerPeticionApp_({ postData: { contents: '{"accion":"datos","args":["2026-11"]}' } });
  igual('petición de la app', pApp && pApp.accion + '|' + pApp.args.join(','), 'datos|2026-11');
  igual('petición sin args', leerPeticionApp_({ postData: { contents: '{"accion":"datos"}' } }).args.length, 0);
  igual('un pago no es petición de la app', leerPeticionApp_({ postData: { contents: '{"importe":"3","comercio":"Bar"}' } }), null);
  igual('formulario no es petición de la app', leerPeticionApp_({ postData: { contents: 'importe=3' } }), null);
  igual('sin cuerpo no es petición de la app', leerPeticionApp_({ parameter: {} }), null);
  igual('escapar html', escaparHtml_('a&b<"c">'), 'a&amp;b&lt;&quot;c&quot;&gt;');
  igual('enlace de la app', enlaceApp_('https://script.google.com/macros/s/AKfy-123_x/exec', 'abc'), APP_WEB + '#u=AKfy-123_x&t=abc');
  igual('enlace de la app sin dirección', /^\(primero/.test(enlaceApp_('', 'abc')), true);

  igual('enlace sin dirección', /^\(primero/.test(enlaceIphone_('', 'abc')), true);
  igual('enlace bueno', enlaceIphone_(' https://script.google.com/macros/s/XYZ/exec ', 'abc'), 'https://script.google.com/macros/s/XYZ/exec?t=abc');
  igual('enlace con clave vieja', enlaceIphone_('https://script.google.com/macros/s/XYZ/exec?t=vieja', 'abc'), 'https://script.google.com/macros/s/XYZ/exec?t=abc');
  igual('enlace de prueba /dev no vale', /^\(esa/.test(enlaceIphone_('https://script.google.com/macros/s/XYZ/dev', 'abc')), true);
  igual('mes anterior en enero', moverMes_('2026-01', -1), '2025-12');
  igual('mes siguiente en diciembre', moverMes_('2025-12', 1), '2026-01');
  igual('seis meses atrás', moverMes_('2026-03', -6), '2025-09');

  igual('día 31 en febrero', diaQueToca_(31, 2026, 2), 28);
  igual('día 31 en febrero bisiesto', diaQueToca_(31, 2028, 2), 29);
  igual('día 31 en abril', diaQueToca_(31, 2026, 4), 30);
  igual('día vacío', diaQueToca_('', 2026, 10), 1);
  const hoy = { anio: 2026, mes: 10, dia: 25 };
  igual('fijo pendiente', fijoToca_(5, hoy, '2026-09'), true);
  igual('fijo ya apuntado', fijoToca_(5, hoy, '2026-10'), false);
  igual('fijo nuevo', fijoToca_(5, hoy, ''), true);
  igual('fijo aún no toca', fijoToca_(30, hoy, '2026-09'), false);
  igual('fijo saltado a mano', fijoToca_(5, hoy, '2026-11'), false);
  igual('fijo 31 en febrero', fijoToca_(31, { anio: 2026, mes: 2, dia: 28 }, '2026-01'), true);
  igual('anual en su mes', fijoToca_(5, hoy, '2025-10', CADA_ANIO, 10), true);
  igual('anual ya apuntado este año', fijoToca_(5, hoy, '2026-10', CADA_ANIO, 10), false);
  igual('anual en otro mes', fijoToca_(5, hoy, '2025-11', CADA_ANIO, 11), false);
  igual('anual sin mes usa el último', fijoToca_(5, hoy, '2025-10', CADA_ANIO, 0), true);
  igual('anual nuevo sin datos', fijoToca_(5, hoy, '', CADA_ANIO, 0), true);
  igual('anual aún no toca', fijoToca_(30, hoy, '2025-10', CADA_ANIO, 10), false);
  // Suscripción nueva con el día de cobro en el futuro: no se apunta hasta ese día.
  igual('cobro futuro este mes', ultimoAntesDeCobro_('2026-11-25', CADA_MES), '2026-10');
  igual('cobro futuro aún no', fijoToca_(25, { anio: 2026, mes: 11, dia: 12 }, '2026-10'), false);
  igual('cobro futuro llega', fijoToca_(25, { anio: 2026, mes: 11, dia: 25 }, '2026-10'), true);
  igual('cobro el mes que viene', ultimoAntesDeCobro_('2026-12-05', CADA_MES), '2026-11');
  igual('cobro el mes que viene, este no', fijoToca_(5, { anio: 2026, mes: 11, dia: 20 }, '2026-11'), false);
  igual('cobro el mes que viene, llega', fijoToca_(5, { anio: 2026, mes: 12, dia: 5 }, '2026-11'), true);
  igual('cobro anual futuro', ultimoAntesDeCobro_('2027-03-15', CADA_ANIO), '2026-03');
  igual('cobro anual futuro llega', fijoToca_(15, { anio: 2027, mes: 3, dia: 15 }, '2026-03', CADA_ANIO, 3), true);
  igual('cobro en enero', ultimoAntesDeCobro_('2027-01-10', CADA_MES), '2026-12');
  // Apuntar a mano con otro día (3.3): ese día, a la hora de ahora; hoy, el futuro o un día que no existe, ahora.
  const ahora = Utilities.parseDate('2026-11-27 18:30', ZONA, 'yyyy-MM-dd HH:mm');
  const apunte = function (t, a) { const f = diaDeApunte_(t, ZONA, a || ahora); return f ? Utilities.formatDate(f, ZONA, 'yyyy-MM-dd HH:mm') : null; };
  igual('apunte de anteayer', apunte('2026-11-25'), '2026-11-25 18:30');
  igual('apunte de otro año', apunte('2025-12-31'), '2025-12-31 18:30');
  igual('apunte de hoy es ahora', apunte('2026-11-27'), null);
  igual('apunte de mañana es ahora', apunte('2026-11-28'), null);
  igual('apunte de un día que no existe', apunte('2026-11-31'), null);
  igual('apunte del 29 de febrero sin bisiesto', apunte('2026-02-29'), null);
  igual('apunte sin día', apunte(''), null);
  igual('apunte sin nada', apunte(undefined), null);
  igual('apunte con otro formato', apunte('25/11/2026'), null);
  igual('apunte de hace siglos', apunte('1999-12-31'), null);
  igual('apunte de ayer pasada la medianoche', apunte('2026-11-27', Utilities.parseDate('2026-11-28 00:10', ZONA, 'yyyy-MM-dd HH:mm')),
    '2026-11-27 00:10');
  igual('texto del día', textoDelDia_(diaDeApunte_('2026-11-25', ZONA, ahora), ZONA, ahora), 'el 25 de noviembre');
  igual('texto del día de otro año', textoDelDia_(diaDeApunte_('2025-12-31', ZONA, ahora), ZONA, ahora), 'el 31 de diciembre de 2025');
  igual('día leído', JSON.stringify(leerDia_(' 2026-11-05 ')), '{"texto":"2026-11-05","anio":2026,"mes":11,"dia":5}');
  igual('cada vacío es mes', normalizarCada_(''), CADA_MES);
  igual('cada anual', normalizarCada_('Anual'), CADA_ANIO);
  igual('cada año', normalizarCada_('año'), CADA_ANIO);
  igual('mes del año número', mesDelAnio_(11), 11);
  igual('mes del año texto', mesDelAnio_('Noviembre'), 11);
  igual('mes del año corto', mesDelAnio_('nov'), 11);
  igual('mes del año vacío', mesDelAnio_(''), 0);
  igual('mes del año malo', mesDelAnio_(13), 0);
  igual('texto cada mes', textoRepite_(CADA_MES, 9, 11), 'el día 9 de cada mes');
  igual('texto cada año', textoRepite_(CADA_ANIO, 9, 11), 'cada 9 de noviembre');
  const fila = function (f) { return leerFijo_(f, ZONA); };
  igual('fijo vacío', fila(['', '', '', '', false, '', '', '', '']), null);
  igual('fijo sin importe', fila(['Netflix', '', 9, '', false, '', '', '', '']), null);
  const nf = fila(['Netflix', 12.99, 9, 'Suscripciones', false, '2026-10', 'Conjunta', 'Año', 'noviembre']);
  igual('fijo leído', [nf.concepto, nf.importe, nf.dia, nf.categoria, nf.pausado, nf.ultimo, nf.cuenta, nf.cada, nf.mesAnio].join('|'),
    'Netflix|12.99|9|Suscripciones|false|2026-10|Conjunta|Año|11');
  const viejo = fila(['Gimnasio', '30', 1, '', true, '', '', '', '']);
  igual('fijo de antes sigue igual', [viejo.cuenta, viejo.cada, viejo.pausado].join('|'), 'Personal|Mes|true');

  const json = leerDatos_({ parameter: { t: 'x' }, postData: { contents: '{"Importe":"12,50 €","Comercio":"Mercadona","Tarjeta":"Visa"}' } });
  igual('json importe', json.importe, '12,50 €');
  igual('json comercio', json.comercio, 'Mercadona');
  igual('json tarjeta', json.tarjeta, 'Visa');
  const form = leerDatos_({ parameter: { t: 'x', importe: '3', comercio: 'Bar' }, postData: { contents: 'importe=3&comercio=Bar' } });
  igual('formulario importe', form.importe, '3');
  igual('formulario comercio', form.comercio, 'Bar');
  const aviso = leerDatos_({ parameter: { t: 'x' }, postData: { contents: '{"Aviso":"Juan te ha enviado 5 €","Título":"Bizum","App":"ABANCA"}' } });
  igual('json aviso', [aviso.aviso, aviso.titulo, aviso.app].join('|'), 'Juan te ha enviado 5 €|Bizum|ABANCA');

  const g = function (id, mes, dia, importe, comercio, categoria, tarjeta, origen) {
    return { id: id, fecha: Number(id), mes: mes, dia: dia, importe: importe, comercio: comercio,
      categoria: categoria, tarjeta: tarjeta || '', origen: origen || 'Apple Pay', nota: '', cuenta: PERSONAL };
  };
  const ejemplo = [
    g('9', '2026-10', 20, 10, 'Mercadona', 'Supermercado', 'Visa'),
    g('8', '2026-10', 12, 20.5, 'MERCADONA', 'Supermercado', 'Visa'),
    g('7', '2026-10', 5, 5, 'Kiosko', SIN_CATEGORIA, 'Master'),
    g('6', '2026-10', 1, 40, 'Vodafone', 'Recibos', '', 'Fijo'),
    g('5', '2026-10', 3, 7, 'Tienda vieja', 'Mascotas', '', 'Manual'),
    g('4', '2026-09', 10, 30, 'Lidl', 'Supermercado', 'Visa'),
    g('3', '2026-09', 28, 100, 'Ikea', 'Hogar', 'Visa'),
    g('2', '2026-05', 2, 15, 'Renfe', 'Transporte', 'Visa'),
    g('1', '2026-04', 2, 99, 'Fuera de rango', 'Otros', 'Visa')
  ];
  const pres = [{ nombre: 'Supermercado', presupuesto: 300 }, { nombre: 'Recibos', presupuesto: 0 }, { nombre: 'Hogar', presupuesto: 50 }];
  const r = resumirMes_(ejemplo, [], pres, '2026-10', { mes: '2026-10', dia: 25 });
  igual('resumen total', r.total, 82.5);
  igual('resumen presupuesto', r.presupuesto, 350);
  igual('resumen primera categoría', r.categorias[0].nombre + ' ' + r.categorias[0].gastado, 'Recibos 40');
  igual('resumen incluye Sin categoría', r.categorias.some(function (c) { return c.nombre === SIN_CATEGORIA && c.gastado === 5; }), true);
  igual('resumen incluye categorías renombradas', r.categorias.some(function (c) { return c.nombre === 'Mascotas'; }), true);
  igual('resumen gastos ordenados', r.gastos.map(function (x) { return x.id; }).join(','), '9,8,7,6,5');
  igual('resumen comparación a estas alturas', r.anterior.nombre + ' ' + r.anterior.total, 'septiembre 30');
  igual('resumen comercio principal', r.comercios[0].nombre + ' ' + r.comercios[0].gastado + ' ' + r.comercios[0].veces, 'Vodafone 40 1');
  igual('resumen junta mayúsculas del comercio', r.comercios[1].nombre + ' ' + r.comercios[1].gastado + ' ' + r.comercios[1].veces, 'Mercadona 30.5 2');
  igual('resumen tarjetas', r.tarjetas.map(function (t) { return t.nombre + ' ' + t.gastado; }).join(', '),
    'Recibos fijos 40, Visa 30.5, Apuntados a mano 7, Master 5');
  igual('resumen seis meses', r.meses.map(function (m) { return m.mes + ':' + m.total; }).join(' '),
    '2026-05:15 2026-06:0 2026-07:0 2026-08:0 2026-09:130 2026-10:82.5');
  igual('resumen sin entradas', [r.ingresos.total, r.ingresos.devoluciones, r.ingresos.lista.length].join('|'), '0|0|0');
  const septiembre = resumirMes_(ejemplo, [], pres, '2026-09', { mes: '2026-10', dia: 25 });
  igual('mes pasado compara el mes entero', septiembre.anterior.nombre + ' ' + septiembre.anterior.total, 'agosto 0');
  igual('mes pasado total', septiembre.total, 130);

  const e = function (id, mes, dia, importe, de, tipo, categoria) {
    return { id: id, fecha: Number(id.slice(1)), mes: mes, dia: dia, importe: importe, de: de, concepto: '',
      tipo: tipo, categoria: categoria, origen: 'Bizum', cuenta: PERSONAL };
  };
  const entradas = [
    e('i50', '2026-10', 21, 15, 'Ana', DEVOLUCION, 'Supermercado'),
    e('i40', '2026-10', 15, 100, 'Juan', INGRESO, ''),
    e('i30', '2026-09', 5, 10, 'Ana', DEVOLUCION, 'Hogar')
  ];
  const r2 = resumirMes_(ejemplo, entradas, pres, '2026-10', { mes: '2026-10', dia: 25 });
  igual('devolución resta del total', r2.total, 67.5);
  igual('devolución resta de su categoría', r2.categorias.filter(function (c) { return c.nombre === 'Supermercado'; })[0].gastado, 15.5);
  igual('dinero que entra', [r2.ingresos.total, r2.ingresos.devoluciones, r2.ingresos.lista.length].join('|'), '100|15|2');
  igual('entradas ordenadas', r2.ingresos.lista.map(function (x) { return x.id; }).join(','), 'i50,i40');
  igual('mes anterior con devolución', r2.anterior.total, 20);
  igual('meses con devolución', r2.meses[4].total + ' ' + r2.meses[5].total, '120 67.5');

  return { total: total, fallos: fallos };
}


// ─────────────────── Ayudantes que usan la hoja ───────────────────

function claveValida_(t) {
  const buena = PropertiesService.getScriptProperties().getProperty('CLAVE');
  return !!buena && typeof t === 'string' && t === buena;
}

function claveCorrecta_(e) {
  return claveValida_(e && e.parameter && e.parameter.t);
}

function comprobarClave_(clave) {
  if (!claveValida_(clave)) throw new Error('La clave no es correcta');
}

function respuesta_(texto) {
  return ContentService.createTextOutput(texto).setMimeType(ContentService.MimeType.TEXT);
}

let bancosLeidos_ = null;
/** Tus bancos, de Config B8. Si no se puede leer la hoja, los de siempre. */
function misCuentas_() {
  if (bancosLeidos_) return bancosLeidos_;
  let texto = '';
  try {
    const config = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJAS.config);
    texto = config ? config.getRange('B8').getValue() : '';
  } catch (err) {
    texto = '';
  }
  bancosLeidos_ = leerBancos_(texto);
  return bancosLeidos_;
}

/** Dirección pública de esta aplicación web, si ya está implementada. Si no, ''. */
function urlPublicada_() {
  try {
    const url = ScriptApp.getService().getUrl();
    return url && /^https:\/\/script\.google\.com\/\S*\/exec$/.test(url) ? url : '';
  } catch (err) {
    return '';
  }
}

/** Rellena en Config el enlace de los atajos (B4) y el de la app (B5) a partir de la dirección (B3) y la clave (B2). */
function escribirEnlaces_(config) {
  const direccion = config.getRange('B3').getValue();
  const clave = config.getRange('B2').getValue();
  config.getRange('B4').setValue(enlaceIphone_(direccion, clave));
  config.getRange('B5').setValue(enlaceApp_(direccion, clave));
}

/** Apunta un gasto (de Apple Pay, de un aviso o de la app) y devuelve el mensaje para el iPhone. */
function apuntarGasto_(ss, datos) {
  const importe = leerImporte_(datos.importe);
  if (!isFinite(importe)) return 'Error: no entiendo el importe «' + limpiarTexto_(datos.importe) + '»';
  if (importe === 0) return 'Importe 0: no se apunta';
  const comercio = limpiarTexto_(datos.comercio) || '(sin comercio)';
  const tarjeta = limpiarTexto_(datos.tarjeta);
  const origen = limpiarTexto_(datos.origen) || (tarjeta ? 'Apple Pay' : 'Manual');
  if (origen === 'Apple Pay' && esTraspaso_(comercio)) {
    guardarAviso_(ss, { app: 'Apple Pay', titulo: tarjeta, aviso: comercio + ' · ' + formatoEuros_(importe) },
      'Traspaso entre tus cuentas: no se apunta');
    return 'Traspaso entre tus cuentas: no se apunta';
  }
  const cuenta = normalizarCuenta_(datos.cuenta);
  let nota = limpiarTexto_(datos.nota);
  const extranjera = monedaExtranjera_(datos.importe);
  if (extranjera) {
    nota = ('Importe original: ' + limpiarTexto_(datos.importe) + ' (sin pasar a euros). ' + nota).trim();
  }
  const categoria = buscarCategoria_(datos.categoria, leerCategorias_(ss)) ||
    categorizar_(comercio, leerReglas_(ss));

  const hoja = ss.getSheetByName(HOJAS.gastos);
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return 'Error: la hoja está ocupada, inténtalo otra vez';
  try {
    const repetido = buscarRepetido_(hoja, {
      importe: importe, origen: origen, tarjeta: tarjeta, cuenta: cuenta,
      saldo: Number(datos.saldo), quien: limpiarTexto_(datos.quien)
    });
    if (repetido) return 'Ya estaba apuntado';
    const fecha = datos.fecha instanceof Date ? datos.fecha : new Date();
    escribirGasto_(hoja, [fecha, importe, comercio, categoria, tarjeta, origen, nota], cuenta);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  const mostrado = extranjera ? limpiarTexto_(datos.importe) : formatoEuros_(importe);
  return 'Apuntado: ' + mostrado + ' · ' + categoria;
}

/** Filas de los últimos minutos, empezando por arriba: [{fila, valores}]. */
function recientes_(hoja, ancho, minutos) {
  const n = Math.min(hoja.getLastRow() - 1, 25);
  if (n < 1) return [];
  const limite = Date.now() - minutos * 60 * 1000;
  return hoja.getRange(2, 1, n, ancho).getValues()
    .map(function (v, i) { return { fila: i + 2, valores: v }; })
    .filter(function (r) { return r.valores[0] instanceof Date && r.valores[0].getTime() >= limite; });
}

/**
 * Evita apuntar dos veces el mismo pago. Mira los gastos de los últimos 10 minutos:
 *  1. Revolut avisa dos veces de un pago de la conjunta. Los dos avisos traen el mismo saldo.
 *  2. Si pagas con la tarjeta de Revolut por Apple Pay, llegan el pago y el aviso de Revolut.
 * Si encuentra el gasto, le añade lo que falte (quién pagó, la cuenta) y devuelve true.
 */
function buscarRepetido_(hoja, n) {
  const marcaSaldo = isFinite(n.saldo) && n.saldo > 0 ? 'Saldo: ' + formatoEuros_(n.saldo) : '';
  const vieneDeAviso = ORIGENES_PROPIOS.indexOf(n.origen) < 0;
  const filas = recientes_(hoja, CABECERA_GASTOS.length, 10);
  for (let i = 0; i < filas.length; i++) {
    const v = filas[i].valores;
    const fila = filas[i].fila;
    if (leerImporte_(v[COL.importe - 1]) !== n.importe) continue;
    const nota = limpiarTexto_(v[COL.nota - 1]);
    const origen = limpiarTexto_(v[COL.origen - 1]);
    if (marcaSaldo && nota.indexOf(marcaSaldo) >= 0) {
      if (n.quien && nota.indexOf('Pagó') < 0) hoja.getRange(fila, COL.nota).setValue('Pagó ' + n.quien + ' · ' + nota);
      return true;
    }
    if (vieneDeAviso && origen === 'Apple Pay' && nota.indexOf('Saldo:') < 0 &&
      normalizar_(v[COL.tarjeta - 1]).indexOf(normalizar_(n.origen)) >= 0) {
      const extra = [n.quien ? 'Pagó ' + n.quien : '', marcaSaldo].filter(function (x) { return x; }).join(' · ');
      hoja.getRange(fila, COL.nota).setValue((nota ? nota + ' · ' : '') + (extra || 'Aviso de ' + n.origen));
      if (n.cuenta === CONJUNTA) hoja.getRange(fila, COL.cuenta).setValue(CONJUNTA);
      return true;
    }
    if (n.origen === 'Apple Pay' && origen && ORIGENES_PROPIOS.indexOf(origen) < 0 && nota.indexOf('Apple Pay') < 0 &&
      normalizar_(n.tarjeta).indexOf(normalizar_(origen)) >= 0) {
      hoja.getRange(fila, COL.nota).setValue((nota ? nota + ' · ' : '') + 'También por Apple Pay');
      return true;
    }
  }
  return false;
}

/** Apunta dinero que entra. Una devolución necesita categoría; si no la tiene, cuenta como ingreso. */
function apuntarIngreso_(ss, datos) {
  const leido = leerImporte_(datos.importe);
  if (!isFinite(leido)) return 'Error: no entiendo el importe «' + limpiarTexto_(datos.importe) + '»';
  if (leido === 0) return 'Importe 0: no se apunta';
  const importe = Math.abs(leido);
  const de = limpiarTexto_(datos.de) || '(sin nombre)';
  const categoria = normalizarTipo_(datos.tipo) === DEVOLUCION ? buscarCategoria_(datos.categoria, leerCategorias_(ss)) : '';
  const tipo = categoria ? DEVOLUCION : INGRESO;
  const nota = limpiarTexto_(datos.nota);
  const hoja = ss.getSheetByName(HOJAS.ingresos);
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return 'Error: la hoja está ocupada, inténtalo otra vez';
  try {
    if (nota && yaApuntado_(hoja, importe, nota)) return 'Ya estaba apuntado';
    escribirIngreso_(hoja, [datos.fecha instanceof Date ? datos.fecha : new Date(), importe, de, limpiarTexto_(datos.concepto), tipo, categoria,
      limpiarTexto_(datos.origen) || 'Manual', normalizarCuenta_(datos.cuenta), nota]);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  return tipo === DEVOLUCION
    ? 'Devolución apuntada: ' + formatoEuros_(importe) + ' en ' + categoria
    : 'Entrada apuntada: ' + formatoEuros_(importe) + ' de ' + de;
}

/** Lee un aviso del banco y lo apunta. Si no lo entiende, lo guarda en Avisos para revisarlo. */
function procesarAviso_(ss, datos) {
  const lectura = leerAviso_(datos.titulo, datos.aviso);
  if (!lectura) {
    guardarAviso_(ss, datos, 'No lo he sabido leer');
    return 'Aviso guardado sin apuntar: no lo he sabido leer';
  }
  const texto = limpiarTexto_(datos.aviso);
  if (lectura.tipo === 'gasto') {
    const app = limpiarTexto_(datos.app) || 'Banco';
    const conjunta = lectura.cuenta === CONJUNTA || normalizarCuenta_(datos.cuenta) === CONJUNTA;
    const nota = [lectura.quien ? 'Pagó ' + lectura.quien : '', isFinite(lectura.saldo) ? 'Saldo: ' + formatoEuros_(lectura.saldo) : '']
      .filter(function (x) { return x; }).join(' · ');
    return apuntarGasto_(ss, { importe: lectura.importe, comercio: lectura.comercio, tarjeta: app + (conjunta ? ' conjunta' : ''),
      origen: app, nota: nota, cuenta: conjunta ? CONJUNTA : PERSONAL, saldo: lectura.saldo, quien: lectura.quien });
  }
  if (lectura.tipo === 'recibido') {
    return apuntarIngreso_(ss, { importe: lectura.importe, de: lectura.persona, concepto: lectura.concepto,
      tipo: INGRESO, origen: 'Bizum', cuenta: datos.cuenta, nota: texto });
  }
  return apuntarGasto_(ss, { importe: lectura.importe, comercio: 'Bizum a ' + lectura.persona, tarjeta: '',
    origen: 'Bizum', nota: texto, cuenta: datos.cuenta });
}

function guardarAviso_(ss, datos, motivo) {
  const hoja = ss.getSheetByName(HOJAS.avisos);
  if (!hoja) return;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return;
  try {
    hoja.insertRowBefore(2);
    hoja.getRange(2, 1, 1, CABECERA_AVISOS.length)
      .setFontWeight('normal')
      .setBackground(null)
      .setNumberFormats([[FECHA_HORA, '@', '@', '@', '@']])
      .setValues([[new Date(), limpiarTexto_(datos.app), limpiarTexto_(datos.titulo), limpiarTexto_(datos.aviso), motivo]]);
    if (hoja.getLastRow() > 301) hoja.deleteRows(302, hoja.getLastRow() - 301);   // guarda solo los 300 últimos
  } finally {
    lock.releaseLock();
  }
}

/** true si en los últimos 10 minutos ya entró lo mismo (el iPhone a veces repite un aviso). */
function yaApuntado_(hoja, importe, nota) {
  const n = Math.min(hoja.getLastRow() - 1, 20);
  if (n < 1) return false;
  const ahora = Date.now();
  return hoja.getRange(2, 1, n, CABECERA_INGRESOS.length).getValues().some(function (f) {
    const fecha = f[COLI.fecha - 1];
    return fecha instanceof Date && ahora - fecha.getTime() < 10 * 60 * 1000 &&
      leerImporte_(f[COLI.importe - 1]) === importe && limpiarTexto_(f[COLI.nota - 1]) === nota;
  });
}

function leerPresupuestos_(ss) {
  const hoja = ss.getSheetByName(HOJAS.categorias);
  if (!hoja || hoja.getLastRow() < 2) {
    return CATEGORIAS_INICIALES.map(function (c) { return { nombre: c, presupuesto: 0 }; });
  }
  return hoja.getRange(2, 1, hoja.getLastRow() - 1, 3).getValues()
    .filter(function (f) { return limpiarTexto_(f[0]); })
    .map(function (f) {
      const p = typeof f[1] === 'number' ? f[1] : leerImporte_(f[1]);
      return { nombre: limpiarTexto_(f[0]), presupuesto: isFinite(p) && p > 0 ? p : 0, emoji: emojiCategoria_(f[2]) };
    });
}

function leerCategorias_(ss) {
  return leerPresupuestos_(ss).map(function (c) { return c.nombre; });
}

function leerReglas_(ss) {
  const hoja = ss.getSheetByName(HOJAS.reglas);
  if (!hoja || hoja.getLastRow() < 2) return prepararReglas_(reglasIniciales_());
  return prepararReglas_(hoja.getRange(2, 1, hoja.getLastRow() - 1, 3).getValues());
}

/** Desde 6 meses antes del mes pedido hasta su final, con 2 días de margen por las zonas horarias. */
function ventana_(mes) {
  const p = mes.split('-').map(Number);
  return { desde: Date.UTC(p[0], p[1] - 7, 1) - 2 * 86400000, hasta: Date.UTC(p[0], p[1], 1) + 2 * 86400000 };
}

/** Gastos de la ventana del mes, listos para resumirMes_. */
function leerGastos_(ss, tz, mes) {
  const hoja = ss.getSheetByName(HOJAS.gastos);
  if (!hoja || hoja.getLastRow() < 2) return [];
  const v = ventana_(mes);
  const filas = hoja.getRange(2, 1, hoja.getLastRow() - 1, CABECERA_GASTOS.length).getValues();
  const lista = [];
  filas.forEach(function (f, i) {
    const fecha = f[COL.fecha - 1];
    if (!(fecha instanceof Date)) return;
    const ms = fecha.getTime();
    if (isNaN(ms) || ms < v.desde || ms >= v.hasta) return;
    const importe = leerImporte_(f[COL.importe - 1]);
    if (!isFinite(importe)) return;
    let id = limpiarTexto_(f[COL.id - 1]);
    if (!id) {
      id = nuevoId_();
      hoja.getRange(i + 2, COL.id).setValue(id);   // filas escritas a mano en la hoja
    }
    lista.push({
      id: id,
      fecha: ms,
      mes: Utilities.formatDate(fecha, tz, 'yyyy-MM'),
      dia: Number(Utilities.formatDate(fecha, tz, 'd')),
      importe: importe,
      comercio: limpiarTexto_(f[COL.comercio - 1]) || '(sin comercio)',
      categoria: limpiarTexto_(f[COL.categoria - 1]) || SIN_CATEGORIA,
      tarjeta: limpiarTexto_(f[COL.tarjeta - 1]),
      origen: limpiarTexto_(f[COL.origen - 1]),
      nota: limpiarTexto_(f[COL.nota - 1]),
      cuenta: normalizarCuenta_(f[COL.cuenta - 1])
    });
  });
  return lista;
}

/** Entradas de dinero de la ventana del mes, listas para resumirMes_. */
function leerIngresos_(ss, tz, mes) {
  const hoja = ss.getSheetByName(HOJAS.ingresos);
  if (!hoja || hoja.getLastRow() < 2) return [];
  const v = ventana_(mes);
  const filas = hoja.getRange(2, 1, hoja.getLastRow() - 1, CABECERA_INGRESOS.length).getValues();
  const lista = [];
  filas.forEach(function (f, i) {
    const fecha = f[COLI.fecha - 1];
    if (!(fecha instanceof Date)) return;
    const ms = fecha.getTime();
    if (isNaN(ms) || ms < v.desde || ms >= v.hasta) return;
    const importe = leerImporte_(f[COLI.importe - 1]);
    if (!isFinite(importe)) return;
    let id = limpiarTexto_(f[COLI.id - 1]);
    if (!id) {
      id = nuevoId_();
      hoja.getRange(i + 2, COLI.id).setValue(id);
    }
    const categoria = limpiarTexto_(f[COLI.categoria - 1]);
    lista.push({
      id: id,
      fecha: ms,
      mes: Utilities.formatDate(fecha, tz, 'yyyy-MM'),
      dia: Number(Utilities.formatDate(fecha, tz, 'd')),
      importe: Math.abs(importe),
      de: limpiarTexto_(f[COLI.de - 1]) || '(sin nombre)',
      concepto: limpiarTexto_(f[COLI.concepto - 1]),
      tipo: normalizarTipo_(f[COLI.tipo - 1]) === DEVOLUCION && categoria ? DEVOLUCION : INGRESO,
      categoria: categoria,
      origen: limpiarTexto_(f[COLI.origen - 1]),
      cuenta: normalizarCuenta_(f[COLI.cuenta - 1])
    });
  });
  return lista;
}

function buscarFilaPorId_(hoja, id, columna) {
  const buscado = limpiarTexto_(id);
  if (!hoja || !buscado || hoja.getLastRow() < 2) return 0;
  const ids = hoja.getRange(2, columna, hoja.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (limpiarTexto_(ids[i][0]) === buscado) return i + 2;
  }
  return 0;
}

/** Busca un id en Gastos y luego en Ingresos. */
function buscarMovimiento_(ss, id) {
  const gastos = ss.getSheetByName(HOJAS.gastos);
  let fila = buscarFilaPorId_(gastos, id, COL.id);
  if (fila) return { hoja: gastos, fila: fila, colCuenta: COL.cuenta, esIngreso: false };
  const ingresos = ss.getSheetByName(HOJAS.ingresos);
  fila = buscarFilaPorId_(ingresos, id, COLI.id);
  if (fila) return { hoja: ingresos, fila: fila, colCuenta: COLI.cuenta, esIngreso: true };
  return null;
}

function nuevoId_() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 12);
}

function textoMes_(valor, tz) {
  if (valor instanceof Date) return Utilities.formatDate(valor, tz, 'yyyy-MM');
  return String(valor == null ? '' : valor).trim();
}

/** Lee una fila de Fijos. Si está vacía o el importe no vale, null. Sin cuenta es tuya y sin «Cada» es cada mes. */
function leerFijo_(f, tz) {
  const concepto = limpiarTexto_(f[COLF.concepto - 1]);
  const importe = leerImporte_(f[COLF.importe - 1]);
  if (!concepto || !isFinite(importe) || importe === 0) return null;
  return {
    concepto: concepto,
    importe: importe,
    dia: f[COLF.dia - 1],
    categoria: limpiarTexto_(f[COLF.categoria - 1]),
    pausado: f[COLF.pausado - 1] === true,
    ultimo: textoMes_(f[COLF.ultimo - 1], tz),
    cuenta: normalizarCuenta_(f[COLF.cuenta - 1]),
    cada: normalizarCada_(f[COLF.cada - 1]),
    mesAnio: mesDelAnio_(f[COLF.mesAnio - 1])
  };
}

/** Los fijos que siguen activos, ordenados por día, para la app. */
function leerFijos_(ss, tz) {
  const hoja = ss.getSheetByName(HOJAS.fijos);
  if (!hoja || hoja.getLastRow() < 2) return [];
  const filas = hoja.getRange(2, 1, hoja.getLastRow() - 1, CABECERA_FIJOS.length).getValues();
  const lista = [];
  let reglas = null;
  filas.forEach(function (f, i) {
    const x = leerFijo_(f, tz);
    if (!x || x.pausado) return;
    if (!x.categoria) {
      reglas = reglas || leerReglas_(ss);
      x.categoria = categorizar_(x.concepto, reglas);
    }
    const dia = Math.min(31, Math.max(1, Math.floor(Number(x.dia)) || 1));
    const mesAnio = x.cada === CADA_ANIO ? (x.mesAnio || Number(x.ultimo.slice(5)) || 0) : 0;
    lista.push({
      fila: i + 2, concepto: x.concepto, importe: x.importe, categoria: x.categoria, cuenta: x.cuenta,
      cada: x.cada, dia: dia, mesAnio: mesAnio, ultimo: x.ultimo, texto: textoRepite_(x.cada, dia, mesAnio)
    });
  });
  return lista.sort(function (a, b) { return a.dia - b.dia || a.fila - b.fila; });
}

/**
 * Añade a Fijos un gasto que se repite, desde la fecha dada (ese mes ya cuenta como apuntado).
 * Si ya hay uno activo con el mismo nombre en la misma cuenta, no lo duplica. Devuelve el texto para la app.
 */
function crearFijo_(ss, datos) {
  const concepto = limpiarTexto_(datos.concepto);
  const importe = leerImporte_(datos.importe);
  if (!concepto) return 'Error: falta el nombre para que se repita';
  if (!isFinite(importe) || importe === 0) return 'Error: no entiendo el importe para que se repita';
  const tz = ss.getSpreadsheetTimeZone() || ZONA;
  const hoja = ss.getSheetByName(HOJAS.fijos) || prepararFijos_(ss);
  const cada = normalizarCada_(datos.cada);
  const dia = Number(Utilities.formatDate(datos.fecha, tz, 'd'));
  const mesAnio = Number(Utilities.formatDate(datos.fecha, tz, 'M'));
  const cuenta = normalizarCuenta_(datos.cuenta);
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return 'Error: la hoja está ocupada, inténtalo otra vez';
  try {
    const n = Math.max(hoja.getLastRow() - 1, 0);
    const filas = n ? hoja.getRange(2, 1, n, CABECERA_FIJOS.length).getValues() : [];
    const nombre = normalizar_(concepto);
    const yaEsta = filas.some(function (f) {
      const x = leerFijo_(f, tz);
      return x && !x.pausado && x.cuenta === cuenta && normalizar_(x.concepto) === nombre;
    });
    if (yaEsta) return 'ya se repetía';
    const libre = filas.findIndex(function (f) { return !limpiarTexto_(f[0]) && !limpiarTexto_(f[1]); });
    const fila = libre >= 0 ? libre + 2 : n + 2;
    hoja.getRange(fila, COLF.pausado).insertCheckboxes();
    hoja.getRange(fila, 1, 1, CABECERA_FIJOS.length).setValues([[
      concepto, importe, dia, limpiarTexto_(datos.categoria), false, datos.ultimo || Utilities.formatDate(datos.fecha, tz, 'yyyy-MM'),
      cuenta, cada, cada === CADA_ANIO ? mesAnio : ''
    ]]);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  return 'se repetirá ' + textoRepite_(cada, dia, mesAnio);
}

/** Mete el gasto en la fila 2, así lo último sale siempre arriba. Recibe 7 datos y añade el Id y la cuenta. */
function escribirGasto_(hoja, fila, cuenta) {
  const id = nuevoId_();
  hoja.insertRowBefore(2);
  hoja.getRange(2, 1, 1, CABECERA_GASTOS.length)
    .setFontWeight('normal')
    .setBackground(null)
    .setNumberFormats([[FECHA_HORA, EUROS, '@', '@', '@', '@', '@', '@', '@']])
    .setValues([fila.concat([id, normalizarCuenta_(cuenta)])]);
  hoja.getRange(2, COL.categoria).setDataValidation(reglaDesplegable_(hoja.getParent()));
  hoja.getRange(2, COL.cuenta).setDataValidation(reglaLista_([PERSONAL, CONJUNTA]));
  return id;
}

/** Mete la entrada de dinero en la fila 2. Recibe 9 datos y añade el Id. */
function escribirIngreso_(hoja, fila) {
  const id = nuevoId_();
  hoja.insertRowBefore(2);
  hoja.getRange(2, 1, 1, CABECERA_INGRESOS.length)
    .setFontWeight('normal')
    .setBackground(null)
    .setNumberFormats([[FECHA_HORA, EUROS, '@', '@', '@', '@', '@', '@', '@', '@']])
    .setValues([fila.concat([id])]);
  hoja.getRange(2, COLI.tipo).setDataValidation(reglaLista_([INGRESO, DEVOLUCION]));
  hoja.getRange(2, COLI.categoria).setDataValidation(reglaDesplegable_(hoja.getParent()));
  hoja.getRange(2, COLI.cuenta).setDataValidation(reglaLista_([PERSONAL, CONJUNTA]));
  return id;
}

function reglaDesplegable_(ss) {
  return SpreadsheetApp.newDataValidation()
    .requireValueInRange(ss.getSheetByName(HOJAS.categorias).getRange('D2:D'), true)
    .setAllowInvalid(true)
    .build();
}

function reglaLista_(valores) {
  return SpreadsheetApp.newDataValidation().requireValueInList(valores, true).setAllowInvalid(true).build();
}

function aprenderDeFilas_(hoja, ini, fin) {
  const ultima = hoja.getLastRow();
  if (ultima < 2) return;
  fin = Math.min(fin, ultima);
  const datos = hoja.getRange(2, 1, ultima - 1, CABECERA_GASTOS.length).getValues();
  const hojaR = hoja.getParent().getSheetByName(HOJAS.reglas);
  if (!hojaR) return;
  const filasR = hojaR.getLastRow() > 1 ? hojaR.getRange(2, 1, hojaR.getLastRow() - 1, 3).getValues() : [];
  const nuevas = {};
  for (let f = ini; f <= fin; f++) {
    const fila = datos[f - 2];
    const comercio = limpiarTexto_(fila[COL.comercio - 1]);
    const categoria = limpiarTexto_(fila[COL.categoria - 1]);
    const clave = normalizar_(comercio);
    if (!clave || !categoria || categoria === SIN_CATEGORIA) continue;
    nuevas[clave] = categoria;
    guardarRegla_(hojaR, filasR, comercio, categoria);
  }
  datos.forEach(function (fila, i) {
    const actual = limpiarTexto_(fila[COL.categoria - 1]);
    if (actual && actual !== SIN_CATEGORIA) return;
    const nueva = nuevas[normalizar_(fila[COL.comercio - 1])];
    if (nueva) hoja.getRange(i + 2, COL.categoria).setValue(nueva);
  });
}

/** Crea o actualiza la regla aprendida del comercio. Si las palabras clave ya aciertan, no hace falta. */
function guardarRegla_(hojaR, filasR, comercio, categoria) {
  const clave = normalizar_(comercio);
  for (let i = 0; i < filasR.length; i++) {
    const f = filasR[i];
    if (normalizar_(f[2]) === normalizar_(APRENDIDA) && normalizar_(f[0]) === clave) {
      if (limpiarTexto_(f[1]) !== categoria) {
        hojaR.getRange(i + 2, 2).setValue(categoria);
        f[1] = categoria;
      }
      return;
    }
  }
  if (categorizar_(comercio, prepararReglas_(filasR)) === categoria) return;
  const nueva = [comercio, categoria, APRENDIDA];
  hojaR.getRange(filasR.length + 2, 1, 1, 3).setValues([nueva]);
  filasR.push(nueva);
}


// ─────────────────── Montaje de las pestañas ───────────────────

function hoja_(ss, nombre) {
  return ss.getSheetByName(nombre) || ss.insertSheet(nombre);
}

function estiloCabecera_(rango) {
  rango.setFontWeight('bold').setBackground(COLOR_CABECERA);
}

function anchos_(hoja, anchos) {
  anchos.forEach(function (a, i) { hoja.setColumnWidth(i + 1, a); });
}

/** Añade al final de Categorías las de CATEGORIAS_NUEVAS que falten y no se hayan añadido ya antes. */
function anadirCategoriasNuevas_(hoja) {
  const props = PropertiesService.getScriptProperties();
  const hechas = (props.getProperty('CATEGORIAS_ANADIDAS') || '').split('|').filter(Boolean);
  const pendientes = CATEGORIAS_NUEVAS.filter(function (c) { return hechas.indexOf(c) < 0; });
  if (!pendientes.length) return;
  const hay = ultimaCategoria_(hoja);
  const faltan = pendientes.filter(function (c) { return hay.actuales.indexOf(normalizar_(c)) < 0; });
  if (faltan.length) {
    if (hay.ultima + faltan.length > hoja.getMaxRows()) hoja.insertRowsAfter(hoja.getMaxRows(), faltan.length);
    hoja.getRange(hay.ultima + 1, 1, faltan.length, 1).setValues(faltan.map(function (c) { return [c]; }));
  }
  props.setProperty('CATEGORIAS_ANADIDAS', hechas.concat(pendientes).join('|'));
}

/** La última fila de Categorías con nombre (1 si no hay ninguna) y los nombres que hay, normalizados. */
function ultimaCategoria_(hoja) {
  const valores = hoja.getRange(2, 1, Math.max(hoja.getMaxRows() - 1, 1), 1).getValues();
  let ultima = 1;
  const actuales = [];
  valores.forEach(function (f, i) {
    if (String(f[0]).trim()) { ultima = i + 2; actuales.push(normalizar_(f[0])); }
  });
  return { ultima: ultima, actuales: actuales };
}

/**
 * Añade a Reglas las palabras clave de las categorías nuevas. Si una palabra ya era palabra clave
 * de otra categoría (por ejemplo «cerveceria», que estaba en Comer fuera), pasa a la nueva.
 * Las reglas aprendidas no se tocan.
 */
function anadirReglasNuevas_(hoja) {
  const props = PropertiesService.getScriptProperties();
  const hechas = (props.getProperty('REGLAS_ANADIDAS') || '').split('|').filter(Boolean);
  const pendientes = CATEGORIAS_NUEVAS.filter(function (c) { return hechas.indexOf(c) < 0; });
  if (!pendientes.length) return;
  const n = Math.max(hoja.getLastRow() - 1, 0);
  const filas = n ? hoja.getRange(2, 1, n, 3).getValues() : [];
  const porClave = {};
  filas.forEach(function (f, i) { if (normalizar_(f[0])) porClave[normalizar_(f[0])] = i; });
  const nuevas = [];
  pendientes.forEach(function (categoria) {
    String(REGLAS_INICIALES[categoria] || '').split(',').forEach(function (p) {
      const palabra = p.trim();
      const clave = normalizar_(palabra);
      if (!clave) return;
      const i = porClave[clave];
      if (i === undefined) { nuevas.push([palabra, categoria, PALABRA_CLAVE]); return; }
      if (normalizar_(filas[i][2]) !== normalizar_(APRENDIDA)) hoja.getRange(i + 2, 2).setValue(categoria);
    });
  });
  if (nuevas.length) {
    if (n + 1 + nuevas.length > hoja.getMaxRows()) hoja.insertRowsAfter(hoja.getMaxRows(), nuevas.length);
    hoja.getRange(n + 2, 1, nuevas.length, 3).setValues(nuevas);
  }
  props.setProperty('REGLAS_ANADIDAS', hechas.concat(pendientes).join('|'));
}

function prepararCategorias_(ss) {
  const hoja = hoja_(ss, HOJAS.categorias);
  const nueva = hoja.getRange('A2').getValue() === '';
  hoja.getRange('A1:C1').setValues([['Categoría', 'Presupuesto mensual', 'Emoji']]);
  estiloCabecera_(hoja.getRange('A1:C1'));
  if (nueva) {
    hoja.getRange(2, 1, CATEGORIAS_INICIALES.length, 1).setValues(CATEGORIAS_INICIALES.map(function (c) { return [c]; }));
    PropertiesService.getScriptProperties().setProperty('CATEGORIAS_ANADIDAS', CATEGORIAS_NUEVAS.join('|'));
  } else {
    anadirCategoriasNuevas_(hoja);
  }
  hoja.getRange('B2:B').setNumberFormat(EUROS);
  hoja.getRange('D1').setValue('Lista de los desplegables (no tocar)');
  hoja.getRange('D2').setFormula('={FILTER(A2:A,A2:A<>"");"' + SIN_CATEGORIA + '"}');
  hoja.hideColumns(4);
  hoja.setFrozenRows(1);
  anchos_(hoja, [150, 150, 70]);
  hoja.getRange('A1').setNote('Añade, quita o cambia categorías aquí o desde la app («＋ Nueva»). En «Presupuesto mensual» pon lo máximo que quieres gastar al mes en cada una. Se puede dejar vacío.');
  hoja.getRange('C1').setNote('Opcional: el emoji que sale en la app. Si está vacío, la app pone uno según el nombre, o 🏷️.');
  return hoja;
}

function prepararGastos_(ss) {
  const hoja = hoja_(ss, HOJAS.gastos);
  const ancho = CABECERA_GASTOS.length;
  hoja.getRange(1, 1, 1, ancho).setValues([CABECERA_GASTOS]);
  estiloCabecera_(hoja.getRange(1, 1, 1, ancho));
  hoja.setFrozenRows(1);
  const filas = hoja.getMaxRows() - 1;
  hoja.getRange(2, COL.fecha, filas, 1).setNumberFormat(FECHA_HORA);
  hoja.getRange(2, COL.importe, filas, 1).setNumberFormat(EUROS);
  hoja.getRange(2, COL.categoria, filas, 1).setDataValidation(reglaDesplegable_(ss));
  hoja.getRange(2, COL.cuenta, filas, 1).setDataValidation(reglaLista_([PERSONAL, CONJUNTA]));
  // Los gastos de antes de la versión 2 no tenían cuenta: son tuyos.
  const ultima = hoja.getLastRow();
  if (ultima >= 2) {
    const fechas = hoja.getRange(2, COL.fecha, ultima - 1, 1).getValues();
    const cuentas = hoja.getRange(2, COL.cuenta, ultima - 1, 1);
    const valores = cuentas.getValues();
    let cambia = false;
    valores.forEach(function (v, i) {
      if (!limpiarTexto_(v[0]) && fechas[i][0] !== '') {
        v[0] = PERSONAL;
        cambia = true;
      }
    });
    if (cambia) cuentas.setValues(valores);
  }
  anchos_(hoja, [120, 85, 180, 120, 120, 85, 180, 100, 90]);
  hoja.hideColumns(COL.id);
  const resaltar = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$D1="' + SIN_CATEGORIA + '"')
    .setBackground(COLOR_AVISO)
    .setRanges([hoja.getRange(1, 1, hoja.getMaxRows(), ancho)])
    .build();
  hoja.setConditionalFormatRules([resaltar]);
  hoja.getRange('D1').setNote('Si cambias una categoría, la hoja la recuerda para ese comercio y corrige sus otros «Sin categoría».');
  hoja.getRange('I1').setNote('«Personal» son tus gastos. «Conjunta» son los de la cuenta conjunta.');
  return hoja;
}

function prepararIngresos_(ss) {
  const hoja = hoja_(ss, HOJAS.ingresos);
  const ancho = CABECERA_INGRESOS.length;
  hoja.getRange(1, 1, 1, ancho).setValues([CABECERA_INGRESOS]);
  estiloCabecera_(hoja.getRange(1, 1, 1, ancho));
  hoja.setFrozenRows(1);
  const filas = hoja.getMaxRows() - 1;
  hoja.getRange(2, COLI.fecha, filas, 1).setNumberFormat(FECHA_HORA);
  hoja.getRange(2, COLI.importe, filas, 1).setNumberFormat(EUROS);
  hoja.getRange(2, COLI.tipo, filas, 1).setDataValidation(reglaLista_([INGRESO, DEVOLUCION]));
  hoja.getRange(2, COLI.categoria, filas, 1).setDataValidation(reglaDesplegable_(ss));
  hoja.getRange(2, COLI.cuenta, filas, 1).setDataValidation(reglaLista_([PERSONAL, CONJUNTA]));
  anchos_(hoja, [120, 85, 160, 160, 100, 120, 80, 90, 220, 100]);
  hoja.hideColumns(COLI.id);
  hoja.getRange('A1').setNote('Dinero que te entra: los Bizum que te llegan y lo que apuntes a mano. Una «Devolución» resta de la categoría que elijas, por ejemplo cuando te devuelven tu parte de una cena.');
  return hoja;
}

function prepararReglasHoja_(ss) {
  const hoja = hoja_(ss, HOJAS.reglas);
  const nueva = hoja.getRange('A2').getValue() === '';
  hoja.getRange('A1:C1').setValues([['Si el comercio contiene', 'Categoría', 'Tipo']]);
  estiloCabecera_(hoja.getRange('A1:C1'));
  if (nueva) {
    const filas = reglasIniciales_();
    hoja.getRange(2, 1, filas.length, 3).setValues(filas);
    PropertiesService.getScriptProperties().setProperty('REGLAS_ANADIDAS', CATEGORIAS_NUEVAS.join('|'));
  } else {
    anadirReglasNuevas_(hoja);
  }
  const n = hoja.getMaxRows() - 1;
  hoja.getRange(2, 2, n, 1).setDataValidation(reglaDesplegable_(ss));
  hoja.getRange(2, 3, n, 1).setDataValidation(reglaLista_([PALABRA_CLAVE, APRENDIDA]));
  hoja.setFrozenRows(1);
  anchos_(hoja, [200, 130, 110]);
  hoja.getRange('A1').setNote('Si el comercio contiene este texto, se le pone la categoría de al lado. No importan mayúsculas ni tildes. Si coinciden varias, gana la más larga. Las de 4 letras o menos tienen que ser palabra entera. Las «Aprendidas» se crean solas al cambiar una categoría y valen solo para ese comercio exacto.');
  return hoja;
}

function prepararFijos_(ss) {
  const hoja = hoja_(ss, HOJAS.fijos);
  const ancho = CABECERA_FIJOS.length;
  hoja.getRange(1, 1, 1, ancho).setValues([CABECERA_FIJOS]);
  estiloCabecera_(hoja.getRange(1, 1, 1, ancho));
  const n = hoja.getMaxRows() - 1;
  hoja.getRange(2, COLF.importe, n, 1).setNumberFormat(EUROS);
  hoja.getRange(2, COLF.dia, n, 1).setNumberFormat('0').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireNumberBetween(1, 31).setAllowInvalid(false).setHelpText('Un día del 1 al 31').build());
  hoja.getRange(2, COLF.categoria, n, 1).setDataValidation(reglaDesplegable_(ss));
  hoja.getRange(2, COLF.ultimo, n, 1).setNumberFormat('@');
  hoja.getRange(2, COLF.cuenta, n, 1).setDataValidation(reglaLista_([PERSONAL, CONJUNTA]));
  hoja.getRange(2, COLF.cada, n, 1).setDataValidation(reglaLista_([CADA_MES, CADA_ANIO]));
  hoja.getRange(2, COLF.mesAnio, n, 1).setNumberFormat('0').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireNumberBetween(1, 12).setAllowInvalid(false).setHelpText('Un mes del 1 al 12').build());
  if (!hoja.getRange('E2').getDataValidation()) hoja.getRange('E2:E40').insertCheckboxes();
  hoja.setFrozenRows(1);
  anchos_(hoja, [160, 85, 90, 120, 70, 140, 90, 70, 120]);
  hoja.getRange('A1').setNote('Gastos que se repiten (suscripciones, alquiler, luz, móvil...). Cada mañana se apuntan solos en Gastos el día que toca. Si el mes no tiene ese día, se usa el último. Marca «Pausado» para dejar de apuntarlo. También se añaden desde la app, al apuntar un gasto con «¿Se repite?».');
  hoja.getRange('F1').setNote('Lo rellena la hoja. Si ya lo apuntaste tú este mes, escribe aquí el mes así: 2026-10');
  hoja.getRange('G1').setNote('Personal o Conjunta. Vacío es Personal.');
  hoja.getRange('H1').setNote('Mes o Año. Vacío es cada mes.');
  hoja.getRange('I1').setNote('Solo para los de cada año: el mes en que se paga, del 1 al 12.');
  return hoja;
}

function prepararAvisos_(ss) {
  const hoja = hoja_(ss, HOJAS.avisos);
  const ancho = CABECERA_AVISOS.length;
  hoja.getRange(1, 1, 1, ancho).setValues([CABECERA_AVISOS]);
  estiloCabecera_(hoja.getRange(1, 1, 1, ancho));
  hoja.setFrozenRows(1);
  hoja.getRange(2, 1, hoja.getMaxRows() - 1, 1).setNumberFormat(FECHA_HORA);
  anchos_(hoja, [120, 90, 120, 420, 170]);
  hoja.getRange('A1').setNote('Avisos del banco que la hoja no ha sabido leer. No se apuntan como gasto ni como ingreso. Sirven para que Claude ajuste el código.');
  return hoja;
}

function prepararConfig_(ss) {
  const hoja = hoja_(ss, HOJAS.config);
  let clave = PropertiesService.getScriptProperties().getProperty('CLAVE');
  if (!clave) clave = nuevaClave();
  hoja.getRange('A1').setValue('Configuración').setFontSize(14).setFontWeight('bold');
  hoja.getRange('A2:A8').setValues([['Clave secreta'], ['Dirección de la aplicación web'],
    ['Enlace para los atajos'], ['Enlace de la app'], ['Pruebas'], ['Preparada el'], ['Tus bancos']]).setFontWeight('bold');
  hoja.getRange('B2').setValue(clave);
  hoja.getRange('B3').setBackground(COLOR_RELLENAR);
  if (!limpiarTexto_(hoja.getRange('B3').getValue())) {
    const url = urlPublicada_();
    if (url) hoja.getRange('B3').setValue(url);
  }
  escribirEnlaces_(hoja);
  hoja.getRange('B7').setValue(new Date()).setNumberFormat(FECHA_HORA).setHorizontalAlignment('left');
  if (!limpiarTexto_(hoja.getRange('B8').getValue())) hoja.getRange('B8').setValue(BANCOS_INICIALES);
  hoja.getRange('B8').setBackground(COLOR_RELLENAR)
    .setNote('Tus bancos, separados por comas. Si pagas a uno de ellos con otra tarjeta (por ejemplo, para pasarte dinero), no cuenta como gasto.');
  // B9 a B11: el objetivo de gasto del mes de cada vista de la app (desde la 3.2). Se respeta lo que ya hubiera.
  OBJETIVOS.forEach(function (ob) {
    hoja.getRange(ob.fila, 1).setValue(ob.nombre).setFontWeight('bold');
    const celda = hoja.getRange(ob.fila, 2);
    celda.setValue(numeroObjetivo_(celda.getValue()) || '').setNumberFormat(EUROS).setBackground(COLOR_RELLENAR)
      .setHorizontalAlignment('left').setNote('Lo máximo que quieres gastar al mes. En la app sale en verde si vas por debajo y en rojo si te pasas. Se cambia también desde la app, tocándolo.');
  });
  // «Cómo se usa» baja de A10:A15 a A13:A19 para dejar sitio a los objetivos.
  hoja.getRange('A12:B12').clearContent();
  hoja.getRange('A13:A19').setValues([
    ['Cómo se usa'],
    ['1. Implementa el código como aplicación web. Si B3 sigue vacía, pega ahí su dirección (acaba en /exec).'],
    ['2. Abre el enlace de B5 y, en el iPhone, añádelo a la pantalla de inicio: es tu app «ByCash».'],
    ['3. Pon el enlace de B4 en los atajos de Apple Pay y de los avisos del banco.'],
    ['4. En B8 van tus bancos, para no contar como gasto el dinero que te pasas entre tus cuentas.'],
    ['5. En B9 a B11, tu objetivo de gasto al mes. También se pone desde la app.'],
    ['6. No compartas B2, B4 ni B5: con ellos cualquiera podría ver y apuntar tus gastos.']
  ]).setFontWeight('normal');
  hoja.getRange('A13').setFontWeight('bold');
  anchos_(hoja, [230, 520]);
  return hoja;
}

/** La pestaña Resumen de la versión 1 ya no hace falta: la app enseña lo mismo y más. */
function quitarResumenViejo_(ss) {
  const vieja = ss.getSheetByName(HOJA_RESUMEN_VIEJA);
  if (vieja && ss.getSheets().length > 1) ss.deleteSheet(vieja);
}

function ordenarPestanas_(ss) {
  [HOJAS.gastos, HOJAS.ingresos, HOJAS.fijos, HOJAS.categorias, HOJAS.reglas, HOJAS.avisos, HOJAS.config]
    .forEach(function (nombre, i) {
      const h = ss.getSheetByName(nombre);
      if (!h) return;
      ss.setActiveSheet(h);
      ss.moveActiveSheet(i + 1);
    });
}

/** Borra la «Hoja 1» vacía que trae la hoja nueva. */
function borrarHojasVacias_(ss) {
  const nuestras = Object.keys(HOJAS).map(function (k) { return HOJAS[k]; });
  ss.getSheets().forEach(function (h) {
    if (nuestras.indexOf(h.getName()) >= 0) return;
    if (/^(hoja|sheet)\s*\d+$/i.test(h.getName()) && h.getLastRow() === 0 && h.getLastColumn() === 0) {
      ss.deleteSheet(h);
    }
  });
}

function crearDisparador_() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'apuntarFijos') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('apuntarFijos').timeBased().everyDays(1).atHour(7).inTimezone(ZONA).create();
}
