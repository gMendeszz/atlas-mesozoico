"""
Downloads Mesozoic dinosaur occurrences from the Paleobiology Database (PBDB)
and saves a compact JSON ready for the map (public/data/dinos.json).

Data: Paleobiology Database (paleobiodb.org), CC BY 4.0

Usage:
    python scripts/fetch_data.py            # uses the local cache if present
    python scripts/fetch_data.py --refresh  # downloads everything again

Standard library only (no pip install needed).

Output format (columnar, to keep it small and fast to read):
  dict     lists of unique strings; the columns store the index (0 = empty)
  sites    one entry per collection site (coordinates, age, country, geological
           formation...); "n" = how many fossils the site has
  fossils  one entry per fossil, grouped by site in the same order as "sites"
           (the first n[0] belong to site 0, and so on); group, type and diet
           are indexes into meta.groups/types/diets
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
USER_AGENT = "MesozoicAtlas/0.1 (educational project)"
PAUSE_SECONDS = 2  # pause between requests, as a courtesy to the server

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "data" / "raw"
OUTPUT = ROOT / "public" / "data" / "dinos.json"

# Main groups, in the index order used in the JSON.
# Fossils that fall in none of them become "others": identified only as Dinosauria/Saurischia,
# groups outside these three (e.g. Herrerasauridae) and eggs/footprints with no assigned group.
GROUPS = {
    "theropoda": "Theropoda",
    "sauropodomorpha": "Sauropodomorpha",
    "ornithischia": "Ornithischia",
}
GROUP_ORDER = [*GROUPS, "others"]

# Fossil type, from the PBDB flags: "I" = ichnofossil (footprints and trackways); "F" = "form taxon",
# which among dinosaurs are the eggs (named separately, like Megaloolithus).
TYPES = ["body", "footprint", "egg"]
# Checked on 2026-11-06: genera with the wrong flag in the PBDB (by name and publication)
TYPE_FIXES = {
    "Jialingpus": "footprint",  # footprint ichnogenus, missing the "I" flag
    "Metatetrapous": "footprint",  # same
    "Shri": "body",  # Shri rapax is a dromaeosaurid described from a skeleton, not an egg
}

# Diet: comes from the PBDB per taxon (inferred from the group, not observed in each fossil).
# Combinations collapse into one category: anything with "omnivore" is omnivore, and so on.
DIETS = ["carnivore", "herbivore", "omnivore", "piscivore", "unknown"]

# Uncertain-identification qualifiers used in the literature: "?", "cf." (compare with),
# "aff." (related to) and names in quotes (informal)
UNCERTAIN_QUALIFIER = re.compile(r'\?|\bcf\.|\baff\.|"')

# Coordinate errors found while checking the data (2026-11-04).
# Fixed only when the PBDB record itself has the right coordinate in its text.
COORDINATE_FIXES = {
    # Titem Suwraga, Mongolia: the PBDB text says "45-22-33 N, 102-28-53 E", but the
    # longitude was entered as west (it would land in South Dakota, USA).
    59358: (45.375832, 102.481392),
}
# Coordinates unrelated to the place described, with no data to fix them: left off the map.
EXCLUDED_SITES = {
    64690: "Chelpyk, Karakalpakstan (Uzbekistan): coordinate lands in the Atlantic, near New York",
    108343: "Payandé, Tolima (Colombia): coordinate lands in Mongolia",
    153528: "Vale Neyzar, Kerman (Iran): coordinate lands in Saudi Arabia",
    155218: "May Point, Nunavut (Canada): coordinate at 89° N, at the North Pole",
}


def fetch(cache_name, params, refresh):
    """Makes the request (or reads the cache) and returns the list of records."""
    file = CACHE / f"{cache_name}.json"
    # The parameters are stored next to the cache: if the query changes, it downloads again
    # (without this, changing a parameter and forgetting --refresh would use another query's data)
    params_file = CACHE / f"{cache_name}.params.json"
    params_text = json.dumps(params, sort_keys=True)
    if file.exists() and not refresh:
        if not params_file.exists():  # old cache, from before this check
            params_file.write_text(params_text, encoding="utf-8")
        if params_file.read_text(encoding="utf-8") == params_text:
            print(f"  cache: {file.name}")
            return json.loads(file.read_text(encoding="utf-8"))["records"]
        print(f"  parameters changed since the {file.name} cache; downloading again")

    url = API + "?" + urllib.parse.urlencode(params)
    print(f"  downloading: {url}")
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=300) as resp:
        text = resp.read().decode("utf-8")

    data = json.loads(text)
    if "errors" in data:
        raise RuntimeError(f"API error: {data['errors']}")

    CACHE.mkdir(parents=True, exist_ok=True)
    file.write_text(text, encoding="utf-8")
    params_file.write_text(params_text, encoding="utf-8")
    time.sleep(PAUSE_SECONDS)
    return data["records"]


def number(value, decimals):
    try:
        n = round(float(value), decimals)
    except (TypeError, ValueError):
        return None
    return int(n) if n == int(n) else n  # 66.0 -> 66 (fewer bytes)


def fossil_type(r):
    """body, footprint or egg (see TYPES)."""
    genus = (r.get("accepted_name") or "").split(" ")[0]
    if genus in TYPE_FIXES:
        return TYPE_FIXES[genus]
    flags = r.get("flags") or ""
    if "I" in flags:
        return "footprint"
    if "F" in flags:
        return "egg"
    return "body"


def fossil_diet(text):
    """Simplifies the PBDB diet ("herbivore, omnivore") into one of DIETS."""
    parts = {p.strip() for p in (text or "").split(",") if p.strip()}
    if "omnivore" in parts:
        return "omnivore"
    if "piscivore" in parts:
        return "piscivore"
    if parts & {"carnivore", "insectivore"}:
        return "carnivore"
    if parts & {"herbivore", "frugivore", "granivore", "folivore", "browser", "grazer"}:
        return "herbivore"
    return "unknown"


def clean_formation(text):
    """Removes quotes and turns the PBDB "?" (uncertain formation) into a trailing "(?)"."""
    t = (text or "").replace('"', "").strip()
    uncertain = "?" in t
    t = t.replace("?", "").strip()
    return f"{t} (?)" if t and uncertain else t


def format_author(text):
    """ "Osborn 1905" -> "Osborn, 1905"; "(Marsh 1877)" -> "(Marsh, 1877)" (parentheses = the
    species was described in another genus), as in zoological nomenclature."""
    return re.sub(r"\s(\d{4})(\)?)$", r", \1\2", (text or "").strip())


def inherit_group_from_family(records, group_by_occ):
    """Fossils with no group whose family, in the rest of the data, belongs to ONE single group
    inherit that group. Fixes duplicated taxa in the PBDB (e.g. a second "Megalosauridae",
    no. 358782, attached directly to Dinosauria instead of Theropoda). Changes group_by_occ and
    returns how many fossils inherited a group."""
    family_groups = {}
    for r in records:
        g = group_by_occ.get(r["occurrence_no"])
        if g and r.get("family", "").isalpha():
            family_groups.setdefault(r["family"], set()).add(g)
    inherited = 0
    for r in records:
        groups = family_groups.get(r.get("family", ""), set())
        if r["occurrence_no"] not in group_by_occ and len(groups) == 1:
            group_by_occ[r["occurrence_no"]] = next(iter(groups))
            inherited += 1
    return inherited


def group_by_site(records):
    """Groups the fossils by collection site (coordinates and age belong to the site), applying
    the fixes and exclusions from the data check. Returns (by_site, excluded, dropped)."""
    by_site = {}
    dropped = 0
    excluded = 0
    for r in records:
        col = int(r["collection_no"])
        if col in EXCLUDED_SITES:
            excluded += 1
            continue
        if col in COORDINATE_FIXES:
            r = {**r, "lat": COORDINATE_FIXES[col][0], "lng": COORDINATE_FIXES[col][1]}
        if None in (number(r.get(c), 3) for c in ("lat", "lng", "max_ma", "min_ma")):
            dropped += 1
            continue
        by_site.setdefault(col, []).append(r)
    return by_site, excluded, dropped


class Dictionary:
    """Stores each string once; returns its index. Index 0 = empty."""

    def __init__(self):
        self.items = [""]
        self.index = {"": 0}

    def __call__(self, text):
        text = text or ""
        if text not in self.index:
            self.index[text] = len(self.items)
            self.items.append(text)
        return self.index[text]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--refresh", action="store_true", help="ignore the cache")
    args = parser.parse_args()

    print("1/2 Mesozoic Dinosauria occurrences")
    records = fetch(
        "dinosauria",
        {
            "base_name": "Dinosauria",
            "interval": "Mesozoic",
            "show": "coords,paleoloc,loc,class,strat,attr,ecospace",
            "vocab": "pbdb",
        },
        args.refresh,
    )
    print(f"  {len(records)} records")

    print("2/2 IDs per group (for classification)")
    group_by_occ = {}
    for key, taxon in GROUPS.items():
        ids = fetch(
            f"ids_{key}",
            {"base_name": taxon, "interval": "Mesozoic", "vocab": "pbdb"},
            args.refresh,
        )
        for r in ids:
            group_by_occ[r["occurrence_no"]] = key
        print(f"  {taxon}: {len(ids)}")

    inherited = inherit_group_from_family(records, group_by_occ)
    print(f"  group inherited from family: {inherited}")

    by_site, excluded, dropped = group_by_site(records)
    print(f"  {excluded} fossils at {len(EXCLUDED_SITES)} excluded sites (wrong coordinates); "
          f"{len(COORDINATE_FIXES)} site with a corrected coordinate")

    dic = {k: Dictionary() for k in ("name", "original_name", "family", "interval", "country", "state", "formation", "author")}
    # (The PBDB paleocoordinates are not included: the ancient-continents mode uses GPlates'
    # positions, from the same model as the outlines — see fetch_paleo.py.)
    sites = {k: [] for k in ("col", "lng", "lat", "max", "min", "interval", "country", "state", "formation", "n")}
    fossils = {"name": [], "family": [], "group": [], "type": [], "diet": [], "author": []}
    # Uncertain identifications ("cf. Tyrannosaurus rex", "? Owenodon sp."): keeps the original
    # text so the site doesn't show more certainty than the publication has.
    # j = the fossil's position in the list; name = index of the original text in dic["original_name"]
    # (separate dictionary: dic["name"] only has accepted names, which are the searchable ones)
    uncertain = {"j": [], "name": []}

    for col in sorted(by_site):
        regs = by_site[col]
        r = regs[0]
        interval = r.get("early_interval", "")
        if r.get("late_interval"):
            interval += f" – {r['late_interval']}"

        sites["col"].append(col)
        sites["lng"].append(number(r["lng"], 3))  # 3 decimals ≈ 100 m
        sites["lat"].append(number(r["lat"], 3))
        sites["max"].append(number(r["max_ma"], 2))
        sites["min"].append(number(r["min_ma"], 2))
        sites["interval"].append(dic["interval"](interval))
        sites["country"].append(dic["country"](r.get("cc")))
        sites["state"].append(dic["state"](r.get("state")))
        sites["formation"].append(dic["formation"](clean_formation(r.get("formation"))))
        sites["n"].append(len(regs))

        for f in sorted(regs, key=lambda x: x.get("accepted_name") or ""):
            family = f.get("family", "")
            fossils["name"].append(dic["name"](f.get("accepted_name") or f.get("identified_name")))
            fossils["family"].append(dic["family"](family if family.isalpha() else ""))
            group = group_by_occ.get(f["occurrence_no"], "others")
            fossils["group"].append(GROUP_ORDER.index(group))
            fossils["type"].append(TYPES.index(fossil_type(f)))
            fossils["diet"].append(DIETS.index(fossil_diet(f.get("diet"))))
            # Author and year only for genus/species: for broad groups ("Theropoda Marsh 1881") it says nothing
            useful_rank = f.get("accepted_rank") in ("species", "genus", "subgenus")
            fossils["author"].append(dic["author"](format_author(f.get("accepted_attr")) if useful_rank else ""))
            original = f.get("identified_name") or ""
            if UNCERTAIN_QUALIFIER.search(original):
                uncertain["j"].append(len(fossils["name"]) - 1)
                uncertain["name"].append(dic["original_name"](original))

    output = {
        "meta": {
            "source": "Paleobiology Database (paleobiodb.org)",
            "license": "CC BY 4.0",
            "generated_at": time.strftime("%Y-%m-%d"),
            # Distinct publications the included fossils come from (shown in "About the data")
            "n_references": len({f["reference_no"] for regs in by_site.values() for f in regs}),
            # Same calculation as fetch_paleo.py: the site only uses an ancient-continents time
            # slice if it was generated from exactly this list of sites.
            "sites_signature": hashlib.sha1(
                json.dumps([sites["lat"], sites["lng"]]).encode()
            ).hexdigest()[:10],
            "groups": GROUP_ORDER,
            "types": TYPES,
            "diets": DIETS,
        },
        "dict": {k: d.items for k, d in dic.items()},
        "sites": sites,
        "fossils": fossils,
        "uncertain": uncertain,
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(output, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    print(f"\nSaved: {OUTPUT.relative_to(ROOT)} ({OUTPUT.stat().st_size / 1e6:.2f} MB)")
    print(f"  {len(sites['col'])} sites, {len(fossils['name'])} fossils "
          f"({dropped} dropped with no coordinates/age)")
    print(f"  uncertain identifications (cf., ?, aff.): {len(uncertain['j'])}")
    for column, names in (("group", GROUP_ORDER), ("type", TYPES), ("diet", DIETS)):
        print(f"  {column}: " + ", ".join(f"{n} {fossils[column].count(i)}" for i, n in enumerate(names)))
    print(f"  sites with a formation: {sum(1 for x in sites['formation'] if x)} of {len(sites['col'])}; "
          f"fossils with an author: {sum(1 for x in fossils['author'] if x)}")


if __name__ == "__main__":
    main()
