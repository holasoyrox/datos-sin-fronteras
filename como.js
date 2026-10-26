// Cómo se hizo — el pedido a la API del tema elegido y los mapas de QGIS.
// Los mapas de QGIS (assets/qgis) los exportó Paula Farias con el controlador temporal.

const Como = (() => {
  const API = "https://data360api.worldbank.org";
  const $ = (id) => document.getElementById(id);
  let listo = false;
  let qTimer = null;

  // ---------- A · La API ----------

  function renderApi() {
    const t = window.Explorar && Explorar.temaActual();
    if (!t) return;
    const url = `${API}/data360/data?DATABASE_ID=${t.db}&INDICATOR=${t.id}&REF_AREA=${pais}`;
    $("api-req").innerHTML = `<span class="c"># ${t.nombre} · ${pais}</span>
GET ${API}/data360/data
    ?DATABASE_ID=<mark>${t.db}</mark>
    &amp;INDICATOR=<mark>${t.id}</mark>
    &amp;REF_AREA=<mark>${pais}</mark>`;
    // Respuesta de ejemplo armada con los datos que ya tenemos (los dos últimos años con dato)
    const filas = [];
    for (let a = t.y1; a >= t.y0 && filas.length < 2; a--) {
      const v = Explorar.valor(pais, a);
      if (v != null) filas.push(`    {
      "REF_AREA": "${pais}",
      "TIME_PERIOD": "${a}",
      "OBS_VALUE": "${v}",
      "INDICATOR": "${t.id}",
      ...
    }`);
    }
    $("api-res").innerHTML = `<span class="c"># respuesta (recortada)</span>
{
  "value": [
${filas.join(",\n") || "    "}
  ]
}`;
    $("api-link").href = url;
  }

  // ---------- C · QGIS ----------

  function qMostrar(a) {
    $("q-img").src = `assets/qgis/${a}.jpg`;
    $("q-anio").value = a;
    $("q-anio-label").textContent = a;
  }

  function qParar() { clearInterval(qTimer); qTimer = null; $("q-play").textContent = "▶"; }

  function initQgis() {
    for (let a = 1990; a <= 2022; a++) new Image().src = `assets/qgis/${a}.jpg`; // precarga
    $("q-anio").oninput = (e) => { qParar(); qMostrar(+e.target.value); };
    $("q-play").onclick = () => {
      if (qTimer) return qParar();
      let a = +$("q-anio").value;
      if (a >= 2022) a = 1989;
      $("q-play").textContent = "❚❚";
      qTimer = setInterval(() => { qMostrar(++a); if (a >= 2022) qParar(); }, 300);
    };
  }

  function render() {
    if (!listo) { initQgis(); listo = true; }
    renderApi();
  }

  return { render, marcar: () => { if (listo) renderApi(); } };
})();

window.Como = Como;
