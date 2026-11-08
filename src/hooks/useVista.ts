// Mapa plano / globo e a rotação automática do globo.
import { useCallback, useEffect, useState } from "react";
import { reduzirMovimento, type MapaLibre } from "../mapa";
import { lerPreferencia, salvarPreferencia } from "../preferencias";
import type { Vista } from "../tipos";

const GRAUS_POR_SEGUNDO = 5;

const vistaSalva = (): Vista => (lerPreferencia("vista") === "mercator" ? "mercator" : "globe");
const giraSozinho = (vista: Vista) => vista === "globe" && !reduzirMovimento.matches;

export function useVista(map: MapaLibre | null, estiloVersao: number) {
  const [vista, setVista] = useState<Vista>(vistaSalva);
  const [girando, setGirando] = useState(() => giraSozinho(vistaSalva()));
  const pronto = map !== null && estiloVersao > 0;

  // A projeção é do estilo: volta a cada mapa base carregado (troca de tema)
  useEffect(() => {
    if (map && estiloVersao) map.setProjection({ type: vista });
  }, [map, vista, estiloVersao]);

  // No plano, zoom muito afastado vira uma faixa repetida do mundo
  useEffect(() => {
    if (!map || !pronto) return;
    map.setMinZoom(vista === "mercator" ? 1.2 : 0);
    if (vista === "mercator") map.jumpTo({ zoom: Math.max(map.getZoom(), 1.6), pitch: 0, bearing: 0 });
  }, [map, vista, pronto]);

  // Rotação contínua, quadro a quadro, com velocidade constante (não depende da taxa de quadros)
  useEffect(() => {
    if (!map || !pronto || !girando || vista !== "globe") return;
    let ultimo = performance.now();
    let quadro = requestAnimationFrame(function girar(agora) {
      const dt = Math.min(agora - ultimo, 100) / 1000; // aba em segundo plano não dá salto
      ultimo = agora;
      if (!map.isMoving()) {
        const c = map.getCenter();
        map.setCenter([c.lng - GRAUS_POR_SEGUNDO * dt, c.lat]);
      }
      quadro = requestAnimationFrame(girar);
    });
    return () => cancelAnimationFrame(quadro);
  }, [map, pronto, girando, vista]);

  // Qualquer interação do usuário com o mapa para a rotação
  useEffect(() => {
    if (!map) return;
    const parar = () => setGirando(false);
    const el = map.getCanvasContainer();
    for (const evento of ["pointerdown", "wheel"]) el.addEventListener(evento, parar, { passive: true });
    return () => {
      for (const evento of ["pointerdown", "wheel"]) el.removeEventListener(evento, parar);
    };
  }, [map]);

  const escolherVista = useCallback((nova: Vista) => {
    setVista(nova);
    salvarPreferencia("vista", nova);
    setGirando(giraSozinho(nova));
  }, []);

  return {
    vista,
    escolherVista,
    girando,
    alternarGiro: useCallback(() => setGirando((g) => !g), []),
    pararGiro: useCallback(() => setGirando(false), []),
  };
}
