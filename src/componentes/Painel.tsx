// Painel lateral: título, botões de tema e de recolher, a contagem e os controles.
import { useId, useState, type ReactNode, type Ref } from "react";
import { BOTAO_ICONE, CARTAO } from "./classes";
import { IconeLua, IconeSeta, IconeSol } from "./Icones";
import type { Tema } from "../tipos";

interface Props {
  ref?: Ref<HTMLElement>;
  tema: Tema;
  aoAlternarTema: () => void;
  contagem: string;
  erro: boolean; // a contagem é uma mensagem de erro
  children: ReactNode;
}

// No celular o painel começa recolhido pra não cobrir o mapa
const comecaAberto = () => !matchMedia("(max-width: 600px)").matches;

export function Painel({ ref, tema, aoAlternarTema, contagem, erro, children }: Props) {
  const [aberto, setAberto] = useState(comecaAberto);
  const idCorpo = useId();
  const escuro = tema === "escuro";

  return (
    <aside
      ref={ref}
      aria-label="Controles do mapa"
      className={`${CARTAO} absolute top-4 left-4 w-[280px] max-w-[calc(100%-32px)] max-h-[calc(100dvh-226px)] overflow-y-auto overscroll-contain px-4 pt-3.5 pb-4
        max-sm:top-2.5 max-sm:left-2.5 max-sm:right-14 max-sm:w-auto max-sm:max-w-none max-sm:max-h-[calc(100dvh-220px)]`}
    >
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-[-0.01em]">Atlas Mesozoico</h1>
        <div className="flex flex-none gap-1.5">
          <button type="button" className={BOTAO_ICONE} aria-pressed={escuro} title="Tema escuro" onClick={aoAlternarTema}>
            <span className="sr-only">Tema escuro</span>
            {/* A lua no claro (vai pro escuro); o sol no escuro (vai pro claro) */}
            {escuro ? <IconeSol /> : <IconeLua />}
          </button>
          <button type="button" className={BOTAO_ICONE} aria-expanded={aberto} aria-controls={idCorpo} onClick={() => setAberto(!aberto)}>
            <span className="sr-only">{aberto ? "Recolher painel" : "Expandir painel"}</span>
            <IconeSeta className={`transition-transform duration-200 motion-reduce:transition-none ${aberto ? "" : "rotate-180"}`} />
          </button>
        </div>
      </div>
      <p className={`mt-0.5 text-md font-semibold tabular-nums ${erro ? "text-erro" : ""}`} aria-live="polite">
        {contagem}
      </p>

      <div id={idCorpo} hidden={!aberto}>
        <p className="mt-1 mb-3 text-[0.8rem] text-suave">Fósseis de dinossauros · 252–66 milhões de anos</p>
        {children}
      </div>
    </aside>
  );
}
