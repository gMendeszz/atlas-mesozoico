// Interface dos filtros: grupo, tipo de fóssil, dieta, país e linha do tempo.
import { PERIODOS, MA_INICIO, MA_FIM, MA_SPAN, MA_FOLGA } from "../constantes.js";
import { esc, fmt, fmtMa } from "../texto.js";
import { LISTAS, tempoCompleto, temFiltroAtivo } from "../filtros.js";
import { caminhoHistograma } from "../histograma.js";

// Onde fica cada lista de opções e qual contagem de calcular() ela mostra
const CAIXAS = {
  grupos: { el: document.getElementById("f-grupo"), contagem: "porGrupo" },
  tipos: { el: document.getElementById("f-tipo"), contagem: "porTipo" },
  dietas: { el: document.getElementById("f-dieta"), contagem: "porDieta" },
};
const elPais = document.getElementById("f-pais");
const elContagem = document.getElementById("contagem");
const botaoLimpar = document.getElementById("limpar");
const elDe = document.getElementById("lt-de");
const elAte = document.getElementById("lt-ate");
const elFaixa = document.getElementById("lt-faixa");
const botaoTudo = document.getElementById("lt-tudo");
const elPeriodos = document.getElementById("lt-periodos");
const elArea = document.getElementById("lt-area");
const sombraEsq = document.getElementById("lt-sombra-esq");
const sombraDir = document.getElementById("lt-sombra-dir");

// Cria os controles e liga os eventos. `f` é o estado dos filtros (alterado aqui);
// `aoMudar(opcoes)` é chamado depois de cada mudança.
export function montarFiltros(dados, f, aoMudar) {
  for (const l of LISTAS) {
    const { el } = CAIXAS[l.campo];
    // Só os grupos têm a bolinha de cor (são a legenda do mapa)
    el.innerHTML = l.opcoes
      .map(
        (o, i) => `<label class="opcao">
      <input type="checkbox" data-i="${i}">
      ${o.cor ? `<span class="bola" style="--cor:${o.cor};--cor-escura:${o.corEscura}" aria-hidden="true"></span>` : ""}${o.nome}
      <span class="n"></span>
    </label>`
      )
      .join("");
    el.addEventListener("change", (e) => {
      f[l.campo][+e.target.dataset.i] = e.target.checked;
      aoMudar();
    });
  }

  elPais.innerHTML =
    `<option value="">Todos os países</option>` +
    dados.paises.map((p) => `<option value="${esc(p.cc)}" data-idx="${p.idx}"></option>`).join("");
  // "Sem país" não tem código pra filtrar; fica de fora do seletor
  elPais.querySelector('option[value=""][data-idx]')?.remove();

  // Atalhos de período: largura proporcional à duração
  elPeriodos.innerHTML = PERIODOS.map(
    (p, i) => `<button type="button" data-p="${i}" aria-pressed="false" style="flex: ${p.de - p.ate}"
      title="${p.nome}: ${fmtMa(p.de)}–${fmtMa(p.ate)} milhões de anos atrás">${p.nome}</button>`
  ).join("");

  elPais.addEventListener("change", () => {
    f.pais = elPais.value;
    aoMudar({ enquadrar: true });
  });

  // Alças: "input" enquanto arrasta (leve, sem mexer na URL); "change" ao soltar
  elDe.addEventListener("input", () => {
    f.de = Math.max(MA_INICIO - +elDe.value, f.ate + MA_FOLGA);
    aoMudar({ arrastando: true });
  });
  elAte.addEventListener("input", () => {
    f.ate = Math.min(MA_INICIO - +elAte.value, f.de - MA_FOLGA);
    aoMudar({ arrastando: true });
  });
  elDe.addEventListener("change", () => aoMudar());
  elAte.addEventListener("change", () => aoMudar());

  elPeriodos.addEventListener("click", (e) => {
    const p = PERIODOS[e.target.closest("[data-p]")?.dataset.p];
    if (!p) return;
    f.de = p.de;
    f.ate = p.ate;
    aoMudar();
  });
  botaoTudo.addEventListener("click", () => {
    f.de = MA_INICIO;
    f.ate = MA_FIM;
    aoMudar();
    elDe.focus(); // o botão some; o foco vai pra alça
  });

  botaoLimpar.addEventListener("click", () => {
    f.de = MA_INICIO;
    f.ate = MA_FIM;
    for (const l of LISTAS) f[l.campo] = l.opcoes.map(() => true);
    f.pais = "";
    aoMudar();
    // O botão some ao limpar; leva o foco do teclado pro primeiro filtro
    CAIXAS.grupos.el.querySelector("input").focus();
  });
}

function atualizarTempo(f, r) {
  const tDe = MA_INICIO - f.de;
  const tAte = MA_INICIO - f.ate;
  elDe.value = String(Math.round(tDe));
  elAte.value = String(Math.round(tAte));
  elDe.setAttribute("aria-valuetext", `${fmtMa(f.de)} milhões de anos atrás`);
  elAte.setAttribute("aria-valuetext", `${fmtMa(f.ate)} milhões de anos atrás`);
  // Alças sobrepostas: a que está mais à direita fica por baixo, pra sempre dar pra pegar as duas
  elDe.style.zIndex = tDe > MA_SPAN / 2 ? "2" : "1";

  elFaixa.textContent = `${fmtMa(f.de)} – ${fmtMa(f.ate)} milhões de anos atrás`;
  botaoTudo.hidden = tempoCompleto(f);
  for (const b of elPeriodos.children) {
    const p = PERIODOS[b.dataset.p];
    b.setAttribute("aria-pressed", String(Math.abs(p.de - f.de) < 0.05 && Math.abs(p.ate - f.ate) < 0.05));
  }

  sombraEsq.setAttribute("x", "0");
  sombraEsq.setAttribute("width", String(tDe));
  sombraDir.setAttribute("x", String(tAte));
  sombraDir.setAttribute("width", String(MA_SPAN - tAte));
  elArea.setAttribute("d", caminhoHistograma(r.histograma));
}

// Atualiza só textos e estados (sem recriar elementos, pra não perder o foco)
export function atualizarFiltros(dados, f, r) {
  atualizarTempo(f, r);
  for (const l of LISTAS) {
    const { el, contagem } = CAIXAS[l.campo];
    for (const input of el.querySelectorAll("input")) {
      const i = +input.dataset.i;
      input.checked = f[l.campo][i];
      const label = input.parentElement;
      label.querySelector(".n").textContent = fmt(r[contagem][i]);
      label.classList.toggle("zero", r[contagem][i] === 0);
    }
  }

  const totalPais = r.porPais.reduce((a, b) => a + b, 0);
  for (const opt of elPais.options) {
    if (!opt.dataset.idx) continue;
    const idx = +opt.dataset.idx;
    opt.textContent = `${dados.paises.find((p) => p.idx === idx).nome} (${fmt(r.porPais[idx])})`;
  }
  elPais.options[0].textContent = `Todos os países (${fmt(totalPais)})`;
  elPais.value = f.pais;
  if (elPais.value !== f.pais) f.pais = ""; // código inválido na URL

  elContagem.textContent = r.totalFosseis
    ? `${fmt(r.totalFosseis)} fósseis em ${fmt(r.features.length)} locais`
    : "Nenhum fóssil com esses filtros";
  botaoLimpar.hidden = !temFiltroAtivo(f);
}
