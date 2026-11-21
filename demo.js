/* Ejemplo (?demo): estructura, clientes y contratos INVENTADOS (D-003, D-014). Mismo formato que el archivo cifrado real.
   est = [Dirección, Gerente comercial, Gerente de cuenta, Ejecutivo]; cli = [razón social, SAP, índice en est (-1 = sin ejecutivo), [[contrato, servicio]]] */
(function (g) {
  "use strict";
  g.REL_DEMO = {
    v: 1, gen: "2026-11-21T00:00:00.000Z",
    est: [
      ["Dirección Ejemplo Norte", "Gerencia Comercial Uno", "Gerencia de Cuenta A", "Ejecutivo de Ejemplo 1"],
      ["Dirección Ejemplo Norte", "Gerencia Comercial Uno", "Gerencia de Cuenta A", "Ejecutivo de Ejemplo 2"],
      ["Dirección Ejemplo Sur", "Gerencia Comercial Dos", "Gerencia de Cuenta B", "Ejecutivo de Ejemplo 3"]
    ],
    cli: [
      ["Comercio Ejemplo Uno S.A.", "104587", 0, [["4000100231", "Encomienda Pyme – Estándar"], ["4000100232", "Encomienda Pyme – Cobranza"], ["4000100233", "Encomienda Pyme – Devoluciones"]]],
      ["Tienda Ficticia S.A.", "106004", 0, [["4000100502", "E-commerce – Entrega directa"], ["4000100503", "E-commerce – Cambio"]]],
      ["Laboratorio Demo S.R.L.", "105123", 1, [["4000100417", "Encomienda Corporativa – Documentación"]]],
      ["Industrias Prueba S.A.", "108112", 2, [["4000100720", "Encomienda Corporativa – Estándar"], ["4000100721", "Encomienda Corporativa – Cobranza"]]],
      ["Distribuidora Sin Dueño S.R.L.", "", -1, [["4000100801", "Encomienda Pyme – Estándar"]]]
    ]
  };
})(typeof window !== "undefined" ? window : globalThis);
