/* Relevamiento migración Integra → DMS · publicación de carteras (T-024, D-126). Solo para Pablo.
   Corre en su navegador con su clave de GitHub: lee el repo privado, arma y cifra las carteras, sube el archivo cifrado
   al repo público y devuelve el link (con la llave en el #). Ningún dato ni clave queda en este código. */
(function (g) {
  "use strict";
  var D = g.REL_DATOS, LS_TOKEN = "andreani.matriz-envios.github.token";
  var PRIV = "https://api.github.com/repos/Pblsanchez/andreani-migracion-datos", PUB = "https://api.github.com/repos/Pblsanchez/relevamiento-migracion-dms";
  var SITIO = "https://pblsanchez.github.io/relevamiento-migracion-dms/", REG = "relevamiento/publicacion.json", REG_ASIG = "relevamiento/asignaciones.csv";
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function token() { var t = ""; try { t = localStorage.getItem(LS_TOKEN) || ""; } catch (e) { t = ""; } return t || ($("tok") ? $("tok").value.trim() : ""); }
  function api(metodo, url, cuerpo, crudo) {
    var h = { Accept: crudo ? "application/vnd.github.raw" : "application/vnd.github+json", Authorization: "Bearer " + token() };
    if (cuerpo) h["Content-Type"] = "application/json";
    return fetch(url, { method: metodo, headers: h, body: cuerpo ? JSON.stringify(cuerpo) : undefined, cache: "no-store" }).then(function (r) {
      return r.text().then(function (t) {
        if (!r.ok) { var e = new Error("GitHub respondió " + r.status); e.status = r.status; throw e; }
        return crudo ? t : (t ? JSON.parse(t) : null);
      });
    });
  }
  function ruta(p) { return "/contents/" + p.split("/").map(encodeURIComponent).join("/"); }
  function leer(p) { return api("GET", PRIV + ruta(p) + "?ref=main", null, true); }
  function shaDe(base, p) { return api("GET", base + ruta(p) + "?ref=main").then(function (j) { return j && j.sha; }, function (e) { if (e.status === 404) return null; throw e; }); }
  function subir(base, p, b64, msg) {
    return shaDe(base, p).then(function (sha) { var c = { message: msg, content: b64, branch: "main" }; if (sha) c.sha = sha; return api("PUT", base + ruta(p), c); });
  }

  var pasos = [];
  function paso(txt, estado) { pasos.push({ t: txt, e: estado || "…" }); pintar(); return pasos.length - 1; }
  function fin(i, estado, txt) { pasos[i].e = estado; if (txt) pasos[i].t = txt; pintar(); }
  function pintar() { $("pasosPub").innerHTML = pasos.map(function (p) { return "<li><strong>" + esc(p.e) + "</strong> " + esc(p.t) + "</li>"; }).join(""); }
  function mostrarLink(link, st, fecha, nota) {
    var h = '<div class="alert alert-success" role="status"><div><strong>Listo.</strong> Este es el link para el equipo comercial' + (fecha ? " (publicado el " + esc(fecha) + ")" : "") + ". Mandalo solo por canales internos: quien lo tiene ve todas las carteras.</div></div>" +
      '<div class="campo"><label for="lnk">Link del relevamiento</label><textarea id="lnk" class="pub-link" rows="3" readonly>' + esc(link) + "</textarea></div>" +
      '<div class="sel-acc"><button type="button" class="btn btn-primary" id="btnCopiarLnk">Copiar link</button><a class="btn btn-secondary" href="' + esc(link) + '" target="_blank" rel="noopener">Abrir y probar</a></div>' +
      (nota ? '<p class="small">' + nota + "</p>" : "");
    if (st) h += '<div class="pub-stats">' + [["Ejecutivos", st.ejecutivos], ["Clientes B2C", st.clientes], ["Contratos B2C", st.contratos], ["Dueño tomado del CRM", (st.porCRM || {}).clientes || 0], ["Clientes sin ejecutivo", st.sinAsignar.clientes]].map(function (x) {
      return '<div class="pub-stat"><b>' + x[1].toLocaleString("es-AR") + '</b><span class="small">' + x[0] + "</span></div>"; }).join("") + "</div>" +
      '<p class="small">Clientes sin dueño: ' + st.sinAsignar.clientes + " (" + st.sinAsignar.contratos + " contratos). No tienen ejecutivo en la base de rentabilidad ni en asignaciones.csv: quedan en «Sin ejecutivo asignado».</p>";
    $("resultado").innerHTML = h;
  }
  function esperarPages(bin) {
    var i = paso("Esperando que GitHub Pages publique el archivo (1 a 3 minutos)…"), t0 = Date.now();
    return new Promise(function (ok) {
      (function intentar() {
        fetch(SITIO + D.ARCHIVO + "?t=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.ok ? r.arrayBuffer() : null; }).then(function (b) {
          var u = b && new Uint8Array(b), igual = u && u.length === bin.length;
          for (var k = 0; igual && k < 16; k++) if (u[k] !== bin[k]) igual = false;
          if (igual) { fin(i, "✓", "Archivo publicado y verificado en el sitio."); ok(true); }
          else if (Date.now() - t0 > 300000) { fin(i, "!", "GitHub Pages todavía no lo publicó. Esperá unos minutos más y probá el link."); ok(false); }
          else setTimeout(intentar, 10000);
        }, function () { setTimeout(intentar, 10000); });
      })();
    });
  }

  var ultimo = null;
  function publicar() {
    /* v0.2.4: el 22/11 se publicó dos veces en 18 s y el primer link quedó muerto: se pide confirmación */
    if (ultimo && !g.confirm("Ya hay un link publicado (" + ultimo + "). Si publicás de nuevo, ese link deja de funcionar y tenés que mandar el nuevo a todo el equipo. ¿Publicar igual?")) return;
    if (!token()) { $("resultado").innerHTML = '<div class="alert alert-warning" role="alert"><div>Falta la clave de GitHub. Pegala en el campo de arriba.</div></div>'; return; }
    $("btnPub").disabled = true; pasos = []; $("resultado").innerHTML = "";
    var st, bin, link, i = paso("Leyendo la Matriz, los vínculos RSA y la base de rentabilidad del repo privado…");
    var asigOpc = leer(REG_ASIG).catch(function (e) { if (e.status === 404) return ""; throw e; });
    Promise.all([leer("matriz/base.json"), leer("rsa/vinculos.json"), leer("fuentes/rentabilidad_rsa.csv"), asigOpc]).then(function (x) {
      fin(i, "✓");
      i = paso("Armando las carteras B2C por estructura comercial…");
      var a = D.armar(JSON.parse(x[0]), JSON.parse(x[1]), x[2], x[3]); st = a.stats;
      fin(i, "✓", "Carteras armadas: " + st.ejecutivos + " ejecutivos, " + st.clientes + " clientes, " + st.contratos + " contratos B2C." +
        (x[3] ? " Dueños tomados del CRM (asignaciones.csv): " + st.porCRM.clientes + " clientes." : " Sin asignaciones.csv: los clientes sin RSA quedan «Sin ejecutivo»."));
      i = paso("Cifrando…");
      return D.cifrar(a.paquete);
    }).then(function (c) {
      bin = c.bin; link = SITIO + "#k=" + c.clave;
      fin(i, "✓", "Cifrado (" + Math.round(bin.length / 1024) + " KB). La llave solo va en el link.");
      i = paso("Subiendo el archivo cifrado al sitio público…");
      return subir(PUB, D.ARCHIVO, D.b64(bin), "T-024: carteras cifradas del relevamiento (" + st.clientes + " clientes)").then(function () { fin(i, "✓"); }, function (e) {
        if (e.status === 403 || e.status === 404) {
          fin(i, "✗", "Tu clave de GitHub no puede escribir en relevamiento-migracion-dms.");
          throw Object.assign(new Error("permiso"), { permiso: true });
        }
        throw e;
      });
    }).then(function () {
      i = paso("Guardando una copia del link en el repo privado…");
      var reg = { publicado: new Date().toISOString(), version: VER, link: link, stats: st, bytes: bin.length };
      return subir(PRIV, REG, D.b64(new TextEncoder().encode(JSON.stringify(reg, null, 1) + "\n")), "T-024: link del relevamiento publicado").then(function () { fin(i, "✓"); },
        function () { fin(i, "!", "No se pudo guardar la copia del link (guardalo vos)."); });
    }).then(function () { return esperarPages(bin); }).then(function () {
      ultimo = new Date().toLocaleString("es-AR");
      mostrarLink(link, st, ultimo);
      $("btnPub").disabled = false;
    }).catch(function (e) {
      $("btnPub").disabled = false;
      if (e.permiso) {
        $("resultado").innerHTML = '<div class="alert alert-warning" role="alert"><div><strong>Falta un permiso.</strong> En GitHub → Settings → Developer settings → tu token → Repository access, sumá <strong>relevamiento-migracion-dms</strong> con «Contents: Read and write», guardá y volvé a tocar «Publicar».</div></div>';
      } else {
        fin(pasos.length - 1, "✗", (pasos[pasos.length - 1] || {}).t + " — " + (e && e.message ? e.message : e));
        $("resultado").innerHTML = '<div class="alert alert-warning" role="alert"><div>No se pudo publicar. Revisá que la clave de GitHub siga vigente y que tenga acceso a andreani-migracion-datos.</div></div>';
      }
    });
  }

  var VER = "0.2.4";
  function iniciar() {
    /* Si el navegador quedó con una versión vieja guardada, no se publica (OJO 22/11: salió sin asignaciones.csv) */
    var ok = D.VER === VER;
    $("verPub").textContent = "Versión " + VER + (ok ? "" : " · el navegador cargó una versión vieja");
    if (!ok) {
      $("btnPub").disabled = true;
      $("estadoClave").innerHTML = '<div class="alert alert-warning" role="alert"><div><strong>Tu navegador tiene guardada una versión vieja de esta página.</strong> Recargala con <strong>Ctrl + F5</strong> (o Ctrl + Shift + R) y volvé a entrar.</div></div>';
      return;
    }
    var t = ""; try { t = localStorage.getItem(LS_TOKEN) || ""; } catch (e) { t = ""; }
    $("estadoClave").innerHTML = t ? '<div class="alert alert-success"><div>Se usa la clave de GitHub que ya tenés guardada en este navegador (la de la Matriz de Envíos).</div></div>'
      : '<div class="alert alert-info"><div>No hay una clave de GitHub guardada en este navegador. Pegá la tuya (la misma de la Matriz, con acceso de escritura a andreani-migracion-datos y relevamiento-migracion-dms).</div></div>' +
        '<div class="campo"><label for="tok">Clave de GitHub</label><input type="password" id="tok" class="pub-link" autocomplete="off" spellcheck="false"></div>';
    if (t) leer(REG).then(function (txt) {
      var r = JSON.parse(txt); if (r && r.publicado) ultimo = new Date(r.publicado).toLocaleString("es-AR"); if (!pasos.length && r && r.link) mostrarLink(r.link, r.stats, new Date(r.publicado).toLocaleString("es-AR"), "Es el último link publicado. Si cambió la Matriz o la base de rentabilidad, tocá «Publicar» para generar uno nuevo (el anterior deja de funcionar).");
    }).catch(function () { /* todavía no se publicó */ });
  }
  document.addEventListener("click", function (ev) {
    var t = ev.target.closest ? ev.target.closest("button") : null; if (!t) return;
    if (t.id === "btnPub") publicar();
    else if (t.id === "btnCopiarLnk") { var a = $("lnk"); a.select(); if (navigator.clipboard) navigator.clipboard.writeText(a.value); t.textContent = "Copiado"; }
  });
  iniciar();
})(window);
