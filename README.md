# Datos sin fronteras

**Cómo tomar datos abiertos del Banco Mundial y convertirlos en una historia.**
Caso de estudio: obesidad en adultos, 1990–2022.

Proyecto presentado en la Media Feria de [Media Party 2026](https://mediaparty.org) (Ciudad Cultural Konex, Buenos Aires).
Surge del trabajo final de Visualización de la Información (Maestría en Ciencia de Datos, ITBA).

**Equipo:** Paula Farias y Rocío Sanchez Faris · **Profesor:** Ariel Aizemberg

🌐 **Sitio:** https://holasoyrox.github.io/datos-sin-fronteras/

## Qué hay en el sitio

Tres pestañas:

**La historia:** obesidad en adultos, de lo general a lo particular
1. El mundo: mapa animado 1990–2022 con el puesto del país elegido frente a su región y al mundo (y un *modo feria* en pantalla completa con un QR, que recorre en loop la obesidad y después todos los temas del explorador)
2. País por país: cada país es una bandera según su % de obesidad; solo 5 pasan el 50%. Es un gráfico de Ariel Aizemberg, hecho con Observable Plot.
3. Las regiones: promedios ponderados por población
4. Ingreso y obesidad: PBI per cápita vs. obesidad
5. Quién cambió más: los 15 países donde más subió
6. Un país: el detalle de cualquier país frente a su región y al mundo

**Explorá otros temas:** el mismo código con 13 indicadores precargados (esperanza de vida, mortalidad infantil, desnutrición, CO₂, internet…), búsqueda en vivo en el catálogo del Banco Mundial, mapas con una paleta propia por tema, el puesto de cada país en el ranking, cruce entre indicadores con su correlación y un *modo juego* para adivinar valores.

**Cómo se hizo:** el pedido a la API del tema elegido, el código en Python, los mapas hechos en QGIS y los notebooks de Observable del profesor.

El explorador, el modo juego y los mapas de QGIS vienen de [El mundo en datos](https://github.com/pafarias-itba/el-mundo-en-datos), la versión de Paula.

## Estructura

```
index.html, style.css           # el sitio (sin build)
app.js                          # La historia + pestañas y helpers compartidos
explorar.js                     # Explorá otros temas
como.js                         # Cómo se hizo
data/obesidad.json              # datos de la historia
data/indicadores.json           # 13 indicadores para el explorador (1990–2024)
data/world.json                 # mapa del mundo (TopoJSON + códigos ISO3)
assets/qgis/                    # mapas de obesidad exportados desde QGIS (1990–2022)
vendor/                         # Vega, Vega-Lite, Vega-Embed, Observable Plot, D3 y QRCode (para usar sin internet)
vendor/circle-flags/            # banderas redondas por código ISO3 (circle-flags, MIT)
scripts/build_data.py           # descarga y procesa los datos de la API
scripts/bajar_banderas.py       # descarga las banderas de los países de la historia
notebooks/TP_Final_InfoVis.ipynb  # el notebook original del TP
```

## Cómo correrlo

```bash
# (opcional) volver a bajar los datos del Banco Mundial
python3 scripts/build_data.py

# levantar el sitio en local
python3 -m http.server 8000
# → http://localhost:8000
```

`build_data.py` usa solo la librería estándar de Python. Los datos y las librerías quedan guardados en el repo, así el sitio anda sin internet (salvo la búsqueda en vivo, que consulta la API).

## Fuentes

- [World Bank Data360 API](https://data360api.worldbank.org): `WB_HCP_OBESITY` (prevalencia de obesidad en adultos, %), `WB_WDI_NY_GDP_PCAP_CD` (PBI per cápita, US$ corrientes) y los indicadores del explorador, `WB_WDI_SP_POP_TOTL` (población total)
- [World Bank API v2](https://api.worldbank.org/v2/country): regiones y nombres de países
- [world-atlas](https://github.com/topojson/world-atlas): geometrías de los países (Natural Earth)
- [circle-flags](https://github.com/HatScripts/circle-flags): banderas redondas (licencia MIT)
- El gráfico de banderas es de [Ariel Aizemberg](https://observablehq.com/@aaizemberg), hecho en Observable
