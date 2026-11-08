// Botões de ícone no canto direito, embaixo do zoom do MapLibre: mapa/globo, rotação e tema.
// São controles do mapa (não filtros dos dados), por isso ficam junto dele e não no painel.
import type { ReactNode } from "react";
import type { Tema, Vista } from "../tipos";
import { IconeGirar, IconeGlobo, IconeLua, IconeMapaPlano, IconePausa, IconeSol } from "./Icones";

interface Props {
  vista: Vista;
  aoTrocarVista: () => void;
  girando: boolean;
  aoAlternarGiro: () => void;
  tema: Tema;
  aoAlternarTema: () => void;
}

// Mesmo tamanho e cantos dos botões de zoom do MapLibre (29 px), pra parecerem da mesma família
function Botao({ rotulo, children, ...props }: { rotulo: string; children: ReactNode; onClick: () => void; "aria-pressed"?: boolean }) {
  return (
    <button
      type="button"
      title={rotulo}
      className="grid size-[29px] place-items-center text-texto not-last:border-b not-last:border-borda hover:bg-trilho focus-visible:relative"
      {...props}
    >
      <span className="sr-only">{rotulo}</span>
      {children}
    </button>
  );
}

export function ControlesDoMapa({ vista, aoTrocarVista, girando, aoAlternarGiro, tema, aoAlternarTema }: Props) {
  const globo = vista === "globe";
  return (
    <div
      role="group"
      aria-label="Controles do mapa"
      // Mesmo fundo do zoom do MapLibre: branco no claro, o fundo do tema no escuro (ver estilos.css)
      // top: abaixo do zoom (10 px de margem + 2 botões de 29 px + 10 px de espaço)
      className="absolute top-[78px] right-[10px] flex flex-col overflow-hidden rounded bg-superficie escuro:bg-fundo shadow-[0_0_0_2px_rgb(0_0_0/0.1)]"
    >
      {/* Mostra o ícone do destino: no globo, o mapa plano; no plano, o globo */}
      <Botao rotulo={globo ? "Ver como mapa plano" : "Ver como globo"} onClick={aoTrocarVista}>
        {globo ? <IconeMapaPlano /> : <IconeGlobo />}
      </Botao>
      {globo && (
        <Botao rotulo={girando ? "Pausar rotação" : "Girar globo"} onClick={aoAlternarGiro}>
          {girando ? <IconePausa /> : <IconeGirar />}
        </Botao>
      )}
      <Botao rotulo="Tema escuro" aria-pressed={tema === "escuro"} onClick={aoAlternarTema}>
        {tema === "escuro" ? <IconeSol /> : <IconeLua />}
      </Botao>
    </div>
  );
}
