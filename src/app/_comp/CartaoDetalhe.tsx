'use client';

import { useId, useRef, type CSSProperties } from 'react';
import Painel from './Painel';
import { FiltroDesgaste, ajustarDesgaste } from './Desgaste';
import { Etiqueta, Lupa } from './Moldura';
import { LINHAS, PALAVRAS, type Ponto } from '../_lib/glifos';
import { MEDIDAS, emSigma } from '../_lib/medidas';
import { sigmaAgora } from '../_lib/sigma';
import { useLaco } from '../_lib/movimento';

// os cartões pequenos (1 × 1) com a lupa de cabo: duas quinas da letra bem de perto, em preto, se gastando. Em cada
// quina, a mira fica no vértice do Cut (onde a quina era), as arestas do Cut seguem pontilhadas, e um traço pela
// bissetriz vai do vértice até o contorno gasto, com o tamanho dele escrito logo depois da ponta: na quina de fora,
// quanto a pedra recuou (o número cai na tinta, depois da ponta); na de dentro, quanto o vão encheu (o número cai na
// tinta do Cut, do outro lado do vértice). Os dois em branco, sobre o preto. Em unidades da fonte, da mesma conta que gerou a fonte (medidas.ts). No canto, a etiqueta com a letra
// inteira e o lugar da lupa.
const L = 413;
const CX = 207;
const CY = 205;
const R = 182;

export type Detalhe = {
    letra: string;
    cor: string; // a cor da letra da etiqueta e do traço da medida
    foco: Ponto; // o ponto da letra no centro da lupa
    zoom: number; // u por unidade da fonte
    tipo: 'fora' | 'dentro';
    guia?: { y: number; rotulo: string }; // uma linha da fonte dentro da lupa (a altura do x do b)
};

export default function CartaoDetalhe({ cfg, estilo }: { cfg: Detalhe; estilo?: CSSProperties }) {
    const id = useId().replace(/:/g, '');
    const ref = useRef<HTMLDivElement>(null);
    const tracos = useRef<(SVGPathElement | null)[]>([]);
    const rotulos = useRef<(SVGTextElement | null)[]>([]);
    const g = PALAVRAS[cfg.letra].glifos[0];
    const z = cfg.zoom;
    const naLupa = (p: Ponto): Ponto => [CX + (p[0] - cfg.foco[0]) * z, CY + (p[1] - cfg.foco[1]) * z];
    // nas quinas de fora, o que sai fica claro (o traço vai na cor, escuro); nas de dentro, o vão enche de tinta (o traço
    // vai em branco)
    const claro = cfg.tipo === 'fora';
    const quinas = (MEDIDAS[cfg.letra].quinas ?? []).map(q => {
        const contorno = g.pedras.flatMap(p => p.vertices).find(c => c.some(v => v[0] === q.v[0] && v[1] === q.v[1]))!;
        const i = contorno.findIndex(v => v[0] === q.v[0] && v[1] === q.v[1]);
        const unit = (a: Ponto) => {
            const d = Math.hypot(a[0] - q.v[0], a[1] - q.v[1]);
            return [(a[0] - q.v[0]) / d, (a[1] - q.v[1]) / d] as Ponto;
        };
        const ua = unit(contorno[(i - 1 + contorno.length) % contorno.length]);
        const ub = unit(contorno[(i + 1) % contorno.length]);
        const s = Math.hypot(ua[0] + ub[0], ua[1] + ub[1]) || 1;
        return { ...q, ua, ub, dir: [(ua[0] + ub[0]) / s, (ua[1] + ub[1]) / s] as Ponto };
    });

    useLaco(
        ref,
        t => {
            const s = sigmaAgora(t);
            ajustarDesgaste(ref.current, s, s);
            quinas.forEach((q, k) => {
                const r = emSigma(q.recuo, s);
                const [x0, y0] = naLupa(q.v);
                const [x1, y1] = naLupa([q.v[0] + q.dir[0] * r, q.v[1] + q.dir[1] * r]);
                tracos.current[k]?.setAttribute('d', `M${x0.toFixed(1)} ${y0.toFixed(1)}L${x1.toFixed(1)} ${y1.toFixed(1)}`);
                const tx = rotulos.current[k];
                if (tx) {
                    const d = claro ? r + 26 / z : -26 / z;
                    const [lx, ly] = naLupa([q.v[0] + q.dir[0] * d, q.v[1] + q.dir[1] * d]);
                    tx.setAttribute('x', lx.toFixed(1));
                    tx.setAttribute('y', (ly + 5).toFixed(1));
                    tx.textContent = `${Math.round(r)} u`;
                }
            });
        },
        30,
    );

    // a etiqueta: a letra inteira com a maiúscula (ou a ascendente) em ~74 u
    const alturaEtiqueta = cfg.letra === cfg.letra.toUpperCase() ? LINHAS.maiuscula : LINHAS.ascendente;
    const se = 74 / alturaEtiqueta;
    const larg = PALAVRAS[cfg.letra].largura;
    const ex = (112 - larg * se) / 2;
    const eb = 20 + alturaEtiqueta * se;
    const aresta = (q: (typeof quinas)[number], u: Ponto) => {
        const [x0, y0] = naLupa(q.v);
        return `M${x0.toFixed(1)} ${y0.toFixed(1)}l${(u[0] * 110 * z).toFixed(1)} ${(u[1] * 110 * z).toFixed(1)}`;
    };
    return (
        <Painel colunas={1} linhas={1} rotulo={`${cfg.letra}: ${cfg.tipo === 'fora' ? 'quanto as quinas recuam' : 'quanto os vãos enchem'}`} estilo={estilo}>
            <div ref={ref} style={{ position: 'absolute', inset: 0 }}>
                <svg className="fx-cartao-svg" viewBox={`0 0 ${L} ${L}`} aria-hidden>
                    <defs>
                        <FiltroDesgaste id={`${id}-f`} modo="ambos" />
                    </defs>
                    <Lupa id={`${id}-lupa`} cx={CX} cy={CY} r={R}>
                        <g transform={`translate(${CX} ${CY}) scale(${z}) translate(${-cfg.foco[0]} ${-cfg.foco[1]})`}>
                            {g.pedras.map((p, i) => (
                                <path key={i} d={p.d} fill="#111" fillRule="evenodd" filter={`url(#${id}-f)`} />
                            ))}
                        </g>
                        {cfg.guia && (
                            <g>
                                <path d={`M${CX - R} ${naLupa([0, cfg.guia.y])[1]}H${CX + R}`} stroke="#9a9a9a" strokeWidth="5" opacity="0.85" />
                                <text className="fx-guia-rotulo" x={CX - 100} y={naLupa([0, cfg.guia.y])[1] + 22} fill="#fff">
                                    {cfg.guia.rotulo}
                                </text>
                            </g>
                        )}
                        {quinas.map((q, k) => (
                            <path key={`a${k}`} d={aresta(q, q.ua) + aresta(q, q.ub)} stroke={claro ? '#111' : '#fff'} strokeWidth="1.6" strokeDasharray="2 4" strokeLinecap="round" fill="none" />
                        ))}
                        {quinas.map((q, k) => (
                            <path
                                key={`t${k}`}
                                ref={el => {
                                    tracos.current[k] = el;
                                }}
                                d=""
                                stroke={cfg.cor}
                                strokeWidth="4"
                                strokeLinecap="round"
                            />
                        ))}
                        {quinas.map((q, k) => {
                            const [x, y] = naLupa(q.v);
                            return (
                                <g key={`m${k}`}>
                                    <circle cx={x} cy={y} r="9.5" fill="#fff" stroke="#111" strokeWidth="1.5" />
                                    <path d={`M${x - 4.5} ${y - 4.5}L${x + 4.5} ${y + 4.5}M${x + 4.5} ${y - 4.5}L${x - 4.5} ${y + 4.5}`} stroke="#111" strokeWidth="1.4" />
                                    <text
                                        ref={el => {
                                            rotulos.current[k] = el;
                                        }}
                                        className="fx-raio"
                                        x={x}
                                        y={y}
                                        textAnchor="middle"
                                        fill="#fff"
                                    >
                                        0 u
                                    </text>
                                </g>
                            );
                        })}
                    </Lupa>
                    <text className="fx-guia-rotulo" x="12" y="20" fill="#111">
                        {cfg.tipo === 'fora' ? 'QUINAS DE FORA' : 'QUINAS DE DENTRO'}
                    </text>
                    <text className="fx-guia-rotulo" x="12" y="37" fill="#111" opacity="0.6">
                        {cfg.tipo === 'fora' ? 'QUANTO RECUAM' : 'QUANTO ENCHEM'}
                    </text>
                </svg>
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
