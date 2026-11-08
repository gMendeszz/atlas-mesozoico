// Lista de caixas de marcar com a contagem de cada opção (grupo, tipo de fóssil, dieta).
// Nos grupos, a bolinha de cor faz da lista também a legenda do mapa (fica sempre aberta).
// As outras podem ser recolhíveis, mostrando um resumo ao lado do título ("Todos", "2 de 5").
import { useState, type CSSProperties, type ReactNode } from "react";
import type { Grupo, Opcao } from "../constantes";
import { fmt } from "../texto";
import { ROTULO } from "./classes";
import { IconeChevron } from "./Icones";

type Genero = "masculino" | "feminino";

interface Props {
  id: string; // prefixo dos ids das caixas (`${id}-0`, `${id}-1`...)
  legenda: string;
  opcoes: (Opcao | Grupo)[];
  marcados: boolean[];
  contagens: number[] | null; // null enquanto os dados carregam
  aoMudar: (i: number, marcado: boolean) => void;
  recolhivel?: Genero; // recolhível; o gênero é o do resumo ("Todos"/"Todas")
  children?: ReactNode; // notas abaixo da lista
}

const temCor = (o: Opcao | Grupo): o is Grupo => "cor" in o;

function resumo(marcados: boolean[], genero: Genero): string {
  const n = marcados.filter(Boolean).length;
  if (n === marcados.length) return genero === "masculino" ? "Todos" : "Todas";
  if (n === 0) return genero === "masculino" ? "Nenhum" : "Nenhuma";
  return `${n} de ${marcados.length}`;
}

export function ListaDeOpcoes({ id, legenda, opcoes, marcados, contagens, aoMudar, recolhivel, children }: Props) {
  // Começa aberta se já vier com filtro (link compartilhado), pra mostrar o que está ativo
  const [aberta, setAberta] = useState(() => !marcados.every(Boolean));
  const tudo = marcados.every(Boolean);

  const lista = (
    <fieldset className="min-w-0">
      <legend className={recolhivel ? "sr-only" : `${ROTULO} mb-1.5`}>{legenda}</legend>
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
              className="m-0 size-4 flex-none accent-texto"
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

  if (!recolhivel) return <div className="mt-3.5 mb-3">{lista}</div>;

  return (
    <details open={aberta} onToggle={(e) => setAberta(e.currentTarget.open)} className="group border-t border-borda">
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
        <IconeChevron className="flex-none text-suave transition-transform duration-150 group-open:rotate-90 motion-reduce:transition-none" />
        <span className={ROTULO}>{legenda}</span>
        {/* Com filtro ativo, o resumo fica em destaque: dá pra ver o filtro mesmo com a seção fechada */}
        <span className={`ml-auto text-sm ${tudo ? "text-suave" : "font-semibold text-destaque"}`}>{resumo(marcados, recolhivel)}</span>
      </summary>
      <div className="pb-2.5">{lista}</div>
    </details>
  );
}
