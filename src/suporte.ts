// O MapLibre 6 precisa de WebGL 2; sem ele, o app avisa em vez de deixar a página em branco
// (e nem baixa os dados, que não teriam onde aparecer)
export const temWebGL = Boolean(document.createElement("canvas").getContext("webgl2"));
