// Datos sin fronteras — gráficos con Vega-Lite
// Los datos se generan con scripts/build_data.py (data/obesidad.json, data/world.json)
// Pestañas: La historia (este archivo), Explorá otros temas (explorar.js), Cómo se hizo (como.js)

const ANIO_0 = 1990;
const ANIO_N = 2022;

const NOMBRES_CORTOS = {
  "Medio Oriente, Norte de África, Afganistán y Pakistán": "Medio Oriente y Norte de África",
  "América Latina y el Caribe": "América Latina y el Caribe",
  "Asia oriental y Pacífico": "Asia oriental y Pacífico",
};
const corto = (r) => NOMBRES_CORTOS[r] || r;

const fmt1 = (v) => v.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const LOCALE = {
  decimal: ",", thousands: ".", grouping: [3], currency: ["US$ ", ""],
};

let D;              // data/obesidad.json
let porIso = {};    // iso3 -> país
let pais = "ARG";
let scopeCambio = "mundo";
let mapaView = null;

// ---------- Tema (colores desde las variables CSS) ----------

function css(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function oscuro() {
  return css("color-scheme") === "dark";
}
function tema() {
  return {
    background: null,
    font: "Inter, system-ui, sans-serif",
    view: { stroke: null },
    axis: {
      labelColor: css("--text-secondary"), titleColor: css("--text-secondary"),
      labelFontSize: 12, titleFontSize: 12, titleFontWeight: 500,
      gridColor: css("--grid"), domainColor: css("--grid"), tickColor: css("--grid"),
      labelPadding: 6,
    },
    axisX: { grid: false },
    legend: { labelColor: css("--text-secondary"), titleColor: css("--text-secondary"), labelFontSize: 12, titleFontSize: 12 },
    text: { color: css("--text-primary"), fontSize: 12 },
  };
}
const C = () => ({
  pais: css("--pais"), region: css("--region"), otro: css("--otro"), mundo: css("--mundo"),
  surface: css("--bg"), missing: css("--missing"), muted: css("--text-muted"),
  text: css("--text-primary"), text2: css("--text-secondary"),
});

function embed(el, spec) {
  spec.$schema = "https://vega.github.io/schema/vega-lite/v5.json";
  spec.config = Object.assign(tema(), spec.config || {});
  return vegaEmbed(el, spec, { actions: false, renderer: "svg", formatLocale: LOCALE });
}

// ---------- Helpers de datos ----------

const idx = (anio) => anio - ANIO_0;
const P = () => porIso[pais];

function serieLarga(nombre, valores, x0 = ANIO_0) {
  return valores.map((v, i) => ({ anio: x0 + i, serie: nombre, valor: v })).filter((d) => d.valor != null);
}

function legend(el, items) {
  document.getElementById(el).innerHTML = items
    .map(([label, color, tipo = "line"]) =>
      `<span><i class="${tipo}" style="background:${color};border-color:${color}"></i>${label}</span>`)
    .join("");
}

// ---------- Portada ----------

function renderHero() {
  const m = D.promedios.Mundo;
  const a = m[0], b = m[m.length - 1];
  document.getElementById("hero-stat").innerHTML = `
    <div><div class="big">${fmt1(a)}%</div><div class="lbl">adultos con obesidad en el mundo, ${ANIO_0}</div></div>
    <div class="arrow">→</div>
    <div><div class="big">${fmt1(b)}%</div><div class="lbl">en ${ANIO_N}</div></div>
    <p class="caption">En ${ANIO_N - ANIO_0} años, la proporción de adultos con obesidad se multiplicó por
      ${fmt1(b / a)}. Hoy, cerca de 1 de cada ${Math.round(100 / b)} adultos del mundo vive con obesidad.</p>`;
}

// ---------- 1. Mapa ----------

function rampa() {
  const r = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"];
  return oscuro() ? r.slice().reverse() : r;
}

function alturaMapa() {
  const w = document.getElementById("viz-mapa").clientWidth;
  if (document.body.classList.contains("feria")) return Math.max(320, innerHeight - 300);
  return Math.min(440, Math.max(260, w * 0.46));
}

// Mapa genérico: valores = [{iso3, nombre, o: [valor por año desde x0]}]
// fmt = expresión Vega para el tooltip (recibe datum.valor)
function specMapa({ el, valores, x0, anio, domain, log = false, titulo, fmt, labelExpr, height, umbrales, paleta, formatoLeyenda }) {
  const c = C();
  const ancho = document.querySelector(el).clientWidth;
  // Con umbrales (clases fijas para todos los años) cada tema usa su propia paleta
  const escala = umbrales
    ? { type: "threshold", domain: umbrales, range: oscuro() ? paleta.slice().reverse() : paleta }
    : { type: log ? "log" : "linear", domain, range: rampa(), clamp: true };
  const leyenda = umbrales
    ? { title: titulo, orient: "bottom-left", direction: "horizontal", format: formatoLeyenda, symbolType: "square", columns: 8 }
    : { title: titulo, direction: "horizontal", orient: ancho < 760 ? "bottom" : "bottom-left", gradientLength: 220, labelExpr, tickCount: 5 };
  return {
    width: "container",
    height,
    autosize: { type: "fit", contains: "padding" },
    params: [{ name: "anio", value: anio }, { name: "pais", value: pais }],
    data: { url: "data/world.json", format: { type: "topojson", feature: "countries" } },
    projection: { type: "equalEarth" },
    transform: [
      { calculate: "datum.properties.iso3", as: "iso3" },
      { filter: "datum.iso3 !== 'ATA'" },
      { lookup: "iso3", from: { data: { values: valores }, key: "iso3", fields: ["nombre", "o"] } },
      { calculate: `isValid(datum.o) && isValid(datum.o[anio - ${x0}]) ? datum.o[anio - ${x0}] : -1`, as: "valor" },
      { calculate: "isValid(datum.nombre) ? datum.nombre : datum.properties.name", as: "País" },
      { calculate: `datum.valor < 0 ? 'sin datos' : ${fmt}`, as: "Valor" },
      { calculate: "anio", as: "Año" },
    ],
    mark: { type: "geoshape", cursor: "pointer" },
    encoding: {
      color: {
        condition: { test: "datum.valor < 0", value: c.missing },
        field: "valor", type: "quantitative",
        scale: escala,
        legend: leyenda,
      },
      stroke: { condition: { test: "datum.iso3 === pais", value: c.text }, value: c.surface },
      strokeWidth: { condition: { test: "datum.iso3 === pais", value: 2 }, value: 0.5 },
      tooltip: [{ field: "País" }, { field: "Año" }, { field: "Valor", title: titulo }],
    },
  };
}

function clickPais(view) {
  view.addEventListener("click", (_, item) => {
    const iso = item && item.datum && item.datum.iso3;
    if (iso) setPais(iso);
  });
}

// El mismo mapa y panel que la obesidad en "Explorá otros temas": clases fijas en rojos y,
// al costado, el país elegido con su puesto y su comparación con la región y el mundo
async function renderMapa() {
  renderPanelMapa();
  const valores = D.paises.map((p) => ({ iso3: p.iso3, nombre: p.nombre, o: p.obesidad }));
  const args = window.Explorar ? Explorar.mapaTema("obes").spec : {
    valores, x0: ANIO_0, domain: [0, 45], titulo: "% de adultos con obesidad",
    fmt: "format(datum.valor, '.1f') + '%'", labelExpr: "datum.value >= 45 ? '45+' : datum.value",
  };
  const res = await embed("#viz-mapa", specMapa({
    el: "#viz-mapa", anio: +document.getElementById("anio").value, height: alturaMapa(), ...args,
  }));
  mapaView = res.view;
  clickPais(mapaView);
}

function renderPanelMapa() {
  document.getElementById("mapa-side").innerHTML =
    window.Explorar ? Explorar.panel("obes", +document.getElementById("anio").value) : "";
}

function setAnio(a) {
  document.getElementById("anio").value = a;
  document.getElementById("anio-label").textContent = a;
  if (mapaView) mapaView.signal("anio", a).runAsync();
  if (!document.body.classList.contains("feria")) renderPanelMapa();
}

let timer = null;
function togglePlay() {
  const btn = document.getElementById("play");
  if (timer) {
    clearInterval(timer); timer = null;
    btn.textContent = "▶"; btn.setAttribute("aria-label", "Reproducir");
    return;
  }
  let a = +document.getElementById("anio").value;
  if (a >= ANIO_N) a = ANIO_0 - 1;
  btn.textContent = "❚❚"; btn.setAttribute("aria-label", "Pausar");
  timer = setInterval(() => {
    a += 1;
    setAnio(a);
    if (a >= ANIO_N) togglePlay();
  }, 280);
}

// ---------- Modo feria: mapa en pantalla completa, en loop ----------

const URL_SITIO = "https://holasoyrox.github.io/datos-sin-fronteras/";
let feriaTimer = null;

// Orden de los temas en la vitrina: primero la historia (obesidad), después el resto del explorador
let feriaTemas = [];
let feriaIdx = 0;

function tituloFeria(texto, sub) {
  document.getElementById("feria-titulo").textContent = texto;
  document.getElementById("feria-tema").textContent = sub;
}

function rangoSlider(y0, y1) {
  const s = document.getElementById("anio");
  s.min = y0; s.max = y1;
}

async function mapaFeria() {
  const k = feriaTemas[feriaIdx];
  if (k === "obes" || !window.Explorar) rangoSlider(ANIO_0, ANIO_N);
  if (k === "obes" || !window.Explorar) {
    tituloFeria(`% de adultos con obesidad, ${ANIO_0}–${ANIO_N}`, "Nuestro caso de estudio");
    await renderMapa();
    return [ANIO_0, ANIO_N];
  }
  const m = Explorar.mapaTema(k);
  rangoSlider(m.y0, m.y1);
  tituloFeria(`${m.nombre} (${m.unidad}), ${m.y0}–${m.y1}`,
    `Tema ${feriaIdx + 1} de ${feriaTemas.length} · el mismo código, otro indicador`);
  const res = await embed("#viz-mapa", specMapa({ el: "#viz-mapa", anio: m.y0, height: alturaMapa(), ...m.spec }));
  mapaView = res.view;
  clickPais(mapaView);
  return [m.y0, m.y1];
}

function entrarFeria() {
  if (timer) togglePlay();
  mostrarTab("historia");
  feriaTemas = ["obes"].concat(window.Explorar ? Explorar.claves().filter((k) => k !== "obes") : []);
  feriaIdx = 0;
  document.body.classList.add("feria");
  const qr = document.getElementById("qr");
  if (!qr.hasChildNodes() && window.QRCode) {
    new QRCode(qr, { text: URL_SITIO, width: 120, height: 120, correctLevel: QRCode.CorrectLevel.M });
  }
  if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
  scrollTo(0, 0);
  let a0 = ANIO_0, a1 = ANIO_N, a = ANIO_0, pausa = 0, cargando = false;
  mapaFeria().then(([y0, y1]) => {
    a0 = y0; a1 = y1; a = y0;
    setAnio(a);
    feriaTimer = setInterval(async () => {
      if (cargando) return;
      if (a >= a1) {               // se queda unos segundos en el último año y pasa al tema siguiente
        if (++pausa < 12) return;
        pausa = 0;
        cargando = true;
        feriaIdx = (feriaIdx + 1) % feriaTemas.length;
        [a0, a1] = await mapaFeria();
        a = a0; setAnio(a);
        cargando = false;
        return;
      }
      setAnio(++a);
    }, 250);
  });
}

function salirFeria() {
  clearInterval(feriaTimer); feriaTimer = null;
  feriaIdx = 0;
  rangoSlider(ANIO_0, ANIO_N);
  document.body.classList.remove("feria");
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  setAnio(ANIO_N);
  renderMapa();
}

// ---------- Gráfico de líneas reutilizable (con crosshair) ----------
// series: [{nombre, valores, color, ancho, destacada, etiqueta}]

function specLineas(series, {
  height = 300, x0 = ANIO_0, x1 = ANIO_N, yTitle = "% de adultos con obesidad",
  fmtV = (v) => `${fmt1(v)}%`, formatoTip = ".1f", yFormat = null, cero = true,
} = {}) {
  const c = C();
  const data = series.flatMap((s) => serieLarga(s.nombre, s.valores, x0).map((d) => ({
    ...d, color: s.color, ancho: s.ancho, destacada: !!s.destacada,
    etiqueta: s.etiqueta ? `${s.etiqueta} ${fmtV(d.valor)}` : null,
  })));
  const nombres = series.map((s) => s.nombre);
  // la etiqueta va en el último año con dato de cada serie
  const ultimo = {};
  data.forEach((d) => { if (!ultimo[d.serie] || d.anio > ultimo[d.serie]) ultimo[d.serie] = d.anio; });
  data.forEach((d) => { d.fin = d.anio === ultimo[d.serie]; });
  const x = { field: "anio", type: "quantitative", title: null,
    axis: { format: "d", tickCount: 6 }, scale: { domain: [x0, x1] } };
  const y = { field: "valor", type: "quantitative", title: yTitle,
    scale: { zero: cero, nice: true }, axis: { tickCount: 5, ...(yFormat ? { format: yFormat } : {}) } };
  const linea = (destacada) => ({
    transform: [{ filter: destacada ? "datum.destacada" : "!datum.destacada" }],
    mark: { type: "line", interpolate: "monotone", strokeCap: "round" },
    encoding: {
      x, y, detail: { field: "serie" },
      color: { field: "color", type: "nominal", scale: null },
      strokeWidth: { field: "ancho", type: "quantitative", scale: null },
    },
  });
  return {
    width: "container", height,
    padding: { right: 8 },
    data: { values: data },
    layer: [
      linea(false),
      linea(true),
      {
        transform: [{ pivot: "serie", value: "valor", groupby: ["anio"] }],
        params: [{ name: "hover", select: { type: "point", encodings: ["x"], nearest: true, on: "pointerover", clear: "pointerout" } }],
        mark: { type: "rule", color: c.muted, strokeWidth: 1 },
        encoding: {
          x,
          opacity: { condition: { param: "hover", empty: false, value: 0.6 }, value: 0 },
          tooltip: [{ field: "anio", title: "Año" }].concat(
            nombres.map((n) => ({ field: n, type: "quantitative", title: corto(n), format: formatoTip }))),
        },
      },
      {
        transform: [{ filter: { param: "hover", empty: false } }, { filter: "datum.destacada" }],
        mark: { type: "point", filled: true, size: 64, stroke: c.surface, strokeWidth: 2, opacity: 1 },
        encoding: { x, y, color: { field: "color", type: "nominal", scale: null } },
      },
      {
        transform: [{ filter: "datum.fin && datum.etiqueta" }],
        mark: { type: "text", align: "right", dy: -12, fontWeight: 600 },
        encoding: { x, y, text: { field: "etiqueta" } },
      },
    ],
  };
}

// ---------- 2. País por país (banderas) ----------
// Hecho con Observable Plot, como el gráfico original de Ariel Aizemberg (Plot.dodgeY con banderas)

function renderBanderas() {
  const el = document.getElementById("viz-banderas");
  const c = C();
  const MITAD = 50;
  const paises = D.paises
    .filter((p) => p.obesidad[idx(ANIO_N)] != null)
    .map((p) => ({ iso3: p.iso3, nombre: p.nombre, v: p.obesidad[idx(ANIO_N)] }))
    .sort((a, b) => a.v - b.v);

  const arriba = paises.filter((p) => p.v > MITAD).reverse();
  const nombres = arriba.map((p) => `${p.nombre} (${fmt1(p.v)}%)`);
  document.getElementById("titulo-banderas").textContent =
    `Los ${arriba.length} países donde la obesidad afecta a más de la mitad de los adultos`;
  document.getElementById("lista-banderas").textContent =
    `Del otro lado de la línea del ${MITAD}% quedan ${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}: ` +
    "islas del Pacífico que en el mapa casi no se ven.";

  const W = el.clientWidth;
  const r = Math.max(5.5, Math.min(11, W / 100));
  const margen = { top: 34, bottom: 44 };
  const dodge = (opciones) => Plot.dodgeY({ x: "v", r, padding: 1, anchor: "middle", ...opciones });

  const plot = (height) => Plot.plot({
    width: W, height,
    marginTop: margen.top, marginBottom: margen.bottom, marginLeft: r + 4, marginRight: r + 4,
    style: { fontFamily: "Inter, system-ui, sans-serif", fontSize: "12px", color: c.text2, background: "transparent", overflow: "visible" },
    x: {
      domain: [0, Math.ceil(paises.at(-1).v / 10) * 10], ticks: W < 500 ? 5 : 10,
      label: "% de adultos con obesidad (IMC de 30 o más) →", labelAnchor: "right", labelArrow: "none",
    },
    marks: [
      Plot.ruleX([MITAD], { stroke: c.muted, strokeDasharray: "4 4" }),
      Plot.text([MITAD], { x: (d) => d, frameAnchor: "bottom", dx: 6, dy: -8, textAnchor: "start", text: () => "La mitad de los adultos", fill: c.text2 }),
      Plot.image(paises, dodge({ src: (d) => `vendor/circle-flags/${d.iso3}.svg`, title: (d) => `${d.nombre}: ${fmt1(d.v)}%` })),
      // borde fino en todas (para las banderas claras) y anillo en el país elegido
      Plot.dot(paises, dodge({
        stroke: (d) => (d.iso3 === pais ? c.pais : c.muted),
        strokeOpacity: (d) => (d.iso3 === pais ? 1 : 0.35),
        strokeWidth: (d) => (d.iso3 === pais ? 3 : 0.75),
      })),
    ],
  });

  // dodgeY no sabe cuánto alto necesita: dibujamos una vez, medimos dónde quedaron las banderas y ajustamos
  let svg = plot(400);
  const ys = [...svg.querySelectorAll("image")].map((img) => +img.getAttribute("y"));
  const alto = Math.max(...ys) - Math.min(...ys) + 2 * r;
  svg = plot(Math.ceil(alto + margen.top + margen.bottom + 8));
  el.replaceChildren(svg);

  const imgs = [...svg.querySelectorAll("image")];
  imgs.forEach((img, i) => { img.style.cursor = "pointer"; img.onclick = () => setPais(paises[i].iso3); });

  // nombre del país elegido arriba del gráfico, con una línea hasta su bandera
  const k = paises.findIndex((p) => p.iso3 === pais);
  if (k >= 0) {
    const x = +imgs[k].getAttribute("x") + r, y = +imgs[k].getAttribute("y");
    const svgEl = (tag, attrs) => {
      const e = document.createElementNS("http://www.w3.org/2000/svg", tag);
      Object.entries(attrs).forEach(([a, v]) => e.setAttribute(a, v));
      return svg.appendChild(e);
    };
    if (y - 2 > margen.top - 8) svgEl("line", { class: "bees-guia", x1: x, x2: x, y1: margen.top - 8, y2: y - 2 });
    svgEl("text", {
      class: "bees-label", x, y: margen.top - 14,
      "text-anchor": x < W * 0.15 ? "start" : x > W * 0.85 ? "end" : "middle",
    }).textContent = `${paises[k].nombre} ${fmt1(paises[k].v)}%`;
  }
}

// ---------- 3. Regiones ----------

function renderRegiones() {
  const c = C();
  const region = P().region;
  const series = D.regiones
    .filter((r) => r !== region)
    .map((r) => ({ nombre: r, valores: D.promedios[r], color: c.otro, ancho: 1.25 }));
  series.push({ nombre: "Mundo", valores: D.promedios.Mundo, color: c.mundo, ancho: 2, destacada: true, etiqueta: "Mundo" });
  series.push({ nombre: region, valores: D.promedios[region], color: c.region, ancho: 2.5, destacada: true, etiqueta: corto(region) });
  legend("legend-regiones", [[corto(region), c.region], ["Mundo", c.mundo], ["Otras regiones", c.otro]]);

  const r = D.promedios[region];
  document.getElementById("titulo-regiones").textContent =
    `${region}: de ${fmt1(r[0])}% a ${fmt1(r[r.length - 1])}%`;
  return embed("#viz-regiones", specLineas(series));
}

// ---------- 4. Ingreso vs. obesidad ----------

function renderIngreso() {
  const c = C();
  const p = P();
  const data = D.paises.filter((d) => d.pbi_pc && d.poblacion).map((d) => ({
    nombre: d.nombre, region: d.region, pbi: d.pbi_pc, pob: d.poblacion,
    obesidad: d.obesidad[idx(ANIO_N)],
    grupo: d.iso3 === pais ? "pais" : d.region === p.region ? "region" : "otro",
    orden: d.iso3 === pais ? 3 : d.region === p.region ? 2 : 1,
  }));
  legend("legend-ingreso", [[p.nombre, c.pais, "dot"], [corto(p.region), c.region, "dot"], ["Resto del mundo", c.otro, "dot"]]);
  const x = { field: "pbi", type: "quantitative", scale: { type: "log", domain: [200, 150000], nice: false },
    title: "PBI per cápita (US$ corrientes, escala log)", axis: { values: [300, 1000, 3000, 10000, 30000, 100000], format: "$,.0f" } };
  const y = { field: "obesidad", type: "quantitative", title: "% de adultos con obesidad", scale: { domain: [0, 80] } };
  const sinPbi = !data.some((d) => d.grupo === "pais");
  return embed("#viz-ingreso", {
    width: "container", height: 360,
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
          tooltip: [
            { field: "nombre", title: "País" }, { field: "region", title: "Región" },
            { field: "pbi", title: "PBI per cápita", format: "$,.0f" },
            { field: "obesidad", title: "Obesidad (%)", format: ".1f" },
            { field: "pob", title: "Población", format: ",.0f" },
          ],
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
  }).then(() => {
    if (sinPbi) document.getElementById("legend-ingreso").insertAdjacentHTML("beforeend",
      `<span style="color:var(--text-muted)">(${p.nombre} no tiene dato de PBI para ${ANIO_N})</span>`);
  });
}

// ---------- 5. Quién cambió más ----------

function renderCambio() {
  const c = C();
  const p = P();
  document.getElementById("scope-region").textContent = `Solo ${corto(p.region)}`;
  let base = D.paises.map((d) => ({
    nombre: d.nombre, region: d.region, iso3: d.iso3,
    o0: d.obesidad[0], o1: d.obesidad[idx(ANIO_N)],
  }));
  if (scopeCambio === "region") base = base.filter((d) => d.region === p.region);
  base.forEach((d) => { d.delta = d.o1 - d.o0; });
  const top = base.sort((a, b) => b.delta - a.delta).slice(0, 15).map((d) => ({
    ...d,
    grupo: d.iso3 === pais ? "pais" : d.region === p.region ? "region" : "otro",
    txt: `+${fmt1(d.delta)} pp`,
  }));
  const fin = { pais: c.pais, region: c.region, otro: c.text2 };
  legend("legend-cambio", [
    [String(ANIO_0), c.otro, "dot"],
    [`${ANIO_N}`, c.text2, "dot"],
    [corto(p.region), c.region, "dot"],
    [p.nombre, c.pais, "dot"],
  ]);
  const y = { field: "nombre", type: "nominal", sort: { field: "delta", order: "descending" }, title: null,
    axis: { labelLimit: 160, labelFontSize: 12, ticks: false, domain: false } };
  const x = { type: "quantitative", title: "% de adultos con obesidad", scale: { domain: [0, 80] } };
  return embed("#viz-cambio", {
    width: "container", height: { step: 24 },
    data: { values: top },
    encoding: { y },
    layer: [
      { mark: { type: "rule", color: c.otro, strokeWidth: 2 }, encoding: { x: { ...x, field: "o0" }, x2: { field: "o1" } } },
      { mark: { type: "circle", size: 90, color: c.otro, opacity: 1 }, encoding: { x: { ...x, field: "o0" } } },
      {
        mark: { type: "circle", size: 110, opacity: 1, stroke: c.surface, strokeWidth: 2 },
        encoding: {
          x: { ...x, field: "o1" },
          color: { field: "grupo", type: "nominal", scale: { domain: Object.keys(fin), range: Object.values(fin) }, legend: null },
          tooltip: [
            { field: "nombre", title: "País" },
            { field: "o0", title: `Obesidad ${ANIO_0} (%)`, format: ".1f" },
            { field: "o1", title: `Obesidad ${ANIO_N} (%)`, format: ".1f" },
            { field: "txt", title: "Cambio" },
          ],
        },
      },
      {
        mark: { type: "text", align: "left", dx: 12, fontSize: 12 },
        encoding: { x: { ...x, field: "o1" }, text: { field: "txt" }, color: { value: c.text2 } },
      },
    ],
  });
}

// ---------- 6. Un país ----------

function renderPais() {
  const c = C();
  const p = P();
  const o = p.obesidad;
  const a = o[0], b = o[o.length - 1];
  const ranking = D.paises.slice().sort((x, y) => y.obesidad[idx(ANIO_N)] - x.obesidad[idx(ANIO_N)]);
  const puesto = ranking.findIndex((d) => d.iso3 === pais) + 1;
  const mundo = D.promedios.Mundo[idx(ANIO_N)];

  document.getElementById("titulo-pais").textContent = `${p.nombre}, de cerca`;
  document.getElementById("kpis").innerHTML = `
    <div class="kpi"><div class="v">${fmt1(a)}%</div><div class="l">adultos con obesidad en ${ANIO_0}</div></div>
    <div class="kpi"><div class="v">${fmt1(b)}%</div><div class="l">en ${ANIO_N}</div></div>
    <div class="kpi"><div class="v">×${fmt1(b / a)}</div><div class="l">veces más que en ${ANIO_0}</div></div>
    <div class="kpi"><div class="v">${puesto}º</div><div class="l">de ${D.paises.length} países en ${ANIO_N}
      (${b > mundo ? "por encima" : "por debajo"} del promedio mundial)</div></div>`;

  legend("legend-pais", [[p.nombre, c.pais], [corto(p.region), c.region], ["Mundo", c.mundo]]);
  const series = [
    { nombre: "Mundo", valores: D.promedios.Mundo, color: c.mundo, ancho: 2, destacada: true, etiqueta: "Mundo" },
    { nombre: p.region, valores: D.promedios[p.region], color: c.region, ancho: 2, destacada: true, etiqueta: corto(p.region) },
    { nombre: p.nombre, valores: o, color: c.pais, ancho: 3, destacada: true, etiqueta: p.nombre },
  ];

  const filas = D.anios.map((anio, i) =>
    `<tr><td>${anio}</td><td>${fmt1(o[i])}</td><td>${fmt1(D.promedios[p.region][i])}</td><td>${fmt1(D.promedios.Mundo[i])}</td></tr>`).join("");
  document.getElementById("tabla-pais").innerHTML = `<div class="scroll"><table>
    <thead><tr><th>Año</th><th>${p.nombre} (%)</th><th>${corto(p.region)} (%)</th><th>Mundo (%)</th></tr></thead>
    <tbody>${filas}</tbody></table></div>`;

  return embed("#viz-pais", specLineas(series, { height: 290 }));
}

// ---------- 7. Cómo se hace ----------

const TEMAS = [
  { label: "Obesidad", q: "obesity prevalence adults", id: "WB_HCP_OBESITY", db: "WB_HCP" },
  { label: "Mortalidad infantil", q: "infant mortality rate", id: "WB_WDI_SP_DYN_IMRT_IN", db: "WB_WDI" },
  { label: "Desnutrición", q: "prevalence of undernourishment", id: "WB_WDI_SN_ITK_DEFC_ZS", db: "WB_WDI" },
  { label: "Esperanza de vida", q: "life expectancy at birth", id: "WB_WDI_SP_DYN_LE00_IN", db: "WB_WDI" },
  { label: "Emisiones de CO₂", q: "CO2 emissions per capita", id: "WB_WDI_EN_GHG_CO2_PC_CE_AR5", db: "WB_WDI" },
];

function renderCodigo(t) {
  const m = (s) => `<mark>${s}</mark>`;
  document.getElementById("code-buscar").innerHTML =
`import requests

r = requests.post("https://data360api.worldbank.org/data360/searchv2", json={
    "search": "${m(t.q)}",
    "select": "series_description/idno, series_description/name",
    "top": 10,
})
r.json()["value"]   # → ${m(t.id)}`;
  document.getElementById("code-traer").innerHTML =
`import pandas as pd

filas, skip = [], 0
while True:
    r = requests.get("https://data360api.worldbank.org/data360/data", params={
        "DATABASE_ID": "${m(t.db)}",
        "INDICATOR": "${m(t.id)}",
        "skip": skip,
    })
    pagina = r.json()["value"]
    filas += pagina
    if len(pagina) &lt; 1000:
        break
    skip += 1000

df = pd.DataFrame(filas)   # una fila por país × año`;
}

function renderChips() {
  const cont = document.getElementById("chips");
  TEMAS.forEach((t, i) => {
    const b = document.createElement("button");
    b.textContent = t.label;
    if (i === 0) b.classList.add("on");
    b.onclick = () => {
      cont.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
      renderCodigo(t);
    };
    cont.appendChild(b);
  });
  renderCodigo(TEMAS[0]);
}

// ---------- Estado ----------

function renderDependientes() {
  renderBanderas();
  return Promise.all([renderRegiones(), renderIngreso(), renderCambio(), renderPais()]);
}

// Las pestañas ocultas no tienen ancho, así que cada una se dibuja cuando se muestra
let tabActual = "historia";
const sucias = new Set(["historia", "explorar", "como"]);

function renderTab(id) {
  sucias.delete(id);
  if (id === "historia") { renderMapa(); renderDependientes(); }
  if (id === "explorar" && window.Explorar) Explorar.render();
  if (id === "como" && window.Como) Como.render();
}

function mostrarTab(id) {
  if (!document.getElementById(`tab-${id}`)) id = "historia";
  tabActual = id;
  document.querySelectorAll(".tab").forEach((t) => { t.hidden = t.id !== `tab-${id}`; });
  document.querySelectorAll(".tabs button").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === id));
  if (location.hash.slice(1) !== id) history.replaceState(null, "", `#${id}`);
  if (sucias.has(id)) renderTab(id);
}

function setPais(iso) {
  if (!porIso[iso] && !(window.Explorar && Explorar.tienePais(iso))) return;
  pais = iso;
  const sel = document.getElementById("pais");
  if (![...sel.options].some((o) => o.value === iso)) return;
  sel.value = iso;
  ["historia", "explorar", "como"].forEach((t) => sucias.add(t));
  if (tabActual === "historia" && mapaView) {
    sucias.delete("historia");
    mapaView.signal("pais", iso).runAsync();
    renderPanelMapa();
    renderDependientes();
  } else {
    renderTab(tabActual);
  }
}

function renderTodo() {
  renderHero();
  ["historia", "explorar", "como"].forEach((t) => sucias.add(t));
  renderTab(tabActual);
}

async function main() {
  D = await fetch("data/obesidad.json").then((r) => r.json());
  D.paises.forEach((p) => { porIso[p.iso3] = p; });

  const sel = document.getElementById("pais");
  D.paises.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, "es")).forEach((p) => {
    sel.add(new Option(p.nombre, p.iso3));
  });
  sel.value = pais;
  sel.onchange = () => setPais(sel.value);

  document.getElementById("anio").oninput = (e) => setAnio(+e.target.value);
  document.getElementById("play").onclick = togglePlay;
  document.querySelectorAll(".toggle button").forEach((b) => {
    b.onclick = () => {
      document.querySelectorAll(".toggle button").forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
      scopeCambio = b.dataset.scope;
      renderCambio();
    };
  });

  document.getElementById("feria-on").onclick = entrarFeria;
  document.getElementById("feria-off").onclick = salirFeria;
  addEventListener("keydown", (e) => { if (e.key === "Escape" && feriaTimer) salirFeria(); });
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && feriaTimer) salirFeria();
  });
  if (new URLSearchParams(location.search).has("feria")) addEventListener("load", entrarFeria);

  document.querySelectorAll(".tabs button").forEach((b) => {
    b.onclick = () => { mostrarTab(b.dataset.tab); scrollTo({ top: document.querySelector(".picker").offsetTop, behavior: "smooth" }); };
  });
  addEventListener("hashchange", () => mostrarTab(location.hash.slice(1)));

  renderChips();
  renderHero();
  if (window.Explorar) await Explorar.init();
  mostrarTab(location.hash.slice(1) || "historia");

  // Cambios de tema (claro/oscuro) y de tamaño
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", renderTodo);
  let w = innerWidth;
  addEventListener("resize", () => {
    if (Math.abs(innerWidth - w) > 80) { w = innerWidth; renderTodo(); }
  });
}

main();
