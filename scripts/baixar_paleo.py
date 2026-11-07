"""
Baixa reconstruções paleogeográficas pro modo "continentes antigos".

Pra cada época (70, 80, ..., 250 milhões de anos atrás), pede ao GPlates Web Service:
  - os contornos dos continentes naquela época
  - a posição, naquela época, de cada local de coleta de public/data/dinos.json
Assim pontos e continentes ficam sempre no mesmo modelo e na mesma época.

Modelo: PALEOMAP (Scotese 2016, CC BY 4.0) — https://doi.org/10.5281/zenodo.10596609
Serviço: GPlates Web Service (EarthByte / Universidade de Sydney) — https://gws.gplates.org

Rodar DEPOIS de baixar_dados.py (usa a lista de locais de lá):
    python scripts/baixar_paleo.py            # usa o cache local se existir
    python scripts/baixar_paleo.py --refresh  # baixa tudo de novo

Saída: public/data/paleo/<época>.json, um arquivo por época. Coordenadas em décimos de
grau, como inteiros (-172 = -17,2°) — a incerteza das reconstruções é bem maior que isso:
  pontos  [lng, lat, lng, lat, ...] na mesma ordem de "locais" (null = sem reconstrução)
  costas  lista de contornos; cada um [lng0, lat0, dlng1, dlat1, ...]: o primeiro ponto
          é absoluto e os seguintes são a diferença pro anterior (números pequenos)
"""

import argparse
import hashlib
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

GWS = "https://gws.gplates.org"
MODELO = "PALEOMAP"
EPOCAS = range(70, 251, 10)
USER_AGENT = "AtlasMesozoico/0.1 (projeto educativo)"
PAUSA_SEGUNDOS = 2  # pausa entre requisições, por cortesia com o servidor
TOLERANCIA_GRAUS = 0.15  # simplificação dos contornos (~17 km); invisível nos zooms do globo
AREA_MINIMA = 0.2  # graus²; descarta ilhotas (80% dos contornos, 0,2% da área)

RAIZ = Path(__file__).resolve().parent.parent
DADOS = RAIZ / "public" / "data" / "dinos.json"
CACHE = RAIZ / "data" / "raw" / "paleo"
SAIDA = RAIZ / "public" / "data" / "paleo"


def baixar(nome_cache, url, dados_post, refresh):
    """GET (ou POST, se houver dados) com cache local. Devolve o JSON."""
    arquivo = CACHE / f"{nome_cache}.json"
    if arquivo.exists() and not refresh:
        return json.loads(arquivo.read_text(encoding="utf-8"))

    corpo = urllib.parse.urlencode(dados_post).encode() if dados_post else None
    req = urllib.request.Request(url, data=corpo, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=300) as resp:
        texto = resp.read().decode("utf-8")

    CACHE.mkdir(parents=True, exist_ok=True)
    arquivo.write_text(texto, encoding="utf-8")
    time.sleep(PAUSA_SEGUNDOS)
    return json.loads(texto)


def distancia_ao_segmento(p, a, b):
    """Distância (em graus, plano) do ponto p ao segmento a-b."""
    (px, py), (ax, ay), (bx, by) = p, a, b
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return ((px - ax) ** 2 + (py - ay) ** 2) ** 0.5
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return ((px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2) ** 0.5


def simplificar(pontos, tol):
    """Ramer–Douglas–Peucker (versão iterativa, sem recursão)."""
    if len(pontos) < 3:
        return pontos
    manter = [False] * len(pontos)
    manter[0] = manter[-1] = True
    pilha = [(0, len(pontos) - 1)]
    while pilha:
        ini, fim = pilha.pop()
        maior, idx = 0, None
        for i in range(ini + 1, fim):
            d = distancia_ao_segmento(pontos[i], pontos[ini], pontos[fim])
            if d > maior:
                maior, idx = d, i
        if idx is not None and maior > tol:
            manter[idx] = True
            pilha += [(ini, idx), (idx, fim)]
    return [p for p, m in zip(pontos, manter) if m]


def area(anel):
    """Área aproximada em graus² (fórmula do laço)."""
    return abs(sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(anel, anel[1:]))) / 2


def desdobrar(anel):
    """Contornos que cruzam a linha de data (179° → -179°) viram contínuos (179° → 181°);
    sem isso o mapa desenharia uma faixa atravessando o mundo inteiro."""
    saida = [(anel[0][0], anel[0][1])]
    for x, y in anel[1:]:
        anterior = saida[-1][0]
        while x - anterior > 180:
            x -= 360
        while x - anterior < -180:
            x += 360
        saida.append((x, y))
    return saida


def decimos(v):
    return int(round(v * 10))


def contornos(geojson):
    """Anéis externos dos polígonos: simplificados, sem ilhotas, em décimos com deltas."""
    saida = []
    for f in geojson.get("features", []):
        g = f.get("geometry") or {}
        if g.get("type") not in ("Polygon", "MultiPolygon"):
            continue
        poligonos = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
        for poligono in poligonos:
            anel = poligono[0]
            if area(anel) < AREA_MINIMA:
                continue
            anel = simplificar(desdobrar(anel), TOLERANCIA_GRAUS)
            inteiros = [(decimos(x), decimos(y)) for x, y in anel]
            inteiros = [p for i, p in enumerate(inteiros) if i == 0 or p != inteiros[i - 1]]
            if len(inteiros) < 4:
                continue
            plano = list(inteiros[0])
            for (x0, y0), (x1, y1) in zip(inteiros, inteiros[1:]):
                plano += [x1 - x0, y1 - y0]
            saida.append(plano)
    return saida


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--refresh", action="store_true", help="ignora o cache")
    args = parser.parse_args()

    dados = json.loads(DADOS.read_text(encoding="utf-8"))
    lats, lngs = dados["locais"]["lat"], dados["locais"]["lng"]
    print(f"{len(lats)} locais de {DADOS.relative_to(RAIZ)}")
    # O cache das posições depende da lista exata de coordenadas: se dinos.json mudar,
    # as posições são pedidas de novo (nunca reaproveita posições de outra lista).
    assinatura = hashlib.sha1(json.dumps([lats, lngs]).encode()).hexdigest()[:10]

    SAIDA.mkdir(parents=True, exist_ok=True)
    for t in EPOCAS:
        print(f"{t} milhões de anos atrás...", end=" ", flush=True)
        costas = baixar(f"costas_{t}", f"{GWS}/reconstruct/coastlines/?time={t}&model={MODELO}", None, args.refresh)
        recon = baixar(
            f"pontos_{t}_{assinatura}",
            f"{GWS}/reconstruct/reconstruct_points/",
            {
                "lats": ",".join(map(str, lats)),
                "lons": ",".join(map(str, lngs)),
                "time": t,
                "model": MODELO,
                "return_null_points": "",
            },
            args.refresh,
        )

        coords = recon["coordinates"]
        if len(coords) != len(lats):
            raise RuntimeError(f"GPlates devolveu {len(coords)} pontos, esperava {len(lats)}")
        pontos = []
        for c in coords:
            pontos += [decimos(c[0]), decimos(c[1])] if c else [None, None]

        saida = {
            "t": t,
            "modelo": MODELO,
            "gerado_de": dados["meta"]["gerado_em"],
            "assinatura": assinatura,
            "n_locais": len(lats),
            "pontos": pontos,
            "costas": contornos(costas),
        }
        arquivo = SAIDA / f"{t}.json"
        arquivo.write_text(json.dumps(saida, separators=(",", ":")), encoding="utf-8")
        nulos = sum(1 for c in coords if not c)
        print(f"{len(saida['costas'])} contornos, {nulos} locais sem reconstrução, "
              f"{arquivo.stat().st_size / 1e3:.0f} KB")


if __name__ == "__main__":
    main()
