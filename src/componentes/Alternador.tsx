// Botões de escolha única lado a lado (Mapa/Globo, Atuais/Antigos), com aria-pressed

interface Props<T extends string> {
  rotulo: string; // nome do grupo pra leitores de tela
  opcoes: { valor: T; texto: string }[];
  valor: T;
  aoEscolher: (valor: T) => void;
  rotuloVisivel?: string; // id de um rótulo visível já na tela (em vez de aria-label)
}

export function Alternador<T extends string>({ rotulo, opcoes, valor, aoEscolher, rotuloVisivel }: Props<T>) {
  return (
    <div
      role="group"
      aria-label={rotuloVisivel ? undefined : rotulo}
      aria-labelledby={rotuloVisivel}
      className="mb-2 grid grid-cols-2 rounded-lg bg-trilho p-[3px]"
    >
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          aria-pressed={o.valor === valor}
          onClick={() => o.valor !== valor && aoEscolher(o.valor)}
          className="min-h-8 rounded-md text-md text-texto aria-pressed:bg-superficie aria-pressed:font-semibold aria-pressed:shadow-botao"
        >
          {o.texto}
        </button>
      ))}
    </div>
  );
}
