// Painel lateral: recolher/expandir, mensagens de erro e o bloco "Sobre os dados".
import { fmt } from "../texto.js";

const elContagem = document.getElementById("contagem");

// Mensagem de erro no lugar da contagem (ex.: sem internet, navegador sem WebGL 2)
export function mostrarErro(mensagem) {
  elContagem.textContent = mensagem;
  elContagem.classList.add("erro");
}
export const temErro = () => elContagem.classList.contains("erro");

export function configurarPainel() {
  const botao = document.getElementById("recolher");
  const corpo = document.getElementById("painel-corpo");
  function definirAberto(aberto) {
    corpo.hidden = !aberto;
    botao.setAttribute("aria-expanded", String(aberto));
    botao.querySelector(".sr-only").textContent = aberto ? "Recolher painel" : "Expandir painel";
  }
  botao.addEventListener("click", () => definirAberto(corpo.hidden));
  // No celular o painel começa recolhido pra não cobrir o mapa
  if (matchMedia("(max-width: 600px)").matches) definirAberto(false);
}

// "Sobre os dados": números calculados dos próprios dados, pra nunca ficarem desatualizados
export function preencherSobre(dados) {
  const total = dados.fosseis.nome.length;
  const pct = (n) => `${Math.round((100 * n) / total)}%`;
  let euaCanada = 0;
  dados.locais.pais.forEach((p, i) => {
    if (["US", "CA"].includes(dados.dic.pais[p])) euaCanada += dados.locais.n[i];
  });
  const [ano, mes, dia] = dados.meta.gerado_em.split("-").map(Number);
  const valores = {
    fosseis: fmt(total),
    referencias: dados.meta.n_referencias ? fmt(dados.meta.n_referencias) : "milhares de",
    data: new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }),
    "eua-canada": pct(euaCanada),
    incertos: pct(dados.incertoDe.size),
  };
  for (const el of document.querySelectorAll("[data-sobre]")) el.textContent = valores[el.dataset.sobre];
}
