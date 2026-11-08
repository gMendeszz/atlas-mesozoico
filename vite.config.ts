import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The site's public address. The absolute links (link preview, sitemap, robots.txt) and the
// subfolder used by the 404 page come from here. Another address (e.g. a custom domain):
//   SITE_URL=https://example.com/ npm run build
const SITE_URL = new URL(process.env.SITE_URL ?? "https://gmendeszz.github.io/atlas-mesozoico/").href.replace(/\/?$/, "/");
// Subfolder ("/atlas-mesozoico/" or "/"). The app itself uses relative paths and doesn't depend on
// it; only the 404 page needs it, because it shows up at any nonexistent address, at any depth.
const SITE_BASE = new URL(SITE_URL).pathname;

// Content Security Policy: the browser only accepts this site's scripts and only talks to this
// site and to the base-map server. If injected code ever got in, it wouldn't run or be able to
// send data out.
// It goes in as a <meta> because GitHub Pages doesn't allow setting HTTP headers.
// Build only: Vite's dev mode uses inline scripts it would block.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  // 'unsafe-inline' for styles only: MapLibre, React (style={...}) and the legend colors use style="..."
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  // Base map: style, tiles, fonts and icons all come from tiles.openfreemap.org
  "connect-src 'self' https://tiles.openfreemap.org",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "upgrade-insecure-requests",
].join("; ");

// License texts of every library that ships inside the site (the runtime dependencies and all
// of theirs). Their licenses (MIT, ISC, BSD) require the notice to go along with the code; the
// minified bundle drops most of them, so they're collected here into third-party-licenses.txt.
function thirdPartyLicenses(): string {
  const seen = new Map<string, string>(); // name -> text
  const visit = (name: string) => {
    if (seen.has(name)) return;
    const dir = resolve("node_modules", name);
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    if (name.startsWith("@types/")) return; // type definitions: not part of the bundle
    const file = readdirSync(dir).find((f) => /^(licen[cs]e|copying)(\.(md|txt))?$/i.test(f));
    // Some packages keep the license in a "## License" section of the README instead of a file
    const readme = readdirSync(dir).find((f) => /^readme(\.md)?$/i.test(f));
    const fromReadme = readme && /^#+ *Licen[cs]e[^\n]*\n([\s\S]*?)(?=\n#+ |(?![\s\S]))/im.exec(readFileSync(join(dir, readme), "utf8"));
    const text = file
      ? readFileSync(join(dir, file), "utf8").trim()
      : fromReadme
        ? fromReadme[1].trim()
        : `License: ${pkg.license} (no license text in the package)`;
    seen.set(name, `${pkg.name} ${pkg.version} — ${pkg.license}\n${pkg.homepage ?? ""}\n\n${text}`);
    for (const dep of Object.keys(pkg.dependencies ?? {})) if (existsSync(resolve("node_modules", dep))) visit(dep);
  };
  const root = JSON.parse(readFileSync("package.json", "utf8"));
  for (const dep of Object.keys(root.dependencies)) visit(dep);
  const header = "Open-source libraries used by the Mesozoic Atlas, with their licenses.\n";
  return [header, ...[...seen.keys()].sort().map((k) => seen.get(k))].join(`\n\n${"=".repeat(72)}\n\n`) + "\n";
}

export default defineConfig({
  // Relative paths: works both on a custom domain and on user.github.io/repository/
  base: "./",
  build: {
    rollupOptions: {
      // Libraries in their own files: they rarely change, so they stay in the browser cache
      // when only the atlas code changes
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/maplibre-gl/")) return "maplibre";
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "react";
        },
      },
    },
    chunkSizeWarningLimit: 1100, // MapLibre alone is ~1 MB (~280 KB compressed)
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node", // pure logic only: no fake browser
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "csp-in-build",
      apply: "build",
      transformIndexHtml: () => [
        { tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: CSP }, injectTo: "head-prepend" },
      ],
    },
    {
      // Absolute links in index.html (Open Graph and canonical require a full address)
      name: "site-url",
      transformIndexHtml: (html) => html.replaceAll("%SITE_URL%", SITE_URL),
    },
    {
      // robots.txt and sitemap.xml (which also need the full address) and the third-party licenses
      name: "robots-sitemap-licenses",
      // In development, the licenses page is served on the fly (the link in About works there too)
      configureServer(server) {
        server.middlewares.use("/third-party-licenses.txt", (_req, res) => {
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end(thirdPartyLicenses());
        });
      },
      generateBundle() {
        this.emitFile({ type: "asset", fileName: "third-party-licenses.txt", source: thirdPartyLicenses() });
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
      // public/404.html is copied without going through Vite: here its "/..." paths get the subfolder
      name: "404-in-subfolder",
      apply: "build",
      closeBundle() {
        if (SITE_BASE === "/") return;
        const file = resolve("dist/404.html");
        const html = readFileSync(file, "utf8").replace(/(href="|src="|url\(")\/(?!\/)/g, `$1${SITE_BASE}`);
        writeFileSync(file, html);
      },
    },
  ],
});
