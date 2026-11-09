'use client';

import { useId, useRef, type CSSProperties } from 'react';
import Painel from './Painel';
import { FiltroDesgaste, ajustarDesgaste } from './Desgaste';
import { LINHAS, PALAVRAS } from '../_lib/glifos';
import { PALAVRAS_EXTRA } from '../_lib/glifos-extra';
import { sigmaAgora } from '../_lib/sigma';
import { useLaco } from '../_lib/movimento';

// o cartão pequeno (1 × 1) de uma letra com as linhas da fonte em que ela se apoia, pontilhadas, com setas, nomes e
// medidas (a altura do x, a linha de base e a descendente, em unidades da fonte): o desgaste arredonda as quinas, mas
// os lados retos não andam, e a letra continua nas mesmas linhas.
const L = 413;
const PAL = { ...PALAVRAS, ...PALAVRAS_EXTRA };

export default function CartaoLetra({ letra, cor, estilo }: { letra: string; cor: string; estilo?: CSSProperties }) {
    const id = useId().replace(/:/g, '');
    const ref = useRef<HTMLDivElement>(null);
    const p = PAL[letra];
    const desce = -LINHAS.descendente;
    const s = 292 / (LINHAS.x + desce);
    const topoX = (L - (LINHAS.x + desce) * s) / 2 - 6;
    const base = topoX + LINHAS.x * s;
    const fundo = base + desce * s;
    const x0 = (L - p.largura * s) / 2 - 34;

    useLaco(
        ref,
        t => {
            const sg = sigmaAgora(t);
            ajustarDesgaste(ref.current, sg, sg);
        },
        30,
    );

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
        <Painel colunas={1} linhas={1} rotulo={`${letra}: as linhas da fonte`} estilo={estilo}>
            <div ref={ref} style={{ position: 'absolute', inset: 0 }}>
                <svg className="fx-cartao-svg" viewBox={`0 0 ${L} ${L}`} aria-hidden>
                    <defs>
                        <FiltroDesgaste id={`${id}-f`} modo="ambos" />
                    </defs>
                    <g transform={`translate(${x0} ${base}) scale(${s})`}>
                        {p.glifos.flatMap((g, gi) => g.pedras.map((pd, pi) => <path key={`${gi}-${pi}`} d={pd.d} fill={cor} fillRule="evenodd" filter={`url(#${id}-f)`} />))}
                    </g>
                    {guia(topoX, `ALTURA DO X ${LINHAS.x}`, true)}
                    {guia(base, 'LINHA DE BASE 0', false)}
                    {guia(fundo, `DESCENDENTE ${LINHAS.descendente}`, false)}
                </svg>
            </div>
        </Painel>
    );
}
