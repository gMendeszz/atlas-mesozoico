// Campo de busca por dinossauro ou formação, com sugestões e o resumo do resultado.
// O campo não é controlado pelo React: a busca acontece no evento nativo "change" (ao escolher
// uma sugestão ou apertar Enter), não a cada letra digitada.
import { memo, useEffect, useId, useRef, useState } from "react";
import { CAMPO, ROTULO } from "./classes";

interface Props {
  sugestoes: string[];
  info: string; // resumo do resultado (lido por leitores de tela)
  aoBuscar: (texto: string) => void;
}

export function Busca({ sugestoes, info, aoBuscar }: Props) {
  const campo = useRef<HTMLInputElement>(null);
  const [temTexto, setTemTexto] = useState(false);
  const id = useId();
  const aoBuscarRef = useRef(aoBuscar);
  useEffect(() => {
    aoBuscarRef.current = aoBuscar;
  });

  // O onChange do React é o evento "input" (a cada tecla); aqui precisamos do "change" de verdade
  useEffect(() => {
    const el = campo.current!;
    const aoMudar = () => aoBuscarRef.current(el.value);
    el.addEventListener("change", aoMudar);
    return () => el.removeEventListener("change", aoMudar);
  }, []);

  function limpar() {
    const el = campo.current!;
    el.value = "";
    setTemTexto(false);
    aoBuscar("");
    el.focus();
  }

  return (
    <div className="mb-3">
      <label className={`${ROTULO} mb-1`} htmlFor={`${id}-campo`}>
        Search dinosaur or formation
      </label>
      <div className="relative">
        <input
          ref={campo}
          id={`${id}-campo`}
          type="search"
          list={`${id}-nomes`}
          autoComplete="off"
          spellCheck={false}
          placeholder="e.g. Tyrannosaurus, Morrison"
          aria-describedby={`${id}-info`}
          onInput={(e) => {
            const vazio = !e.currentTarget.value;
            setTemTexto(!vazio);
            if (vazio) aoBuscar(""); // apagou tudo
          }}
          className={`${CAMPO} min-h-9 py-1.5 pr-[34px] pl-2.5 placeholder:text-placeholder`}
        />
        {temTexto && (
          <button
            type="button"
            onClick={limpar}
            className="absolute top-1/2 right-1 size-7 -translate-y-1/2 rounded text-[1.1rem] leading-none text-suave"
          >
            <span aria-hidden="true">×</span>
            <span className="sr-only">Clear search</span>
          </button>
        )}
      </div>
      <Sugestoes id={`${id}-nomes`} nomes={sugestoes} />
      <p id={`${id}-info`} aria-live="polite" className="mt-1 text-xs leading-[1.4] text-suave empty:hidden">
        {info}
      </p>
    </div>
  );
}

// Milhares de sugestões: memo evita redesenhar a lista toda a cada busca
const Sugestoes = memo(function Sugestoes({ id, nomes }: { id: string; nomes: string[] }) {
  return (
    <datalist id={id}>
      {nomes.map((n) => (
        <option key={n} value={n} />
      ))}
    </datalist>
  );
});
