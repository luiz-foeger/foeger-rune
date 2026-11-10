import Alfabeto from './_comp/Alfabeto';
import Digitada from './_comp/Digitada';
import { CartazPolido, Onomatopeias } from './_comp/Composicoes';
import { Faixa, Manchete, Textos } from './_comp/Faixa';
import { Escura, LetrasRune, Recursos, TextoVariacoes } from './_comp/Livro';
import { CartazCut, IngressoCut } from './_comp/Pratica';
import SecaoDesgaste from './_comp/SecaoDesgaste';
import SecaoLivro from './_comp/SecaoLivro';
import Testador from './_comp/Testador';
import { Cabecalho } from './_comp/Topo';
import { HeroPedras } from './_comp/HeroPedras';
import TituloEstilos from './_comp/TituloEstilos';
import { TITULO_LIVRO, TITULO_RECURSOS } from './_lib/conteudo';

// a página da Föeger Rune: o cabeçalho preso no alto e o hero da palavra Rune; o alfabeto com os três desgastes e a
// frase digitada; a seção do desgaste (os cartões de perto, movidos pelo mesmo σ); o "Três* Estilos" e o testador; as faixas coloridas de cada estilo e a seção
// escura; os recursos; e, no fim, o livro do espécime e o PDF para baixar. Parte do clone da Studio Feixen Fonts
// (guardado em C:\pessoal\clone-feixen), sem as seções que mais tinham a cara dela: os cartões das quinas de fora e
// de dentro, a troca de palavra e as letras soltas com o botão.
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
                {/* as faixas coloridas, uma por estilo, coladas umas nas outras */}
                <div className="fx-faixas">
                    {/* cada faixa no padrão novo: a frase que corre, a peça grande e a de texto pequeno (Pratica.tsx) */}
                    <Faixa estilo="cut">
                        <Manchete estilo="cut" />
                        <CartazCut />
                        <IngressoCut />
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
