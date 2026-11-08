"""
Tests for the data scripts' rules (standard library only):

    python -m unittest discover -s tests -p "test_*.py"
"""

import importlib.util
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent.parent / "scripts"


def load(name):
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


data = load("fetch_data")
paleo = load("fetch_paleo")


def record(occ, col, family="", lat="10", lng="20", identified="X"):
    return {"occurrence_no": occ, "collection_no": str(col), "family": family, "lat": lat, "lng": lng,
            "max_ma": "100", "min_ma": "90", "identified_name": identified}


class UncertainQualifier(unittest.TestCase):
    """What counts as an uncertain identification: this decides the tag in the popup."""

    def test_recognizes_the_qualifiers_from_the_literature(self):
        for name in ["cf. Tyrannosaurus rex", "Apatosaurus cf. louisae", "? Owenodon sp.",
                     "Ichthyornis aff. dispar", '"Megalosaurus" sp.']:
            self.assertTrue(data.UNCERTAIN_QUALIFIER.search(name), name)

    def test_does_not_flag_normal_identifications(self):
        for name in ["Tyrannosaurus rex", "Saturnalia tupiniquim n. gen. n. sp.", "Theropoda indet.",
                     "Owenodon sp.", "Ceratopsidae"]:
            self.assertFalse(data.UNCERTAIN_QUALIFIER.search(name), name)


class FossilType(unittest.TestCase):
    """Decides the footprint and egg filters."""

    def test_pbdb_flags(self):
        self.assertEqual(data.fossil_type({"accepted_name": "Eubrontes", "flags": "I"}), "footprint")
        self.assertEqual(data.fossil_type({"accepted_name": "Grallator", "flags": "IF"}), "footprint")
        self.assertEqual(data.fossil_type({"accepted_name": "Megaloolithus", "flags": "F"}), "egg")
        self.assertEqual(data.fossil_type({"accepted_name": "Tyrannosaurus rex"}), "body")

    def test_fix_wins_over_the_wrong_flag(self):
        # Shri rapax is a skeleton, but the PBDB flags it "F" (which would make it an egg)
        self.assertEqual(data.fossil_type({"accepted_name": "Shri rapax", "flags": "F"}), "body")
        self.assertEqual(data.fossil_type({"accepted_name": "Jialingpus yuechiensis", "flags": "F"}), "footprint")


class FossilDiet(unittest.TestCase):
    def test_combinations_with_omnivore_become_omnivore(self):
        self.assertEqual(data.fossil_diet("herbivore, omnivore"), "omnivore")
        self.assertEqual(data.fossil_diet("carnivore, omnivore"), "omnivore")

    def test_simple_categories(self):
        self.assertEqual(data.fossil_diet("carnivore"), "carnivore")
        self.assertEqual(data.fossil_diet("herbivore"), "herbivore")
        self.assertEqual(data.fossil_diet("piscivore, insectivore"), "piscivore")

    def test_no_data_is_not_a_guess(self):
        self.assertEqual(data.fossil_diet(None), "unknown")
        self.assertEqual(data.fossil_diet("something new"), "unknown")


class PbdbText(unittest.TestCase):
    def test_author_in_nomenclature_format(self):
        self.assertEqual(data.format_author("Osborn 1905"), "Osborn, 1905")
        self.assertEqual(data.format_author("(Marsh 1877)"), "(Marsh, 1877)")
        self.assertEqual(data.format_author("Zhao et al. 1999"), "Zhao et al., 1999")

    def test_uncertain_formation_and_quotes(self):
        self.assertEqual(data.clean_formation('"Lance"'), "Lance")
        self.assertEqual(data.clean_formation("?Dunvegan"), "Dunvegan (?)")
        self.assertEqual(data.clean_formation("Kirtland?"), "Kirtland (?)")
        self.assertEqual(data.clean_formation("?"), "")
        self.assertEqual(data.clean_formation(None), "")


class PublishedName(unittest.TestCase):
    """Decides when the popup shows the name a record was published under."""

    def test_synonym_or_recombination_is_kept(self):
        self.assertEqual(data.published_name("Gorgosaurus sternbergi n. sp.", "Gorgosaurus libratus"), "Gorgosaurus sternbergi")

    def test_specific_label_is_kept(self):
        # "indet. A" and "indet. B" at the same site are different animals
        self.assertEqual(data.published_name("Theropoda <indet. A>", "Theropoda"), "Theropoda indet. A")
        self.assertEqual(data.published_name("Iguanodon mantelli", "Iguanodon"), "Iguanodon mantelli")

    def test_nothing_new_is_dropped(self):
        self.assertEqual(data.published_name("Theropoda indet.", "Theropoda"), "")
        self.assertEqual(data.published_name("Tyrannosaurus rex n. sp.", "Tyrannosaurus rex"), "")
        self.assertEqual(data.published_name("Tyrannosaurus sp.", "Tyrannosaurus"), "")
        self.assertEqual(data.published_name(None, "Theropoda"), "")


class ClassifyGroups(unittest.TestCase):
    def test_birds_get_their_own_group(self):
        # A bird is in both the Theropoda and Aves lists: Aves wins
        ids = {"theropoda": [{"occurrence_no": "1"}, {"occurrence_no": "2"}], "aves": [{"occurrence_no": "2"}]}
        self.assertEqual(data.classify_groups(ids), {"1": "theropoda", "2": "aves"})

    def test_aves_comes_after_theropoda(self):
        self.assertLess(list(data.GROUPS).index("theropoda"), list(data.GROUPS).index("aves"))


class InheritGroupFromFamily(unittest.TestCase):
    def test_fossil_without_group_inherits_its_family_group(self):
        # Real case: a duplicated "Megalosauridae" in the PBDB left megalosaurids without a group
        regs = [record("1", 1, "Megalosauridae"), record("2", 2, "Megalosauridae")]
        groups = {"1": "theropoda"}
        self.assertEqual(data.inherit_group_from_family(regs, groups), 1)
        self.assertEqual(groups["2"], "theropoda")

    def test_family_in_more_than_one_group_is_not_inherited(self):
        # Ambiguous: better to leave it in "others" than to guess
        regs = [record("1", 1, "Ambigua"), record("2", 2, "Ambigua"), record("3", 3, "Ambigua")]
        groups = {"1": "theropoda", "2": "ornithischia"}
        data.inherit_group_from_family(regs, groups)
        self.assertNotIn("3", groups)

    def test_no_family_inherits_nothing(self):
        regs = [record("1", 1, "NO_FAMILY_SPECIFIED"), record("2", 2, "NO_FAMILY_SPECIFIED")]
        groups = {"1": "theropoda"}
        self.assertEqual(data.inherit_group_from_family(regs, groups), 0)


class DataCheckFixes(unittest.TestCase):
    def test_sites_with_impossible_coordinates_are_left_out(self):
        col = next(iter(data.EXCLUDED_SITES))
        by_site, excluded, _ = data.group_by_site([record("1", col), record("2", 1)])
        self.assertNotIn(col, by_site)
        self.assertEqual(excluded, 1)

    def test_corrected_coordinate_replaces_the_wrong_one(self):
        col, (lat, lng) = next(iter(data.COORDINATE_FIXES.items()))
        by_site, _, _ = data.group_by_site([record("1", col, lat="45.37", lng="-102.48")])
        self.assertEqual((by_site[col][0]["lat"], by_site[col][0]["lng"]), (lat, lng))

    def test_record_without_coordinates_or_age_is_dropped(self):
        no_lat = {**record("1", 1), "lat": None}
        by_site, _, dropped = data.group_by_site([no_lat])
        self.assertEqual((by_site, dropped), ({}, 1))


class PaleoOutlines(unittest.TestCase):
    def decode(self, flat):
        """Same algorithm as the site (src/paleo.ts), to check the round trip."""
        x, y = flat[0], flat[1]
        points = [(x, y)]
        for k in range(2, len(flat), 2):
            x, y = x + flat[k], y + flat[k + 1]
            points.append((x, y))
        return points

    def test_unwrap_removes_the_date_line_jump(self):
        ring = [(179.0, 0.0), (-179.0, 1.0), (-178.0, 2.0), (179.0, 0.0)]
        unwrapped = paleo.unwrap(ring)
        jumps = [abs(b[0] - a[0]) for a, b in zip(unwrapped, unwrapped[1:])]
        self.assertTrue(all(j < 180 for j in jumps), unwrapped)

    def test_simplify_drops_aligned_point_and_keeps_corner(self):
        line_with_corner = [(0, 0), (1, 0.001), (2, 0), (2, 2)]
        self.assertEqual(paleo.simplify(line_with_corner, 0.1), [(0, 0), (2, 0), (2, 2)])

    def test_compact_encoding_round_trips_to_the_original_outline(self):
        square = [[[10.04, 20.0], [15.0, 20.0], [15.0, 25.0], [10.04, 25.0], [10.04, 20.0]]]
        geojson = {"features": [{"geometry": {"type": "Polygon", "coordinates": square}}]}
        [flat] = paleo.outlines(geojson)
        self.assertEqual(self.decode(flat), [(100, 200), (150, 200), (150, 250), (100, 250), (100, 200)])

    def test_islets_are_dropped(self):
        islet = [[[0, 0], [0.1, 0], [0.1, 0.1], [0, 0.1], [0, 0]]]
        geojson = {"features": [{"geometry": {"type": "Polygon", "coordinates": islet}}]}
        self.assertEqual(paleo.outlines(geojson), [])


if __name__ == "__main__":
    unittest.main()
