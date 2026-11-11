import Alfabeto from './_comp/Alfabeto';
import Caracteres from './_comp/Caracteres';
import Chamada from './_comp/Chamada';
import Digitada from './_comp/Digitada';
import { Faixa, Manchete } from './_comp/Faixa';
import { Escura, LetrasRune, Recursos, TextoVariacoes } from './_comp/Livro';
import SecaoDesgaste from './_comp/SecaoDesgaste';
import SecaoLivro from './_comp/SecaoLivro';
import Testador from './_comp/Testador';
import { Cabecalho } from './_comp/Topo';
import { HeroPedras } from './_comp/HeroPedras';
import TituloEstilos from './_comp/TituloEstilos';
import { CHAMADA_PRATICA, PAGINA_PRATICA, TITULO_CARACTERES, TITULO_LIVRO, TITULO_RECURSOS } from './_lib/conteudo';

// a home da Föeger Rune, a fonte e a ideia: o cabeçalho preso no alto e o hero da palavra Rune; o alfabeto com os três
// desgastes e a frase digitada; a seção do desgaste (os cartões de perto, movidos pelo mesmo σ); o "Três Estilos" e o
// testador; as faixas coloridas de cada estilo, só com a frase que corre, e a seção escura; a chamada para a página
// "Na prática" (as peças em uso e o playground); os caracteres; os recursos; e, no fim, o livro do espécime e o PDF
// para baixar. Parte do clone da Studio Feixen Fonts (guardado em C:\pessoal\clone-feixen), sem as seções que mais
// tinham a cara dela: os cartões das quinas de fora e de dentro, a troca de palavra e as letras soltas com o botão.
export default function Pagina() {
    return (
        <>
            <Cabecalho />
            <HeroPedras />
            <main className="fx-corpo">
                <Alfabeto />
                <Digitada />
                {/* a seção do desgaste: os cartões de perto, todos movidos pelo mesmo σ */}
                <SecaoDesgaste />
                <TituloEstilos ancora="estilos" livre />
                {/* a âncora do "Testar" do menu */}
                <div id="testador" />
                <Testador />
                {/* as faixas coloridas, uma por estilo, coladas umas nas outras, com a frase que corre; as peças de cada
                    estilo em uso ficam na página "Na prática" */}
                <div className="fx-faixas">
                    <Faixa estilo="cut">
                        <Manchete estilo="cut" />
                    </Faixa>
                    <Faixa estilo="polished">
                        <Manchete estilo="polished" />
                    </Faixa>
                    <Faixa estilo="worn">
                        <Manchete estilo="worn" />
                    </Faixa>
                    <Escura>
                        <LetrasRune />
                        <TextoVariacoes />
                    </Escura>
                </div>
                <Chamada href={PAGINA_PRATICA.caminho} texto={CHAMADA_PRATICA.texto} legenda={CHAMADA_PRATICA.legenda} />
                {/* os caracteres além do alfabeto: os números, o mostruário (acentos, pontuação e símbolos) e os símbolos se gastando */}
                <TituloEstilos texto={TITULO_CARACTERES.texto} asteriscoDepois={null} nota={TITULO_CARACTERES.nota} ancora="caracteres" livre />
                <Caracteres />
                <TituloEstilos texto={TITULO_RECURSOS} asteriscoDepois={null} nota={null} ancora="recursos" />
                <Recursos />
                {/* o livro: o espécime para folhear (o livro realista do clone-tantan) e o PDF para baixar */}
                <TituloEstilos texto={TITULO_LIVRO.texto} asteriscoDepois={TITULO_LIVRO.asteriscoDepois} nota={TITULO_LIVRO.nota} ancora="livro" />
                <SecaoLivro />
            </main>
        </>
    );
}
