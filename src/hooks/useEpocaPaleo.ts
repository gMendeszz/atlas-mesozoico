// Continentes antigos: baixa a época do meio do intervalo escolhido (sem travar a tela).
// Enquanto a época nova não chega, continua valendo a anterior (os pontos não "piscam").
import { useEffect, useState } from "react";
import { carregarEpoca, epocaDoIntervalo } from "../paleo";
import type { Continentes, Epoca } from "../tipos";

export interface EstadoPaleo {
  epoca: Epoca | null; // posições pra usar no cálculo; null = continentes atuais (ou a 1ª ainda não chegou)
  t: number; // época que deveria estar na tela
  carregando: boolean;
  erro: boolean;
}

export function useEpocaPaleo(continentes: Continentes, de: number, ate: number, assinatura: string | null): EstadoPaleo {
  const t = epocaDoIntervalo(de, ate);
  const antigos = continentes === "antigos";
  const [carregada, setCarregada] = useState<Epoca | null>(null);
  const [erroEm, setErroEm] = useState<number | null>(null);

  useEffect(() => {
    if (!antigos || !assinatura) return;
    let valendo = true; // ignora respostas atrasadas (o usuário pode ter mudado de época ou de modo)
    carregarEpoca(t, assinatura)
      .then((d) => valendo && setCarregada(d))
      .catch(() => valendo && setErroEm(t));
    return () => {
      valendo = false;
    };
  }, [antigos, t, assinatura]);

  const epoca = antigos ? carregada : null;
  const erro = antigos && erroEm === t && carregada?.t !== t;
  return { epoca, t, carregando: antigos && carregada?.t !== t && !erro, erro };
}
