// Cria o mapa do MapLibre dentro de um elemento do React e acompanha o estilo (mapa base).
// O mapa é imperativo; os componentes reagem a `estiloVersao`, que muda a cada estilo
// carregado (ao abrir e a cada troca de tema), pra repor dados no mapa novo.
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { carregarEstilo, criarMapa, definirCeu, ehCamadaNossa, nomesEmPortugues, type MapaLibre } from "../mapa";
import type { Tema } from "../tipos";

interface Opcoes {
  container: RefObject<HTMLDivElement | null>;
  linhaTempo: RefObject<HTMLElement | null>; // fica por cima da parte de baixo do mapa
  tema: Tema;
  ativo: boolean; // false sem WebGL 2: não cria o mapa
  aoErro: (mensagem: string) => void;
}

export interface EstadoMapa {
  map: MapaLibre | null;
  estiloVersao: number; // 0 = carregando o primeiro estilo
  estiloPronto: () => boolean; // false enquanto um mapa base novo carrega (troca de tema)
  camadasBase: () => string[]; // camadas do mapa base (ruas, nomes...), pra esconder nos continentes antigos
}

export function useMapa({ container, linhaTempo, tema, ativo, aoErro }: Opcoes): EstadoMapa {
  const [map, setMap] = useState<MapaLibre | null>(null);
  const [estiloVersao, setEstiloVersao] = useState(0);
  const temaCarregado = useRef(tema);
  const carregando = useRef(true);
  const camadasBase = useRef<string[]>([]);
  const aoErroRef = useRef(aoErro);
  useEffect(() => {
    aoErroRef.current = aoErro;
  });

  useEffect(() => {
    if (!ativo || !container.current || !linhaTempo.current) return;
    const elLinhaTempo = linhaTempo.current;
    const margemInferior = () => elLinhaTempo.offsetHeight + 40;
    carregando.current = true;
    const m = criarMapa(container.current, temaCarregado.current, margemInferior());

    // Se o primeiro estilo não carregar (serviço fora do ar, sem internet), avisa.
    // Erros depois disso (um tile que falhou) são normais e o MapLibre tenta de novo sozinho.
    let estiloOk = false;
    m.on("style.load", () => {
      estiloOk = true;
      carregando.current = false;
      camadasBase.current = m.getStyle().layers.map((l) => l.id).filter((id) => !ehCamadaNossa(id));
      nomesEmPortugues(m);
      definirCeu(m, temaCarregado.current);
      setEstiloVersao((v) => v + 1);
    });
    m.on("error", (e) => {
      if (!estiloOk) aoErroRef.current("Não foi possível carregar o mapa base. Verifique a conexão e recarregue a página.");
      console.error(e.error ?? e);
    });

    // O mapa "desconta" a linha do tempo: o globo e os enquadramentos se centralizam na área livre
    const observador = new ResizeObserver(() => m.setPadding({ top: 0, right: 0, left: 0, bottom: margemInferior() }));
    observador.observe(elLinhaTempo);

    setMap(m);
    return () => {
      observador.disconnect();
      m.remove();
      setMap(null);
      setEstiloVersao(0);
    };
  }, [ativo, container, linhaTempo]);

  // Trocar o tema troca o mapa base; pontos, busca e continentes antigos vão junto (ver carregarEstilo)
  useEffect(() => {
    if (!map || tema === temaCarregado.current) return;
    temaCarregado.current = tema;
    carregando.current = true;
    carregarEstilo(map, tema);
  }, [map, tema]);

  return {
    map,
    estiloVersao,
    estiloPronto: useCallback(() => !carregando.current, []),
    camadasBase: useCallback(() => camadasBase.current, []),
  };
}
