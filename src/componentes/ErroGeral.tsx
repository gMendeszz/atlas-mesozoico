// Se algo quebrar ao desenhar a interface, mostra uma mensagem em vez de uma tela vazia.
// (O React só captura erros assim com um componente de classe.)
import { Component, type ReactNode } from "react";
import { CARTAO } from "./classes";

export class ErroGeral extends Component<{ children: ReactNode }, { erro: boolean }> {
  state = { erro: false };

  static getDerivedStateFromError() {
    return { erro: true };
  }

  componentDidCatch(erro: unknown) {
    console.error(erro);
  }

  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <div role="alert" className={`${CARTAO} absolute top-4 left-4 max-w-[calc(100%-32px)] px-4 py-3.5`}>
        <h1 className="text-xl font-bold">Atlas Mesozoico</h1>
        <p className="mt-1 text-md font-semibold text-erro">Algo deu errado ao montar o mapa. Recarregue a página.</p>
      </div>
    );
  }
}
