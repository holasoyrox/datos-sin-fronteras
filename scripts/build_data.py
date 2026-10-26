"""
Descarga los datos del Banco Mundial y arma los archivos que usa la web.

Es la misma lógica del notebook del TP (notebooks/TP_Final_InfoVis.ipynb),
pero sin dependencias: solo librería estándar de Python.

    python3 scripts/build_data.py

Genera:
    data/obesidad.json  -> todo lo que necesita la web (países, series, promedios)
    data/world.json     -> mapa del mundo (TopoJSON) con códigos ISO3
"""

import csv
import io
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

DATA360_ROOT = "https://data360api.worldbank.org"
V2_ROOT = "https://api.worldbank.org/v2"

# Indicadores (los mismos que eligió el notebook)
OBESIDAD = ("WB_HCP", "WB_HCP_OBESITY")       # Prevalence of obesity among adults (%)
PBI_PC = ("WB_GS", "WB_GS_NY_GDP_PCAP_CD")    # GDP per capita (current US$)
POBLACION = ("WB_WDI", "WB_WDI_SP_POP_TOTL")  # Population, total

ANIO_DESDE, ANIO_HASTA = 1990, 2022

WORLD_TOPO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json"
ISO_CODES_URL = (
    "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/"
    "master/all/all.csv"
)

# Nombres de regiones del Banco Mundial en español
REGIONES_ES = {
    "East Asia & Pacific": "Asia oriental y Pacífico",
    "Europe & Central Asia": "Europa y Asia central",
    "Latin America & Caribbean": "América Latina y el Caribe",
    "Middle East, North Africa, Afghanistan & Pakistan": "Medio Oriente, Norte de África, Afganistán y Pakistán",
    "North America": "América del Norte",
    "South Asia": "Asia meridional",
    "Sub-Saharan Africa": "África subsahariana",
}

# Nombres más cortos y como se dicen en la calle
NOMBRES_CORTOS = {
    "COD": "R. D. del Congo",
    "COG": "Congo",
    "EGY": "Egipto",
    "FSM": "Micronesia",
    "IRN": "Irán",
    "KOR": "Corea del Sur",
    "PRK": "Corea del Norte",
    "LAO": "Laos",
    "PRI": "Puerto Rico",
    "PSE": "Cisjordania y Gaza",
    "SOM": "Somalia",
    "YEM": "Yemen",
    "BRN": "Brunéi",
    "RUS": "Rusia",
    "SYR": "Siria",
    "VEN": "Venezuela",
    "TUR": "Turquía",
}

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data"


def get_json(url, params=None, method="GET", body=None, intentos=3):
    if params:
        url = f"{url}?{urllib.parse.urlencode(params)}"
    data = json.dumps(body).encode() if body is not None else None
    for intento in range(intentos):
        try:
            headers = {"User-Agent": "datos-sin-fronteras/1.0"}
            if data:
                headers["Content-Type"] = "application/json"
            req = urllib.request.Request(url, data=data, method=method, headers=headers)
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except Exception as e:
            print(f"  intento {intento + 1} falló ({e}), reintentando...")
            time.sleep(2 * (intento + 1))
    raise RuntimeError(f"No se pudo obtener {url}")


def obtener_serie(database_id, indicator_id):
    """Trae una serie completa paginando con skip (máx. 1000 filas por request)."""
    filas, skip = [], 0
    while True:
        pagina = get_json(f"{DATA360_ROOT}/data360/data", {
            "DATABASE_ID": database_id, "INDICATOR": indicator_id, "skip": skip,
        })["value"]
        filas.extend(pagina)
        print(f"  {indicator_id}: skip={skip} -> {len(pagina)} filas")
        if len(pagina) < 1000:
            return filas
        skip += 1000
        time.sleep(0.2)


def a_tabla(filas):
    """{ISO3: {anio: valor}} quedándonos con el total (sin desagregar por sexo/edad)
    y con el rango de años que nos interesa."""
    tabla = {}
    for f in filas:
        if f.get("SEX", "_T") not in ("_T", "_Z") or f.get("AGE", "_T") not in ("_T", "_Z"):
            continue
        try:
            anio, valor = int(f["TIME_PERIOD"]), float(f["OBS_VALUE"])
        except (TypeError, ValueError):
            continue
        if ANIO_DESDE <= anio <= ANIO_HASTA:
            tabla.setdefault(f["REF_AREA"], {})[anio] = valor
    return tabla


def catalogo_paises():
    """Metadata de países desde la API v2 clásica, sin agregados regionales."""
    _, paises = get_json(f"{V2_ROOT}/country", {"format": "json", "per_page": 400})
    return {
        p["id"]: {
            "nombre": p["name"],
            "region": REGIONES_ES.get(p["region"]["value"].strip(), p["region"]["value"].strip()),
            "ingreso": p["incomeLevel"]["value"],
        }
        for p in paises
        if p["region"]["value"] != "Aggregates"
    }


def nombres_es():
    """Nombres de países en español (API v2 acepta /es/)."""
    _, paises = get_json(f"{V2_ROOT}/es/country", {"format": "json", "per_page": 400})
    return {p["id"]: p["name"] for p in paises}


def promedio_ponderado(obesidad, poblacion, codigos, anio):
    """Promedio ponderado por población: cada país pesa según cuánta gente vive ahí.
    (El notebook usaba promedio simple; acá Samoa Americana no pesa lo mismo que China.)"""
    num = den = 0.0
    for c in codigos:
        o = obesidad.get(c, {}).get(anio)
        p = poblacion.get(c, {}).get(anio)
        if o is not None and p:
            num += o * p
            den += p
    return round(num / den, 2) if den else None


def main():
    OUT.mkdir(exist_ok=True)

    print("Catálogo de países...")
    paises = catalogo_paises()
    es = nombres_es()

    print("Series...")
    obesidad = a_tabla(obtener_serie(*OBESIDAD))
    pbi = a_tabla(obtener_serie(*PBI_PC))
    poblacion = a_tabla(obtener_serie(*POBLACION))

    codigos = sorted(c for c in obesidad if c in paises)
    anios = list(range(ANIO_DESDE, ANIO_HASTA + 1))

    salida_paises = []
    for c in codigos:
        meta = paises[c]
        salida_paises.append({
            "iso3": c,
            "nombre": NOMBRES_CORTOS.get(c) or es.get(c, meta["nombre"]),
            "region": meta["region"],
            "ingreso": meta["ingreso"],
            "obesidad": [round(obesidad[c][a], 2) if a in obesidad[c] else None for a in anios],
            "pbi_pc": round(pbi[c][ANIO_HASTA], 0) if ANIO_HASTA in pbi.get(c, {}) else None,
            "poblacion": int(poblacion[c][ANIO_HASTA]) if ANIO_HASTA in poblacion.get(c, {}) else None,
        })

    regiones = sorted({paises[c]["region"] for c in codigos})
    promedios = {"Mundo": [promedio_ponderado(obesidad, poblacion, codigos, a) for a in anios]}
    for r in regiones:
        miembros = [c for c in codigos if paises[c]["region"] == r]
        promedios[r] = [promedio_ponderado(obesidad, poblacion, miembros, a) for a in anios]

    (OUT / "obesidad.json").write_text(json.dumps({
        "fuente": {
            "indicador": "Prevalencia de obesidad en adultos (%)",
            "id": OBESIDAD[1],
            "base": OBESIDAD[0],
            "api": f"{DATA360_ROOT}/data360/data",
        },
        "anios": anios,
        "regiones": regiones,
        "promedios": promedios,
        "paises": salida_paises,
    }, ensure_ascii=False, separators=(",", ":")))
    print(f"data/obesidad.json: {len(salida_paises)} países, {len(anios)} años")

    print("Mapa del mundo...")
    topo = get_json(WORLD_TOPO_URL)
    with urllib.request.urlopen(ISO_CODES_URL, timeout=60) as r:
        iso = {row["country-code"]: row["alpha-3"]
               for row in csv.DictReader(io.TextIOWrapper(r, encoding="utf-8"))}
    iso["-99"] = None
    for g in topo["objects"]["countries"]["geometries"]:
        g.setdefault("properties", {})["iso3"] = iso.get(str(g.get("id")))
    # Kosovo y norte de Chipre vienen sin código numérico en world-atlas
    for g in topo["objects"]["countries"]["geometries"]:
        if g["properties"].get("name") == "Kosovo":
            g["properties"]["iso3"] = "XKX"
    del topo["objects"]["land"]
    (OUT / "world.json").write_text(json.dumps(topo, separators=(",", ":")))
    print("data/world.json listo")


if __name__ == "__main__":
    main()
