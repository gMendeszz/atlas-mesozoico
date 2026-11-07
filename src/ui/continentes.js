// Continentes atuais × antigos: os botões, o carregamento da época certa e o aviso abaixo deles.
import { mostrarPaleo } from "../mapa.js";
import { epocaDoIntervalo, carregarEpoca } from "../paleo.js";
import { fmt } from "../texto.js";

const elInfo = document.getElementById("paleo-info");
const botoes = document.querySelectorAll("[data-continentes]");

// `f` é o estado dos filtros; `aoMudar(opcoes)` reaplica os filtros (troca de modo ou época que chegou)
export function montarContinentes({ map, f, assinatura, obterCamadasBase, aoMudar }) {
  let epocaCarregada = null;

  for (const b of botoes) {
    b.addEventListener("click", () => {
      if (f.continentes === b.dataset.continentes) return;
      f.continentes = b.dataset.continentes;
      if (f.continentes === "atuais") {
        epocaCarregada = null;
        mostrarPaleo(map, obterCamadasBase(), false);
      }
      aoMudar();
    });
  }

  // Se o modo é "antigos" e a época do intervalo ainda não chegou, começa a baixar (sem travar
  // a tela) e reaplica os filtros quando chegar. Retorna true enquanto estiver carregando.
  function garantirEpoca() {
    if (f.continentes !== "antigos") return false;
    const t = epocaDoIntervalo(f.de, f.ate);
    if (epocaCarregada?.t === t) return false;
    carregarEpoca(t, assinatura)
      .then((d) => {
        // Ignora respostas atrasadas (o usuário pode ter mudado de época ou de modo)
        if (f.continentes !== "antigos" || epocaDoIntervalo(f.de, f.ate) !== d.t) return;
        const primeira = !epocaCarregada;
        epocaCarregada = d;
        map.getSource("paleo")?.setData(d.costas);
        if (primeira) mostrarPaleo(map, obterCamadasBase(), true);
        aoMudar({ url: false });
      })
      .catch(() => {
        elInfo.textContent = "Não deu pra carregar os continentes antigos. Tente de novo.";
      });
    return true;
  }

  function atualizarInfo(carregando, resultado) {
    for (const b of botoes) b.setAttribute("aria-pressed", String(b.dataset.continentes === f.continentes));
    elInfo.hidden = f.continentes !== "antigos";
    if (f.continentes !== "antigos") return;
    const t = epocaDoIntervalo(f.de, f.ate);
    let texto = carregando
      ? `Carregando a Terra de ${t} milhões de anos atrás…`
      : `A Terra há ${t} milhões de anos (meio do intervalo escolhido). Contornos dos continentes atuais, na posição daquela época.`;
    if (!carregando && resultado.semPosicao) {
      texto += ` ${fmt(resultado.semPosicao)} fósseis ficam ocultos: o modelo não reconstrói o local deles.`;
    }
    elInfo.textContent = texto;
  }

  // Depois de trocar o mapa base: repõe a época carregada e o que fica visível
  function sincronizar() {
    if (epocaCarregada) map.getSource("paleo")?.setData(epocaCarregada.costas);
    mostrarPaleo(map, obterCamadasBase(), Boolean(epocaCarregada));
  }

  return {
    garantirEpoca,
    sincronizar,
    atualizarInfo,
    // Posições antigas pra usar no cálculo; enquanto a primeira época não chega, os pontos
    // ficam na posição atual
    epoca: () => (f.continentes === "antigos" ? epocaCarregada : null),
  };
}
