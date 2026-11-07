// Preferências do visitante guardadas no navegador: mapa/globo e tema claro/escuro.
// localStorage pode não existir ou falhar (modo privado, cookies bloqueados): nunca quebra o app.

export function lerPreferencia(chave) {
  try {
    return localStorage.getItem("atlas:" + chave);
  } catch {
    return null;
  }
}

export function salvarPreferencia(chave, valor) {
  try {
    localStorage.setItem("atlas:" + chave, valor);
  } catch {
    /* sem problema: só não lembra na próxima visita */
  }
}

export function apagarPreferencia(chave) {
  try {
    localStorage.removeItem("atlas:" + chave);
  } catch {
    /* idem */
  }
}
