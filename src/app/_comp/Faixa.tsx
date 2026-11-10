'use client';

import { useRef, type CSSProperties, type ReactNode } from 'react';
import Painel from './Painel';
import { COR_FAIXA, ESTILOS, MANCHETES, type Estilo } from '../_lib/conteudo';
import { useLaco } from '../_lib/movimento';

// as faixas coloridas da Feixen, uma por estilo: o fundo da página inteira na cor do estilo (os painéis ficam da mesma
// cor, com a trama mais escura) e a manchete enorme que corre para a esquerda conforme a página desce; as peças de cada
// estilo na prática ficam em Pratica.tsx.
export function Faixa({ estilo, children }: { estilo: Estilo; children: ReactNode }) {
    const nome = ESTILOS.find(e => e.id === estilo)!.nome;
    return (
        <section id={`faixa-${estilo}`} className="fx-faixa" aria-label={`Faixa ${nome}`} style={{ '--cor-faixa': COR_FAIXA[estilo] } as CSSProperties}>
            <div className="fx-faixa-miolo">{children}</div>
        </section>
    );
}

export const familiaDe = (estilo: Estilo) => ESTILOS.find(e => e.id === estilo)!.familia;

// a manchete corrida (4 × 1): a etiqueta com o nome do estilo e a frase enorme; o deslocamento segue a posição do
// painel na tela (entrando embaixo, a frase ainda está no começo; saindo em cima, no fim), suavizado
export function Manchete({ estilo }: { estilo: Estilo }) {
    const ref = useRef<HTMLDivElement>(null);
    const linha = useRef<HTMLParagraphElement>(null);
    const atual = useRef<number | null>(null);
    const nome = ESTILOS.find(e => e.id === estilo)!.nome;
    useLaco(ref, () => {
        const caixa = ref.current;
        const ln = linha.current;
        if (!caixa || !ln) return;
        const r = caixa.getBoundingClientRect();
        const vh = window.innerHeight;
        const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
        const w = caixa.clientWidth;
        const alvo = w * 0.12 - p * (ln.scrollWidth - w * 0.82);
        atual.current = atual.current === null ? alvo : atual.current + (alvo - atual.current) * 0.12;
        ln.style.transform = `translate3d(${atual.current.toFixed(1)}px, 0, 0)`;
    });
    return (
        <Painel colunas={4} linhas={1} rotulo={MANCHETES[estilo]}>
            <div ref={ref} className="fx-manchete">
                <p ref={linha} className="fx-manchete-texto" style={{ fontFamily: familiaDe(estilo) }}>
                    {MANCHETES[estilo]}
                </p>
                <span className="fx-etiqueta-estilo">{nome}</span>
            </div>
        </Painel>
    );
}
