import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Endereço público do site. Daqui saem os links absolutos (prévia ao compartilhar, sitemap,
// robots.txt) e a subpasta usada pela página 404. Outro endereço (ex.: domínio próprio):
//   SITE_URL=https://meusite.com/ npm run build
const SITE_URL = new URL(process.env.SITE_URL ?? "https://gmendeszz.github.io/atlas-mesozoico/").href.replace(/\/?$/, "/");
// Subpasta ("/atlas-mesozoico/" ou "/"). O app em si usa caminhos relativos e não depende disso;
// só a página 404 precisa, porque ela aparece em qualquer endereço inexistente, em qualquer profundidade.
const SITE_BASE = new URL(SITE_URL).pathname;

// Política de Segurança de Conteúdo: o navegador só aceita scripts deste site e só conversa
// com este site e com o servidor do mapa base. Se algum dia entrar código injetado, ele não
// roda nem consegue mandar dados pra fora.
// Vai como <meta> porque o GitHub Pages não deixa configurar cabeçalhos HTTP.
// Só na build: o modo de desenvolvimento do Vite usa scripts embutidos que ela bloquearia.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  // 'unsafe-inline' só pra estilos: o MapLibre, o React (style={...}) e as cores da legenda usam style="..."
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
  build: {
    rollupOptions: {
      // Bibliotecas em arquivos próprios: mudam raramente, então ficam no cache do navegador
      // quando só o código do atlas muda
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/maplibre-gl/")) return "maplibre";
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "react";
        },
      },
    },
    chunkSizeWarningLimit: 1100, // o MapLibre sozinho tem ~1 MB (~280 KB comprimido)
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node", // só lógica pura: nada de navegador falso
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "csp-na-build",
      apply: "build",
      transformIndexHtml: () => [
        { tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: CSP }, injectTo: "head-prepend" },
      ],
    },
    {
      // Links absolutos no index.html (Open Graph e canonical exigem endereço completo)
      name: "endereco-do-site",
      transformIndexHtml: (html) => html.replaceAll("%SITE_URL%", SITE_URL),
    },
    {
      // robots.txt e sitemap.xml, que também precisam do endereço completo
      name: "robots-e-sitemap",
      apply: "build",
      generateBundle() {
        const robots = ["User-agent: *", "Allow: /", "", `Sitemap: ${SITE_URL}sitemap.xml`, ""].join("\n");
        this.emitFile({ type: "asset", fileName: "robots.txt", source: robots });
        this.emitFile({
          type: "asset",
          fileName: "sitemap.xml",
          source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_URL}</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>
</urlset>
`,
        });
      },
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
