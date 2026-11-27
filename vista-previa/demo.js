// Vista previa de ByCash con datos inventados: no habla con ninguna hoja. Lo que se apunte aquí se pierde al cerrar.
(function () {
  function pad(x) { return (x < 10 ? '0' : '') + x; }
  function mesDe(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1); }
  var ahora = new Date(), M = mesDe(ahora), n = 0;
  var nombres = CATEGORIAS_INICIALES.slice(), reglas = prepararReglas_(reglasIniciales_());
  var gastos = [], ingresos = [], fijos = [], objetivos = { mio: 700, conjunta: 0, todo: 0 };
  function hace(dias, h, mi) { return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - dias, h == null ? 12 : h, mi || 0); }
  function gasto(d, importe, comercio, categoria, tarjeta, origen, cuenta) {
    gastos.push({ id: 'v' + (++n), fecha: d.getTime(), mes: mesDe(d), dia: d.getDate(), importe: importe, comercio: comercio,
      categoria: categoria, tarjeta: tarjeta || '', origen: origen || 'Apple Pay', nota: '', cuenta: cuenta || PERSONAL });
  }
  function entrada(d, importe, de, tipo, categoria, origen) {
    ingresos.push({ id: 'v' + (++n), fecha: d.getTime(), mes: mesDe(d), dia: d.getDate(), importe: importe, de: de, concepto: '',
      tipo: tipo, categoria: categoria || '', origen: origen || 'Manual', cuenta: PERSONAL });
  }
  function fijo(concepto, importe, categoria, cada, dia, mesAnio, ultimo) {
    fijos.push({ fila: fijos.length + 2, concepto: concepto, importe: importe, categoria: categoria, cuenta: PERSONAL, cada: cada, dia: dia,
      mesAnio: mesAnio, ultimo: ultimo, texto: textoRepite_(cada, dia, mesAnio) });
  }
  [[0, 9, 12, 2.8, 'Cafetería Central', 'Comer fuera', 'Revolut'], [1, 21, 40, 18, 'La Tagliatella', 'Comer fuera', 'ABANCA'],
    [1, 13, 15, 12.4, 'Mercadona', 'Supermercado', 'Revolut'], [2, 19, 30, 9.5, 'Cervecería La Sureña', 'Tomar algo', 'Revolut'],
    [3, 18, 5, 6.75, 'Estanco', 'Otros', 'Revolut'], [5, 11, 0, 45.3, 'Repsol', 'Gasolina', 'ABANCA'],
    [8, 17, 20, 39.99, 'Zara', 'Ropa', 'Imagin'], [10, 9, 0, 13.99, 'Netflix', 'Suscripciones', '', 'Fijo'],
    [12, 12, 30, 62.1, 'Mercadona', 'Supermercado', 'Revolut', 'Apple Pay', CONJUNTA], [15, 20, 45, 24, 'Cines Yelmo', 'Ocio', 'Revolut'],
    [20, 9, 0, 10.99, 'Spotify', 'Suscripciones', '', 'Fijo'], [33, 12, 0, 95, 'Mercadona', 'Supermercado', 'Revolut'],
    [40, 10, 0, 180, 'Ryanair', 'Viajes', 'Imagin']
  ].forEach(function (x) { gasto(hace(x[0], x[1], x[2]), x[3], x[4], x[5], x[6], x[7], x[8]); });
  entrada(hace(4, 20, 10), 20, 'Ana', INGRESO, '', 'Bizum');
  fijo('Netflix', 13.99, 'Suscripciones', CADA_MES, hace(10).getDate(), 0, M);
  fijo('Spotify', 10.99, 'Suscripciones', CADA_MES, hace(20).getDate(), 0, M);
  fijo('Gimnasio', 39.9, 'Salud', CADA_MES, 1, 0, M);

  function datos(mes) {
    var hoy = { mes: M, dia: ahora.getDate() };
    var pres = nombres.map(function (c) { return { nombre: c, presupuesto: c === 'Supermercado' ? 250 : c === 'Comer fuera' ? 120 : 0 }; });
    var sinPres = nombres.map(function (c) { return { nombre: c, presupuesto: 0 }; });
    var conj = function (x) { return x.cuenta === CONJUNTA; }, mio = function (x) { return x.cuenta !== CONJUNTA; };
    return {
      ok: true, versionHoja: VERSION_HOJA, mes: mes, hoja: 'https://docs.google.com/spreadsheets/', hayConjunta: true,
      listaCategorias: nombres.slice(), emojis: {}, objetivos: JSON.parse(JSON.stringify(objetivos)), fijos: fijos.slice(),
      vistas: {
        mio: resumirMes_(gastos.filter(mio), ingresos.filter(mio), pres, mes, hoy),
        conjunta: resumirMes_(gastos.filter(conj), ingresos.filter(conj), sinPres, mes, hoy),
        todo: resumirMes_(gastos, ingresos, sinPres, mes, hoy)
      }
    };
  }
  // Como la hoja: tarda un poco en contestar.
  function luego(r) { return new Promise(function (ok) { setTimeout(function () { ok(r); }, 300); }); }
  // El día que manda la app (aaaa-mm-dd), a la hora de ahora.
  function diaDe(texto) {
    var p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto || '');
    return p ? new Date(+p[1], +p[2] - 1, +p[3], ahora.getHours(), ahora.getMinutes()) : null;
  }
  function quitar(lista, id) { for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista.splice(i, 1)[0]; return null; }
  function buscar(lista, id) { return lista.filter(function (x) { return x.id === id; })[0]; }

  window.API_PRUEBA = {
    datos: function (mes) { return luego(datos(mes || M)); },
    apuntar: function (g) {
      var importe = leerImporte_(g.importe), d = diaDe(g.fecha), comercio = limpiarTexto_(g.comercio) || '(sin comercio)';
      if (!isFinite(importe) || !importe) return luego('Error: no entiendo el importe');
      var cat = buscarCategoria_(g.categoria, nombres) || categorizar_(comercio, reglas);
      if (g.repetir) {
        var cada = normalizarCada_(g.repetir), cobro = d || new Date();
        fijo(comercio, importe, cat, cada, cobro.getDate(), cada === CADA_ANIO ? cobro.getMonth() + 1 : 0, mesDe(cobro));
        if (cobro > new Date()) return luego('Hecho: se apuntará solo el ' + cobro.getDate() + ' de ' + MESES[cobro.getMonth()]);
      }
      gasto(d || new Date(), importe, comercio, cat, '', 'Manual', normalizarCuenta_(g.cuenta));
      return luego('Apuntado: ' + formatoEuros_(importe) + ' · ' + cat + (d && !g.repetir ? ' · ' + textoDelDia_(d, ZONA) : ''));
    },
    apuntarIngreso: function (i) {
      var importe = Math.abs(leerImporte_(i.importe)), d = diaDe(i.fecha), de = limpiarTexto_(i.de) || '(sin nombre)';
      if (!isFinite(importe) || !importe) return luego('Error: no entiendo el importe');
      var cat = normalizarTipo_(i.tipo) === DEVOLUCION ? buscarCategoria_(i.categoria, nombres) : '';
      entrada(d || new Date(), importe, de, cat ? DEVOLUCION : INGRESO, cat);
      return luego((cat ? 'Devolución apuntada: ' + formatoEuros_(importe) + ' en ' + cat : 'Entrada apuntada: ' + formatoEuros_(importe) + ' de ' + de) +
        (d ? ' · ' + textoDelDia_(d, ZONA) : ''));
    },
    cambiar: function (id, cat) { var g = buscar(gastos, id); if (g) g.categoria = cat; return luego('Hecho: «' + (g ? g.comercio : '') + '» irá siempre a ' + cat); },
    cambiarIngreso: function (id, tipo, cat) {
      var x = buscar(ingresos, id);
      if (x) { x.tipo = cat ? DEVOLUCION : INGRESO; x.categoria = cat || ''; }
      return luego('Hecho');
    },
    cuenta: function (id, cuenta) { var g = buscar(gastos, id); if (g) g.cuenta = normalizarCuenta_(cuenta); return luego('Hecho'); },
    borrar: function (id) { quitar(gastos, id) || quitar(ingresos, id); return luego('Borrado'); },
    repetir: function (id, cada) {
      var g = buscar(gastos, id);
      if (g) fijo(g.comercio, g.importe, g.categoria, normalizarCada_(cada), g.dia, normalizarCada_(cada) === CADA_ANIO ? +g.mes.slice(5) : 0, g.mes);
      return luego('Hecho: se repetirá');
    },
    cambiarFijo: function (fila, concepto, importe) {
      fijos.forEach(function (f) { if (f.fila === fila) f.importe = leerImporte_(importe); });
      return luego('Hecho: «' + concepto + '» ahora es ' + formatoEuros_(leerImporte_(importe)));
    },
    dejarFijo: function (fila, concepto) {
      fijos = fijos.filter(function (f) { return f.fila !== fila; });
      return luego('Listo: «' + concepto + '» ya no se apuntará solo');
    },
    editar: function (id, cambios) {
      var x = buscar(gastos, id) || buscar(ingresos, id);
      if (x && cambios.importe) x.importe = Math.abs(leerImporte_(cambios.importe));
      if (x && cambios.nombre) { if ('comercio' in x) x.comercio = cambios.nombre; else x.de = cambios.nombre; }
      if (x && 'nota' in cambios) x.nota = cambios.nota;
      return luego('Hecho');
    },
    crearCategoria: function (nombre, emoji) {
      var limpio = nombreCategoriaNueva_(nombre), ya = buscarCategoria_(limpio, nombres);
      if (!limpio) return luego('Error: escribe un nombre para la categoría');
      if (ya) return luego({ nombre: ya, emoji: '', nueva: false });
      nombres.push(limpio);
      return luego({ nombre: limpio, emoji: emojiCategoria_(emoji), nueva: true });
    },
    guardarObjetivo: function (vista, importe) {
      var v = leerImporte_(importe);
      objetivos[vista] = isFinite(v) && v > 0 ? v : 0;
      return luego('Hecho');
    }
  };

  // Un cartelito arriba, para que no se confunda con la app de verdad.
  var cartel = document.createElement('div');
  cartel.textContent = 'Vista previa';
  cartel.style.cssText = 'position:fixed;z-index:99;left:50%;top:calc(env(safe-area-inset-top, 0px) + 4px);transform:translateX(-50%);' +
    'padding:3px 10px;border-radius:99px;background:rgba(0,0,0,.6);color:#fff;font:600 11px/1.4 -apple-system,system-ui,sans-serif;' +
    'pointer-events:none;white-space:nowrap';
  document.body.appendChild(cartel);
})();
