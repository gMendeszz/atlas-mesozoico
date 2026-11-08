// Fixed values used across the app.

export interface Option {
  key: string; // value in the data and in the URL
  name: string; // text on screen
}
export interface Group extends Option {
  color: string;
  darkColor: string;
}
export interface FossilType extends Option {
  short?: string; // tag in the popup ("footprint", "egg"); bones get no tag
}

// Same order as meta.groups in the JSON (the index is the group code).
// Okabe-Ito palette colors, designed to be distinguishable by people with color blindness;
// `darkColor` is the lighter version for the dark theme. Checked with deuteranopia, protanopia
// and tritanopia simulation (no pair looks alike) and ≥ 3:1 contrast with the map backgrounds in
// both themes. The "Others" gray is dark on purpose: a mid gray looks like the green to deuteranopes.
export const GROUPS: Group[] = [
  { key: "theropoda", name: "Theropods", color: "#d55e00", darkColor: "#f07f3c" },
  { key: "sauropodomorpha", name: "Sauropodomorphs", color: "#009e73", darkColor: "#3fd0a0" },
  { key: "ornithischia", name: "Ornithischians", color: "#0072b2", darkColor: "#5aa9e6" },
  // Identified only as dinosaurs, groups outside the three above (e.g. herrerasaurids),
  // and eggs/footprints with no assigned group
  { key: "others", name: "Others", color: "#5f574d", darkColor: "#857a6c" },
];
export const OTHERS = 3;

// Same order as meta.types and meta.diets in the JSON (see scripts/fetch_data.py)
export const TYPES: FossilType[] = [
  { key: "body", name: "Bones, teeth and other remains" },
  { key: "footprint", name: "Footprints and trackways", short: "footprint" },
  { key: "egg", name: "Eggs", short: "egg" },
];
export const DIETS: Option[] = [
  { key: "carnivore", name: "Carnivores" },
  { key: "herbivore", name: "Herbivores" },
  { key: "omnivore", name: "Omnivores" },
  { key: "piscivore", name: "Piscivores" },
  { key: "unknown", name: "Unknown" },
];

// Timeline in millions of years ago (Ma). Period boundaries: ICS 2023 (start of the Triassic ≈ 251.9).
export const MA_START = 252;
export const MA_END = 66;
export const MA_SPAN = MA_START - MA_END; // 186
export const MA_GAP = 2; // minimum range between the timeline handles

export interface Period {
  name: string;
  from: number;
  to: number;
}
export const PERIODS: Period[] = [
  { name: "Triassic", from: 252, to: 201.4 },
  { name: "Jurassic", from: 201.4, to: 145 },
  { name: "Cretaceous", from: 145, to: 66 },
];

// Period (index in PERIODS) of the midpoint of a site's age
export const periodOfMidpoint = (mid: number): number => (mid > PERIODS[0].to ? 0 : mid > PERIODS[1].to ? 1 : 2);

// Ancient continents: one time slice every 10 Ma (see scripts/fetch_paleo.py)
export const PALEO_FIRST = 70;
export const PALEO_LAST = 250;
