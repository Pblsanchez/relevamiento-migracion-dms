# Relevamiento migración Integra → DMS

Página para que el equipo comercial de Andreani releve, contrato por contrato, qué se migra a DMS y cómo: ciclo de vida, condición de entrega, tipo de etiqueta e integración. Solo opciones cerradas.

- Sitio: https://pblsanchez.github.io/relevamiento-migracion-dms/
- Estado: **prototipo v0.1.1 con clientes y contratos inventados**.
- Las respuestas se guardan en el navegador de cada comercial y se envían por Teams con un mensaje ya escrito.

**Este repositorio es público: no contiene ni debe contener datos de clientes, contratos ni respuestas.** Las carteras reales viajan cifradas en el link personal de cada comercial y las respuestas se consolidan en un repositorio privado.

| Archivo | Para qué |
|---|---|
| `index.html` | Estructura de la página |
| `rel.css` | Estilos (Design System Andreani) |
| `catalogos.js` | Opciones de cada pregunta: ciclos de vida, condiciones de entrega, motivos, etiquetas, integraciones. **Es el único archivo a tocar para cambiar opciones.** |
| `demo.js` | Cartera de ejemplo (inventada) |
| `app.js` | Lógica y pantallas |
