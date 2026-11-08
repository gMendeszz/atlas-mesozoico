// Preferências do visitante guardadas no navegador: mapa/globo e tema claro/escuro.
// localStorage pode não existir ou falhar (modo privado, cookies bloqueados): nunca quebra o app.

export function lerPreferencia(chave: string): string | null {
  try {
    return localStorage.getItem("atlas:" + chave);
  } catch {
    return null;
  }
}

export function salvarPreferencia(chave: string, valor: string): void {
  try {
    localStorage.setItem("atlas:" + chave, valor);
  } catch {
    /* sem problema: só não lembra na próxima visita */
  }
}

export function apagarPreferencia(chave: string): void {
  try {
    localStorage.removeItem("atlas:" + chave);
  } catch {
    /* idem */
  }
}
