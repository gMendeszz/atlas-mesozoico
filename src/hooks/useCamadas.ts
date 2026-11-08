// Mantém as camadas do mapa em dia com o estado do React: pontos, continentes antigos, destaque da
// busca e popups. Cada efeito repete a cada estilo carregado (`estiloVersao`), então uma troca de
// tema no meio de uma mudança não deixa o mapa novo desatualizado.
import { useEffect, useRef, useState } from "react";
import { adicionarCamadas, fonte, mostrarPaleo, type MapaLibre } from "../mapa";
import { montarPopups, type Popups } from "../popups-mapa";
import type { Dados, Epoca, Filtros, Ponto, Resultado, Tema } from "../tipos";
import type { EstadoMapa } from "./useMapa";

interface Opcoes {
  mapa: EstadoMapa;
  tema: Tema;
  dados: Dados | null;
  resultado: Resultado | null;
  epoca: Epoca | null; // continentes antigos ligados (e a época já chegou)
  destaque: Ponto[]; // locais achados pela busca
  filtros: Filtros; // o popup mostra só os fósseis que passam neles
}

export function useCamadas({ mapa, tema, dados, resultado, epoca, destaque, filtros }: Opcoes) {
  const { map, estiloVersao, estiloPronto, camadasBase } = mapa;

  // As camadas entram uma vez por mapa, quando o estilo e os dados estão prontos
  const [mapaComCamadas, setMapaComCamadas] = useState<MapaLibre | null>(null);
  const prontas = map !== null && mapaComCamadas === map;
  useEffect(() => {
    if (!map || !resultado || !estiloVersao || prontas || !estiloPronto()) return;
    if (!fonte(map, "dinos")) adicionarCamadas(map, tema, resultado.features);
    setMapaComCamadas(map);
  }, [map, resultado, estiloVersao, prontas, estiloPronto, tema]);

  // Pontos: no máximo uma atualização por quadro (arrastar a alça muda o resultado muitas vezes)
  useEffect(() => {
    if (!map || !prontas || !resultado) return;
    const quadro = requestAnimationFrame(() => {
      if (estiloPronto()) fonte(map, "dinos")?.setData({ type: "FeatureCollection", features: resultado.features });
    });
    return () => cancelAnimationFrame(quadro);
  }, [map, prontas, resultado, estiloVersao, estiloPronto]);

  // Continentes antigos: troca o mapa base pelas terras da época
  useEffect(() => {
    if (!map || !prontas || !estiloPronto()) return;
    if (epoca) fonte(map, "paleo")?.setData(epoca.costas);
    mostrarPaleo(map, camadasBase(), Boolean(epoca));
  }, [map, prontas, epoca, estiloVersao, estiloPronto, camadasBase]);

  // Anel em volta dos locais achados pela busca
  useEffect(() => {
    if (!map || !prontas || !estiloPronto()) return;
    fonte(map, "destaque")?.setData({
      type: "FeatureCollection",
      features: destaque.map((p) => ({ type: "Feature", properties: {}, geometry: p.geometry })),
    });
  }, [map, prontas, destaque, estiloVersao, estiloPronto]);

  // Popups (lêem os filtros da hora do clique)
  const filtrosAtuais = useRef(filtros);
  useEffect(() => {
    filtrosAtuais.current = filtros;
  });
  const popups = useRef<Popups | null>(null);
  useEffect(() => {
    if (!map || !dados || !prontas) return;
    const p = montarPopups(map, dados, () => filtrosAtuais.current);
    popups.current = p;
    return () => {
      p.desmontar();
      popups.current = null;
    };
  }, [map, dados, prontas]);

  // Mudou o que aparece no mapa: o popup aberto pode estar mostrando coisa que sumiu
  useEffect(() => {
    popups.current?.fechar();
  }, [resultado]);

  return {
    abrirPopup: (i: number, coordenadas: [number, number]) => popups.current?.abrir(i, coordenadas),
    fecharPopup: () => popups.current?.fechar(),
  };
}
