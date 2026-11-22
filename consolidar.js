/* Relevamiento migración Integra → DMS · consolidación y análisis de respuestas (T-024, E4, D-129). Sin datos en el código.
   Lo usan el tablero (navegador) y el agente (Node) para juntar los mensajes de Teams.
   Teams pega el texto dos veces: se lee solo el PRIMER código REL-DMS de cada mensaje. */
(function (g) {
  "use strict";
  var RE = /REL-DMS\|(\d+)\|([A-Za-z0-9_-]+)\|([zj])\|([A-Za-z0-9_-]+?)(?=Relevamiento|[^A-Za-z0-9_-]|$)/;

  function texto(html) {
    return String(html || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
  }
  function extraer(html) { var m = RE.exec(texto(html)); return m ? { ver: +m[1], id: m[2], tipo: m[3], cod: m[4] } : null; }
  function deb64u(s) { s = String(s).replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; var b = atob(s), o = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) o[i] = b.charCodeAt(i); return o; }
  function nada() { /* el error lo informa la lectura */ }
  function inflar(bytes) { var ds = new DecompressionStream("deflate-raw"), w = ds.writable.getWriter(); w.write(bytes).catch(nada); w.close().catch(nada); return new Response(ds.readable).text(); }
  function decodificar(x) { var b = deb64u(x.cod); return (x.tipo === "z" ? inflar(b) : Promise.resolve(new TextDecoder().decode(b))).then(JSON.parse); }

  /* id de cada cartera publicada (mismo cálculo que datos.js → cartera) */
  function indice(pq, D) {
    var m = {}; pq.est.forEach(function (t, i) { m["e" + D.hash(t.join("|"))] = i; });
    if (pq.cli.some(function (c) { return c[2] < 0; })) m[D.SIN.id] = -1;
    return m;
  }

  /* prev: respuestas.json anterior (o null) · mensajes: [{msg, fecha (ISO), de, html}] · vale el último envío por cartera */
  function consolidar(prev, mensajes, pq, D) {
    var r = prev && prev.envios ? JSON.parse(JSON.stringify(prev)) : { v: 1, envios: {}, vistos: [], descartes: [] };
    r.vistos = r.vistos || []; r.descartes = r.descartes || [];
    var idx = indice(pq, D), visto = {}; r.vistos.forEach(function (v) { visto[v] = 1; });
    var nuevos = mensajes.filter(function (m) { return !visto[m.msg]; }).sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; });
    var st = { leidos: nuevos.length, aplicados: 0, descartados: 0, sinCodigo: 0 };
    return nuevos.reduce(function (cad, m) {
      return cad.then(function () {
        r.vistos.push(m.msg);
        var x = extraer(m.html); if (!x) { st.sinCodigo++; return; }
        var desc = function (mot) { r.descartes.push({ msg: m.msg, fecha: m.fecha, de: m.de, id: x.id, motivo: mot }); st.descartados++; };
        if (!(x.id in idx)) return desc("La cartera no está en la publicación vigente (prueba o publicación anterior)");
        return decodificar(x).then(function (p) {
          if (!p || p.id !== x.id || !Array.isArray(p.c)) return desc("Código con formato inesperado");
          var ant = r.envios[x.id];
          if (ant && ant.fecha > m.fecha) return desc("Hay un envío más nuevo de esta cartera");
          r.envios[x.id] = { msg: m.msg, fecha: m.fecha, de: m.de, p: p }; st.aplicados++;
        }, function () { desc("El código no se pudo leer (incompleto o dañado)"); });
      });
    }, Promise.resolve()).then(function () { r.actualizado = new Date().toISOString(); r.stats = st; return r; });
  }

  /* ---------- análisis ---------- */
  function filas(pq, resp, D) {
    var envios = (resp && resp.envios) || {}, out = [], porEst = {};
    pq.cli.forEach(function (c) { var k = c[2] < 0 ? -1 : c[2]; (porEst[k] = porEst[k] || []).push(c); });
    Object.keys(porEst).forEach(function (k) {
      var i = +k, est = i < 0 ? ["(Sin ejecutivo asignado)", "—", "—", D.SIN.nombre] : pq.est[i], id = i < 0 ? D.SIN.id : "e" + D.hash(pq.est[i].join("|"));
      var env = envios[id], p = env && env.p, rc = {}, re = {};
      if (p) { p.c.forEach(function (x) { rc[x[0]] = x; }); (p.e || []).forEach(function (x) { re[x[0]] = x[1]; }); }
      var f = { id: id, est: est, cli: porEst[k].length, ct: 0, resp: 0, mig: 0, no: 0, ns: 0, enviado: env ? env.fecha : "", de: env ? env.de : "", contratos: [] };
      porEst[k].forEach(function (c) {
        var cid = c[1] || "c" + D.hash(c[0]), et = re[cid] || "";
        c[3].forEach(function (ct) {
          var x = rc[ct[0]] || [ct[0], "", "", "", "", ""];
          f.ct++; if (x[1]) f.resp++; if (x[1] === "si") f.mig++; if (x[1] === "no") f.no++;
          var mg = x[1] === "si";
          [x[1], mg ? x[3] : "", mg ? x[4] : "", mg ? x[5] : "", mg ? et : ""].forEach(function (v) { if (v === "ns") f.ns++; });
          f.contratos.push({ razon: c[0], sap: c[1], nro: ct[0], servicio: ct[1], m: x[1], mot: x[2], ciclo: mg ? x[3] : "", cond: mg ? x[4] : "", integ: mg ? x[5] : "", etiq: mg ? et : "" });
        });
      });
      f.estado = !env ? "sin" : f.resp < f.ct ? "inc" : f.ns ? "ns" : "ok";
      out.push(f);
    });
    return out.sort(function (a, b) { return a.est.join("|").localeCompare(b.est.join("|"), "es"); });
  }
  function totales(fs) {
    var t = { carteras: fs.length, enviadas: 0, ct: 0, resp: 0, ns: 0, mig: 0, no: 0, conNs: 0 };
    fs.forEach(function (f) { if (f.estado !== "sin") t.enviadas++; if (f.estado === "ns") t.conNs++; t.ct += f.ct; t.resp += f.resp; t.ns += f.ns; t.mig += f.mig; t.no += f.no; });
    t.pct = t.carteras ? Math.round(t.enviadas * 100 / t.carteras) : 0;
    t.pctCt = t.ct ? Math.round(t.resp * 100 / t.ct) : 0;
    return t;
  }
  /* mensaje para el director (una sola línea: Teams no respeta los saltos en un mensaje precargado) */
  function reporte(dir, nombre, fs, link, fecha) {
    var t = totales(fs), falta = {}, ns = [];
    fs.forEach(function (f) { if (f.estado === "sin" || f.estado === "inc") (falta[f.est[1]] = falta[f.est[1]] || []).push(f.est[3]); if (f.estado === "ns") ns.push(f.est[3] + " (" + f.ns + ")"); });
    var gcs = Object.keys(falta).sort(function (a, b) { return a.localeCompare(b, "es"); });
    var s = "Hola " + nombre + ", te paso cómo viene el relevamiento de migración a DMS en tu dirección al " + fecha + ": " + t.enviadas + " de " + t.carteras + " carteras enviadas (" + t.pct + " %) y " + t.resp + " de " + t.ct + " contratos relevados.";
    s += gcs.length ? " Faltan enviar: " + gcs.map(function (gc) { return gc + " → " + falta[gc].join(", "); }).join(" | ") + "." : " ¡Ya enviaron todas las carteras!";
    if (ns.length) s += " Enviaron con respuestas «No sé» para revisar: " + ns.join(", ") + ".";
    if (gcs.length) s += " Te pido que se lo bajes a tu equipo. El relevamiento se completa desde este link: " + link;
    return s + " Gracias.";
  }

  g.REL_CONS = { extraer: extraer, decodificar: decodificar, indice: indice, consolidar: consolidar, filas: filas, totales: totales, reporte: reporte, texto: texto };
})(typeof window !== "undefined" ? window : globalThis);
