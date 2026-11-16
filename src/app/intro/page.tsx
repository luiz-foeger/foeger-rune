import type { Metadata } from 'next';
import Abertura from '../_comp/Abertura';
import Alfabeto from '../_comp/Alfabeto';
import Digitada from '../_comp/Digitada';
import SecaoDesgaste from '../_comp/SecaoDesgaste';
import { Cabecalho } from '../_comp/Topo';
import { HeroPedras } from '../_comp/HeroPedras';

export const metadata: Metadata = { title: 'Abertura · Föeger Rune', robots: { index: false } };

// o protótipo da abertura (a do clone da Studio Namma com a Rune), para ver antes de levar para a home: o começo da
// home (o cabeçalho, o hero, o alfabeto, a frase e o desgaste) com a abertura na frente, tocando a cada visita (na home,
// seria só na primeira da sessão)
export default function Intro() {
    return (
        <>
            <Abertura />
            <Cabecalho />
            <HeroPedras />
            <main className="fx-corpo">
                <Alfabeto />
                <Digitada />
                <SecaoDesgaste />
            </main>
        </>
    );
}
