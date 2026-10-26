# Datos sin fronteras

**Cómo tomar datos abiertos del Banco Mundial y convertirlos en una historia.**
Caso de estudio: obesidad en adultos, 1990–2022.

Proyecto presentado en la Media Feria de [Media Party 2026](https://mediaparty.org) (Ciudad Cultural Konex, Buenos Aires).
Surge del trabajo final de la materia Visualización de la Información.

🌐 **Sitio:** https://holasoyrox.github.io/datos-sin-fronteras/

## Qué hay en el sitio

1. **El mundo:** mapa animado de la prevalencia de obesidad, de 1990 a 2022
2. **Las regiones:** evolución por región del Banco Mundial (promedios ponderados por población)
3. **Ingreso y obesidad:** PBI per cápita vs. obesidad en 2022
4. **Quién cambió más:** los 15 países donde más subió
5. **Un país:** el detalle de cualquier país, comparado con su región y con el mundo
6. **Cómo se hace:** los tres pasos para repetir todo esto con cualquier otro indicador

## Estructura

```
index.html, style.css, app.js   # el sitio (Vega-Lite, sin build)
data/obesidad.json              # datos procesados para la web
data/world.json                 # mapa del mundo (TopoJSON + códigos ISO3)
scripts/build_data.py           # descarga y procesa los datos de la API
notebooks/TP_Final_InfoVis.ipynb  # el notebook original del TP (exploración + Altair)
```

## Cómo correrlo

```bash
# (opcional) volver a bajar los datos del Banco Mundial
python3 scripts/build_data.py

# levantar el sitio en local
python3 -m http.server 8000
# → http://localhost:8000
```

`build_data.py` usa solo la librería estándar de Python. Los datos quedan guardados en el repo, así el sitio anda aunque no haya conexión con la API.

## Fuentes

- [World Bank Data360 API](https://data360api.worldbank.org): `WB_HCP_OBESITY` (prevalencia de obesidad en adultos, %), `WB_GS_NY_GDP_PCAP_CD` (PBI per cápita, US$ corrientes), `WB_WDI_SP_POP_TOTL` (población total)
- [World Bank API v2](https://api.worldbank.org/v2/country): regiones y nombres de países
- [world-atlas](https://github.com/topojson/world-atlas): geometrías de los países (Natural Earth)
