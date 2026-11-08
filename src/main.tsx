// Ponto de entrada: começa a baixar os dados já e monta o app React.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./estilos.css";
import { App } from "./App";
import { ErroGeral } from "./componentes/ErroGeral";
import { carregarDados } from "./dados";
import { temWebGL } from "./suporte";

// Em paralelo com o React e o estilo do mapa (o App pega a mesma promessa depois)
if (temWebGL) carregarDados().catch(() => {}); // o erro é mostrado pelo App

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <ErroGeral>
      <App />
    </ErroGeral>
  </StrictMode>
);
