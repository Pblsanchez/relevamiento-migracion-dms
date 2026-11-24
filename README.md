# Relevamiento migración Integra → DMS

Página para que el equipo comercial de Andreani releve, contrato por contrato, qué se migra a DMS y cómo: ciclo de vida, condición de entrega, tipo de etiqueta e integración. Solo opciones cerradas.

- Sitio: https://pblsanchez.github.io/relevamiento-migracion-dms/ (necesita el link con la llave que manda el equipo de migración)
- Ejemplo con datos inventados: https://pblsanchez.github.io/relevamiento-migracion-dms/?demo
- Estado: **v0.2** · un solo link para todo el equipo; cada comercial elige su cartera por estructura comercial (Dirección → Gerente comercial → Gerente de cuenta → Ejecutivo).
- Las respuestas se guardan en el navegador de cada comercial y se envían por Teams al equipo de migración con un mensaje ya escrito. **A quién le llega el envío se define en un solo lugar: `destino` en `catalogos.js`** (si cambia la persona o hay una cuenta del equipo, se cambia ahí).

**Este repositorio es público: no contiene datos legibles de clientes, contratos ni respuestas.** Las carteras se publican cifradas (AES-GCM) en `datos/carteras.bin`; la llave viaja solo en el link (después del `#`, que el navegador no manda al servidor). Las respuestas se consolidan en un repositorio privado.

| Archivo | Para qué |
|---|---|
| `index.html` | Estructura de la página |
| `rel.css` | Estilos (Design System Andreani) |
| `catalogos.js` | Opciones de cada pregunta: ciclos de vida, condiciones de entrega, motivos, etiquetas, integraciones, y el destinatario del envío (`destino`). **Es el único archivo a tocar para cambiar opciones.** |
| `datos.js` | Arma las carteras (Matriz B2C → RSA → estructura comercial), cifra y descifra |
| `seleccion.js` | Arranque y elección de cartera (filtro en cascada y búsqueda por cliente) |
| `app.js` | Las seis secciones del relevamiento y el envío por Teams |
| `demo.js` | Cartera de ejemplo (inventada) |
| `publicar.html` · `publicar.js` | Solo para el administrador: lee el repo privado con su clave de GitHub, arma, cifra, publica y devuelve el link |
| `datos/carteras.bin` | Carteras cifradas (las genera `publicar.html`) |
