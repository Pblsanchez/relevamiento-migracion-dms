/* Relevamiento migración Integra → DMS · arranque y selección de cartera (T-024, D-126).
   Un solo link para todo el equipo: filtro en cascada Dirección → Gerente comercial → Gerente de cuenta → Ejecutivo. */
(function (g) {
  "use strict";
  var D = g.REL_DATOS, pq = null, LS = "rel-dms.sel", sel = ["", "", "", ""], cnt = [], sinN = 0;
  var NIV = [
    { id: "s-dir", t: "Dirección comercial" }, { id: "s-gc", t: "Gerente comercial" },
    { id: "s-gcu", t: "Gerente de cuenta" }, { id: "s-ej", t: "Ejecutivo de cuentas" }
  ];
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function plural(n, s, p) { return n + " " + (n === 1 ? s : p); }

  /* ---------- opciones en cascada ---------- */
  function compatibles(hasta) {
    var out = [];
    pq.est.forEach(function (t, i) { for (var k = 0; k < hasta; k++) if (sel[k] && t[k] !== sel[k]) return; out.push(i); });
    return out;
  }
  function opciones(nivel) {
    var m = {};
    compatibles(nivel).forEach(function (i) { var v = pq.est[i][nivel]; m[v] = (m[v] || 0) + cnt[i]; });
    return Object.keys(m).sort(function (a, b) { return a.localeCompare(b, "es"); }).map(function (v) { return { v: v, n: m[v] }; });
  }
  function estElegida() {
    if (sel[0] === D.SIN.id) return D.SIN.id;
    if (!sel[3]) return null;
    var c = compatibles(4); return c.length === 1 ? c[0] : null;
  }

  /* ---------- vista de selección ---------- */
  function vistaSel(foco) {
    var sin = sel[0] === D.SIN.id, h = '<div class="sel-card">' +
      '<h1 id="selT" tabindex="-1">¿De quién es la cartera que vas a relevar?</h1>' +
      '<p class="bajada">Elegí la estructura comercial hasta llegar al ejecutivo. Si sos gerente, podés completar la de alguien de tu equipo.</p><div class="sel-grid">';
    NIV.forEach(function (n, i) {
      var hab = i === 0 || (!sin && sel[i - 1]), ops = hab ? opciones(i) : [];
      h += '<div class="campo"><label for="' + n.id + '">' + (i + 1) + ". " + n.t + "</label>" +
        '<select id="' + n.id + '" data-nivel="' + i + '"' + (hab ? "" : " disabled") + '><option value="">' + (hab ? "Elegir…" : "—") + "</option>" +
        ops.map(function (o) { return '<option value="' + esc(o.v) + '"' + (sel[i] === o.v ? " selected" : "") + ">" + esc(o.v) + " (" + plural(o.n, "cliente", "clientes") + ")</option>"; }).join("") +
        (i === 0 && sinN ? '<option value="' + D.SIN.id + '"' + (sin ? " selected" : "") + ">" + esc(D.SIN.nombre) + " (" + plural(sinN, "cliente", "clientes") + ")</option>" : "") +
        "</select></div>";
    });
    var e = estElegida();
    h += '</div><div class="sel-acc"><button type="button" class="btn btn-primary" id="btnVer"' + (e === null ? " disabled" : "") + ">Ver cartera</button>" +
      (e === null ? '<span class="small">Elegí los cuatro niveles para ver la cartera.</span>' : '<span class="small">' + esc(resumen(e)) + "</span>") + "</div>" +
      '<div class="sel-busca"><div class="campo"><label for="busca">¿No encontrás un cliente? Buscalo por razón social o SAP</label>' +
      '<input type="search" id="busca" autocomplete="off" aria-describedby="busca-a" aria-controls="resBusca"><span class="ayuda" id="busca-a">Te muestra de qué cartera es y te lleva directo.</span></div>' +
      '<ul class="res-busca" id="resBusca" aria-live="polite"></ul></div></div>';
    $("vistaSel").innerHTML = h;
    if (foco) { var f = $(foco); if (f) f.focus(); }
  }
  function resumen(e) {
    var c = D.cartera(pq, e), n = 0; c.clientes.forEach(function (k) { n += k.contratos.length; });
    return (e === D.SIN.id ? D.SIN.nombre : c.ejecutivo) + ": " + plural(c.clientes.length, "cliente", "clientes") + " y " + plural(n, "contrato", "contratos") + " B2C.";
  }
  function buscar(txt) {
    var q = D.sinAcentos(txt), ul = $("resBusca");
    if (q.length < 3) { ul.innerHTML = q ? '<li class="small">Escribí al menos 3 letras o números.</li>' : ""; return; }
    var res = [];
    pq.cli.forEach(function (c, i) { if (res.length < 15 && (D.sinAcentos(c[0]).indexOf(q) >= 0 || (c[1] && c[1].indexOf(q) >= 0))) res.push(i); });
    ul.innerHTML = res.length ? res.map(function (i) {
      var c = pq.cli[i], quien = c[2] < 0 ? D.SIN.nombre : pq.est[c[2]][3] + " · " + pq.est[c[2]][2];
      return '<li><button type="button" class="res-op" data-cli="' + i + '"><span class="strong">' + esc(c[0]) + "</span>" + (c[1] ? " · SAP " + esc(c[1]) : "") +
        '<span class="small">Cartera de ' + esc(quien) + "</span></button></li>";
    }).join("") : '<li class="small">No hay clientes B2C con ese nombre o SAP.</li>';
  }

  /* ---------- abrir una cartera ---------- */
  function abrir(e) {
    var c = D.cartera(pq, e);
    try { localStorage.setItem(LS, JSON.stringify(e === D.SIN.id ? D.SIN.id : pq.est[e])); } catch (x) { /* sin almacenamiento */ }
    sel = e === D.SIN.id ? [D.SIN.id, "", "", ""] : pq.est[e].slice();
    $("vistaSel").hidden = true; $("vistaRel").hidden = false; $("quienBox").hidden = false;
    g.REL_APP.iniciar(c);
    var t = $("pasoT"); if (t) t.focus();
  }
  function mostrarSel(sinFoco) {
    $("vistaRel").hidden = true; $("quienBox").hidden = true; $("vistaSel").hidden = false;
    vistaSel(sinFoco === true ? null : "selT");
  }
  function recordada() {
    var s = null; try { s = JSON.parse(localStorage.getItem(LS)); } catch (x) { s = null; }
    if (s === D.SIN.id) return sinN ? D.SIN.id : null;
    if (!Array.isArray(s)) return null;
    for (var i = 0; i < pq.est.length; i++) if (pq.est[i].join("|") === s.join("|")) return i;
    return null;
  }

  /* ---------- arranque ---------- */
  function aviso(tipo, html) { $("vistaSel").innerHTML = '<div class="sel-card"><div class="alert alert-' + tipo + '" role="status"><div>' + html + "</div></div></div>"; }
  function listo(p, txtBanner) {
    pq = p; cnt = pq.est.map(function () { return 0; }); sinN = 0;
    pq.cli.forEach(function (c) { if (c[2] < 0) sinN++; else cnt[c[2]]++; });
    $("banner").innerHTML = txtBanner;
    var e = recordada();
    if (e !== null) abrir(e); else mostrarSel(true);
  }
  /* La llave del link queda guardada en este navegador: la próxima vez se puede entrar desde el Portal sin el link (v0.2.3) */
  var LS_K = "rel-dms.k";
  function claveGuardada() { try { return localStorage.getItem(LS_K) || ""; } catch (x) { return ""; } }
  function guardarClave(k) { try { localStorage.setItem(LS_K, k); } catch (x) { /* sin almacenamiento */ } }
  function arrancar() {
    var demo = /[?&]demo(?:=|&|$)/.test(location.search), delLink = D.claveDelLink(location.hash), clave = delLink || claveGuardada();
    if (demo) { listo(g.REL_DEMO, "Ejemplo con clientes y contratos <strong>inventados</strong>. Tus respuestas quedan guardadas en este navegador."); return; }
    if (!clave) {
      $("banner").textContent = "Relevamiento de la migración Integra → DMS";
      aviso("info", "<strong>Para entrar necesitás el link que te mandó Pablo Sánchez</strong>: trae la llave para ver las carteras. Si lo abriste desde otro lado, buscalo en tu Teams. " +
        '¿Querés ver cómo funciona? <a href="?demo">Abrí el ejemplo</a>.');
      return;
    }
    aviso("info", "Cargando las carteras…");
    intentar(clave, delLink, 0);
  }
  /* v0.2.4: si el link es nuevo y GitHub Pages todavía sirve el archivo anterior (tarda 1–2 min en publicar), reintenta solo */
  var REINT = 8, ESPERA = 15000;
  function intentar(clave, delLink, n) {
    D.cargar(clave, D.ARCHIVO).then(function (p) {
      var f = new Date(p.gen);
      guardarClave(clave);
      listo(p, "Carteras B2C de la Matriz de Envíos al " + f.toLocaleDateString("es-AR") + ". Tus respuestas quedan guardadas en este navegador hasta que las envíes.");
    }, function () {
      $("banner").textContent = "Relevamiento de la migración Integra → DMS";
      if (delLink && n < REINT) {
        aviso("info", "<strong>Estamos terminando de publicar las carteras.</strong> Puede tardar uno o dos minutos; la página vuelve a probar sola (intento " + (n + 1) + " de " + REINT + ").");
        setTimeout(function () { intentar(clave, delLink, n + 1); }, ESPERA); return;
      }
      if (!delLink) { try { localStorage.removeItem(LS_K); } catch (x) { /* nada */ } }
      aviso("warning", "<strong>No se pudieron abrir las carteras.</strong> " + (delLink ? "El link puede estar incompleto o haber sido reemplazado por uno nuevo." : "Las carteras se volvieron a publicar con una llave nueva.") +
        " Abrí el link actualizado que te mandó Pablo Sánchez por Teams: después vas a poder entrar también desde el Portal.");
    });
  }

  /* ---------- eventos ---------- */
  document.addEventListener("change", function (ev) {
    var t = ev.target; if (!t.hasAttribute || !t.hasAttribute("data-nivel")) return;
    var n = +t.getAttribute("data-nivel"); sel[n] = t.value;
    for (var k = n + 1; k < 4; k++) sel[k] = "";
    if (sel[0] !== D.SIN.id) for (var j = n + 1; j < 4; j++) { var o = opciones(j); if (sel[j - 1] && o.length === 1) sel[j] = o[0].v; else break; }
    vistaSel(t.id);
  });
  document.addEventListener("input", function (ev) { if (ev.target.id === "busca") buscar(ev.target.value); });
  document.addEventListener("click", function (ev) {
    var t = ev.target.closest ? ev.target.closest("button") : null; if (!t) return;
    if (t.id === "btnVer") { var e = estElegida(); if (e !== null) abrir(e); }
    else if (t.id === "btnCambiar") mostrarSel();
    else if (t.hasAttribute("data-cli")) { var c = pq.cli[+t.getAttribute("data-cli")]; abrir(c[2] < 0 ? D.SIN.id : c[2]); }
  });
  /* v0.2.4: pegar un link nuevo en la misma pestaña solo cambia el # y el navegador no recarga: se fuerza la recarga */
  g.addEventListener("hashchange", function () { if (D.claveDelLink(location.hash)) location.reload(); });
  g.REL_SEL = { arrancar: arrancar, mostrar: mostrarSel };
  arrancar();
})(window);
