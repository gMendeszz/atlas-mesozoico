// Tema claro/escuro. Sem escolha salva, segue o sistema (e acompanha se ele mudar).
// Escolher o mesmo tema do sistema apaga a escolha: volta a seguir o sistema.
import { lerPreferencia, salvarPreferencia, apagarPreferencia } from "./preferencias.js";

const sistemaEscuro = matchMedia("(prefers-color-scheme: dark)");
const COR_DA_BARRA = { claro: "#fbf8f2", escuro: "#1d1a16" }; // barra do navegador no celular

export const temaAtual = () => (document.documentElement.dataset.tema === "escuro" ? "escuro" : "claro");
const temaDoSistema = () => (sistemaEscuro.matches ? "escuro" : "claro");

function temaEscolhido() {
  const salvo = lerPreferencia("tema");
  return salvo === "claro" || salvo === "escuro" ? salvo : temaDoSistema();
}

// `aoMudar(tema)` é chamado quando o tema muda depois de a página abrir
export function montarTema(aoMudar) {
  const botao = document.getElementById("tema");
  const meta = document.querySelector('meta[name="theme-color"]');

  function aplicar() {
    const tema = temaEscolhido();
    const mudou = tema !== temaAtual();
    document.documentElement.dataset.tema = tema;
    botao.setAttribute("aria-pressed", String(tema === "escuro"));
    meta.content = COR_DA_BARRA[tema];
    if (mudou) aoMudar(tema);
  }

  botao.addEventListener("click", () => {
    const novo = temaAtual() === "escuro" ? "claro" : "escuro";
    if (novo === temaDoSistema()) apagarPreferencia("tema");
    else salvarPreferencia("tema", novo);
    aplicar();
  });
  sistemaEscuro.addEventListener("change", aplicar);
  aplicar();
}
