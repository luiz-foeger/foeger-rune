import type { Metadata } from 'next';
import Editor from '../_comp/Editor';
import { Faixa, Manchete } from '../_comp/Faixa';
import Inspetor from '../_comp/Inspetor';
import { Escura, LetrasRune, TextoVariacoes } from '../_comp/Livro';
import { CaixinhasCut, CaixinhasPolished, CaixinhasWorn, CartazCut, DiscoWorn, LivroPolished } from '../_comp/Pratica';
import Rodape from '../_comp/Rodape';
import TituloEstilos from '../_comp/TituloEstilos';
import { Cabecalho } from '../_comp/Topo';
import { PAGINA_PRATICA, TITULO_ESCREVA } from '../_lib/conteudo';

export const metadata: Metadata = { title: `${PAGINA_PRATICA.titulo} · Föeger Rune` };

// a página "Na prática": a Föeger Rune onde ela seria usada, uma faixa colorida por estilo, aberta pela frase que corre
// e com as peças de verdade (no Cut, os cartazes colados na parede e as caixinhas do festival; no Polished, as capas
// dos livros e as do livro infantil; no Worn, o disco e as do LP), fechada pela seção escura (o RUNE e as variações);
// o inspetor de fonte e tamanho por cima das faixas; e, no fim, o playground para testar a fonte do seu jeito, com o
// rodapé de uma linha embaixo. A volta para a home fica no cabeçalho (o "A fonte") e na logo
export default function NaPratica() {
    return (
        <>
            <Cabecalho />
            <main className="fx-corpo fx-corpo-pagina">
                <TituloEstilos texto={PAGINA_PRATICA.titulo} asteriscoDepois={null} nota={null} livre />
                {/* as faixas coloridas, uma por estilo, coladas umas nas outras: a frase que corre, a peça grande e as
                    caixinhas de texto pequeno (Pratica.tsx) */}
                <div className="fx-faixas">
                    <Faixa estilo="cut">
                        <Manchete estilo="cut" />
                        <CartazCut />
                        <CaixinhasCut />
                    </Faixa>
                    <Faixa estilo="polished">
                        <Manchete estilo="polished" />
                        <LivroPolished />
                        <CaixinhasPolished />
                    </Faixa>
                    <Faixa estilo="worn">
                        <Manchete estilo="worn" />
                        <DiscoWorn />
                        <CaixinhasWorn />
                    </Faixa>
                    <Escura>
                        <LetrasRune />
                        <TextoVariacoes />
                    </Escura>
                </div>
                {/* passando o mouse num texto das faixas: a fonte e o tamanho dele */}
                <Inspetor escopo=".fx-faixas" />
                {/* o playground: o editor para testar a fonte (os estilos, os tamanhos, as cores, os efeitos e o desgaste) */}
                <TituloEstilos texto={TITULO_ESCREVA.texto} asteriscoDepois={null} nota={TITULO_ESCREVA.nota} ancora="playground" livre />
                <Editor />
            </main>
            <Rodape />
        </>
    );
}
