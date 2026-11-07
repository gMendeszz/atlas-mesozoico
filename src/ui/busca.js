// Interface da busca por nome: sugestões, destaque no mapa, resumo em texto e navegação.
import { esc, fmt } from "../texto.js";
import { lugarDoLocal } from "../dados.js";
import { locaisDoNome, nomesBuscaveis } from "../busca.js";
import { reduzirMovimento } from "../mapa.js";

const elBusca = document.getElementById("busca");
const elInfo = document.getElementById("busca-info");
const botaoLimpar = document.getElementById("busca-limpar");

/**
 * @param ctx.dados        dados preparados
 * @param ctx.map          o mapa
 * @param ctx.resultado    () => resultado atual de calcular() (pontos visíveis)
 * @param ctx.abrirPopup   (i, coordenadas) => void
 * @param ctx.fecharPopup  () => void
 * @param ctx.enquadrar    (features) => void
 * @param ctx.pararGiro    () => void
 * @returns { atualizar({ mover }) , ativa() }
 */
export function montarBusca(ctx) {
  const { dados, map } = ctx;
  let busca = null; // { locais: Set de índices de local }

  document.getElementById("busca-nomes").innerHTML = nomesBuscaveis(dados)
    .map((n) => `<option value="${esc(n)}"></option>`)
    .join("");

  // Desenha o destaque só nos locais visíveis agora (respeita filtros e continentes antigos)
  function desenharDestaque() {
    const visiveis = busca ? ctx.resultado().features.filter((f) => busca.locais.has(f.id)) : [];
    map.getSource("destaque")?.setData({
      type: "FeatureCollection",
      features: visiveis.map((f) => ({ type: "Feature", properties: {}, geometry: f.geometry })),
    });
    return visiveis;
  }

  function atualizar({ mover = false } = {}) {
    const texto = elBusca.value.trim();
    botaoLimpar.hidden = !texto;
    if (!texto) {
      busca = null;
      desenharDestaque();
      elInfo.textContent = "";
      return;
    }
    const achado = locaisDoNome(dados, texto);
    if (!achado.locais.size) {
      busca = null;
      desenharDestaque();
      elInfo.textContent = `Nenhum fóssil encontrado para “${texto}”.`;
      return;
    }
    busca = { locais: achado.locais };
    const visiveis = desenharDestaque();
    const ocultos = achado.locais.size - visiveis.length;

    const nLocais = achado.locais.size === 1 ? "1 local" : `${fmt(achado.locais.size)} locais`;
    let info = `${texto}: ${achado.fosseis === 1 ? "1 fóssil" : `${fmt(achado.fosseis)} fósseis`} em ${nLocais}`;
    if (achado.incertos) info += ` (${fmt(achado.incertos)} com identificação incerta)`;
    if (visiveis.length) {
      const lugares = [...new Set(visiveis.map((f) => lugarDoLocal(dados, f.id)).filter(Boolean))];
      info += `. Locais: ${lugares.slice(0, 3).join("; ")}${lugares.length > 3 ? "…" : ""}`;
    }
    if (ocultos) info += `. ${ocultos === 1 ? "1 local está oculto" : `${fmt(ocultos)} locais estão ocultos`} pelos filtros atuais.`;
    elInfo.textContent = info;

    if (!mover || !visiveis.length) return;
    ctx.fecharPopup(); // o popup da busca anterior não fica aberto por cima do resultado novo
    ctx.pararGiro();
    if (visiveis.length === 1) {
      const [f] = visiveis;
      map.once("moveend", () => ctx.abrirPopup(f.id, f.geometry.coordinates));
      // Zoom acima de clusterMaxZoom (9): o ponto aparece sozinho, fora de agrupamentos
      map.easeTo({ center: f.geometry.coordinates, zoom: Math.max(map.getZoom(), 9.5), duration: reduzirMovimento.matches ? 0 : 1000 });
    } else {
      ctx.enquadrar(visiveis);
    }
  }

  // "change" dispara ao escolher uma sugestão ou apertar Enter
  elBusca.addEventListener("change", () => atualizar({ mover: true }));
  elBusca.addEventListener("input", () => {
    botaoLimpar.hidden = !elBusca.value;
    if (!elBusca.value) atualizar(); // apagou tudo
  });
  botaoLimpar.addEventListener("click", () => {
    elBusca.value = "";
    atualizar();
    elBusca.focus();
  });

  return { atualizar, ativa: () => Boolean(busca), desenharDestaque };
}
