import Abertura from './_comp/Abertura';
import Alfabeto from './_comp/Alfabeto';
import Caracteres from './_comp/Caracteres';
import Digitada from './_comp/Digitada';
import SecaoDesgaste from './_comp/SecaoDesgaste';
import SecaoLivro from './_comp/SecaoLivro';
import SecaoVariacoes from './_comp/SecaoVariacoes';
import Testador from './_comp/Testador';
import { Cabecalho } from './_comp/Topo';
import { HeroPedras } from './_comp/HeroPedras';
import Rodape from './_comp/Rodape';
import Titulo from './_comp/Titulo';
import { TITULO_CARACTERES, TITULO_ESTILOS, TITULO_LIVRO, TITULO_VARIACOES } from './_lib/conteudo';

// a home da Föeger Rune, a fonte e a ideia: na primeira visita da sessão, a abertura (o Rune em linhas de construção
// que se enche de tinta e vira o hero); o cabeçalho preso no alto e o hero da palavra Rune; o alfabeto com os três
// desgastes e a frase digitada; a seção do desgaste (os cartões de perto, movidos pelo mesmo σ); o "Três Estilos" e o
// testador (as faixas de cada estilo com as peças em uso, a seção escura e o playground ficam na página "Na prática",
// com o link no cabeçalho); os caracteres; as variações; e, no fim, o livro do espécime e o PDF
// para baixar, com o rodapé de uma linha embaixo. Parte do clone da Studio Feixen Fonts (guardado em C:\pessoal\clone-feixen), sem as seções que mais
// tinham a cara dela: os cartões das quinas de fora e de dentro, a troca de palavra e as letras soltas com o botão.
export default function Pagina() {
    return (
        <>
            <Abertura />
            <Cabecalho />
            <HeroPedras />
            <main className="fx-corpo">
                <Alfabeto />
                <Digitada />
                {/* a seção do desgaste: os cartões de perto, movidos pelo mesmo σ (menos o Y, com a divisa, e o A, que anda com ela) */}
                <SecaoDesgaste />
                <Titulo texto={TITULO_ESTILOS.texto} nota={TITULO_ESTILOS.nota} ancora="styles" />
                {/* a âncora do testador (#tester), para link direto */}
                <div id="tester" />
                <Testador />
                {/* os caracteres além do alfabeto: os números, o mostruário (acentos, pontuação e símbolos) e os símbolos se gastando */}
                <Titulo texto={TITULO_CARACTERES.texto} nota={TITULO_CARACTERES.nota} ancora="characters" />
                <Caracteres />
                {/* as variações: as trocas que a fonte faz sozinha (as letras repetidas, o L do meio e o f do começo) */}
                <Titulo texto={TITULO_VARIACOES.texto} nota={TITULO_VARIACOES.nota} ancora="variations" />
                <SecaoVariacoes />
                {/* o livro: o espécime para folhear (o livro realista do clone-tantan) e o PDF para baixar */}
                <Titulo texto={TITULO_LIVRO.texto} nota={TITULO_LIVRO.nota} ancora="book" />
                <SecaoLivro />
            </main>
            <Rodape />
        </>
    );
}
