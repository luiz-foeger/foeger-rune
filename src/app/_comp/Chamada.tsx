'use client';

import Link from 'next/link';
import Painel from './Painel';

// a chamada para a outra página: o painel inteiro é o link, com a frase grande na Rune Cut, a seta que anda no hover e
// a legenda embaixo, na fonte de texto
export default function Chamada({ href, texto, legenda }: { href: string; texto: string; legenda: string }) {
    return (
        <Painel colunas={4} linhas={1} rotulo={texto} celular={{ colunas: 2, linhas: 1 }}>
            <Link href={href} className="fx-chamada">
                <span className="fx-chamada-texto">
                    {texto} <span className="fx-chamada-seta">→</span>
                </span>
                <span className="fx-chamada-legenda">{legenda}</span>
            </Link>
        </Painel>
    );
}
