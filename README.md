# Atlas Mesozoico

Mapa interativo de ocorrências fósseis de dinossauros (252–66 milhões de anos).

**Tecnologias:** React 19 + TypeScript + Tailwind CSS 4, com Vite; mapa em MapLibre GL JS (globo e
mapa plano). Dados preparados por scripts em Python (só biblioteca padrão). Site estático, sem
servidor: tudo roda no navegador.

## Rodar localmente

```bash
npm install
npm run dev
```

Abre em http://localhost:5173

## Publicar

```bash
npm run build                                # domínio próprio ou usuario.github.io
SITE_BASE=/atlas-mesozoico/ npm run build    # usuario.github.io/atlas-mesozoico/
```

O app funciona em qualquer endereço (caminhos relativos); `SITE_BASE` só ajusta os caminhos da
página 404, que aparece em qualquer endereço inexistente. No Git Bash do Windows, use
`MSYS_NO_PATHCONV=1` antes, senão ele troca `/atlas-mesozoico/` por um caminho do Windows.

## Atualizar os dados

Precisa de Python 3 (só biblioteca padrão, sem pip):

```bash
python scripts/baixar_dados.py            # usa o cache em data/raw/ se existir
python scripts/baixar_dados.py --refresh  # baixa tudo de novo do PBDB
```

Gera `public/data/dinos.json` (formato compacto: uma tabela de locais e uma de fósseis, com dicionários pros textos; detalhes no topo do script). O script faz 4 requisições (Dinosauria + IDs de
Theropoda, Sauropodomorpha e Ornithischia, pra classificar o grupo), com pausa entre elas.

Depois, os continentes antigos (usa a lista de locais do passo anterior):

```bash
python scripts/baixar_paleo.py            # usa o cache em data/raw/paleo/ se existir
python scripts/baixar_paleo.py --refresh  # baixa tudo de novo do GPlates
```

Pra cada época de 70 a 250 milhões de anos (de 10 em 10), pede ao GPlates Web Service os
contornos dos continentes e a posição antiga de cada local, no modelo PALEOMAP. São 38
requisições, com pausa entre elas.

## Qualidade dos dados

Conferência feita em 2026-11-04 (dados brutos × JSON, coordenadas × contornos de países do
Natural Earth, posições antigas × paleocoordenadas do próprio PBDB, contagens do app × cálculo
independente). Ajustes aplicados em `scripts/baixar_dados.py`, cada um com o motivo no código:

- **1 coordenada corrigida** (Titem Suwraga, Mongólia): longitude cadastrada como oeste; o
  próprio texto do PBDB traz a coordenada certa (102° E).
- **4 locais excluídos** (Uzbequistão, Colômbia, Irã, Canadá): coordenadas sem relação com o
  lugar descrito e sem dado pra corrigir.
- **15 fósseis reclassificados como terópodes**: o PBDB tem um segundo táxon "Megalosauridae"
  (nº 358782) ligado direto a Dinosauria. Regra geral: fóssil sem grupo herda o grupo da sua
  família, quando a família pertence a um grupo só.
- **"Outros"** (antes "Indeterminado"): reúne fósseis identificados só como dinossauro, grupos
  fora dos três principais (ex.: herrerassaurídeos, como o *Staurikosaurus*) e ovos/pegadas.
- Códigos de oceano do PBDB (O1–O7, ex.: O2 = Atlântico Norte) aparecem com nome.
- **Pegadas e ovos** (conferência de 2026-11-06): vêm das marcas do PBDB ("I" = icnofóssil,
  "F" = ovo). 3 gêneros com marca errada foram corrigidos: *Jialingpus* e *Metatetrapous* são
  pegadas sem a marca "I"; *Shri rapax* é esqueleto, não ovo.
- **Dieta** é a do táxon no PBDB (inferida pelo grupo, não observada em cada fóssil), resumida
  em carnívoros, herbívoros, onívoros (qualquer combinação com "omnivore") e piscívoros; 10% sem
  dado ficam como "sem informação". **Autor e ano** só aparecem pra gênero e espécie, e não em
  identificações incertas. **Formação**: aspas removidas e "?" do PBDB vira "(?)".
- **Identificações incertas** (~11%: "cf.", "?", "aff.") aparecem com o texto original da
  publicação e uma marca "identificação incerta", em vez do nome aceito sozinho.

Limitações conhecidas: ~1% dos locais tem coordenada até ~120 km do lado errado de uma
fronteira (precisão do registro original); o PBDB usa uma versão mais nova do modelo do
Scotese (2021) que o GPlates (PALEOMAP 2016) — a diferença mediana entre as duas posições é
de 0,7°, chegando a ~15° em casos raros (ex.: Grã-Bretanha no Triássico).

## Tema escuro

Segue o tema do sistema; o botão de sol/lua no painel troca e a escolha fica salva (escolher o
mesmo tema do sistema volta a seguir o sistema). Trocar o tema troca o mapa base (OpenFreeMap
`positron` ↔ `dark`, este com tons ajustados em `src/mapa.ts`) e leva junto pontos, busca e
continentes antigos. As cores dos grupos têm uma versão pra cada tema, conferidas com simulação
de daltonismo e contraste mínimo de 3:1 com o mapa; textos têm contraste de 4,5:1 ou mais.

## Segurança e privacidade

- **CSP** (Content-Security-Policy) na build, via `vite.config.js`: só scripts do próprio site;
  conexões só com o site e com `tiles.openfreemap.org`. Testado: bloqueia script externo e envio
  de dados pra outro servidor.
- Textos vindos dos dados: o React escapa sozinho; os popups do mapa (HTML montado fora do React)
  passam por `esc()` em `src/texto.ts`. Nenhum `dangerouslySetInnerHTML`.
- 3 dependências no site (`maplibre-gl`, `react`, `react-dom`); as de desenvolvimento são Vite,
  Vitest, TypeScript, Tailwind e os plugins oficiais. Versões exatas no `package.json` e travadas
  no `package-lock.json`; instaladas só versões com pelo menos 2 semanas de publicadas.
  `npm audit` sem vulnerabilidades em 2026-11-07. Scripts Python só usam a biblioteca padrão.
- Sem cookies, analytics ou rastreamento. `localStorage` guarda só as preferências mapa/globo e tema claro/escuro.
  O mapa base (OpenFreeMap) recebe o IP de quem acessa, como qualquer servidor.
- Erros de rede, mapa base fora do ar e navegador sem WebGL 2 mostram mensagem em vez de tela vazia.

## Testes

```bash
npm test                                          # site: lógica, segurança e arquivos de dados
npm run typecheck                                 # tipos do TypeScript (a build também confere)
python -m unittest discover -s tests -p "test_*.py"   # scripts Python
```

Os testes cobrem regras que, se quebrarem, mostram dado errado ou abrem falha: filtro de tempo
por sobreposição de faixas, contagens de cada opção, histograma (inclusive faixas que passam do
Mesozoico), enquadramento na linha de data, escape de HTML, identificações incertas, filtros
vindos da URL e a busca. `tests/dados-publicados.test.js` confere os arquivos **reais** de
`public/data` (rode `npm run test:dados` depois de atualizar os dados): sincronia entre
`dinos.json` e as épocas, códigos de país sem nome, locais excluídos que voltaram etc.

Cada teste foi validado reintroduzindo de propósito o bug que ele protege e conferindo que falha.

## Estrutura

- `scripts/baixar_dados.py` — baixa do PBDB e gera o JSON compacto
- `scripts/baixar_paleo.py` — baixa do GPlates as reconstruções por época
- `public/data/dinos.json` — dados compactos prontos pro mapa (~1 MB, ~280 KB comprimido)
- `public/data/paleo/<época>.json` — continentes e posições antigas (~150 KB, ~43 KB comprimido; o site só baixa a época em uso)
- `public/404.html` — página de "não encontrado" (estática, sem JavaScript; tema escuro segue o sistema)
- `public/tema-inicial.js` — põe o tema claro/escuro antes de a página aparecer (sem "piscar")
- `src/` — o site (React + TypeScript):
  - lógica pura, sem React, com testes: `filtros.ts` (cálculo de pontos, contagens e
    histograma), `busca.ts`, `paleo.ts`, `geo.ts`, `popup.ts`, `dados.ts`, `texto.ts`,
    `histograma.ts`, `constantes.ts`; tipos dos dados em `tipos.ts`
  - mapa (MapLibre, imperativo): `mapa.ts` (camadas, tema do mapa base, enquadramento) e
    `popups-mapa.ts`
  - hooks que ligam o mapa ao React: `hooks/useMapa.ts`, `useVista.ts` (globo/plano e
    rotação), `useEpocaPaleo.ts`, `useTema.ts`
  - componentes: `componentes/Painel.tsx`, `Busca.tsx`, `ListaDeOpcoes.tsx`, `SeletorPais.tsx`,
    `LinhaDoTempo.tsx`, `Sobre.tsx`, `Alternador.tsx`
  - `App.tsx` — estado do app (filtros, busca, dados) e sincronia com o mapa; `main.tsx` — entrada
  - `estilos.css` — tema do Tailwind (cores claro/escuro como tokens) e o pouco que não dá pra
    fazer com classes (alças do slider, popups e controles do MapLibre)
- `tests/` — testes (Vitest pro site, unittest pros scripts)
- `data/raw/` — cache das respostas das APIs (fora do git)

## Crédito

Dados: [Paleobiology Database](https://paleobiodb.org), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Continentes antigos: Scotese, C. R. (2016), [PALEOMAP PaleoAtlas for GPlates](https://doi.org/10.5281/zenodo.10596609), CC BY 4.0,
reconstruídos com o [GPlates Web Service](https://gws.gplates.org) (EarthByte, Universidade de Sydney).
Mapa base: © OpenFreeMap, OpenMapTiles, OpenStreetMap.
