"""
Testes das regras dos scripts de dados (só biblioteca padrão):

    python -m unittest discover -s tests -p "test_*.py"
"""

import importlib.util
import unittest
from pathlib import Path

PASTA = Path(__file__).resolve().parent.parent / "scripts"


def carregar(nome):
    spec = importlib.util.spec_from_file_location(nome, PASTA / f"{nome}.py")
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


dados = carregar("baixar_dados")
paleo = carregar("baixar_paleo")


def registro(occ, col, familia="", lat="10", lng="20", identificado="X"):
    return {"occurrence_no": occ, "collection_no": str(col), "family": familia, "lat": lat, "lng": lng,
            "max_ma": "100", "min_ma": "90", "identified_name": identificado}


class QualificadorIncerto(unittest.TestCase):
    """O que conta como identificação incerta: isso decide a marca no popup."""

    def test_reconhece_os_qualificadores_da_literatura(self):
        for nome in ["cf. Tyrannosaurus rex", "Apatosaurus cf. louisae", "? Owenodon sp.",
                     "Ichthyornis aff. dispar", '"Megalosaurus" sp.']:
            self.assertTrue(dados.QUALIFICADOR_INCERTO.search(nome), nome)

    def test_nao_confunde_com_identificacao_normal(self):
        for nome in ["Tyrannosaurus rex", "Saturnalia tupiniquim n. gen. n. sp.", "Theropoda indet.",
                     "Owenodon sp.", "Ceratopsidae"]:
            self.assertFalse(dados.QUALIFICADOR_INCERTO.search(nome), nome)


class TipoDoFossil(unittest.TestCase):
    """Decide os filtros de pegadas e ovos."""

    def test_marcas_do_pbdb(self):
        self.assertEqual(dados.tipo_do_fossil({"accepted_name": "Eubrontes", "flags": "I"}), "pegada")
        self.assertEqual(dados.tipo_do_fossil({"accepted_name": "Grallator", "flags": "IF"}), "pegada")
        self.assertEqual(dados.tipo_do_fossil({"accepted_name": "Megaloolithus", "flags": "F"}), "ovo")
        self.assertEqual(dados.tipo_do_fossil({"accepted_name": "Tyrannosaurus rex"}), "corpo")

    def test_correcao_vale_mais_que_a_marca_errada(self):
        # Shri rapax é esqueleto, mas o PBDB marca como "F" (o que faria dele um ovo)
        self.assertEqual(dados.tipo_do_fossil({"accepted_name": "Shri rapax", "flags": "F"}), "corpo")
        self.assertEqual(dados.tipo_do_fossil({"accepted_name": "Jialingpus yuechiensis", "flags": "F"}), "pegada")


class DietaDoFossil(unittest.TestCase):
    def test_combinacoes_com_onivoro_viram_onivoro(self):
        self.assertEqual(dados.dieta_do_fossil("herbivore, omnivore"), "onivoro")
        self.assertEqual(dados.dieta_do_fossil("carnivore, omnivore"), "onivoro")

    def test_categorias_simples(self):
        self.assertEqual(dados.dieta_do_fossil("carnivore"), "carnivoro")
        self.assertEqual(dados.dieta_do_fossil("herbivore"), "herbivoro")
        self.assertEqual(dados.dieta_do_fossil("piscivore, insectivore"), "piscivoro")

    def test_sem_dado_nao_vira_chute(self):
        self.assertEqual(dados.dieta_do_fossil(None), "desconhecida")
        self.assertEqual(dados.dieta_do_fossil("algo novo"), "desconhecida")


class TextosDoPbdb(unittest.TestCase):
    def test_autor_no_formato_da_nomenclatura(self):
        self.assertEqual(dados.formatar_autor("Osborn 1905"), "Osborn, 1905")
        self.assertEqual(dados.formatar_autor("(Marsh 1877)"), "(Marsh, 1877)")
        self.assertEqual(dados.formatar_autor("Zhao et al. 1999"), "Zhao et al., 1999")

    def test_formacao_incerta_e_aspas(self):
        self.assertEqual(dados.limpar_formacao('"Lance"'), "Lance")
        self.assertEqual(dados.limpar_formacao("?Dunvegan"), "Dunvegan (?)")
        self.assertEqual(dados.limpar_formacao("Kirtland?"), "Kirtland (?)")
        self.assertEqual(dados.limpar_formacao("?"), "")
        self.assertEqual(dados.limpar_formacao(None), "")


class HerdarGrupoPelaFamilia(unittest.TestCase):
    def test_fossil_sem_grupo_herda_o_grupo_da_familia(self):
        # Caso real: "Megalosauridae" duplicado no PBDB deixava megalossaurídeos sem grupo
        regs = [registro("1", 1, "Megalosauridae"), registro("2", 2, "Megalosauridae")]
        grupos = {"1": "theropoda"}
        self.assertEqual(dados.herdar_grupo_pela_familia(regs, grupos), 1)
        self.assertEqual(grupos["2"], "theropoda")

    def test_familia_de_mais_de_um_grupo_nao_e_herdada(self):
        # Ambíguo: melhor deixar em "outros" do que chutar
        regs = [registro("1", 1, "Ambigua"), registro("2", 2, "Ambigua"), registro("3", 3, "Ambigua")]
        grupos = {"1": "theropoda", "2": "ornithischia"}
        dados.herdar_grupo_pela_familia(regs, grupos)
        self.assertNotIn("3", grupos)

    def test_sem_familia_nao_herda_nada(self):
        regs = [registro("1", 1, "NO_FAMILY_SPECIFIED"), registro("2", 2, "NO_FAMILY_SPECIFIED")]
        grupos = {"1": "theropoda"}
        self.assertEqual(dados.herdar_grupo_pela_familia(regs, grupos), 0)


class CorrecoesDaConferencia(unittest.TestCase):
    def test_locais_com_coordenada_impossivel_ficam_fora(self):
        col = next(iter(dados.EXCLUIR_LOCAIS))
        por_local, excluidos, _ = dados.agrupar_por_local([registro("1", col), registro("2", 1)])
        self.assertNotIn(col, por_local)
        self.assertEqual(excluidos, 1)

    def test_coordenada_corrigida_substitui_a_errada(self):
        col, (lat, lng) = next(iter(dados.CORRECOES_COORDENADA.items()))
        por_local, _, _ = dados.agrupar_por_local([registro("1", col, lat="45.37", lng="-102.48")])
        self.assertEqual((por_local[col][0]["lat"], por_local[col][0]["lng"]), (lat, lng))

    def test_registro_sem_coordenada_ou_idade_e_descartado(self):
        sem_lat = {**registro("1", 1), "lat": None}
        por_local, _, descartados = dados.agrupar_por_local([sem_lat])
        self.assertEqual((por_local, descartados), ({}, 1))


class ContornosPaleo(unittest.TestCase):
    def decodificar(self, plano):
        """Mesmo algoritmo do site (src/paleo.js), pra conferir a ida e volta."""
        x, y = plano[0], plano[1]
        pontos = [(x, y)]
        for k in range(2, len(plano), 2):
            x, y = x + plano[k], y + plano[k + 1]
            pontos.append((x, y))
        return pontos

    def test_desdobrar_remove_o_salto_na_linha_de_data(self):
        anel = [(179.0, 0.0), (-179.0, 1.0), (-178.0, 2.0), (179.0, 0.0)]
        desdobrado = paleo.desdobrar(anel)
        saltos = [abs(b[0] - a[0]) for a, b in zip(desdobrado, desdobrado[1:])]
        self.assertTrue(all(s < 180 for s in saltos), desdobrado)

    def test_simplificar_tira_ponto_alinhado_e_mantem_esquina(self):
        reta_com_esquina = [(0, 0), (1, 0.001), (2, 0), (2, 2)]
        self.assertEqual(paleo.simplificar(reta_com_esquina, 0.1), [(0, 0), (2, 0), (2, 2)])

    def test_codificacao_compacta_volta_ao_contorno_original(self):
        quadrado = [[[10.04, 20.0], [15.0, 20.0], [15.0, 25.0], [10.04, 25.0], [10.04, 20.0]]]
        geojson = {"features": [{"geometry": {"type": "Polygon", "coordinates": quadrado}}]}
        [plano] = paleo.contornos(geojson)
        self.assertEqual(self.decodificar(plano), [(100, 200), (150, 200), (150, 250), (100, 250), (100, 200)])

    def test_ilhotas_sao_descartadas(self):
        ilhota = [[[0, 0], [0.1, 0], [0.1, 0.1], [0, 0.1], [0, 0]]]
        geojson = {"features": [{"geometry": {"type": "Polygon", "coordinates": ilhota}}]}
        self.assertEqual(paleo.contornos(geojson), [])


if __name__ == "__main__":
    unittest.main()
