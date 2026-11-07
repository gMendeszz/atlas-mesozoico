// Valores fixos usados em todo o app.

// Mesma ordem de meta.grupos no JSON (o índice é o código do grupo).
// Cores da paleta Okabe-Ito, feita pra ser distinguível por quem tem daltonismo; `corEscura` é a
// versão mais clara pro tema escuro. Conferidas com simulação de deuteranopia, protanopia e
// tritanopia (nenhum par fica parecido) e contraste ≥ 3:1 com os fundos do mapa nos dois temas.
// O cinza de "Outros" é escuro de propósito: um cinza médio fica igual ao verde pra deuteranopes.
export const GRUPOS = [
  { chave: "theropoda", nome: "Terópodes", cor: "#d55e00", corEscura: "#f07f3c" },
  { chave: "sauropodomorpha", nome: "Sauropodomorfos", cor: "#009e73", corEscura: "#3fd0a0" },
  { chave: "ornithischia", nome: "Ornitísquios", cor: "#0072b2", corEscura: "#5aa9e6" },
  // Identificados só como dinossauro, grupos fora dos três acima (ex.: herrerassaurídeos),
  // e ovos/pegadas sem grupo definido
  { chave: "outros", nome: "Outros", cor: "#5f574d", corEscura: "#857a6c" },
];
export const OUTROS = 3;

// Mesma ordem de meta.tipos e meta.dietas no JSON (ver scripts/baixar_dados.py)
export const TIPOS = [
  { chave: "corpo", nome: "Ossos, dentes e outros restos" },
  { chave: "pegada", nome: "Pegadas e rastros", curto: "pegada" },
  { chave: "ovo", nome: "Ovos", curto: "ovo" },
];
export const DIETAS = [
  { chave: "carnivoro", nome: "Carnívoros" },
  { chave: "herbivoro", nome: "Herbívoros" },
  { chave: "onivoro", nome: "Onívoros" },
  { chave: "piscivoro", nome: "Piscívoros" },
  { chave: "desconhecida", nome: "Sem informação" },
];

// Linha do tempo em milhões de anos (Ma). Limites dos períodos: ICS 2023 (início do Triássico ≈ 251,9).
export const MA_INICIO = 252;
export const MA_FIM = 66;
export const MA_SPAN = MA_INICIO - MA_FIM; // 186
export const MA_FOLGA = 2; // intervalo mínimo entre as alças da linha do tempo

export const PERIODOS = [
  { nome: "Triássico", de: 252, ate: 201.4 },
  { nome: "Jurássico", de: 201.4, ate: 145 },
  { nome: "Cretáceo", de: 145, ate: 66 },
];

// Período (índice em PERIODOS) do ponto médio da idade de um local
export const periodoDoMeio = (meio) => (meio > PERIODOS[0].ate ? 0 : meio > PERIODOS[1].ate ? 1 : 2);

// Continentes antigos: uma época a cada 10 Ma (ver scripts/baixar_paleo.py)
export const PALEO_PRIMEIRA = 70;
export const PALEO_ULTIMA = 250;
