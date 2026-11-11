import type { Metadata } from 'next';
import Chamada from '../_comp/Chamada';
import Editor from '../_comp/Editor';
import { Faixa } from '../_comp/Faixa';
import Inspetor from '../_comp/Inspetor';
import { CaixinhasCut, CaixinhasPolished, CaixinhasWorn, CartazCut, DiscoWorn, LivroPolished } from '../_comp/Pratica';
import TituloEstilos from '../_comp/TituloEstilos';
import { Cabecalho } from '../_comp/Topo';
import { CHAMADA_HOME, ESTILOS, PAGINA_PRATICA, TITULO_ESCREVA, type Estilo } from '../_lib/conteudo';

export const metadata: Metadata = { title: `${PAGINA_PRATICA.titulo} · Föeger Rune` };

// a página "Na prática": a Föeger Rune onde ela seria usada, uma faixa colorida por estilo com as peças de verdade
// (no Cut, os cartazes colados na parede e as caixinhas do festival; no Polished, as capas dos livros e as do livro
// infantil; no Worn, o disco e as do LP), com o inspetor de fonte e tamanho por cima, e, no fim, o playground para
// testar a fonte do seu jeito. A frase que corre de cada estilo ficou na home; aqui, cada faixa abre com o nome dele.
// No pé, a volta para a home, onde estão a ideia, os caracteres, os recursos e o livro para baixar
const nomeDe = (estilo: Estilo) => ESTILOS.find(e => e.id === estilo)!.nome;

export default function NaPratica() {
    return (
        <>
            <Cabecalho />
            <main className="fx-corpo fx-corpo-pagina">
                <TituloEstilos texto={PAGINA_PRATICA.titulo} asteriscoDepois={null} nota={null} livre />
                <div className="fx-faixas">
                    <Faixa estilo="cut">
                        <p className="fx-faixa-rotulo">{nomeDe('cut')}</p>
                        <CartazCut />
                        <CaixinhasCut />
                    </Faixa>
                    <Faixa estilo="polished">
                        <p className="fx-faixa-rotulo">{nomeDe('polished')}</p>
                        <LivroPolished />
                        <CaixinhasPolished />
                    </Faixa>
                    <Faixa estilo="worn">
                        <p className="fx-faixa-rotulo">{nomeDe('worn')}</p>
                        <DiscoWorn />
                        <CaixinhasWorn />
                    </Faixa>
                </div>
                {/* passando o mouse num texto das faixas: a fonte e o tamanho dele */}
                <Inspetor escopo=".fx-faixas" />
                {/* o playground: o editor para testar a fonte (os estilos, os tamanhos, as cores, os efeitos e o desgaste) */}
                <TituloEstilos texto={TITULO_ESCREVA.texto} asteriscoDepois={null} nota={TITULO_ESCREVA.nota} ancora="playground" livre />
                <Editor />
                <Chamada href="/" texto={CHAMADA_HOME.texto} legenda={CHAMADA_HOME.legenda} />
            </main>
        </>
    );
}
