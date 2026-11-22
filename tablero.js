/* Relevamiento migración Integra → DMS · tablero de seguimiento (T-024, E4, D-129). Solo para Pablo.
   Lee con su clave de GitHub el repo privado (publicación, respuestas consolidadas por el agente, mails de directores)
   y las carteras cifradas del sitio. No guarda nada; los datos quedan en memoria mientras la página está abierta. */
(function (g) {
  "use strict";
  var D = g.REL_DATOS, C = g.REL_CONS, CAT = g.REL_CAT, LS_TOKEN = "andreani.matriz-envios.github.token";
  var PRIV = "https://api.github.com/repos/Pblsanchez/andreani-migracion-datos/contents/relevamiento/";
  var SITIO = "https://pblsanchez.github.io/relevamiento-migracion-dms/";
  var EST = { sin: ["Sin enviar", "e-sin"], inc: ["Incompleto", "e-ns"], ns: ["Enviado con «No sé»", "e-ns"], ok: ["Enviado", "e-ok"] };
  var st = { fs: [], resp: null, pub: null, dirs: {}, vista: "avance", f: { dir: "", gc: "", estado: "", q: "" } };
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function n(x) { return Number(x).toLocaleString("es-AR"); }
  function fecha(iso) { return iso ? new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""; }
  function nom(lista, id) { if (id === "ns") return "No sé"; for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i].nombre; return id || ""; }
  function token() { try { return localStorage.getItem(LS_TOKEN) || ""; } catch (e) { return ""; } }

  /* ---------- carga ---------- */
  function leer(archivo, opcional) {
    return fetch(PRIV + archivo + "?ref=main", { headers: { Accept: "application/vnd.github.raw", Authorization: "Bearer " + token() }, cache: "no-store" }).then(function (r) {
      if (r.status === 404 && opcional) return "";
      if (!r.ok) { var e = new Error("GitHub respondió " + r.status); e.status = r.status; throw e; }
      return r.text();
    });
  }
  function aviso(tipo, html) { $("cuerpo").innerHTML = '<div class="alert alert-' + tipo + '" role="status"><div>' + html + "</div></div>"; }
  function cargar() {
    if (!token()) {
      $("kpis").innerHTML = "";
      aviso("info", "<strong>Para ver el tablero necesitás tu clave de GitHub</strong> (la misma de la Matriz de Envíos).");
      $("cuerpo").innerHTML += '<div class="campo tb-clave"><label for="tok">Clave de GitHub</label><input type="password" id="tok" autocomplete="off" spellcheck="false"></div><button type="button" class="btn btn-primary" id="btnTok">Entrar</button>';
      return;
    }
    aviso("info", "Cargando la publicación, las respuestas y las carteras…");
    Promise.all([leer("publicacion.json"), leer("respuestas.json", true), leer("directores.csv", true)]).then(function (x) {
      st.pub = JSON.parse(x[0]); st.resp = x[1] ? JSON.parse(x[1]) : null;
      st.dirs = {}; D.parseCSV(x[2], ";").slice(1).forEach(function (f) { if (f[0]) st.dirs[f[0].trim()] = { nombre: (f[1] || "").trim(), mail: (f[2] || "").trim() }; });
      var clave = D.claveDelLink(new URL(st.pub.link).hash);
      return D.cargar(clave, SITIO + D.ARCHIVO);
    }).then(function (pq) {
      st.fs = C.filas(pq, st.resp, D);
      opcionesFiltro(); pintar();
    }).catch(function (e) {
      aviso("warning", e.status === 401 || e.status === 403 || e.status === 404 ? "<strong>Tu clave de GitHub no puede leer el repositorio privado.</strong> Revisá que siga vigente y tenga acceso a andreani-migracion-datos." :
        "<strong>No se pudo armar el tablero.</strong> Si se volvieron a publicar las carteras hace menos de 2 minutos, esperá y recargá. (" + esc(e.message) + ")");
    });
  }

  /* ---------- filtros ---------- */
  function filtradas(sinDir) {
    var f = st.f, q = D.sinAcentos(f.q);
    return st.fs.filter(function (x) {
      return (sinDir || !f.dir || x.est[0] === f.dir) && (!f.gc || x.est[1] === f.gc) && (!f.estado || (f.estado === "env" ? x.estado !== "sin" : x.estado === f.estado || (f.estado === "ns" && x.estado === "inc"))) &&
        (!q || D.sinAcentos(x.est.join(" ")).indexOf(q) >= 0);
    });
  }
  function unicos(i, lista) { var m = {}; lista.forEach(function (x) { m[x.est[i]] = 1; }); return Object.keys(m).sort(function (a, b) { return a.localeCompare(b, "es"); }); }
  function select(id, vals, val, todos) { $(id).innerHTML = '<option value="">' + todos + "</option>" + vals.map(function (v) { return '<option value="' + esc(v) + '"' + (v === val ? " selected" : "") + ">" + esc(v) + "</option>"; }).join(""); }
  function opcionesFiltro() {
    select("fDir", unicos(0, st.fs), st.f.dir, "Todas las direcciones");
    select("fGc", unicos(1, st.fs.filter(function (x) { return !st.f.dir || x.est[0] === st.f.dir; })), st.f.gc, "Todos los gerentes comerciales");
  }

  /* ---------- vistas ---------- */
  function barra(pct, etiqueta) { return '<div class="tb-barra" role="progressbar" aria-label="' + esc(etiqueta) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><span style="width:' + pct + '%"></span></div>'; }
  function kpis(fs) {
    var t = C.totales(fs), r = st.resp;
    $("kpis").innerHTML = [["Carteras enviadas", n(t.enviadas) + " / " + n(t.carteras), t.pct + " %"], ["Contratos relevados", n(t.resp) + " / " + n(t.ct), t.pctCt + " %"],
      ["Se migran", n(t.mig), t.resp ? Math.round(t.mig * 100 / t.resp) + " % de lo relevado" : ""], ["Respuestas «No sé»", n(t.ns), t.conNs + " carteras para revisar"],
      ["Última consolidación", r && r.actualizado ? fecha(r.actualizado) : "Todavía no", r && r.stats ? r.stats.aplicados + " envíos nuevos en la última" : "Pedíselo al agente"]].map(function (k) {
      return '<div class="pub-stat"><span class="small">' + k[0] + "</span><b>" + k[1] + '</b><span class="small">' + esc(k[2]) + "</span></div>";
    }).join("");
  }
  function chip(f) { var e = EST[f.estado]; return '<span class="tb-chip ' + e[1] + '">' + e[0] + "</span>"; }
  function vAvance(fs) {
    var porDir = {}; fs.forEach(function (x) { (porDir[x.est[0]] = porDir[x.est[0]] || []).push(x); });
    var dirs = Object.keys(porDir).sort(function (a, b) { return porDir[b].length - porDir[a].length; });
    if (!dirs.length) return '<div class="alert alert-info"><div>No hay carteras con esos filtros.</div></div>';
    return dirs.map(function (d) {
      var lista = porDir[d], t = C.totales(lista), info = st.dirs[d], todas = st.fs.filter(function (x) { return x.est[0] === d; });
      var btn = info && info.mail ? '<button type="button" class="btn btn-primary btn-sm" data-reporte="' + esc(d) + '">Enviar reporte a ' + esc(info.nombre || d) + " por Teams</button>" :
        '<span class="small">' + (d.charAt(0) === "(" || d === "#N/A" ? "Sin director para reportar" : "Falta el mail del director en directores.csv") + "</span>";
      return '<section class="tb-dir"><div class="tb-dir-cab"><div><h2>' + esc(d === "#N/A" ? "#N/A (sin dirección en la base de rentabilidad)" : d) + '</h2><span class="small">' +
        n(t.enviadas) + " de " + n(t.carteras) + " carteras enviadas · " + n(t.resp) + " de " + n(t.ct) + " contratos relevados" + (t.conNs ? " · " + t.conNs + " con «No sé»" : "") + "</span>" +
        barra(t.pct, "Avance de " + d) + "</div><div class=\"tb-dir-acc\">" + btn + (lista.length < todas.length ? '<span class="small">El reporte incluye las ' + todas.length + " carteras de la dirección, no solo las filtradas.</span>" : "") + "</div></div>" +
        '<div class="tabla-wrap"><table><caption class="sr-only">Carteras de ' + esc(d) + '</caption><thead><tr><th scope="col">Gerente comercial</th><th scope="col">Gerente de cuenta</th><th scope="col">Ejecutivo</th><th scope="col">Clientes</th><th scope="col">Contratos</th><th scope="col">Estado</th><th scope="col">Enviado</th><th scope="col">«No sé»</th></tr></thead><tbody>' +
        lista.map(function (x) { return "<tr><td>" + esc(x.est[1]) + "</td><td>" + esc(x.est[2]) + "</td><td>" + esc(x.est[3]) + "</td><td>" + n(x.cli) + "</td><td>" + n(x.ct) + "</td><td>" + chip(x) + "</td><td>" + esc(fecha(x.enviado)) + "</td><td>" + (x.ns ? n(x.ns) : "") + "</td></tr>"; }).join("") +
        "</tbody></table></div></section>";
    }).join("");
  }
  function tablaConteo(titulo, pares, base) {
    var tot = pares.reduce(function (a, p) { return a + p[1]; }, 0);
    return '<section class="tb-res"><h3>' + esc(titulo) + '</h3><span class="small">' + esc(base) + '</span><div class="tabla-wrap"><table><thead><tr><th scope="col">Respuesta</th><th scope="col">Cantidad</th><th scope="col">%</th><th scope="col"><span class="sr-only">Gráfico</span></th></tr></thead><tbody>' +
      pares.map(function (p) { var pc = tot ? Math.round(p[1] * 100 / tot) : 0; return "<tr><td>" + esc(p[0]) + "</td><td>" + n(p[1]) + "</td><td>" + pc + ' %</td><td class="tb-mini">' + barra(pc, p[0]) + "</td></tr>"; }).join("") +
      "</tbody></table></div></section>";
  }
  function contar(lista, campo, ops) {
    var m = {}; lista.forEach(function (c) { if (c[campo]) m[c[campo]] = (m[c[campo]] || 0) + 1; });
    return ops.concat([{ id: "ns", nombre: "No sé" }]).filter(function (o, i, a) { return a.findIndex(function (z) { return z.id === o.id; }) === i; }).map(function (o) { return [o.codigo ? o.codigo + " · " + o.nombre : (o.id.length === 1 ? o.id + " · " : "") + o.nombre, m[o.id] || 0]; });
  }
  function vResultados(fs) {
    var cts = []; fs.forEach(function (x) { if (x.estado !== "sin") cts = cts.concat(x.contratos); });
    if (!cts.length) return '<div class="alert alert-info"><div>Todavía no hay respuestas para mostrar con estos filtros.</div></div>';
    var mig = cts.filter(function (c) { return c.m === "si"; }), clis = {};
    mig.forEach(function (c) { clis[c.razon] = c.etiq; });
    var migra = [["Migrar", mig.length]].concat(CAT.motivos.map(function (o) { return ["No migrar · " + o.nombre, cts.filter(function (c) { return c.m === "no" && c.mot === o.id; }).length]; })).concat([["No sé", cts.filter(function (c) { return c.m === "ns"; }).length]]);
    var et = {}; Object.keys(clis).forEach(function (k) { et[clis[k]] = (et[clis[k]] || 0) + 1; });
    return '<div class="tb-grid">' + tablaConteo("¿Se migra?", migra, n(cts.length) + " contratos relevados") +
      tablaConteo("Ciclo de vida", contar(mig, "ciclo", CAT.ciclos), n(mig.length) + " contratos a migrar") +
      tablaConteo("Condición de entrega", contar(mig, "cond", CAT.condiciones), n(mig.length) + " contratos a migrar") +
      tablaConteo("Tipo de etiqueta", CAT.etiquetas.concat([{ id: "ns", nombre: "No sé" }]).filter(function (o, i, a) { return a.findIndex(function (z) { return z.id === o.id; }) === i; }).map(function (o) { return [o.nombre, et[o.id] || 0]; }), n(Object.keys(clis).length) + " clientes con contratos a migrar") +
      tablaConteo("Integración", contar(mig, "integ", CAT.integraciones), n(mig.length) + " contratos a migrar") + "</div>";
  }
  function pintar() {
    var fs = filtradas(); kpis(fs);
    Array.prototype.forEach.call(document.querySelectorAll("[data-vista]"), function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-vista") === st.vista ? "true" : "false"); });
    var desc = st.resp && st.resp.descartes && st.resp.descartes.length ? '<p class="small">Mensajes descartados en la consolidación: ' + st.resp.descartes.length + " (pruebas, publicaciones anteriores o códigos dañados).</p>" : "";
    $("cuerpo").innerHTML = (st.vista === "avance" ? vAvance(fs) : vResultados(fs)) + desc;
  }

  /* ---------- reporte y descarga ---------- */
  function enviarReporte(d) {
    var info = st.dirs[d]; if (!info || !info.mail) return;
    var msg = C.reporte(d, info.nombre || d, st.fs.filter(function (x) { return x.est[0] === d; }), st.pub.link, new Date().toLocaleDateString("es-AR"));
    g.open("https://teams.microsoft.com/l/chat/0/0?users=" + encodeURIComponent(info.mail) + "&message=" + encodeURIComponent(msg), "_blank", "noopener");
  }
  function descargar() {
    var cab = ["Dirección", "Gerente comercial", "Gerente de cuenta", "Ejecutivo", "Estado de la cartera", "Enviado", "Razón social", "SAP", "Contrato", "Servicio", "¿Migra?", "Motivo", "Ciclo", "Condición", "Etiqueta", "Integración"];
    var lin = [cab];
    filtradas().forEach(function (x) {
      x.contratos.forEach(function (c) {
        var ci = CAT.ciclos.filter(function (o) { return o.id === c.ciclo; })[0];
        lin.push(x.est.concat([EST[x.estado][0], fecha(x.enviado), c.razon, c.sap, c.nro, c.servicio, nom(CAT.migrar, c.m), nom(CAT.motivos, c.mot), c.ciclo === "ns" ? "No sé" : ci ? ci.codigo + " · " + ci.nombre : "", c.cond ? (c.cond === "ns" ? "No sé" : c.cond + " · " + nom(CAT.condiciones, c.cond)) : "", nom(CAT.etiquetas, c.etiq), nom(CAT.integraciones, c.integ)]));
      });
    });
    var csv = "\uFEFF" + lin.map(function (f) { return f.map(function (v) { v = String(v == null ? "" : v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(";"); }).join("\r\n");
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = "relevamiento-dms-" + new Date().toISOString().slice(0, 10) + ".csv"; document.body.appendChild(a); a.click(); a.remove();
  }

  /* ---------- eventos ---------- */
  document.addEventListener("change", function (e) {
    var id = e.target.id;
    if (id === "fDir") { st.f.dir = e.target.value; st.f.gc = ""; opcionesFiltro(); pintar(); }
    else if (id === "fGc") { st.f.gc = e.target.value; pintar(); }
    else if (id === "fEstado") { st.f.estado = e.target.value; pintar(); }
  });
  document.addEventListener("input", function (e) { if (e.target.id === "fQ") { st.f.q = e.target.value; pintar(); } });
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("button") : null; if (!t) return;
    if (t.hasAttribute("data-vista")) { st.vista = t.getAttribute("data-vista"); pintar(); }
    else if (t.hasAttribute("data-reporte")) enviarReporte(t.getAttribute("data-reporte"));
    else if (t.id === "btnCsv") descargar();
    else if (t.id === "btnRecargar") cargar();
    else if (t.id === "btnTok") { var v = ($("tok") || {}).value || ""; if (v.trim()) { try { localStorage.setItem(LS_TOKEN, v.trim()); } catch (x) { /* nada */ } cargar(); } }
  });
  g.REL_TABLERO = { cargar: cargar, estado: st };
  cargar();
})(window);
