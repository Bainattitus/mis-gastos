// Utilities falso de Apps Script: formatDate y parseDate con la zona horaria pedida.
function partes(d, tz) {
  var f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  var o = {};
  f.formatToParts(d).forEach(function (p) { o[p.type] = p.value; });
  return o;
}
var Utilities = {
  formatDate: function (d, tz, patron) {
    var p = partes(d, tz);
    return patron.replace(/yyyy|MM|M|dd|d|HH|mm|ss/g, function (t) {
      return { yyyy: p.year, MM: p.month, M: String(+p.month), dd: p.day, d: String(+p.day), HH: p.hour, mm: p.minute, ss: p.second }[t];
    });
  },
  parseDate: function (texto, tz) {
    var m = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}))?$/.exec(texto);
    var utc = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
    var d = new Date(utc);
    for (var i = 0; i < 3; i++) {
      var p = partes(d, tz);
      var visto = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
      d = new Date(d.getTime() + (utc - visto));
    }
    return d;
  },
  getUuid: function () { return 'xxxxxxxx-xxxx'.replace(/x/g, function () { return (Math.random() * 16 | 0).toString(16); }); }
};
