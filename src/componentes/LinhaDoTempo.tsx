// Linha do tempo: histograma de fósseis, duas alças pro intervalo e atalhos de período.
// Também leva os créditos dos dados (fica sempre visível no rodapé).
import { useEffect, useRef, type Ref } from "react";
import { MA_FIM, MA_FOLGA, MA_INICIO, MA_SPAN, PERIODOS } from "../constantes";
import { fmtMa } from "../texto";
import { CARTAO, ROTULO } from "./classes";

interface Props {
  ref?: Ref<HTMLElement>;
  de: number;
  ate: number;
  caminho: string; // desenho do histograma (caminhoHistograma)
  paleoVisivel: boolean; // mostra o crédito dos continentes antigos
  // `arrastando`: a alça ainda está sendo arrastada (o app atualiza o mapa, mas não a URL)
  aoMudar: (de: number, ate: number, arrastando: boolean) => void;
  aoSoltar: () => void; // terminou de arrastar (ou de ajustar pelo teclado)
}

const ESCALA = [252, 201, 145, 66];
const iguais = (a: number, b: number) => Math.abs(a - b) < 0.05;

export function LinhaDoTempo({ ref, de, ate, caminho, paleoVisivel, aoMudar, aoSoltar }: Props) {
  const alcaDe = useRef<HTMLInputElement>(null);
  const alcaAte = useRef<HTMLInputElement>(null);
  // Posição das alças: 0 = 252 Ma (esquerda, mais antigo), 186 = 66 Ma
  const tDe = MA_INICIO - de;
  const tAte = MA_INICIO - ate;
  const tudo = de >= MA_INICIO && ate <= MA_FIM;

  // Soltar a alça (evento nativo "change"; o onChange do React dispara a cada movimento).
  // Só avisa que parou: os valores já chegaram pelo onChange.
  const aoSoltarRef = useRef(aoSoltar);
  useEffect(() => {
    aoSoltarRef.current = aoSoltar;
  });
  useEffect(() => {
    const soltar = () => aoSoltarRef.current();
    const alcas = [alcaDe.current!, alcaAte.current!];
    for (const a of alcas) a.addEventListener("change", soltar);
    return () => {
      for (const a of alcas) a.removeEventListener("change", soltar);
    };
  }, []);

  function todoOMesozoico() {
    aoMudar(MA_INICIO, MA_FIM, false);
    alcaDe.current?.focus(); // o botão some; o foco vai pra alça
  }

  return (
    <div className="pointer-events-none absolute right-4 bottom-[30px] left-4 flex justify-center max-sm:right-2 max-sm:left-2">
      <section
        ref={ref}
        aria-labelledby="lt-titulo"
        className={`${CARTAO} pointer-events-auto w-[min(720px,100%)] px-3.5 pt-2 pb-1.5 max-sm:px-2.5 max-sm:pt-1.5 max-sm:pb-1`}
      >
        <div className="flex min-h-[26px] items-baseline gap-2.5">
          <h2 id="lt-titulo" className={`${ROTULO} max-sm:sr-only`}>
            Time
          </h2>
          <output htmlFor="lt-de lt-ate" className="text-md font-semibold tabular-nums max-sm:text-sm">
            {fmtMa(de)} – {fmtMa(ate)} million years ago
          </output>
          <span className="text-xs text-suave max-sm:hidden" aria-hidden="true">
            · height = number of fossils
          </span>
          {!tudo && (
            <button
              type="button"
              onClick={todoOMesozoico}
              className="ml-auto min-h-[26px] rounded-md px-2 py-0.5 text-sm font-semibold text-destaque max-sm:px-1 max-sm:whitespace-nowrap"
            >
              Whole Mesozoic
            </button>
          )}
        </div>

        <div className="relative h-11">
          <svg
            viewBox={`0 0 ${MA_SPAN} 40`}
            preserveAspectRatio="none"
            aria-hidden="true"
            className="absolute top-0.5 left-[11px] h-[42px] w-[calc(100%-22px)]"
          >
            <path d={caminho} className="fill-histograma" />
            {/* Fora do intervalo escolhido fica esmaecido */}
            <rect x="0" y="0" width={tDe} height="40" className="fill-fundo opacity-72" />
            <rect x={tAte} y="0" width={MA_SPAN - tAte} height="40" className="fill-fundo opacity-72" />
          </svg>
          <input
            ref={alcaDe}
            id="lt-de"
            type="range"
            min="0"
            max={MA_SPAN}
            step="1"
            value={Math.round(tDe)}
            aria-label="Range start"
            aria-valuetext={`${fmtMa(de)} million years ago`}
            onChange={(e) => aoMudar(Math.max(MA_INICIO - +e.target.value, ate + MA_FOLGA), ate, true)}
            // Alças sobrepostas: a que está mais à direita fica por baixo, pra sempre dar pra pegar as duas
            style={{ zIndex: tDe > MA_SPAN / 2 ? 2 : 1 }}
            className="alca absolute inset-0 m-0 size-full"
          />
          <input
            ref={alcaAte}
            id="lt-ate"
            type="range"
            min="0"
            max={MA_SPAN}
            step="1"
            value={Math.round(tAte)}
            aria-label="Range end"
            aria-valuetext={`${fmtMa(ate)} million years ago`}
            onChange={(e) => aoMudar(de, Math.min(MA_INICIO - +e.target.value, de - MA_FOLGA), true)}
            className="alca absolute inset-0 m-0 size-full"
          />
        </div>

        <div className="relative mx-[11px] mt-0.5 h-3.5 text-2xs text-suave tabular-nums" aria-hidden="true">
          {ESCALA.map((ma, k) => (
            <span
              key={ma}
              style={{ left: `${((MA_INICIO - ma) / MA_SPAN) * 100}%` }}
              className={`absolute ${k === 0 ? "" : k === ESCALA.length - 1 ? "-translate-x-full" : "-translate-x-1/2"}`}
            >
              {ma}
            </span>
          ))}
        </div>

        <div className="mx-[11px] mt-[3px] flex gap-[3px]" role="group" aria-label="Period shortcuts">
          {PERIODOS.map((p) => (
            <button
              key={p.nome}
              type="button"
              aria-pressed={iguais(p.de, de) && iguais(p.ate, ate)}
              title={`${p.nome}: ${fmtMa(p.de)}–${fmtMa(p.ate)} million years ago`}
              onClick={() => aoMudar(p.de, p.ate, false)}
              style={{ flex: p.de - p.ate }}
              className="min-h-7 min-w-0 overflow-hidden rounded-[5px] bg-trilho px-1 py-0.5 text-sm text-ellipsis whitespace-nowrap text-texto hover:not-aria-pressed:bg-trilho-forte aria-pressed:bg-texto aria-pressed:font-semibold aria-pressed:text-contra"
            >
              {p.nome}
            </button>
          ))}
        </div>

        <Credito paleoVisivel={paleoVisivel} />
      </section>
    </div>
  );
}

function Link({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener">
      {children}
    </a>
  );
}

function Credito({ paleoVisivel }: { paleoVisivel: boolean }) {
  return (
    <footer className="mt-1.5 text-2xs text-suave">
      Data:{" "}
      <a href="https://paleobiodb.org" target="_blank" rel="noopener">
        Paleobiology Database<span className="sr-only"> (opens in a new tab)</span>
      </a>
      , <Link href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</Link>
      {paleoVisivel && (
        <span>
          {" "}
          · Ancient continents: <Link href="https://doi.org/10.5281/zenodo.10596609">PALEOMAP (Scotese 2016)</Link> via{" "}
          <Link href="https://gplates.org">GPlates</Link>, CC BY 4.0
        </span>
      )}
    </footer>
  );
}
