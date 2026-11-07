"""
Baixa ocorrências de dinossauros do Mesozoico no Paleobiology Database (PBDB)
e salva um JSON compacto pronto pro mapa (public/data/dinos.json).

Dados: Paleobiology Database (paleobiodb.org), CC BY 4.0

Uso:
    python scripts/baixar_dados.py            # usa o cache local se existir
    python scripts/baixar_dados.py --refresh  # força baixar tudo de novo

Só usa a biblioteca padrão do Python (não precisa de pip install).

Formato de saída (colunar, pra ficar pequeno e rápido de ler):
  dic     listas de textos únicos; as colunas guardam o índice (0 = vazio)
  locais  uma entrada por local de coleta (coordenadas, idade, país, formação
          geológica...); "n" = quantos fósseis há no local
  fosseis uma entrada por fóssil, agrupados por local na mesma ordem de
          "locais" (os n[0] primeiros são do local 0, e assim por diante);
          grupo, tipo e dieta são índices das listas meta.grupos/tipos/dietas
"""

import argparse
import hashlib
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://paleobiodb.org/data1.2/occs/list.json"
USER_AGENT = "AtlasMesozoico/0.1 (projeto educativo)"
PAUSA_SEGUNDOS = 2  # pausa entre requisições, por cortesia com o servidor

RAIZ = Path(__file__).resolve().parent.parent
CACHE = RAIZ / "data" / "raw"
SAIDA = RAIZ / "public" / "data" / "dinos.json"

# Grupos principais, na ordem dos índices usados no JSON.
# Fósseis que não caem em nenhum viram "outros": identificados só como Dinosauria/Saurischia,
# grupos fora desses três (ex.: Herrerasauridae) e ovos/pegadas sem grupo definido.
GRUPOS = {
    "theropoda": "Theropoda",
    "sauropodomorpha": "Sauropodomorpha",
    "ornithischia": "Ornithischia",
}
ORDEM_GRUPOS = [*GRUPOS, "outros"]

# Tipo de fóssil, pelas marcas do PBDB: "I" = icnofóssil (pegadas e rastros); "F" = "form taxon",
# que entre os dinossauros são os ovos (nomeados à parte, como Megaloolithus).
TIPOS = ["corpo", "pegada", "ovo"]
# Conferência de 2026-11-06: gêneros com a marca errada no PBDB (pelo nome e pela publicação)
TIPO_CORRIGIDO = {
    "Jialingpus": "pegada",  # icnogênero de pegada, sem a marca "I"
    "Metatetrapous": "pegada",  # idem
    "Shri": "corpo",  # Shri rapax é um dromeossaurídeo descrito por esqueleto, não ovo
}

# Dieta: vem do PBDB por táxon (inferida pelo grupo, não observada em cada fóssil).
# Combinações viram uma categoria só: qualquer uma com "omnivore" é onívoro, e assim por diante.
DIETAS = ["carnivoro", "herbivoro", "onivoro", "piscivoro", "desconhecida"]

# Qualificadores de identificação incerta usados na literatura: "?", "cf." (comparar com),
# "aff." (afim de) e nomes entre aspas (informais)
QUALIFICADOR_INCERTO = re.compile(r'\?|\bcf\.|\baff\.|"')

# Erros de coordenada encontrados na conferência dos dados (2026-11-04).
# Correção só quando o próprio registro do PBDB traz a coordenada certa no texto.
CORRECOES_COORDENADA = {
    # Titem Suwraga, Mongólia: o texto do PBDB diz "45-22-33 N, 102-28-53 E", mas a
    # longitude foi cadastrada como oeste (cairia na Dakota do Sul, EUA).
    59358: (45.375832, 102.481392),
}
# Coordenadas sem relação com o lugar descrito, e sem dado pra corrigir: ficam fora do mapa.
EXCLUIR_LOCAIS = {
    64690: "Chelpyk, Karakalpakstão (Uzbequistão): coordenada cai no Atlântico, perto de Nova York",
    108343: "Payandé, Tolima (Colômbia): coordenada cai na Mongólia",
    153528: "Vale Neyzar, Kerman (Irã): coordenada cai na Arábia Saudita",
    155218: "May Point, Nunavut (Canadá): coordenada a 89° N, no Polo Norte",
}


def baixar(nome_cache, params, refresh):
    """Faz a requisição (ou lê do cache) e devolve a lista de registros."""
    arquivo = CACHE / f"{nome_cache}.json"
    # Os parâmetros ficam guardados ao lado do cache: se a consulta mudar, baixa de novo
    # (sem isso, mudar um parâmetro e esquecer o --refresh usaria dados de outra consulta)
    arquivo_params = CACHE / f"{nome_cache}.params.json"
    params_texto = json.dumps(params, sort_keys=True)
    if arquivo.exists() and not refresh:
        if not arquivo_params.exists():  # cache antigo, de antes desta checagem
            arquivo_params.write_text(params_texto, encoding="utf-8")
        if arquivo_params.read_text(encoding="utf-8") == params_texto:
            print(f"  cache: {arquivo.name}")
            return json.loads(arquivo.read_text(encoding="utf-8"))["records"]
        print(f"  parâmetros mudaram desde o cache de {arquivo.name}; baixando de novo")

    url = API + "?" + urllib.parse.urlencode(params)
    print(f"  baixando: {url}")
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=300) as resp:
        texto = resp.read().decode("utf-8")

    dados = json.loads(texto)
    if "errors" in dados:
        raise RuntimeError(f"Erro da API: {dados['errors']}")

    CACHE.mkdir(parents=True, exist_ok=True)
    arquivo.write_text(texto, encoding="utf-8")
    arquivo_params.write_text(params_texto, encoding="utf-8")
    time.sleep(PAUSA_SEGUNDOS)
    return dados["records"]


def numero(valor, casas):
    try:
        n = round(float(valor), casas)
    except (TypeError, ValueError):
        return None
    return int(n) if n == int(n) else n  # 66.0 -> 66 (menos bytes)


def tipo_do_fossil(r):
    """corpo, pegada ou ovo (ver TIPOS)."""
    genero = (r.get("accepted_name") or "").split(" ")[0]
    if genero in TIPO_CORRIGIDO:
        return TIPO_CORRIGIDO[genero]
    marcas = r.get("flags") or ""
    if "I" in marcas:
        return "pegada"
    if "F" in marcas:
        return "ovo"
    return "corpo"


def dieta_do_fossil(texto):
    """Simplifica a dieta do PBDB ("herbivore, omnivore") numa das DIETAS."""
    partes = {p.strip() for p in (texto or "").split(",") if p.strip()}
    if "omnivore" in partes:
        return "onivoro"
    if "piscivore" in partes:
        return "piscivoro"
    if partes & {"carnivore", "insectivore"}:
        return "carnivoro"
    if partes & {"herbivore", "frugivore", "granivore", "folivore", "browser", "grazer"}:
        return "herbivoro"
    return "desconhecida"


def limpar_formacao(texto):
    """Tira aspas e troca o "?" do PBDB (formação incerta) por um "(?)" no fim."""
    t = (texto or "").replace('"', "").strip()
    incerta = "?" in t
    t = t.replace("?", "").strip()
    return f"{t} (?)" if t and incerta else t


def formatar_autor(texto):
    """ "Osborn 1905" -> "Osborn, 1905"; "(Marsh 1877)" -> "(Marsh, 1877)" (parênteses = a
    espécie foi descrita em outro gênero), como na nomenclatura zoológica."""
    return re.sub(r"\s(\d{4})(\)?)$", r", \1\2", (texto or "").strip())


def herdar_grupo_pela_familia(registros, grupo_por_occ):
    """Fósseis sem grupo cuja família, no resto dos dados, pertence a UM único grupo herdam
    esse grupo. Corrige táxons duplicados no PBDB (ex.: um segundo "Megalosauridae",
    nº 358782, ligado direto a Dinosauria em vez de Theropoda). Altera grupo_por_occ e
    devolve quantos fósseis herdaram."""
    grupos_da_familia = {}
    for r in registros:
        g = grupo_por_occ.get(r["occurrence_no"])
        if g and r.get("family", "").isalpha():
            grupos_da_familia.setdefault(r["family"], set()).add(g)
    herdados = 0
    for r in registros:
        grupos = grupos_da_familia.get(r.get("family", ""), set())
        if r["occurrence_no"] not in grupo_por_occ and len(grupos) == 1:
            grupo_por_occ[r["occurrence_no"]] = next(iter(grupos))
            herdados += 1
    return herdados


def agrupar_por_local(registros):
    """Agrupa os fósseis por local de coleta (coordenadas e idade são do local), aplicando
    as correções e exclusões da conferência. Devolve (por_local, excluídos, descartados)."""
    por_local = {}
    descartados = 0
    excluidos = 0
    for r in registros:
        col = int(r["collection_no"])
        if col in EXCLUIR_LOCAIS:
            excluidos += 1
            continue
        if col in CORRECOES_COORDENADA:
            r = {**r, "lat": CORRECOES_COORDENADA[col][0], "lng": CORRECOES_COORDENADA[col][1]}
        if None in (numero(r.get(c), 3) for c in ("lat", "lng", "max_ma", "min_ma")):
            descartados += 1
            continue
        por_local.setdefault(col, []).append(r)
    return por_local, excluidos, descartados


class Dicionario:
    """Guarda cada texto uma vez só; devolve o índice. Índice 0 = vazio."""

    def __init__(self):
        self.itens = [""]
        self.indice = {"": 0}

    def __call__(self, texto):
        texto = texto or ""
        if texto not in self.indice:
            self.indice[texto] = len(self.itens)
            self.itens.append(texto)
        return self.indice[texto]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--refresh", action="store_true", help="ignora o cache")
    args = parser.parse_args()

    print("1/2 Ocorrências de Dinosauria no Mesozoico")
    registros = baixar(
        "dinosauria",
        {
            "base_name": "Dinosauria",
            "interval": "Mesozoic",
            "show": "coords,paleoloc,loc,class,strat,attr,ecospace",
            "vocab": "pbdb",
        },
        args.refresh,
    )
    print(f"  {len(registros)} registros")

    print("2/2 IDs por grupo (pra classificar)")
    grupo_por_occ = {}
    for chave, taxon in GRUPOS.items():
        ids = baixar(
            f"ids_{chave}",
            {"base_name": taxon, "interval": "Mesozoic", "vocab": "pbdb"},
            args.refresh,
        )
        for r in ids:
            grupo_por_occ[r["occurrence_no"]] = chave
        print(f"  {taxon}: {len(ids)}")

    herdados = herdar_grupo_pela_familia(registros, grupo_por_occ)
    print(f"  grupo herdado da família: {herdados}")

    por_local, excluidos, descartados = agrupar_por_local(registros)
    print(f"  {excluidos} fósseis em {len(EXCLUIR_LOCAIS)} locais excluídos (coordenada errada); "
          f"{len(CORRECOES_COORDENADA)} local com coordenada corrigida")

    dic = {k: Dicionario() for k in ("nome", "nome_original", "familia", "intervalo", "pais", "estado", "formacao", "autor")}
    # (As paleocoordenadas do PBDB não entram: o modo de continentes antigos usa as do
    # GPlates, no mesmo modelo dos contornos — ver baixar_paleo.py.)
    locais = {k: [] for k in ("col", "lng", "lat", "max", "min", "intervalo", "pais", "estado", "formacao", "n")}
    fosseis = {"nome": [], "familia": [], "grupo": [], "tipo": [], "dieta": [], "autor": []}
    # Identificações incertas ("cf. Tyrannosaurus rex", "? Owenodon sp."): guarda o texto
    # original pra o site não mostrar com mais certeza do que a publicação tem.
    # j = posição do fóssil na lista; nome = índice do texto original em dic["nome_original"]
    # (dicionário separado: dic["nome"] só tem nomes aceitos, que são os buscáveis)
    incertos = {"j": [], "nome": []}

    for col in sorted(por_local):
        regs = por_local[col]
        r = regs[0]
        intervalo = r.get("early_interval", "")
        if r.get("late_interval"):
            intervalo += f" – {r['late_interval']}"

        locais["col"].append(col)
        locais["lng"].append(numero(r["lng"], 3))  # 3 casas ≈ 100 m
        locais["lat"].append(numero(r["lat"], 3))
        locais["max"].append(numero(r["max_ma"], 2))
        locais["min"].append(numero(r["min_ma"], 2))
        locais["intervalo"].append(dic["intervalo"](intervalo))
        locais["pais"].append(dic["pais"](r.get("cc")))
        locais["estado"].append(dic["estado"](r.get("state")))
        locais["formacao"].append(dic["formacao"](limpar_formacao(r.get("formation"))))
        locais["n"].append(len(regs))

        for f in sorted(regs, key=lambda x: x.get("accepted_name") or ""):
            familia = f.get("family", "")
            fosseis["nome"].append(dic["nome"](f.get("accepted_name") or f.get("identified_name")))
            fosseis["familia"].append(dic["familia"](familia if familia.isalpha() else ""))
            grupo = grupo_por_occ.get(f["occurrence_no"], "outros")
            fosseis["grupo"].append(ORDEM_GRUPOS.index(grupo))
            fosseis["tipo"].append(TIPOS.index(tipo_do_fossil(f)))
            fosseis["dieta"].append(DIETAS.index(dieta_do_fossil(f.get("diet"))))
            # Autor e ano só de gênero/espécie: o de grupos amplos ("Theropoda Marsh 1881") não informa nada
            nivel_util = f.get("accepted_rank") in ("species", "genus", "subgenus")
            fosseis["autor"].append(dic["autor"](formatar_autor(f.get("accepted_attr")) if nivel_util else ""))
            original = f.get("identified_name") or ""
            if QUALIFICADOR_INCERTO.search(original):
                incertos["j"].append(len(fosseis["nome"]) - 1)
                incertos["nome"].append(dic["nome_original"](original))

    saida = {
        "meta": {
            "fonte": "Paleobiology Database (paleobiodb.org)",
            "licenca": "CC BY 4.0",
            "gerado_em": time.strftime("%Y-%m-%d"),
            # Publicações distintas de onde vêm os fósseis incluídos (mostrado em "Sobre os dados")
            "n_referencias": len({f["reference_no"] for regs in por_local.values() for f in regs}),
            # Mesma conta do baixar_paleo.py: o site só usa uma época de continentes antigos
            # se ela foi gerada a partir exatamente desta lista de locais.
            "assinatura_locais": hashlib.sha1(
                json.dumps([locais["lat"], locais["lng"]]).encode()
            ).hexdigest()[:10],
            "grupos": ORDEM_GRUPOS,
            "tipos": TIPOS,
            "dietas": DIETAS,
        },
        "dic": {k: d.itens for k, d in dic.items()},
        "locais": locais,
        "fosseis": fosseis,
        "incertos": incertos,
    }

    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    SAIDA.write_text(
        json.dumps(saida, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    print(f"\nSalvo: {SAIDA.relative_to(RAIZ)} ({SAIDA.stat().st_size / 1e6:.2f} MB)")
    print(f"  {len(locais['col'])} locais, {len(fosseis['nome'])} fósseis "
          f"({descartados} descartados sem coordenada/idade)")
    print(f"  identificações incertas (cf., ?, aff.): {len(incertos['j'])}")
    for coluna, nomes in (("grupo", ORDEM_GRUPOS), ("tipo", TIPOS), ("dieta", DIETAS)):
        print(f"  {coluna}: " + ", ".join(f"{n} {fosseis[coluna].count(i)}" for i, n in enumerate(nomes)))
    print(f"  locais com formação: {sum(1 for x in locais['formacao'] if x)} de {len(locais['col'])}; "
          f"fósseis com autor: {sum(1 for x in fosseis['autor'] if x)}")


if __name__ == "__main__":
    main()
