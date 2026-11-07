import Alfabeto from './_comp/Alfabeto';
import Blocos from './_comp/Blocos';
import Digitada from './_comp/Digitada';
import { CartazPolido, GradePalavras, Onomatopeias, Simbolos } from './_comp/Composicoes';
import { Faixa, Manchete, Textos } from './_comp/Faixa';
import { Escura, LetrasRune, Recursos, TextoVariacoes } from './_comp/Livro';
import SecaoLivro from './_comp/SecaoLivro';
import Testador from './_comp/Testador';
import { Cabecalho, Hero } from './_comp/Topo';
import TituloEstilos from './_comp/TituloEstilos';
import { TITULO_LIVRO, TITULO_RECURSOS } from './_lib/conteudo';

// a página da Föeger Rune: o cabeçalho preso no alto e o hero da palavra Rune; o alfabeto com os três desgastes e a
// frase digitada; os blocos do desgaste (a letra nova e gasta dos dois lados de uma divisa); o "Três* Estilos" e o testador; as faixas coloridas de cada estilo e a seção
// escura; os recursos; e, no fim, o livro do espécime e o PDF para baixar. Parte do clone da Studio Feixen Fonts
// (guardado em C:\pessoal\clone-feixen), sem as seções que mais tinham a cara dela: os cartões das quinas de fora e
// de dentro, a troca de palavra e as letras soltas com o botão.
export default function Pagina() {
    return (
        <>
            <Cabecalho />
            <Hero />
            <main className="fx-corpo">
                <Alfabeto />
                <Digitada />
                {/* os blocos do desgaste: a letra dividida, nova de um lado da divisa e gasta do outro */}
                <Blocos />
                <TituloEstilos ancora="estilos" />
                {/* a âncora do "Testar" do menu */}
                <div id="testador" />
                <Testador />
                {/* as faixas coloridas, uma por estilo, coladas umas nas outras */}
                <div className="fx-faixas">
                    <Faixa estilo="cut">
                        <Manchete estilo="cut" />
                        <GradePalavras estilo="cut" />
                        <Textos estilo="cut" />
                        <Simbolos estilo="cut" />
                    </Faixa>
                    <Faixa estilo="polished">
                        <Manchete estilo="polished" />
                        <CartazPolido estilo="polished" />
                        <Textos estilo="polished" ordem={[1, 2, 3, 0]} />
                    </Faixa>
                    <Faixa estilo="worn">
                        <Manchete estilo="worn" />
                        <Onomatopeias estilo="worn" />
                        <Textos estilo="worn" ordem={[2, 3, 0, 1]} />
                    </Faixa>
                    <Escura>
                        <LetrasRune />
                        <TextoVariacoes />
                    </Escura>
                </div>
                <TituloEstilos texto={TITULO_RECURSOS} asteriscoDepois={null} nota={null} ancora="recursos" />
                <Recursos />
                {/* o livro: o espécime para folhear (o livro realista do clone-tantan) e o PDF para baixar */}
                <TituloEstilos texto={TITULO_LIVRO.texto} asteriscoDepois={TITULO_LIVRO.asteriscoDepois} nota={TITULO_LIVRO.nota} ancora="livro" />
                <SecaoLivro />
            </main>
        </>
    );
}
