// Explorá otros temas — el mismo código de la historia, aplicado a cualquier indicador.
// Idea y textos de los indicadores tomados de "El mundo en datos" (Paula Farias).
// Usa helpers de app.js: embed, C, specMapa, specLineas, clickPais, legend, corto, setPais, pais.

const Explorar = (() => {
  const API = "https://data360api.worldbank.org";

  // Textos de cada tema (los datos vienen de data/indicadores.json)
  // Paletas de ColorBrewer (7 clases), una por tema
  const PALETAS = {
    Reds: ["#fee5d9", "#fcbba1", "#fc9272", "#fb6a4a", "#ef3b2c", "#cb181d", "#99000d"],
    BuGn: ["#edf8fb", "#ccece6", "#99d8c9", "#66c2a4", "#41ae76", "#238b45", "#005824"],
    OrRd: ["#fef0d9", "#fdd49e", "#fdbb84", "#fc8d59", "#ef6548", "#d7301f", "#990000"],
    Oranges: ["#feedde", "#fdd0a2", "#fdae6b", "#fd8d3c", "#f16913", "#d94801", "#8c2d04"],
    YlGn: ["#ffffcc", "#d9f0a3", "#addd8e", "#78c679", "#41ab5d", "#238443", "#005a32"],
    Purples: ["#f2f0f7", "#dadaeb", "#bcbddc", "#9e9ac8", "#807dba", "#6a51a3", "#4a1486"],
    YlOrRd: ["#ffffb2", "#fed976", "#feb24c", "#fd8d3c", "#fc4e2a", "#e31a1c", "#b10026"],
    BuPu: ["#edf8fb", "#bfd3e6", "#9ebcda", "#8c96c6", "#8c6bb1", "#88419d", "#6e016b"],
    Greens: ["#edf8e9", "#c7e9c0", "#a1d99b", "#74c476", "#41ab5d", "#238b45", "#005a32"],
    PuRd: ["#f1eef6", "#d4b9da", "#c994c7", "#df65b0", "#e7298a", "#ce1256", "#91003f"],
    Blues: ["#eff3ff", "#c6dbef", "#9ecae1", "#6baed6", "#4292c6", "#2171b5", "#084594"],
    YlOrBr: ["#ffffd4", "#fee391", "#fec44f", "#fe9929", "#ec7014", "#cc4c02", "#8c2d04"],
    RdPu: ["#feebe2", "#fcc5c0", "#fa9fb5", "#f768a1", "#dd3497", "#ae017e", "#7a0177"],
  };
  const PALETA_TEMA = {
    obes: "Reds", life: "BuGn", imrt: "OrRd", undn: "Oranges", gdp: "YlGn", net: "Purples", elec: "YlOrRd",
    co2: "BuPu", forest: "Greens", fert: "PuRd", urb: "Blues", unemp: "YlOrBr", health: "RdPu",
  };

  const META = [
    { k: "obes", nombre: "Obesidad en adultos", unidad: "% de adultos", sfx: "%", dec: 1,
      desc: "Personas de 18 años o más con un índice de masa corporal de 30 o más." },
    { k: "life", nombre: "Esperanza de vida", unidad: "años", sfx: " años", dec: 1, cero: false,
      desc: "Cuántos años viviría un recién nacido si se mantuvieran las condiciones de mortalidad de ese año." },
    { k: "imrt", nombre: "Mortalidad infantil", unidad: "muertes cada 1.000 nacidos vivos", sfx: " ‰", dec: 1,
      desc: "Bebés que mueren antes de cumplir un año, cada 1.000 nacidos vivos." },
    { k: "undn", nombre: "Desnutrición", unidad: "% de la población", sfx: "%", dec: 1,
      desc: "Personas cuyo consumo habitual de alimentos no alcanza para cubrir la energía que necesitan." },
    { k: "gdp", nombre: "PBI per cápita", unidad: "US$ corrientes", pre: "US$ ", dec: 0, log: true,
      desc: "Producto bruto interno dividido por la población, en dólares de cada año." },
    { k: "net", nombre: "Uso de internet", unidad: "% de la población", sfx: "%", dec: 1,
      desc: "Personas que usaron internet en los últimos tres meses." },
    { k: "elec", nombre: "Acceso a electricidad", unidad: "% de la población", sfx: "%", dec: 1,
      desc: "Personas que viven en hogares con acceso a electricidad." },
    { k: "co2", nombre: "Emisiones de CO₂", unidad: "t CO₂e por persona", sfx: " t", dec: 2,
      desc: "Emisiones de dióxido de carbono por habitante, en toneladas equivalentes." },
    { k: "forest", nombre: "Superficie de bosques", unidad: "% del territorio", sfx: "%", dec: 1,
      desc: "Parte del territorio cubierta por bosques." },
    { k: "fert", nombre: "Hijos por mujer", unidad: "tasa de fecundidad", sfx: "", dec: 2,
      desc: "Cantidad promedio de hijos que tendría una mujer a lo largo de su vida." },
    { k: "urb", nombre: "Población urbana", unidad: "% del total", sfx: "%", dec: 1,
      desc: "Parte de la población que vive en ciudades." },
    { k: "unemp", nombre: "Desempleo", unidad: "% de la fuerza laboral", sfx: "%", dec: 1,
      desc: "Personas que buscan trabajo y no lo encuentran, sobre el total que trabaja o busca trabajo." },
    { k: "health", nombre: "Gasto en salud", unidad: "% del PBI", sfx: "%", dec: 1,
      desc: "Gasto corriente en salud, público y privado, como parte del PBI." },
  ];

  let X;          // data/indicadores.json
  let A0;         // primer año de los datos (1990)
  let PAISES;     // iso3 -> {nombre, region}
  let POB;        // población por país y año (para ponderar)
  const TEMAS = {}; // k -> meta + data + rango de años
  const S = { k: "obes", anio: null, rank: "top", cruce: "gdp", juego: false, adivinados: {}, playing: null };
  let mapaView = null;

  const $ = (id) => document.getElementById(id);
  const T = () => TEMAS[S.k];

  // ---------- Formato ----------

  function fmt(t, v, conUnidad = true) {
    if (v == null) return "sin dato";
    const n = v.toLocaleString("es-AR", { maximumFractionDigits: t.dec, minimumFractionDigits: 0 });
    return conUnidad ? `${t.pre || ""}${n}${t.sfx || ""}` : n;
  }
  const d3fmt = (t) => `,.${Math.min(t.dec, 2)}f`;

  // ---------- Datos ----------

  const val = (t, iso, anio) => {
    const a = t.data[iso];
    if (!a) return null;
    const v = a[anio - A0];
    return v == null ? null : v;
  };

  // Rango de años con buena cobertura (al menos 45% del año con más países)
  function prep(t) {
    const cuenta = {};
    Object.values(t.data).forEach((a) => a.forEach((v, i) => { if (v != null) cuenta[i] = (cuenta[i] || 0) + 1; }));
    const max = Math.max(...Object.values(cuenta));
    const anios = Object.keys(cuenta).map(Number).filter((i) => cuenta[i] >= 0.45 * max).map((i) => A0 + i);
    t.y0 = Math.min(...anios);
    t.y1 = Math.max(...anios);
    const todos = [];
    Object.values(t.data).forEach((a) => a.forEach((v, i) => {
      if (v != null && A0 + i >= t.y0 && A0 + i <= t.y1 && (!t.log || v > 0)) todos.push(v);
    }));
    todos.sort((a, b) => a - b);
    const q = (p) => todos[Math.min(todos.length - 1, Math.floor(p * todos.length))];
    t.dominio = [q(0.02), q(0.98)];
    // 7 clases con la misma cantidad de datos (cuantiles de todos los años), fijas al animar
    t.umbrales = [1, 2, 3, 4, 5, 6].map((i) => q(i / 7)).filter((v, i, a) => i === 0 || v > a[i - 1]);
    t.paleta = PALETAS[PALETA_TEMA[t.k] || "Blues"].slice(0, t.umbrales.length + 1);
    t.cache = {};
  }

  // Promedio ponderado por población (región = null → mundo)
  function promedio(t, region, anio) {
    const key = `${region || "Mundo"}|${anio}`;
    if (key in t.cache) return t.cache[key];
    let s = 0, w = 0;
    for (const [iso, p] of Object.entries(PAISES)) {
      if (region && p.region !== region) continue;
      const v = val(t, iso, anio);
      const pob = POB[iso] && POB[iso][anio - A0];
      if (v == null || !pob) continue;
      s += v * pob; w += pob;
    }
    return (t.cache[key] = w ? s / w : null);
  }

  function agregarTema(meta, data, extra = {}) {
    const t = { ...meta, ...extra, data };
    prep(t);
    TEMAS[t.k] = t;
    return t;
  }

  // ---------- 1. Fichas ----------

  function sparkline(t) {
    const pts = [];
    for (let a = t.y0; a <= t.y1; a++) { const v = promedio(t, null, a); if (v != null) pts.push([a, v]); }
    if (pts.length < 2) return "";
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const d = pts.map(([x, y], i) =>
      `${i ? "L" : "M"}${((x - x0) / (x1 - x0 || 1) * 100).toFixed(1)},${(28 - (y - y0) / (y1 - y0 || 1) * 24).toFixed(1)}`).join("");
    return `<svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" style="stroke:${t.paleta[t.paleta.length - 2]}"/></svg>`;
  }

  function renderCards() {
    $("x-cards").innerHTML = Object.values(TEMAS).map((t) => {
      const w = promedio(t, null, t.y1);
      return `<button class="card${t.k === S.k ? " on" : ""}" data-k="${t.k}" aria-pressed="${t.k === S.k}">
        ${t.nuevo ? '<span class="badge">Nuevo</span>' : ""}
        <span class="card-t">${t.nombre}</span>
        <span class="card-v">${w == null ? "" : `Mundo ${t.y1}: <b>${fmt(t, w)}</b>`}</span>
        ${sparkline(t)}
      </button>`;
    }).join("");
    $("x-cards").querySelectorAll(".card").forEach((b) => { b.onclick = () => setTema(b.dataset.k); });
  }

  // ---------- 2. Mapa + panel ----------

  // Lo que necesita specMapa para dibujar un tema (lo usa también el modo feria)
  function argsMapa(t) {
    return {
      valores: Object.entries(t.data).map(([iso, o]) => ({ iso3: iso, nombre: PAISES[iso]?.nombre, o })),
      x0: A0, domain: t.dominio, log: !!t.log, titulo: t.unidad,
      fmt: `'${t.pre || ""}' + format(datum.valor, '${d3fmt(t)}') + '${(t.sfx || "").replace(/'/g, "")}'`,
      umbrales: t.umbrales, paleta: t.paleta,
      formatoLeyenda: t.log ? "~s" : t.dominio[1] < 10 ? ",.1f" : ",.0f",
    };
  }

  async function renderMapa() {
    const t = T();
    const res = await embed("#x-mapa", specMapa({
      el: "#x-mapa", anio: S.anio, height: Math.min(400, Math.max(240, $("x-mapa").clientWidth * 0.5)),
      ...argsMapa(t),
    }));
    mapaView = res.view;
    clickPais(mapaView);
  }

  function cmp(v, ref) {
    if (ref == null) return null;
    if (Math.abs(v - ref) <= Math.abs(ref) * 0.03) return "en línea con el";
    return v > ref ? "por encima del" : "por debajo del";
  }

  function renderSide() {
    const t = T(), c = C();
    const p = PAISES[pais];
    if (!p) { $("x-side").innerHTML = ""; return; }
    const v = val(t, pais, S.anio);
    const r = promedio(t, p.region, S.anio);
    const w = promedio(t, null, S.anio);
    const key = `${S.k}|${pais}|${S.anio}`;

    if (S.juego && v != null && !(key in S.adivinados)) {
      const [d0, d1] = t.dominio;
      const paso = (d1 - d0) / 200;
      $("x-side").innerHTML = `
        <p class="side-pais">${p.nombre} · ${S.anio}</p>
        <h3>¿Cuánto creés que da?</h3>
        <p class="muted">${t.nombre} (${t.unidad})</p>
        <output id="x-guess-out" class="big"></output>
        <input id="x-guess" type="range" min="${d0}" max="${d1}" step="${paso}" value="${(d0 + d1) / 2}" aria-label="Tu respuesta">
        <button id="x-guess-go" class="btn-go">Ver respuesta</button>`;
      const inp = $("x-guess"), out = $("x-guess-out");
      const upd = () => { out.textContent = fmt(t, +inp.value); };
      inp.oninput = upd; upd();
      $("x-guess-go").onclick = () => { S.adivinados[key] = +inp.value; renderSide(); };
      return;
    }

    let veredicto = "";
    if (key in S.adivinados && v != null) {
      const g = S.adivinados[key];
      const err = Math.abs(g - v) / (t.dominio[1] - t.dominio[0] || 1);
      const txt = err < 0.05 ? "🎯 ¡Clavado!" : err < 0.15 ? "¡Muy cerca!" : "Estabas lejos";
      veredicto = `<p class="veredicto">${txt} Dijiste ${fmt(t, g)}.</p>`;
    }

    const frase = v == null ? "" : [
      cmp(v, r) && `${p.nombre} está ${cmp(v, r)} promedio de ${corto(p.region)} (${fmt(t, r)})`,
      cmp(v, w) && `${cmp(v, w)} promedio mundial (${fmt(t, w)})`,
    ].filter(Boolean).join(" y ") + ".";
    // Puesto en el ranking del año (de mayor a menor)
    let puesto = "";
    if (v != null) {
      const vals = Object.keys(t.data).filter((iso) => PAISES[iso]).map((iso) => val(t, iso, S.anio)).filter((x) => x != null);
      const pos = vals.filter((x) => x > v).length + 1;
      puesto = `<p class="puesto">Puesto <b>${pos}</b> de ${vals.length} países en ${S.anio} (de mayor a menor).</p>`;
    }

    const filas = [[p.nombre, v, c.pais], [corto(p.region), r, c.region], ["Mundo", w, c.mundo]];
    const max = Math.max(...filas.map((f) => Math.abs(f[1] || 0))) || 1;
    $("x-side").innerHTML = `
      ${veredicto}
      <p class="side-pais">${p.nombre} · ${S.anio}</p>
      <div class="big">${v == null ? `<span class="muted">Sin dato en ${S.anio}</span>` : fmt(t, v)}</div>
      ${puesto}
      <p class="frase">${frase}</p>
      <div class="barras">
        ${filas.map(([n, x, col]) => `<div class="barra"><span>${n}</span>
          <span class="track"><span class="fill" style="width:${x == null ? 0 : Math.max(2, Math.abs(x) / max * 100)}%;background:${col}"></span></span>
          <span class="v">${fmt(t, x)}</span></div>`).join("")}
      </div>`;
  }

  // ---------- 3. La película ----------

  function renderLinea() {
    const t = T(), c = C();
    const p = PAISES[pais];
    const rango = [];
    for (let a = t.y0; a <= t.y1; a++) rango.push(a);
    const serie = (f) => rango.map(f);
    $("x-titulo-linea").textContent = `${p.nombre} frente a ${corto(p.region)} y el mundo, ${t.y0}–${t.y1}`;
    legend("x-legend-linea", [[p.nombre, c.pais], [corto(p.region), c.region], ["Mundo", c.mundo]]);
    return embed("#x-linea", specLineas([
      { nombre: "Mundo", valores: serie((a) => promedio(t, null, a)), color: c.mundo, ancho: 2, destacada: true, etiqueta: "Mundo" },
      { nombre: p.region, valores: serie((a) => promedio(t, p.region, a)), color: c.region, ancho: 2, destacada: true, etiqueta: corto(p.region) },
      { nombre: p.nombre, valores: serie((a) => val(t, pais, a)), color: c.pais, ancho: 3, destacada: true, etiqueta: p.nombre },
    ], {
      height: 280, x0: t.y0, x1: t.y1, yTitle: t.unidad, fmtV: (v) => fmt(t, v),
      formatoTip: d3fmt(t), cero: t.cero !== false,
    }));
  }

  // ---------- 4. Ranking ----------

  function primerValor(t, iso) {
    for (let a = t.y0; a <= S.anio; a++) { const v = val(t, iso, a); if (v != null) return [a, v]; }
    return null;
  }

  function renderRank() {
    const t = T(), c = C();
    const p = PAISES[pais];
    const cambio = S.rank === "up" || S.rank === "down";
    let filas = Object.keys(t.data).filter((iso) => PAISES[iso]).map((iso) => {
      const v = val(t, iso, S.anio);
      if (v == null) return null;
      let x = v;
      if (cambio) {
        const ini = primerValor(t, iso);
        if (!ini || ini[0] >= S.anio) return null;
        x = v - ini[1];
      }
      const pp = PAISES[iso];
      return { iso, nombre: pp.nombre, x, v,
        grupo: iso === pais ? "pais" : pp.region === p.region ? "region" : "otro" };
    }).filter(Boolean);
    const asc = S.rank === "bottom" || S.rank === "down";
    filas.sort((a, b) => asc ? a.x - b.x : b.x - a.x);
    filas = filas.slice(0, 10);
    // si el país elegido no entra en el top, lo sumamos al final para compararlo
    if (!filas.some((f) => f.iso === pais)) {
      const v = val(t, pais, S.anio);
      const ini = cambio ? primerValor(t, pais) : null;
      if (v != null && (!cambio || ini)) filas.push({ iso: pais, nombre: `${p.nombre} (tu país)`, x: cambio ? v - ini[1] : v, v, grupo: "pais" });
    }
    filas.forEach((f, i) => {
      f.orden = i;
      f.txt = cambio ? `${f.x >= 0 ? "+" : "−"}${fmt(t, Math.abs(f.x))}` : fmt(t, f.v);
    });
    const subs = {
      top: `Los 10 países con el valor más alto en ${S.anio}.`,
      bottom: `Los 10 países con el valor más bajo en ${S.anio}.`,
      up: `Los 10 países que más subieron entre ${t.y0} y ${S.anio}.`,
      down: `Los 10 países que más bajaron entre ${t.y0} y ${S.anio}.`,
    };
    $("x-rank-sub").textContent = subs[S.rank];
    const neg = filas.some((f) => f.x < 0);
    const colores = { pais: c.pais, region: c.region, otro: c.otro };
    return embed("#x-rank", {
      width: "container", height: { step: 26 },
      data: { values: filas },
      encoding: {
        y: { field: "nombre", type: "nominal", sort: { field: "orden" }, title: null,
          axis: { labelLimit: 180, labelFontSize: 12, ticks: false, domain: false } },
      },
      layer: [
        {
          mark: { type: "bar", cornerRadiusEnd: 4, height: { band: 0.7 } },
          encoding: {
            x: { field: "x", type: "quantitative", title: cambio ? `Cambio (${t.unidad})` : t.unidad,
              scale: { type: t.log && !cambio ? "symlog" : "linear", nice: true } },
            color: { field: "grupo", type: "nominal", scale: { domain: Object.keys(colores), range: Object.values(colores) }, legend: null },
            tooltip: [{ field: "nombre", title: "País" }, { field: "txt", title: cambio ? "Cambio" : t.nombre }],
          },
        },
        {
          mark: { type: "text", align: neg ? "right" : "left", dx: neg ? -6 : 6, fontSize: 12 },
          encoding: { x: { field: "x", type: "quantitative" }, text: { field: "txt" }, color: { value: c.text2 } },
        },
      ],
    });
  }

  // ---------- 5. Cruce ----------

  function valCerca(t, iso, anio) {
    for (const d of [0, -1, 1, -2, 2, -3]) { const v = val(t, iso, anio + d); if (v != null) return v; }
    return null;
  }

  function renderCruce() {
    const t = T(), c = C();
    if (S.cruce === S.k || !TEMAS[S.cruce]) S.cruce = S.k === "gdp" ? "life" : "gdp";
    const tx = TEMAS[S.cruce];
    const sel = $("x-cruce");
    sel.innerHTML = Object.values(TEMAS).filter((m) => m.k !== S.k)
      .map((m) => `<option value="${m.k}"${m.k === S.cruce ? " selected" : ""}>${m.nombre}</option>`).join("");
    const p = PAISES[pais];
    const data = Object.keys(PAISES).map((iso) => {
      const y = val(t, iso, S.anio), x = valCerca(tx, iso, S.anio), pob = POB[iso] && POB[iso][S.anio - A0];
      if (y == null || x == null || (tx.log && x <= 0)) return null;
      const pp = PAISES[iso];
      const grupo = iso === pais ? "pais" : pp.region === p.region ? "region" : "otro";
      return { nombre: pp.nombre, region: pp.region, x, y, pob: pob || 0, grupo,
        orden: { pais: 3, region: 2, otro: 1 }[grupo], tx: fmt(tx, x), ty: fmt(t, y) };
    }).filter(Boolean);
    legend("x-legend-cruce", [[p.nombre, c.pais, "dot"], [corto(p.region), c.region, "dot"], ["Resto del mundo", c.otro, "dot"]]);
    renderCorrelacion(data, tx, t);
    const x = { field: "x", type: "quantitative", title: `${tx.nombre} (${tx.unidad}${tx.log ? ", escala log" : ""})`,
      scale: { type: tx.log ? "log" : "linear", zero: false, nice: true } };
    const y = { field: "y", type: "quantitative", title: `${t.nombre} (${t.unidad})`,
      scale: { type: t.log ? "log" : "linear", zero: false, nice: true } };
    return embed("#x-cruce-viz", {
      width: "container", height: 340,
      data: { values: data },
      layer: [
        {
          mark: { type: "circle", stroke: c.surface, strokeWidth: 1 },
          encoding: {
            x, y,
            size: { field: "pob", type: "quantitative", scale: { range: [15, 1200] }, legend: null },
            color: { field: "grupo", type: "nominal", scale: { domain: ["otro", "region", "pais"], range: [c.otro, c.region, c.pais] }, legend: null },
            opacity: { condition: { test: "datum.grupo === 'otro'", value: 0.7 }, value: 0.95 },
            order: { field: "orden" },
            tooltip: [{ field: "nombre", title: "País" }, { field: "ty", title: t.nombre }, { field: "tx", title: tx.nombre }],
          },
        },
        {
          transform: [{ filter: "datum.grupo === 'pais'" }],
          mark: { type: "circle", size: 320, fillOpacity: 0, stroke: c.pais, strokeWidth: 2 },
          encoding: { x, y },
        },
        {
          transform: [{ filter: "datum.grupo === 'pais'" }],
          mark: { type: "text", align: "left", dx: 14, dy: -12, fontWeight: 600, fontSize: 13 },
          encoding: { x, y, text: { field: "nombre" } },
        },
      ],
    });
  }

  // Correlación de Pearson (en escala log si el eje es logarítmico)
  function renderCorrelacion(data, tx, ty) {
    const el = $("x-corr");
    if (!el) return;
    if (data.length < 10) { el.textContent = ""; return; }
    const xs = data.map((d) => (tx.log ? Math.log(d.x) : d.x));
    const ys = data.map((d) => (ty.log ? Math.log(d.y) : d.y));
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = ys.reduce((a, b) => a + b, 0) / ys.length;
    let sxy = 0, sxx = 0, syy = 0;
    xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; syy += (ys[i] - my) ** 2; });
    const r = sxy / Math.sqrt(sxx * syy);
    const fuerza = Math.abs(r) > 0.6 ? "una relación fuerte" : Math.abs(r) > 0.3 ? "una relación moderada, con mucha dispersión" : "una relación débil";
    const sentido = Math.abs(r) <= 0.3 ? "" : r > 0 ? " (cuando uno sube, el otro tiende a subir)" : " (cuando uno sube, el otro tiende a bajar)";
    el.innerHTML = `Correlación${tx.log || ty.log ? " (en escala log)" : ""}: <b>${r.toLocaleString("es-AR", { maximumFractionDigits: 2 })}</b> con ${data.length} países: ${fuerza}${sentido}. Que dos cosas se muevan juntas no quiere decir que una cause la otra.`;
  }

  // ---------- Estado ----------

  function renderHead() {
    const t = T();
    $("x-nombre").textContent = t.nombre;
    $("x-desc").textContent = `${t.desc} Datos de ${t.y0} a ${t.y1}. Código: ${t.id}.`;
    const sl = $("x-anio");
    sl.min = t.y0; sl.max = t.y1; sl.value = S.anio;
    $("x-anio-label").textContent = S.anio;
  }

  let debounce = null;
  function setAnio(a, rapido = false) {
    S.anio = a;
    $("x-anio").value = a;
    $("x-anio-label").textContent = a;
    if (mapaView) mapaView.signal("anio", a).runAsync();
    renderSide();
    clearTimeout(debounce);
    debounce = setTimeout(() => { renderRank(); renderCruce(); }, rapido ? 400 : 120);
  }

  function parar() {
    clearInterval(S.playing); S.playing = null;
    $("x-play").textContent = "▶";
  }

  function togglePlay() {
    if (S.playing) return parar();
    const t = T();
    let a = S.anio >= t.y1 ? t.y0 - 1 : S.anio;
    $("x-play").textContent = "❚❚";
    S.playing = setInterval(() => {
      setAnio(++a, true);
      if (a >= t.y1) parar();
    }, 300);
  }

  function setTema(k) {
    parar();
    S.k = k;
    S.anio = T().y1;
    render();
    if (window.Como) Como.marcar();
  }

  function render() {
    if (!X) return;
    renderHead();
    renderCards();
    renderSide();
    return Promise.all([renderMapa(), renderLinea(), renderRank(), renderCruce()]);
  }

  // ---------- Búsqueda en vivo en el catálogo ----------

  async function getJSON(url, opt = {}, ms = 20000) {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), ms);
    try {
      const r = await fetch(url, { ...opt, signal: ctl.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } finally { clearTimeout(to); }
  }

  const SIN_RED = "No hay conexión con la API del Banco Mundial. Probá con los temas de arriba, que ya están descargados.";

  async function buscar(q) {
    const out = $("x-resultados");
    if (!q) { out.innerHTML = ""; return; }
    out.innerHTML = `<p class="muted">Buscando “${q}” en el catálogo…</p>`;
    try {
      const j = await getJSON(`${API}/data360/searchv2`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: true, search: q, top: 8, filter: "type eq 'indicator'",
          select: "series_description/idno, series_description/name, series_description/database_id" }),
      });
      const res = (j.value || []).map((r) => r.series_description).filter((r) => r && r.idno);
      if (!res.length) { out.innerHTML = `<p class="muted">No encontramos indicadores para “${q}”.</p>`; return; }
      out.innerHTML = `<p class="muted">${j["@odata.count"]?.toLocaleString("es-AR") || res.length} resultados. Elegí uno para traerlo:</p>
        <ul class="resultados">${res.map((r, i) => `<li><button type="button" data-i="${i}">
          <b>${r.name}</b><span>${r.database_id} · ${r.idno}</span></button></li>`).join("")}</ul>`;
      out.querySelectorAll("button").forEach((b) => { b.onclick = () => traer(res[+b.dataset.i]); });
    } catch (e) {
      out.innerHTML = `<p class="error">${SIN_RED}</p>`;
    }
  }

  async function traer(r) {
    const out = $("x-resultados");
    const k = `api_${r.idno}`;
    if (TEMAS[k]) { setTema(k); return; }
    const anios = X.anios;
    const filas = [];
    try {
      for (let skip = 0, pag = 0; pag < 30; pag++, skip += 1000) {
        out.innerHTML = `<p class="muted">Trayendo ${r.idno}… (${(skip / 1000) + 1}ª página)</p>`;
        const url = `${API}/data360/data?DATABASE_ID=${encodeURIComponent(r.database_id)}&INDICATOR=${encodeURIComponent(r.idno)}&skip=${skip}`;
        const pagina = (await getJSON(url)).value || [];
        filas.push(...pagina);
        if (pagina.length < 1000) break;
      }
    } catch (e) {
      out.innerHTML = `<p class="error">${SIN_RED}</p>`;
      return;
    }
    // Algunos indicadores ya vienen desagregados (ej. edad 15–24 o solo varones).
    // Si existe la serie total la usamos; si no, la desagregación más frecuente.
    const DESAGR = ["SEX", "AGE", "URBANISATION"];
    const clave = (f) => DESAGR.map((c) => f[c] ?? "_Z").join("|");
    const esTotal = (k) => k.split("|").every((x) => x === "_T" || x === "_Z");
    const cuenta = {};
    filas.forEach((f) => { const k = clave(f); cuenta[k] = (cuenta[k] || 0) + 1; });
    const claves = Object.keys(cuenta).sort((a, b) => cuenta[b] - cuenta[a]);
    const elegida = claves.find(esTotal) || claves[0];
    const data = {};
    for (const f of filas) {
      const a = parseInt(f.TIME_PERIOD, 10), v = parseFloat(f.OBS_VALUE);
      if (clave(f) !== elegida || !PAISES[f.REF_AREA] || isNaN(v) || a < anios[0] || a > anios[anios.length - 1]) continue;
      (data[f.REF_AREA] ||= anios.map(() => null))[a - A0] ??= v;
    }
    const n = Object.keys(data).length;
    if (n < 20) {
      out.innerHTML = `<p class="error">Este indicador tiene datos para muy pocos países (${n}). Probá con otro.</p>`;
      return;
    }
    const todos = Object.values(data).flat().filter((v) => v != null);
    const mag = Math.max(...todos.map(Math.abs));
    const unidad = (r.name.match(/\(([^)]+)\)\s*$/) || [])[1] || "valor";
    const t = agregarTema({
      k, nombre: r.name.replace(/\s*\([^)]*\)\s*$/, ""), unidad, sfx: "", dec: mag >= 1000 ? 0 : mag >= 10 ? 1 : 2,
      desc: "Indicador traído en vivo desde el catálogo del Banco Mundial (nombre original en inglés).", nuevo: true,
    }, data, { id: r.idno, db: r.database_id });
    out.innerHTML = `<p class="ok">Listo: ${n} países, ${t.y0}–${t.y1}. Se agregó como ficha nueva.</p>`;
    setTema(k);
  }

  // ---------- Inicio ----------

  async function init() {
    X = await fetch("data/indicadores.json").then((r) => r.json());
    A0 = X.anios[0];
    PAISES = Object.fromEntries(X.paises.map((p) => [p.iso3, p]));
    POB = X.temas.pop.data;
    META.forEach((m) => {
      const t = X.temas[m.k];
      if (t) agregarTema(m, t.data, { id: t.id, db: t.db });
    });
    S.anio = T().y1;

    $("x-anio").oninput = (e) => { parar(); setAnio(+e.target.value); };
    $("x-play").onclick = togglePlay;
    $("x-cruce").onchange = (e) => { S.cruce = e.target.value; renderCruce(); };
    $("x-juego").onclick = () => {
      S.juego = !S.juego; S.adivinados = {};
      $("x-juego").setAttribute("aria-pressed", S.juego);
      $("x-juego").classList.toggle("on", S.juego);
      renderSide();
    };
    document.querySelectorAll("#x-rank-modo button").forEach((b) => {
      b.onclick = () => {
        document.querySelectorAll("#x-rank-modo button").forEach((x) => x.classList.remove("on"));
        b.classList.add("on");
        S.rank = b.dataset.m;
        renderRank();
      };
    });
    $("x-buscar").onsubmit = (e) => { e.preventDefault(); buscar($("x-q").value.trim()); };
  }

  return {
    init, render,
    tienePais: (iso) => !!(PAISES && PAISES[iso]),
    temaActual: () => T(),
    claves: () => Object.keys(TEMAS),
    mapaTema: (k) => { const t = TEMAS[k]; return { nombre: t.nombre, unidad: t.unidad, y0: t.y0, y1: t.y1, spec: argsMapa(t) }; },
    valor: (iso, anio) => val(T(), iso, anio),
  };
})();

window.Explorar = Explorar;
