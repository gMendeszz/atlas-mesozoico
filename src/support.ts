// MapLibre 6 needs WebGL 2; without it, the app shows a message instead of a blank page
// (and doesn't even download the data, which would have nowhere to go)
export const hasWebGL = Boolean(document.createElement("canvas").getContext("webgl2"));
