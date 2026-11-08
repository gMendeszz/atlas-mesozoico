// Small data in the same format as public/data/dinos.json, built to cover the hard cases: an
// age range crossing the end of the Mesozoic, a site on the date line, an uncertain
// identification, a malicious name, a tie between groups, a footprint, an egg, an uncertain
// formation and a record published under a synonym.
import { prepareData } from "../src/data";

export const NAMES = ["", "Tyrannosaurus rex", "Tyrannosauridae", "Dinosauria", "Foo bar", '<img src=x onerror="alert(1)">'];

export function testData() {
  return prepareData({
    meta: {
      generated_at: "2026-11-04",
      sites_signature: "test",
      groups: ["theropoda", "aves", "sauropodomorpha", "ornithischia", "others"],
      types: ["body", "footprint", "egg"],
      diets: ["carnivore", "herbivore", "omnivore", "piscivore", "unknown"],
    },
    dict: {
      name: NAMES,
      original_name: ["", "cf. Tyrannosaurus rex", "Foo antiquus"],
      family: ["", "Tyrannosauridae"],
      interval: ["", "Carnian – Norian", "Maastrichtian – Danian", "Kimmeridgian"],
      country: ["", "BR", "US", "NZ"],
      state: ["", "Rio Grande do Sul", "Montana", "Chatham Islands"],
      formation: ["", "Santa Maria", "Hell Creek (?)"],
      author: ["", "Fulano, 1900", "Osborn, 1905"],
    },
    sites: {
      col: [100, 200, 300],
      lng: [-53.7, -106.5, -176.7],
      lat: [-29.7, 47.0, -43.8],
      max: [230, 72.2, 150],
      min: [220, 61.66, 140],
      interval: [1, 2, 3],
      country: [1, 2, 3],
      state: [1, 2, 3],
      formation: [1, 2, 0],
      n: [3, 3, 1],
    },
    // site 0 (Brazil, Triassic, Santa Maria Fm.): 1 carnivorous theropod (uncertain, with an
    //   author that must not show) + 1 footprint and 1 egg from "others", no diet
    // site 1 (USA, 72–61.7 Ma, uncertain Hell Creek Fm.): 1 herbivorous sauropodomorph (with
    //   author, published as the synonym "Foo antiquus") + 1 herbivorous ornithischian + 1
    //   carnivorous theropod with a malicious name
    // site 2 (New Zealand, Jurassic, no formation): 1 "others" with no diet
    fossils: {
      name: [1, 3, 3, 4, 4, 5, 3],
      family: [1, 0, 0, 0, 0, 0, 0],
      group: [0, 4, 4, 2, 3, 0, 4],
      type: [0, 1, 2, 0, 0, 0, 0],
      diet: [0, 4, 4, 1, 1, 0, 4],
      author: [2, 0, 0, 1, 0, 0, 0],
    },
    uncertain: { j: [0], name: [1] },
    published: { j: [3], name: [2] },
  });
}
