import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

// Onde o site fica no domínio: "/" (domínio próprio ou usuario.github.io) ou a subpasta do
// repositório (ex.: SITE_BASE=/atlas-mesozoico/ npm run build, pra usuario.github.io/atlas-mesozoico/).
// O app em si usa caminhos relativos e não depende disso; só a página 404 precisa, porque ela
// aparece em qualquer endereço inexistente, em qualquer profundidade.
const SITE_BASE = (process.env.SITE_BASE ?? "/").replace(/\/?$/, "/");
// No Git Bash do Windows, "/atlas-mesozoico" vira "C:/Program Files/Git/atlas-mesozoico" sozinho
if (!/^\/[\w\-/]*$/.test(SITE_BASE)) {
  throw new Error(`SITE_BASE inválido: "${SITE_BASE}". Use algo como /atlas-mesozoico/ (no Git Bash: MSYS_NO_PATHCONV=1).`);
}

// Política de Segurança de Conteúdo: o navegador só aceita scripts deste site e só conversa
// com este site e com o servidor do mapa base. Se algum dia entrar código injetado, ele não
// roda nem consegue mandar dados pra fora.
// Vai como <meta> porque o GitHub Pages não deixa configurar cabeçalhos HTTP.
// Só na build: o modo de desenvolvimento do Vite usa scripts embutidos que ela bloquearia.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  // 'unsafe-inline' só pra estilos: o MapLibre e as cores da legenda usam style="..."
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  // Mapa base: estilo, tiles, fontes e ícones vêm todos de tiles.openfreemap.org
  "connect-src 'self' https://tiles.openfreemap.org",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "upgrade-insecure-requests",
].join("; ");

export default defineConfig({
  // Caminhos relativos: funciona tanto em domínio próprio quanto em usuario.github.io/repositorio/
  base: "./",
  test: {
    include: ["tests/**/*.test.js"],
    environment: "node", // só lógica pura: nada de navegador falso
  },
  plugins: [
    {
      name: "csp-na-build",
      apply: "build",
      transformIndexHtml: () => [
        { tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: CSP }, injectTo: "head-prepend" },
      ],
    },
    {
      // public/404.html é copiada sem passar pelo Vite: aqui os caminhos "/..." dela ganham a subpasta
      name: "404-na-subpasta",
      apply: "build",
      closeBundle() {
        if (SITE_BASE === "/") return;
        const arquivo = resolve("dist/404.html");
        const html = readFileSync(arquivo, "utf8").replace(/(href="|src="|url\(")\/(?!\/)/g, `$1${SITE_BASE}`);
        writeFileSync(arquivo, html);
      },
    },
  ],
});
