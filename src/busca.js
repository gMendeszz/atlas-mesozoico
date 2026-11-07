// Busca por nome de dinossauro ou por formação geológica (lógica pura; a interface fica em ui/busca.js).

const PREFIXO_FORMACAO = "formação ";
// "Kirtland (?)" (formação incerta no PBDB) é achada buscando "Kirtland"
const nomeBaseDaFormacao = (texto) => texto.replace(/ \(\?\)$/, "");

// Sugestões: nomes usados por algum fóssil e formações com algum local ("Formação Morrison"),
// em ordem alfabética
export function nomesBuscaveis(dados) {
  const nomes = [...new Set(dados.fosseis.nome)].map((idx) => dados.dic.nome[idx]);
  const formacoes = [...new Set(dados.locais.formacao)]
    .map((idx) => dados.dic.formacao[idx])
    .filter(Boolean)
    .map((t) => `Formação ${nomeBaseDaFormacao(t)}`);
  return [...new Set([...nomes, ...formacoes])].filter(Boolean).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

// Locais com fósseis desse nome. Sem diferenciar maiúsculas; o gênero acha as espécies
// ("Tyrannosaurus" acha "Tyrannosaurus rex"), mas não nomes que só começam igual
// ("Tyrannosaurus" não acha "Tyrannosauridae"). Se nenhum nome bate, tenta como formação,
// com ou sem a palavra "Formação" ("Morrison" e "Formação Morrison" acham o mesmo).
export function locaisDoNome(dados, texto) {
  const alvo = texto.trim().toLowerCase();
  const vazio = { locais: new Set(), fosseis: 0, incertos: 0 };
  if (!alvo) return vazio;

  const idsNome = new Set();
  dados.dic.nome.forEach((n, idx) => {
    const nn = n.toLowerCase();
    if (nn === alvo || nn.startsWith(alvo + " ")) idsNome.add(idx);
  });
  if (!idsNome.size) return locaisDaFormacao(dados, alvo) ?? vazio;

  const locais = new Set();
  let fosseis = 0;
  let incertos = 0;
  const { inicio, fosseis: F } = dados;
  for (let i = 0; i < dados.locais.col.length; i++) {
    for (let j = inicio[i]; j < inicio[i + 1]; j++) {
      if (idsNome.has(F.nome[j])) {
        locais.add(i);
        fosseis++;
        if (dados.incertoDe.has(j)) incertos++;
      }
    }
  }
  return { locais, fosseis, incertos };
}

function locaisDaFormacao(dados, alvo) {
  const nome = alvo.startsWith(PREFIXO_FORMACAO) ? alvo.slice(PREFIXO_FORMACAO.length).trim() : alvo;
  const idsFormacao = new Set();
  dados.dic.formacao.forEach((t, idx) => {
    if (t && nomeBaseDaFormacao(t).toLowerCase() === nome) idsFormacao.add(idx);
  });
  if (!idsFormacao.size) return null;

  const L = dados.locais;
  const locais = new Set();
  let fosseis = 0;
  for (let i = 0; i < L.col.length; i++) {
    if (!idsFormacao.has(L.formacao[i])) continue;
    locais.add(i);
    fosseis += L.n[i];
  }
  return { locais, fosseis, incertos: 0 };
}
