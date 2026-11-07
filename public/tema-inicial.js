// Define o tema antes de a página aparecer (evita piscar o tema claro em quem usa o escuro).
// Arquivo separado, e não <script> embutido, porque a CSP só aceita scripts do próprio site.
// Mesma regra de src/tema.js: a escolha salva vale; sem escolha, segue o sistema.
(function () {
  var salvo = null;
  try {
    salvo = localStorage.getItem("atlas:tema");
  } catch (e) {
    /* modo privado ou cookies bloqueados: segue o sistema */
  }
  var escuro = salvo ? salvo === "escuro" : matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.tema = escuro ? "escuro" : "claro";
})();
