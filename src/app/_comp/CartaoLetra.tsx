'use client';

import { useId, useRef, type CSSProperties } from 'react';
import Painel from './Painel';
import { FiltroDesgaste, ajustarDesgaste } from './Desgaste';
import { Janela } from './Moldura';
import { LINHAS, PALAVRAS } from '../_lib/glifos';
import { useLaco, vaiEVolta } from '../_lib/movimento';

// o cartão pequeno (1 × 1) do "n" roxo da Feixen: a letra entre a altura do x e a linha de base (as guias pontilhadas,
// com setas e nomes), e a janelinha das quinas de dentro, que a seta arrasta: os vãos entre a haste e o arco se enchem.
const L = 413;

export default function CartaoLetra({ letra, estilo }: { letra: string; estilo?: CSSProperties }) {
    const id = useId().replace(/:/g, '');
    const ref = useRef<HTMLDivElement>(null);
    const pegadores = useRef<(HTMLSpanElement | null)[]>([]);
    const p = PALAVRAS[letra];
    const s = 297 / LINHAS.x; // a altura do x com 297 u, como o n da gravação
    const base = 354;
    const x0 = (L - p.largura * s) / 2;
    const topoX = base - LINHAS.x * s;

    useLaco(ref, t => {
        const k = vaiEVolta(t + 1.3, { parado0: 0.7, sobe: 1.2, parado1: 1.2, desce: 1.2 });
        ajustarDesgaste(ref.current, 0, 50 * k);
        if (pegadores.current[0]) pegadores.current[0].style.left = `${(100 * k).toFixed(2)}%`;
    }, 30);

    const guia = (y: number, rotulo: string, acima: boolean) => (
        <g>
            <path d={`M30 ${y}H383`} stroke="#111" strokeWidth="1.2" strokeDasharray="1.5 4" strokeLinecap="round" />
            <path d={`M28 ${y}l7 -3.5v7zM385 ${y}l-7 -3.5v7z`} fill="#111" />
            <text className="fx-guia-rotulo" x="381" y={acima ? y - 9 : y + 18} textAnchor="end" fill="#111">
                {rotulo}
            </text>
        </g>
    );
    return (
        <Painel colunas={1} linhas={1} rotulo={`${letra}: quinas de dentro`} estilo={estilo}>
            <div ref={ref} style={{ position: 'absolute', inset: 0 }}>
                <svg className="fx-cartao-svg" viewBox={`0 0 ${L} ${L}`} aria-hidden>
                    <defs>
                        <FiltroDesgaste id={`${id}-f`} modo="dentro" />
                    </defs>
                    <g transform={`translate(${x0} ${base}) scale(${s})`}>
                        {p.glifos.flatMap((g, gi) =>
                            g.pedras.map((pd, pi) => <path key={`${gi}-${pi}`} d={pd.d} fill="var(--roxo)" fillRule="evenodd" filter={`url(#${id}-f)`} />),
                        )}
                    </g>
                    {guia(topoX, 'Altura do x', true)}
                    {guia(base, 'Linha de base', false)}
                </svg>
                <Janela
                    itens={[{ nome: 'QUINAS DE DENTRO', cor: 'var(--roxo)' }]}
                    pegadores={pegadores}
                    seta={0}
                    estilo={{ left: 'calc(92 * var(--u))', top: 'calc(318 * var(--u))' }}
                />
            </div>
        </Painel>
    );
}
