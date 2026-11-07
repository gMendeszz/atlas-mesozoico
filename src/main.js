// Ponto de entrada: liga dados, mapa e interface. A lógica de cada parte está nos módulos:
//   filtros.js (cálculo), paleo.js, busca.js, geo.js, popup.js  — lógica pura, com testes
//   mapa.js, ui/*.js (painel, filtros, busca, popups, continentes) — mapa e interface
import "./style.css";
import { mostrarErro, temErro, configurarPainel, preencherSobre } from "./ui/painel.js";
import { criarMapa, carregarEstilo, ehCamadaNossa, configurarVista, nomesEmPortugues, adicionarCamadas, enquadrar } from "./mapa.js";
import { montarTema, temaAtual } from "./tema.js";
import { prepararDados } from "./dados.js";
import { lerFiltrosDaURL, filtrosParaURL, calcular } from "./filtros.js";
import { montarFiltros, atualizarFiltros } from "./ui/filtros.js";
import { montarBusca } from "./ui/busca.js";
import { montarPopups } from "./ui/popups.js";
import { montarContinentes } from "./ui/continentes.js";

// O MapLibre 6 precisa de WebGL 2; sem ele, avisa em vez de deixar a página em branco
if (document.createElement("canvas").getContext("webgl2")) {
  comecar();
} else {
  mostrarErro("Seu navegador não suporta WebGL 2, necessário para o mapa. Tente atualizá-lo ou usar outro navegador.");
}

function comecar() {
  // Começa a baixar os dados já, em paralelo com o estilo do mapa.
  // "no-cache" = sempre confere com o servidor se há versão nova (resposta 304 se não houver)
  const dadosPromise = fetch("data/dinos.json", { cache: "no-cache" }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });
  dadosPromise.catch(() => mostrarErro("Não foi possível carregar os dados dos fósseis. Recarregue a página."));

  configurarPainel();
  const map = criarMapa();
  const vista = configurarVista(map);
  // Trocar o tema troca o mapa base; pontos, busca e continentes antigos vão junto (ver carregarEstilo)
  montarTema((tema) => carregarEstilo(map, tema));

  // Camadas do mapa base (ruas, nomes, países...), pra esconder no modo de continentes antigos.
  // "style.load" acontece ao abrir e de novo a cada troca de tema.
  let camadasBase = [];
  let primeiroEstilo = true;
  let aoTrocarEstilo = () => {};
  map.on("style.load", () => {
    camadasBase = map.getStyle().layers.map((l) => l.id).filter((id) => !ehCamadaNossa(id));
    nomesEmPortugues(map);
    // Brilho da atmosfera em volta do globo; no escuro, mais fraco pra não ofuscar
    const brilho = temaAtual() === "escuro" ? 0.35 : 1;
    map.setSky({ "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, brilho, 5, brilho, 7, 0] });
    if (primeiroEstilo) vista.aplicarVista();
    else {
      vista.reaplicarProjecao();
      aoTrocarEstilo();
    }
    primeiroEstilo = false;
  });

  // Começa assim que o estilo do mapa e os dados chegam, sem esperar os tiles do mapa base
  const estiloCarregado = new Promise((ok) => map.once("style.load", ok));

  // Se o estilo do mapa base não carregar (serviço fora do ar, sem internet), avisa.
  // Erros depois disso (um tile que falhou) são normais e o MapLibre tenta de novo sozinho.
  let estiloOk = false;
  estiloCarregado.then(() => (estiloOk = true));
  map.on("error", (e) => {
    if (!estiloOk) mostrarErro("Não foi possível carregar o mapa base. Verifique a conexão e recarregue a página.");
    console.error(e.error ?? e);
  });

  Promise.all([dadosPromise, estiloCarregado])
    .then(([bruto]) => {
      aoTrocarEstilo = iniciar(map, vista, () => camadasBase, prepararDados(bruto)).sincronizar;
    })
    .catch((erro) => {
      console.error(erro);
      if (!temErro()) mostrarErro("Algo deu errado ao montar o mapa. Recarregue a página.");
    });
}

function iniciar(map, vista, obterCamadasBase, dados) {
  preencherSobre(dados);

  const f = lerFiltrosDaURL(location.search);
  let resultado = calcular(dados, f);
  adicionarCamadas(map, resultado.features);

  const popups = montarPopups(map, dados, f);
  const enquadrarPontos = (features) => {
    vista.pararGiro();
    enquadrar(map, features);
  };
  const busca = montarBusca({
    dados,
    map,
    resultado: () => resultado,
    abrirPopup: popups.abrir,
    fecharPopup: popups.fechar,
    enquadrar: enquadrarPontos,
    pararGiro: vista.pararGiro,
  });
  const continentes = montarContinentes({
    map,
    f,
    assinatura: dados.meta.assinatura_locais,
    obterCamadasBase,
    aoMudar: (opcoes) => aplicar(opcoes),
  });

  // Recalcula tudo a partir dos filtros (`f`) e atualiza mapa, painel, aviso de continentes, busca e URL
  function aplicar({ enquadrar: deveEnquadrar = false, url = true } = {}) {
    const carregando = continentes.garantirEpoca();
    resultado = calcular(dados, f, continentes.epoca());
    // ?.: durante a troca de tema o mapa base novo ainda está carregando; sincronizar() repõe depois
    map.getSource("dinos")?.setData({ type: "FeatureCollection", features: resultado.features });
    popups.fechar();
    atualizarFiltros(dados, f, resultado);
    continentes.atualizarInfo(carregando, resultado);
    // Busca ativa: o destaque acompanha sempre; o texto só ao terminar (não a cada quadro do arrasto)
    if (busca.ativa() && url) busca.atualizar();
    else busca.desenharDestaque();
    if (url) history.replaceState(null, "", filtrosParaURL(f) || location.pathname);
    if (deveEnquadrar && f.pais) enquadrarPontos(resultado.features);
  }

  // Enquanto arrasta a alça: no máximo uma atualização por quadro, e sem mexer na URL
  let quadroPendente = 0;
  montarFiltros(dados, f, (opcoes = {}) => {
    if (opcoes.arrastando) {
      quadroPendente ||= requestAnimationFrame(() => {
        quadroPendente = 0;
        aplicar({ url: false });
      });
      return;
    }
    cancelAnimationFrame(quadroPendente);
    quadroPendente = 0;
    aplicar(opcoes);
  });

  aplicar({ url: false });
  if (f.pais) enquadrarPontos(resultado.features);

  // Depois de trocar o tema: repõe no mapa novo o que pode ter mudado enquanto ele carregava
  // (sem fechar o popup aberto)
  function sincronizar() {
    map.getSource("dinos")?.setData({ type: "FeatureCollection", features: resultado.features });
    continentes.sincronizar();
    busca.desenharDestaque();
  }
  return { sincronizar };
}
