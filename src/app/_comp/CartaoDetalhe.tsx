'use client';

import { useId, useMemo, useRef, type CSSProperties } from 'react';
import Painel from './Painel';
import { FiltroDesgaste, ajustarDesgaste } from './Desgaste';
import { Etiqueta, Ferramentas, Lupa } from './Moldura';
import { LINHAS, PALAVRAS, type Ponto } from '../_lib/glifos';
import { arco, quinaPerto, quinasDe, raioDe } from '../_lib/geometria';
import { useLaco, vaiEVolta } from '../_lib/movimento';

// os cartões pequenos (1 × 1) com a lupa de cabo, como o "R", o "H" e o "b" da Feixen: um trecho da letra bem de
// perto, em preto, se gastando; nas duas quinas marcadas, o círculo de mira no centro do arco com o raio escrito e as
// arestas originais pontilhadas até a quina viva. No canto, a etiqueta com a letra inteira e o lugar da lupa.
const L = 413;
const CX = 207;
const CY = 205;
const R = 182;

export type Detalhe = {
    letra: string;
    cor: string; // a cor da letra da etiqueta
    foco: Ponto; // o ponto da letra no centro da lupa
    zoom: number; // u por unidade da fonte
    marcar: Ponto[]; // perto de quais quinas vão os círculos de mira
    modo: 'fora' | 'dentro';
    max: number; // o σ máximo
    atraso: number; // segundos, para os cartões não andarem juntos
    guia?: { y: number; rotulo: string }; // uma linha da fonte dentro da lupa (a altura do x do b)
};

export default function CartaoDetalhe({ cfg, estilo }: { cfg: Detalhe; estilo?: CSSProperties }) {
    const id = useId().replace(/:/g, '');
    const ref = useRef<HTMLDivElement>(null);
    const miras = useRef<(SVGGElement | null)[]>([]);
    const pontilhados = useRef<(SVGPathElement | null)[]>([]);
    const g = PALAVRAS[cfg.letra].glifos[0];
    const quinas = useMemo(() => g.pedras.flatMap(p => quinasDe(p.vertices)), [g]);
    const marcadas = useMemo(() => cfg.marcar.map(m => quinaPerto(quinas, m, q => (cfg.modo === 'fora' ? q.convexa : !q.convexa))), [cfg, quinas]);
    const z = cfg.zoom;
    // nas quinas de fora, o canto que sai fica claro (o pontilhado vai escuro) e o centro do arco cai na tinta (o raio
    // vai em branco); nas de dentro, o contrário
    const escuroNaQuina = cfg.modo === 'fora';
    const naLupa = (p: Ponto): Ponto => [CX + (p[0] - cfg.foco[0]) * z, CY + (p[1] - cfg.foco[1]) * z];

    useLaco(ref, t => {
        const sigma = cfg.max * vaiEVolta(t + cfg.atraso, { parado0: 0.7, sobe: 1.2, parado1: 1.1, desce: 1.2 });
        ajustarDesgaste(ref.current, cfg.modo === 'fora' ? sigma : 0, cfg.modo === 'dentro' ? sigma : 0);
        marcadas.forEach((q, k) => {
            const a = arco(q, Math.max(4, raioDe(sigma)));
            const el = miras.current[k];
            if (el) {
                const [x, y] = naLupa(a.centro);
                el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
                const tx = el.lastElementChild as SVGTextElement | null;
                if (tx) tx.textContent = `${Math.round(sigma < 1 ? 0 : a.r)}u`;
            }
            const pt = pontilhados.current[k];
            if (pt) {
                const [px, py] = naLupa(a.p);
                const [vx, vy] = naLupa(q.v);
                const [tx, ty] = naLupa(a.t);
                pt.setAttribute('d', `M${px.toFixed(1)} ${py.toFixed(1)}L${vx.toFixed(1)} ${vy.toFixed(1)}L${tx.toFixed(1)} ${ty.toFixed(1)}`);
            }
        });
    }, 30);

    // a etiqueta: a letra inteira com a maiúscula (ou a altura do x) em ~80 u
    const alturaEtiqueta = cfg.letra === cfg.letra.toUpperCase() ? LINHAS.maiuscula : LINHAS.ascendente;
    const se = 74 / alturaEtiqueta;
    const larg = PALAVRAS[cfg.letra].largura;
    const ex = (112 - larg * se) / 2;
    const eb = 20 + alturaEtiqueta * se;
    return (
        <Painel colunas={1} linhas={1} rotulo={`${cfg.letra}, de perto`} estilo={estilo}>
            <div ref={ref} style={{ position: 'absolute', inset: 0 }}>
                <svg className="fx-cartao-svg" viewBox={`0 0 ${L} ${L}`} aria-hidden>
                    <defs>
                        <FiltroDesgaste id={`${id}-f`} modo={cfg.modo} />
                    </defs>
                    <Lupa id={`${id}-lupa`} cx={CX} cy={CY} r={R}>
                        <g transform={`translate(${CX} ${CY}) scale(${z}) translate(${-cfg.foco[0]} ${-cfg.foco[1]})`}>
                            {g.pedras.map((p, i) => (
                                <path key={i} d={p.d} fill="#111" fillRule="evenodd" filter={`url(#${id}-f)`} />
                            ))}
                        </g>
                        {cfg.guia && (
                            <g>
                                <path
                                    d={`M${CX - R} ${naLupa([0, cfg.guia.y])[1]}H${CX + R}`}
                                    stroke="#9a9a9a"
                                    strokeWidth="5"
                                    opacity="0.85"
                                />
                                <text className="fx-guia-rotulo" x={CX + 40} y={naLupa([0, cfg.guia.y])[1] + 19} fill="#fff">
                                    {cfg.guia.rotulo}
                                </text>
                            </g>
                        )}
                        {marcadas.map((_, k) => (
                            <path
                                key={k}
                                ref={el => {
                                    pontilhados.current[k] = el;
                                }}
                                d=""
                                stroke={escuroNaQuina ? '#111' : '#fff'}
                                strokeWidth="1.6"
                                strokeDasharray="2 4"
                                strokeLinecap="round"
                                fill="none"
                            />
                        ))}
                        {marcadas.map((_, k) => (
                            <g
                                key={k}
                                ref={el => {
                                    miras.current[k] = el;
                                }}
                            >
                                <circle r="9.5" fill="#fff" stroke="#111" strokeWidth="1.5" />
                                <path d="M-4.5 -4.5L4.5 4.5M4.5 -4.5L-4.5 4.5" stroke="#111" strokeWidth="1.4" />
                                <text className="fx-raio" x={k === 0 ? -14 : 14} y={k === 0 ? -14 : 26} textAnchor={k === 0 ? 'end' : 'start'} fill={escuroNaQuina ? '#fff' : '#111'}>
                                    0u
                                </text>
                            </g>
                        ))}
                    </Lupa>
                </svg>
                <Ferramentas />
                <Etiqueta>
                    <svg viewBox="0 0 112 115">
                        <g transform={`translate(${ex} ${eb}) scale(${se})`}>
                            {g.pedras.map((p, i) => (
                                <path key={i} d={p.d} fill={cfg.cor} fillRule="evenodd" />
                            ))}
                        </g>
                        <circle cx={ex + cfg.foco[0] * se} cy={eb + cfg.foco[1] * se} r="14" fill="none" stroke="#111" strokeWidth="1.4" />
                    </svg>
                </Etiqueta>
            </div>
        </Painel>
    );
}
