'use client';

import { useRef, type CSSProperties } from 'react';
import Painel from './Painel';
import { ESTILOS } from '../_lib/medidas';
import { segurarSigma, sigmaAgora, sigmaNaMao } from '../_lib/sigma';
import { useLaco } from '../_lib/movimento';

// o cartão da régua do desgaste (2 × 1): o σ que move os cartões da seção, de 0 a 50 unidades da fonte, com os três
// estilos marcados onde eles saem do desfoque (Cut 0, Polished 26, Worn 50) e o a de cada fonte de verdade em cima da
// sua marca (o miolo dele fecha na Worn). O pegador anda sozinho; com o mouse em cima (ou o dedo arrastando), ele segue
// o ponteiro e os cartões vão junto. O par do meio fica de fora: o Y tem a divisa dele e o A anda com ela (divisa.ts).
const L = 885;
const A = 413;
const X0 = 70;
const X1 = 815;
const Y = 300;
const xDe = (s: number) => X0 + ((X1 - X0) * s) / 50;
const CORES = ['var(--p-cut)', 'var(--p-polished)', 'var(--p-worn)'];
const FAMILIAS = ['var(--ff-cut)', 'var(--ff-polished)', 'var(--ff-worn)'];

export default function CartaoRegua({ estilo }: { estilo?: CSSProperties }) {
    const ref = useRef<HTMLDivElement>(null);
    const caixa = useRef<SVGSVGElement>(null);
    const pegador = useRef<SVGGElement>(null);
    const valor = useRef<SVGTextElement>(null);
    const nome = useRef<SVGTextElement>(null);
    const amostras = useRef<(SVGGElement | null)[]>([]);
    const seta = useRef<SVGPathElement>(null);
    const arrastando = useRef(false);

    useLaco(ref, t => {
        const s = sigmaAgora(t);
        pegador.current?.setAttribute('transform', `translate(${xDe(s).toFixed(1)} ${Y})`);
        if (valor.current) valor.current.textContent = `σ ${Math.round(s)}`;
        const perto = ESTILOS.reduce((a, b) => (Math.abs(b.sigma - s) < Math.abs(a.sigma - s) ? b : a));
        if (nome.current) nome.current.textContent = Math.abs(perto.sigma - s) < 1.5 ? perto.nome.toUpperCase() : 'ENTRE ESTILOS';
        amostras.current.forEach((el, i) => el?.setAttribute('opacity', (0.28 + 0.72 * Math.max(0, 1 - Math.abs(ESTILOS[i].sigma - s) / 13)).toFixed(2)));
        // a seta desenhada só aparece quando o pegador anda sozinho
        seta.current?.setAttribute('opacity', sigmaNaMao() ? '0' : '1');
    });

    const sigmaDoPonteiro = (e: React.PointerEvent) => {
        const r = caixa.current!.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * L;
        return ((x - X0) / (X1 - X0)) * 50;
    };
    const tracos: string[] = [];
    for (let s = 0; s <= 50; s += 2) tracos.push(`M${xDe(s)} ${Y - (s % 10 === 0 ? 14 : 7)}V${Y}`);

    return (
        <Painel colunas={2} linhas={1} rotulo="O desgaste: σ em unidades da fonte" estilo={estilo}>
            <div ref={ref} style={{ position: 'absolute', inset: 0 }}>
                <svg
                    ref={caixa}
                    className="fx-cartao-svg fx-regua-sigma"
                    viewBox={`0 0 ${L} ${A}`}
                    onPointerDown={e => {
                        arrastando.current = true;
                        caixa.current?.setPointerCapture(e.pointerId);
                        segurarSigma(sigmaDoPonteiro(e));
                    }}
                    onPointerMove={e => {
                        if (arrastando.current || e.pointerType === 'mouse') segurarSigma(sigmaDoPonteiro(e));
                    }}
                    onPointerLeave={() => {
                        if (!arrastando.current) segurarSigma(null);
                    }}
                    onPointerUp={e => {
                        arrastando.current = false;
                        // com o mouse, ele continua seguindo até sair da régua; com o dedo, solta
                        if (e.pointerType !== 'mouse') segurarSigma(null);
                    }}
                    onPointerCancel={() => {
                        arrastando.current = false;
                        segurarSigma(null);
                    }}
                    aria-hidden
                >
                    <text className="fx-guia-rotulo" x={X0 - 40} y="40" fill="#111">
                        DESGASTE
                    </text>
                    <text className="fx-guia-rotulo" x={X0 - 40} y="58" fill="#111" opacity="0.6">
                        σ DO DESFOQUE, EM UNIDADES DA FONTE
                    </text>
                    <text ref={valor} className="fx-sigma-valor" x={X1 + 30} y="66" textAnchor="end">
                        σ 0
                    </text>
                    <text ref={nome} className="fx-guia-rotulo" x={X1 + 30} y="90" textAnchor="end" fill="#111" opacity="0.6">
                        CUT
                    </text>
                    {/* o a de cada estilo, da fonte de verdade, em cima da marca dele */}
                    {ESTILOS.map((e, i) => (
                        <g
                            key={e.nome}
                            ref={el => {
                                amostras.current[i] = el;
                            }}
                        >
                            <text x={xDe(e.sigma)} y={Y - 44} textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'} className="fx-sigma-amostra" style={{ fontFamily: FAMILIAS[i] }} fill={CORES[i]}>
                                a
                            </text>
                        </g>
                    ))}
                    <path d={`M${X0} ${Y}H${X1}`} stroke="#111" strokeWidth="1.4" />
                    <path d={tracos.join('')} stroke="#111" strokeWidth="1.1" />
                    {[10, 20, 30, 40].map(s => (
                        <text key={s} className="fx-guia-rotulo" x={xDe(s)} y={Y + 24} textAnchor="middle" fill="#111" opacity="0.6">
                            {s}
                        </text>
                    ))}
                    {ESTILOS.map((e, i) => (
                        <g key={e.nome}>
                            <circle cx={xDe(e.sigma)} cy={Y} r="5" fill={CORES[i]} stroke="#111" strokeWidth="1.2" />
                            <text className="fx-guia-rotulo" x={xDe(e.sigma)} y={Y + 52} textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'} fill="#111">
                                {e.nome.toUpperCase()} {e.sigma}
                            </text>
                        </g>
                    ))}
                    <g ref={pegador} transform={`translate(${X0} ${Y})`} style={{ pointerEvents: 'none' }}>
                        <circle r="12" fill="var(--p-quente)" stroke="#111" strokeWidth="1.5" />
                        <path ref={seta} d="M6 8l0 22 6-6 5 10 4-2-5-10 8 0z" fill="#fff" stroke="#111" strokeWidth="1.3" strokeLinejoin="round" />
                    </g>
                </svg>
            </div>
        </Painel>
    );
}
