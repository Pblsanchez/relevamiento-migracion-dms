/* Relevamiento migración Integra → DMS · datos (T-024, D-126). Sin datos en el código.
   Arma las carteras (Matriz B2C → RSA → estructura comercial), las cifra (AES-GCM, clave en el # del link) y las descifra. */
(function (g) {
  "use strict";
  var MAGIA = [82, 68, 77, 49]; /* "RDM1" */
  var INTERNOS = ["correo andreani s a", "andreani online"], SEG_INTERNOS = ["andreani"], B2B = ["350", "351"];
  var SIN = { id: "sin", nombre: "Sin ejecutivo asignado" };

  function sinAcentos(s) { return String(s == null ? "" : s).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  function plano(s) { return sinAcentos(s).replace(/[.\s]+/g, " ").trim(); }
  function esInterno(r) {
    var c = plano(r.cliente);
    return INTERNOS.some(function (k) { return c === k || c.indexOf(k + " ") === 0; }) || SEG_INTERNOS.indexOf(sinAcentos(r.segmento)) >= 0;
  }
  function canal(r) {
    if (r.canal) return /b2b/i.test(r.canal) ? "B2B" : "B2C";
    var c = String(r.contrato || "");
    return B2B.some(function (p) { return c.indexOf(p) === 0; }) ? "B2B" : "B2C";
  }
  function parseCSV(txt, sep) {
    txt = String(txt || "").replace(/^\uFEFF/, "");
    var filas = [], f = [], v = "", q = false;
    for (var i = 0; i < txt.length; i++) {
      var ch = txt[i];
      if (q) { if (ch === '"') { if (txt[i + 1] === '"') { v += '"'; i++; } else q = false; } else v += ch; }
      else if (ch === '"') q = true;
      else if (ch === sep) { f.push(v); v = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && txt[i + 1] === "\n") i++; f.push(v); filas.push(f); f = []; v = ""; }
      else v += ch;
    }
    if (v !== "" || f.length) { f.push(v); filas.push(f); }
    return filas.filter(function (x) { return x.some(function (y) { return String(y).trim() !== ""; }); });
  }

  /* base: matriz/base.json · vinculos: rsa/vinculos.json · csv: fuentes/rentabilidad_rsa.csv (texto) */
  function armar(base, vinculos, csv) {
    var filas = parseCSV(csv, ";"), cab = (filas.shift() || []).map(sinAcentos);
    function col(re) { for (var i = 0; i < cab.length; i++) if (re.test(cab[i])) return i; return -1; }
    var iR = col(/^id_rsa$/), iE = col(/^ejecutivo/), iGcu = col(/^gerente cuenta/), iGc = col(/^gerente comercial/), iD = col(/^direccion/);
    if ([iR, iE, iGcu, iGc, iD].some(function (x) { return x < 0; })) throw new Error("La base de rentabilidad no tiene las columnas esperadas (ID_RSA, Ejecutivo Cuentas, Gerente Cuenta, Gerente Comercial, Dirección Comercial).");
    var estRsa = {};
    filas.forEach(function (f) { var id = String(f[iR] || "").trim(); if (id) estRsa[id] = [f[iD], f[iGc], f[iGcu], f[iE]].map(function (x) { return String(x || "").trim(); }); });
    var vin = {};
    ((vinculos && vinculos.vinculos) || []).forEach(function (v) { vin[v.rs] = v; });

    var clientes = {}, orden = [];
    ((base && base.registros) || []).forEach(function (r) {
      var nro = String(r.contrato || "").trim();
      if (!nro || nro.charAt(0) === "(" || canal(r) !== "B2C" || esInterno(r)) return;
      var rs = String(r.cliente || "").trim() || "(Sin razón social)";
      var k = clientes[rs] || (clientes[rs] = { razon: rs, cts: {} }, orden.push(rs), clientes[rs]);
      var s = k.cts[nro] || (k.cts[nro] = {});
      if (r.servicio) s[String(r.servicio).trim()] = 1;
    });

    var est = [], idxEst = {}, cli = [], st = { clientes: 0, contratos: 0, sinAsignar: { clientes: 0, contratos: 0, sinVinculo: 0, sinEstructura: 0, ambiguos: 0 } };
    orden.sort(function (a, b) { return a.localeCompare(b, "es"); }).forEach(function (rs) {
      var k = clientes[rs], v = vin[rs] || { rsa: [], sol: [] }, tuplas = {};
      (v.rsa || []).forEach(function (id) { var t = estRsa[id]; if (t) tuplas[t.join("\u0001")] = t; });
      var ks = Object.keys(tuplas), e = -1;
      if (ks.length === 1) {
        if (!(ks[0] in idxEst)) { idxEst[ks[0]] = est.length; est.push(tuplas[ks[0]]); }
        e = idxEst[ks[0]];
      }
      var cts = Object.keys(k.cts).sort().map(function (n) { return [n, Object.keys(k.cts[n]).sort().join(" · ")]; });
      cli.push([rs, String((v.sol || [])[0] || ""), e, cts]);
      st.clientes++; st.contratos += cts.length;
      if (e < 0) {
        st.sinAsignar.clientes++; st.sinAsignar.contratos += cts.length;
        if (!(v.rsa || []).length) st.sinAsignar.sinVinculo++; else if (!ks.length) st.sinAsignar.sinEstructura++; else st.sinAsignar.ambiguos++;
      }
    });
    st.ejecutivos = est.length;
    return { paquete: { v: 1, gen: new Date().toISOString(), est: est, cli: cli }, stats: st };
  }

  /* ---------- cartera de una selección ---------- */
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ("0000000" + (h >>> 0).toString(16)).slice(-8); }
  function cartera(pq, e) {
    var sin = e === SIN.id || e < 0, t = sin ? [] : pq.est[e];
    return { id: sin ? SIN.id : "e" + hash(t.join("|")), ejecutivo: sin ? SIN.nombre : t[3], estructura: t,
      clientes: pq.cli.map(function (c, i) { return { c: c, i: i }; }).filter(function (x) { return sin ? x.c[2] < 0 : x.c[2] === e; }).map(function (x) {
        return { id: x.c[1] || "c" + hash(x.c[0]), razon: x.c[0], sap: x.c[1], contratos: x.c[3].map(function (ct) { return { nro: ct[0], servicio: ct[1] }; }) };
      }) };
  }

  /* ---------- bytes, compresión y cifrado ---------- */
  function b64(bytes) { var s = ""; for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); }
  function b64u(bytes) { return b64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  function deb64u(s) { s = String(s).replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; var b = atob(s), o = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) o[i] = b.charCodeAt(i); return o; }
  function flujo(bytes, ts) { var w = ts.writable.getWriter(); w.write(bytes); w.close(); return new Response(ts.readable).arrayBuffer().then(function (b) { return new Uint8Array(b); }); }
  function comprimir(txt) { return flujo(new TextEncoder().encode(txt), new CompressionStream("deflate-raw")); }
  function descomprimir(bytes) { return flujo(bytes, new DecompressionStream("deflate-raw")).then(function (b) { return new TextDecoder().decode(b); }); }
  function claveAES(raw, uso) { return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, [uso]); }
  function cifrar(obj) {
    var raw = crypto.getRandomValues(new Uint8Array(32)), iv = crypto.getRandomValues(new Uint8Array(12));
    return comprimir(JSON.stringify(obj)).then(function (z) {
      return claveAES(raw, "encrypt").then(function (k) { return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, k, z); });
    }).then(function (ct) {
      ct = new Uint8Array(ct);
      var bin = new Uint8Array(4 + 12 + ct.length); bin.set(MAGIA, 0); bin.set(iv, 4); bin.set(ct, 16);
      return { bin: bin, clave: b64u(raw) };
    });
  }
  function descifrar(bin, clave) {
    bin = new Uint8Array(bin);
    if (bin.length < 32 || MAGIA.some(function (x, i) { return bin[i] !== x; })) return Promise.reject(new Error("formato"));
    return claveAES(deb64u(clave), "decrypt").then(function (k) {
      return crypto.subtle.decrypt({ name: "AES-GCM", iv: bin.subarray(4, 16) }, k, bin.subarray(16));
    }).then(function (z) { return descomprimir(new Uint8Array(z)); }).then(JSON.parse);
  }
  /* Lee la clave del # (k=...) y baja el archivo cifrado publicado */
  function claveDelLink(hashTxt) { var m = /(?:^#|&)k=([A-Za-z0-9_-]{43})/.exec(hashTxt || ""); return m ? m[1] : ""; }
  function cargar(clave, url) {
    return fetch(url + "?t=" + Date.now(), { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("No se encontraron los datos publicados (HTTP " + r.status + ").");
      return r.arrayBuffer();
    }).then(function (b) { return descifrar(b, clave); });
  }

  g.REL_DATOS = { SIN: SIN, ARCHIVO: "datos/carteras.bin", armar: armar, parseCSV: parseCSV, cartera: cartera, hash: hash,
    cifrar: cifrar, descifrar: descifrar, claveDelLink: claveDelLink, cargar: cargar, b64: b64, b64u: b64u, deb64u: deb64u, sinAcentos: sinAcentos };
})(typeof window !== "undefined" ? window : globalThis);
