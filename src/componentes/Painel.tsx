// Painel lateral: título, botão de recolher, a contagem e os filtros. (Controles do mapa, como
// mapa/globo e tema, ficam no canto do mapa: ver ControlesDoMapa.tsx.)
import { useId, useState, type ReactNode, type Ref } from "react";
import { BOTAO_ICONE, CARTAO } from "./classes";
import { IconeSeta } from "./Icones";

interface Props {
  ref?: Ref<HTMLElement>;
  contagem: string; // na tela, sempre atualizada
  anuncio: string; // a mesma contagem pra leitores de tela, sem mudar a cada quadro de um arrasto
  erro: boolean; // a contagem é uma mensagem de erro
  children: ReactNode;
}

// No celular o painel começa recolhido pra não cobrir o mapa
const comecaAberto = () => !matchMedia("(max-width: 600px)").matches;

export function Painel({ ref, contagem, anuncio, erro, children }: Props) {
  const [aberto, setAberto] = useState(comecaAberto);
  const idCorpo = useId();

  return (
    <aside
      ref={ref}
      aria-label="Filters"
      className={`${CARTAO} absolute top-4 left-4 w-[280px] max-w-[calc(100%-32px)] max-h-[calc(100dvh-226px)] overflow-y-auto overscroll-contain px-4 pt-3.5 pb-4
        max-sm:top-2.5 max-sm:left-2.5 max-sm:right-14 max-sm:w-auto max-sm:max-w-none max-sm:max-h-[calc(100dvh-220px)]`}
    >
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-[-0.01em]">Mesozoic Atlas</h1>
        <button type="button" className={BOTAO_ICONE} aria-expanded={aberto} aria-controls={idCorpo} onClick={() => setAberto(!aberto)}>
            {/* Nome fixo: o estado (aberto/fechado) quem diz é o aria-expanded */}
            <span className="sr-only">Filter panel</span>
            <IconeSeta className={`transition-transform duration-200 motion-reduce:transition-none ${aberto ? "" : "rotate-180"}`} />
          </button>
      </div>
      <p className={`mt-0.5 text-md font-semibold tabular-nums ${erro ? "text-erro" : ""}`} aria-hidden="true">
        {contagem}
      </p>
      <p className="sr-only" aria-live="polite">
        {anuncio}
      </p>

      <div id={idCorpo} hidden={!aberto}>
        <p className="mt-1 mb-3 text-[0.8rem] text-suave">Dinosaur fossils · 252–66 million years ago</p>
        {children}
      </div>
    </aside>
  );
}
