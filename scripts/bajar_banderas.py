"""
Descarga las banderas redondas de los países de la historia (circle-flags, licencia MIT).

    python3 scripts/bajar_banderas.py

Genera vendor/circle-flags/<ISO3>.svg para cada país de data/obesidad.json,
así el gráfico de banderas anda sin internet. Las banderas vienen con el
código ISO2 y el sitio usa ISO3: la equivalencia sale de la API v2 del Banco Mundial.
"""

import json
import urllib.request
from pathlib import Path

from build_data import V2_ROOT, get_json

VERSION = "v2.8.0"
REPO_URL = f"https://cdn.jsdelivr.net/gh/HatScripts/circle-flags@{VERSION}"

RAIZ = Path(__file__).resolve().parent.parent
DESTINO = RAIZ / "vendor" / "circle-flags"


def bajar(url):
    req = urllib.request.Request(url, headers={"User-Agent": "datos-sin-fronteras/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def main():
    paises = json.loads((RAIZ / "data" / "obesidad.json").read_text())["paises"]
    _, catalogo = get_json(f"{V2_ROOT}/country", {"format": "json", "per_page": 400})
    iso2 = {p["id"]: p["iso2Code"].lower() for p in catalogo}

    DESTINO.mkdir(parents=True, exist_ok=True)
    (DESTINO / "LICENSE.md").write_bytes(bajar(f"{REPO_URL}/LICENSE.md"))
    faltan = []
    for p in paises:
        try:
            svg = bajar(f"{REPO_URL}/flags/{iso2[p['iso3']]}.svg")
        except Exception:
            faltan.append(p["iso3"])
            continue
        (DESTINO / f"{p['iso3']}.svg").write_bytes(svg)

    print(f"{len(paises) - len(faltan)} banderas en {DESTINO.relative_to(RAIZ)}/")
    if faltan:
        print("Sin bandera:", ", ".join(faltan))


if __name__ == "__main__":
    main()
