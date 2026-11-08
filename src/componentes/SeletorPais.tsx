// Seletor de país, com quantos fósseis cada um tem nos filtros atuais
import { useId } from "react";
import { fmt } from "../texto";
import type { Pais } from "../tipos";
import { CAMPO, ROTULO } from "./classes";

interface Props {
  paises: Pais[];
  porPais: Uint32Array | null;
  valor: string;
  aoEscolher: (cc: string) => void;
}

export function SeletorPais({ paises, porPais, valor, aoEscolher }: Props) {
  const id = useId();
  const n = (v: number) => (porPais ? ` (${fmt(v)})` : "");
  const total = porPais ? porPais.reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="border-t border-borda pt-2.5 pb-3">
      <label className={`${ROTULO} mb-1.5`} htmlFor={id}>
        Country
      </label>
      <select id={id} value={valor} onChange={(e) => aoEscolher(e.target.value)} className={`${CAMPO} min-h-[34px] px-2 py-1`}>
        <option value="">{`All countries${n(total)}`}</option>
        {/* "Sem país" não tem código pra filtrar; fica de fora */}
        {paises
          .filter((p) => p.cc)
          .map((p) => (
            <option key={p.cc} value={p.cc}>
              {`${p.nome}${n(porPais?.[p.idx] ?? 0)}`}
            </option>
          ))}
      </select>
    </div>
  );
}
