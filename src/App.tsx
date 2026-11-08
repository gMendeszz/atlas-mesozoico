// O app: guarda o estado (filtros, busca, dados), calcula o que aparece e mantém o mapa em dia.
// A regra de negócio fica nos módulos puros (filtros.ts, busca.ts, paleo.ts, popup.ts), testados
// à parte; aqui só se liga essa lógica à interface e ao mapa.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MA_SPAN } from "./constantes";
import { carregarDados } from "./dados";
import { LISTAS, calcular, filtrosParaURL, lerFiltrosDaURL, limparFiltros, temFiltroAtivo, type CampoLista } from "./filtros";
import { locaisDoNome, nomesBuscaveis, resumoDaBusca } from "./busca";
import { caminhoHistograma } from "./histograma";
import { enquadrar, reduzirMovimento } from "./mapa";
import { temWebGL } from "./suporte";
import { fmt } from "./texto";
import type { Continentes, Dados, Filtros, Ponto, Resultado } from "./tipos";
import type { EstadoPaleo } from "./hooks/useEpocaPaleo";
import { useCamadas } from "./hooks/useCamadas";
import { useEpocaPaleo } from "./hooks/useEpocaPaleo";
import { useMapa } from "./hooks/useMapa";
import { useTema } from "./hooks/useTema";
import { useVista } from "./hooks/useVista";
import { Alternador } from "./componentes/Alternador";
import { ControlesDoMapa } from "./componentes/ControlesDoMapa";
import { Busca } from "./componentes/Busca";
import { BOTAO_LARGO, NOTA, ROTULO } from "./componentes/classes";
import { LinhaDoTempo } from "./componentes/LinhaDoTempo";
import { ListaDeOpcoes } from "./componentes/ListaDeOpcoes";
import { Painel } from "./componentes/Painel";
import { SeletorPais } from "./componentes/SeletorPais";
import { Sobre } from "./componentes/Sobre";

const CONTINENTES: { valor: Continentes; texto: string }[] = [
  { valor: "atuais", texto: "Present-day" },
  { valor: "antigos", texto: "Ancient" },
];
const HISTOGRAMA_VAZIO = new Float64Array(MA_SPAN);

export function App() {
  const [tema, alternarTema] = useTema();
  const [erro, setErro] = useState<string | null>(
    temWebGL ? null : "Your browser doesn’t support WebGL 2, which the map needs. Try updating it or using another browser."
  );
  const mostrarErro = useCallback((mensagem: string) => setErro((atual) => atual ?? mensagem), []);
  const [dados, setDados] = useState<Dados | null>(null);
  const [f, setF] = useState<Filtros>(() => lerFiltrosDaURL(location.search));
  const [arrastando, setArrastando] = useState(false); // alça da linha do tempo sendo arrastada
  const [consulta, setConsulta] = useState(""); // texto buscado

  const elMapa = useRef<HTMLDivElement>(null);
  const elPainel = useRef<HTMLElement>(null);
  const elLinhaTempo = useRef<HTMLElement>(null);

  const mapa = useMapa({
    container: elMapa,
    linhaTempo: elLinhaTempo,
    tema,
    ativo: temWebGL,
    aoErro: mostrarErro,
  });
  const { map, estiloVersao } = mapa;
  const { vista, escolherVista, girando, alternarGiro, pararGiro } = useVista(map, estiloVersao);
  const paleo = useEpocaPaleo(f.continentes, f.de, f.ate, dados?.meta.assinatura_locais ?? null);

  // Dados dos fósseis (o download começa em main.tsx, junto com a página)
  useEffect(() => {
    if (!temWebGL) return;
    let valendo = true;
    carregarDados()
      .then((d) => {
        if (!valendo) return;
        // País da URL que não existe nos dados: volta pra "todos"
        setF((atual) => (atual.pais && !d.paises.some((p) => p.cc === atual.pais) ? { ...atual, pais: "" } : atual));
        setDados(d);
      })
      .catch((e: unknown) => {
        console.error(e);
        if (valendo) mostrarErro("Couldn’t load the fossil data. Please reload the page.");
      });
    return () => {
      valendo = false;
    };
  }, [mostrarErro]);

  // Tudo que aparece (pontos, contagens, histograma) sai daqui, recalculado só quando algo muda
  const resultado = useMemo(() => (dados ? calcular(dados, f, paleo.epoca) : null), [dados, f, paleo.epoca]);

  // ---------- Busca ----------
  const sugestoes = useMemo(() => (dados ? nomesBuscaveis(dados) : []), [dados]);
  const achado = useMemo(() => (dados && consulta ? locaisDoNome(dados, consulta) : null), [dados, consulta]);
  const destaque = useMemo(
    () => (achado && resultado ? resultado.features.filter((p) => achado.locais.has(p.id)) : []),
    [achado, resultado]
  );

  // ---------- Mapa ----------
  const { abrirPopup, fecharPopup } = useCamadas({ mapa, tema, dados, resultado, epoca: paleo.epoca, destaque, filtros: f });

  const enquadrarPontos = useCallback(
    (features: Ponto[]) => {
      if (!map) return;
      pararGiro();
      enquadrar(map, features, elPainel.current);
    },
    [map, pararGiro]
  );

  // Ao abrir com ?pais= na URL e ao escolher um país: enquadra os pontos dele
  const enquadrarPais = useRef(Boolean(f.pais));
  useEffect(() => {
    if (!map || !estiloVersao || !resultado || !enquadrarPais.current) return;
    enquadrarPais.current = false;
    if (f.pais) enquadrarPontos(resultado.features);
  }, [map, estiloVersao, resultado, f.pais, enquadrarPontos]);

  // Filtros na URL (link compartilhável); enquanto arrasta a alça, só no fim
  useEffect(() => {
    if (!arrastando) history.replaceState(null, "", filtrosParaURL(f) || location.pathname);
  }, [f, arrastando]);

  // Textos anunciados a leitores de tela (contagem, resumo da busca) não mudam a cada quadro do
  // arrasto da alça: usam o último resultado com a alça parada. (Ajuste de estado durante a
  // renderização: o padrão do React pra "lembrar o último valor".)
  const [resultadoParado, setResultadoParado] = useState(resultado);
  if (!arrastando && resultadoParado !== resultado) setResultadoParado(resultado);
  const paraAnunciar = arrastando ? resultadoParado : resultado;
  const infoBusca = useMemo(() => {
    if (!dados) return "";
    const visiveis = achado && paraAnunciar ? paraAnunciar.features.filter((p) => achado.locais.has(p.id)) : [];
    return resumoDaBusca(dados, consulta, achado, visiveis);
  }, [dados, consulta, achado, paraAnunciar]);

  function buscar(texto: string) {
    const alvo = texto.trim();
    setConsulta(alvo);
    if (!alvo || !dados || !resultado || !map) return;
    const { locais } = locaisDoNome(dados, alvo);
    const visiveis = resultado.features.filter((p) => locais.has(p.id));
    if (!visiveis.length) return;
    fecharPopup(); // o popup da busca anterior não fica por cima do resultado novo
    pararGiro();
    if (visiveis.length > 1) {
      enquadrarPontos(visiveis);
      return;
    }
    const [p] = visiveis;
    const centro = p.geometry.coordinates as [number, number];
    map.once("moveend", () => abrirPopup(p.id, centro));
    // Zoom acima de clusterMaxZoom (9): o ponto aparece sozinho, fora de agrupamentos
    map.easeTo({ center: centro, zoom: Math.max(map.getZoom(), 9.5), duration: reduzirMovimento.matches ? 0 : 1000 });
  }

  // ---------- Mudanças nos filtros ----------
  const mudarTempo = useCallback((de: number, ate: number, arrastandoAgora: boolean) => {
    setArrastando(arrastandoAgora);
    setF((atual) => (atual.de === de && atual.ate === ate ? atual : { ...atual, de, ate }));
  }, []);
  const mudarLista = (campo: CampoLista) => (i: number, marcado: boolean) =>
    setF((atual) => ({ ...atual, [campo]: atual[campo].map((v, k) => (k === i ? marcado : v)) }));
  function escolherPais(cc: string) {
    enquadrarPais.current = true;
    setF((atual) => ({ ...atual, pais: cc }));
  }
  function limpar() {
    setF(limparFiltros);
    // O botão some ao limpar; o foco do teclado vai pro primeiro filtro
    document.getElementById("grupos-0")?.focus();
  }

  const caminho = useMemo(() => caminhoHistograma(resultado?.histograma ?? HISTOGRAMA_VAZIO), [resultado]);
  const [grupos, tipos, dietas] = LISTAS;

  return (
    <>
      {/* O MapLibre põe position: relative no elemento do mapa; quem fixa na tela é a div de fora */}
      <div className="absolute inset-0">
        <div ref={elMapa} className="size-full bg-espaco" />
      </div>

      <Painel
        ref={elPainel}
        contagem={erro ?? textoDaContagem(resultado)}
        anuncio={erro ?? textoDaContagem(paraAnunciar)}
        erro={erro !== null}
      >
        <Busca sugestoes={sugestoes} info={infoBusca} aoBuscar={buscar} />

        <p className={`${ROTULO} mb-1.5`} id="rot-continentes">
          Continents
        </p>
        <Alternador
          rotulo="Continents"
          rotuloVisivel="rot-continentes"
          opcoes={CONTINENTES}
          valor={f.continentes}
          aoEscolher={(continentes) => setF((atual) => ({ ...atual, continentes }))}
        />
        {f.continentes === "antigos" && (
          <p className="mt-1.5 text-xs leading-[1.4] text-suave" aria-live="polite">
            {textoDoPaleo(paleo, resultado)}
          </p>
        )}

        <ListaDeOpcoes
          id={grupos.campo}
          legenda="Group"
          opcoes={grupos.opcoes}
          marcados={f.grupos}
          contagens={resultado?.porGrupo ?? null}
          aoMudar={mudarLista("grupos")}
        >
          <p className={NOTA}>Each dot is colored by the group with the most fossils at that site.</p>
          <details className="mt-1 text-xs text-suave">
            <summary className="w-fit cursor-pointer text-destaque">What’s in “Others”?</summary>
            <p className="mt-1 leading-[1.4]">
              Fossils identified only as dinosaurs, groups outside these three (such as herrerasaurids), and
              eggs and footprints with no assigned group.
            </p>
          </details>
        </ListaDeOpcoes>
        <ListaDeOpcoes
          id={tipos.campo}
          legenda="Fossil type"
          recolhivel
          opcoes={tipos.opcoes}
          marcados={f.tipos}
          contagens={resultado?.porTipo ?? null}
          aoMudar={mudarLista("tipos")}
        />
        <ListaDeOpcoes
          id={dietas.campo}
          legenda="Diet"
          recolhivel
          opcoes={dietas.opcoes}
          marcados={f.dietas}
          contagens={resultado?.porDieta ?? null}
          aoMudar={mudarLista("dietas")}
        >
          <p className={NOTA}>Diet is that of the animal’s group in the PBDB, not something observed in each fossil.</p>
        </ListaDeOpcoes>

        <SeletorPais paises={dados?.paises ?? []} porPais={resultado?.porPais ?? null} valor={f.pais} aoEscolher={escolherPais} />

        {temFiltroAtivo(f) && (
          <button type="button" onClick={limpar} className={`${BOTAO_LARGO} mt-3.5 font-semibold text-destaque`}>
            Clear filters
          </button>
        )}

        <Sobre dados={dados} />
      </Painel>

      <ControlesDoMapa
        vista={vista}
        aoTrocarVista={() => escolherVista(vista === "globe" ? "mercator" : "globe")}
        girando={girando}
        aoAlternarGiro={alternarGiro}
        tema={tema}
        aoAlternarTema={alternarTema}
      />

      <LinhaDoTempo
        ref={elLinhaTempo}
        de={f.de}
        ate={f.ate}
        caminho={caminho}
        paleoVisivel={Boolean(paleo.epoca)}
        aoMudar={mudarTempo}
        aoSoltar={() => setArrastando(false)}
      />
    </>
  );
}

function textoDaContagem(r: Resultado | null): string {
  if (!r) return "Loading data…";
  if (!r.totalFosseis) return "No fossils match these filters";
  return `${fmt(r.totalFosseis)} fossils at ${fmt(r.features.length)} sites`;
}

function textoDoPaleo(paleo: EstadoPaleo, r: Resultado | null): string {
  if (paleo.erro) return "Couldn’t load the ancient continents. Please try again.";
  if (paleo.carregando) return `Loading Earth at ${paleo.t} million years ago…`;
  let texto = `Earth ${paleo.t} million years ago (middle of the selected range). Present-day coastlines, shown where they were at that time.`;
  if (r?.semPosicao) texto += ` ${fmt(r.semPosicao)} fossils are hidden: the model can’t reconstruct their location.`;
  return texto;
}
