// Lista de caixas de marcar com a contagem de cada opção (grupo, tipo de fóssil, dieta).
// Nos grupos, a bolinha de cor faz da lista também a legenda do mapa.
import type { CSSProperties, ReactNode } from "react";
import type { Grupo, Opcao } from "../constantes";
import { fmt } from "../texto";
import { ROTULO } from "./classes";

interface Props {
  id: string; // prefixo dos ids das caixas (`${id}-0`, `${id}-1`...)
  legenda: string;
  opcoes: (Opcao | Grupo)[];
  marcados: boolean[];
  contagens: number[] | null; // null enquanto os dados carregam
  aoMudar: (i: number, marcado: boolean) => void;
  children?: ReactNode; // notas abaixo da lista
}

const temCor = (o: Opcao | Grupo): o is Grupo => "cor" in o;

export function ListaDeOpcoes({ id, legenda, opcoes, marcados, contagens, aoMudar, children }: Props) {
  return (
    <fieldset className="mt-3.5 min-w-0">
      <legend className={`${ROTULO} mb-1.5`}>{legenda}</legend>
      <div className="grid gap-0.5">
        {opcoes.map((o, i) => (
          <label
            key={o.chave}
            className={`flex min-h-[30px] cursor-pointer items-center gap-2 text-md ${contagens?.[i] === 0 ? "opacity-55" : ""}`}
          >
            <input
              id={`${id}-${i}`}
              type="checkbox"
              checked={marcados[i]}
              onChange={(e) => aoMudar(i, e.target.checked)}
              className="m-0 size-4 accent-texto"
            />
            {temCor(o) && (
              <span className="bola" style={{ "--cor": o.cor, "--cor-escura": o.corEscura } as CSSProperties} aria-hidden="true" />
            )}
            {o.nome}
            <span className="ml-auto text-suave tabular-nums">{contagens ? fmt(contagens[i]) : ""}</span>
          </label>
        ))}
      </div>
      {children}
    </fieldset>
  );
}
