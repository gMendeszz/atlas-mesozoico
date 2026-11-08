// Tema claro/escuro. Sem escolha salva, segue o sistema (e acompanha se ele mudar).
// Escolher o mesmo tema do sistema apaga a escolha: volta a seguir o sistema.
// O tema inicial já vem posto no <html> por public/tema-inicial.js (antes de a página aparecer).
import { useCallback, useEffect, useState } from "react";
import { apagarPreferencia, lerPreferencia, salvarPreferencia } from "../preferencias";
import type { Tema } from "../tipos";

const sistemaEscuro = matchMedia("(prefers-color-scheme: dark)");
const COR_DA_BARRA: Record<Tema, string> = { claro: "#fbf8f2", escuro: "#1d1a16" }; // barra do navegador no celular

const temaDoSistema = (): Tema => (sistemaEscuro.matches ? "escuro" : "claro");
function temaEscolhido(): Tema {
  const salvo = lerPreferencia("tema");
  return salvo === "claro" || salvo === "escuro" ? salvo : temaDoSistema();
}

export function useTema(): [Tema, () => void] {
  const [tema, setTema] = useState<Tema>(() =>
    document.documentElement.dataset.tema === "escuro" ? "escuro" : "claro"
  );

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!.content = COR_DA_BARRA[tema];
  }, [tema]);

  useEffect(() => {
    const aoMudarSistema = () => setTema(temaEscolhido());
    sistemaEscuro.addEventListener("change", aoMudarSistema);
    return () => sistemaEscuro.removeEventListener("change", aoMudarSistema);
  }, []);

  const alternar = useCallback(() => {
    const novo: Tema = tema === "escuro" ? "claro" : "escuro";
    if (novo === temaDoSistema()) apagarPreferencia("tema");
    else salvarPreferencia("tema", novo);
    setTema(novo);
  }, [tema]);

  return [tema, alternar];
}
