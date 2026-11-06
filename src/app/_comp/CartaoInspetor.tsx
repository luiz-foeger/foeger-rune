'use client';

import { useId, useMemo, useRef, type CSSProperties } from 'react';
import Painel from './Painel';
import { FiltroDesgaste, ajustarDesgaste } from './Desgaste';
import { Faixas, Ferramentas, Janela, ReguaV, SetaLupa, Transferidor } from './Moldura';
import { LINHAS, PALAVRAS, type Ponto } from '../_lib/glifos';
import { arco, quinaPerto, quinasDe, raioDe, type Quina } from '../_lib/geometria';
import { suave, useLaco, vaiEVolta } from '../_lib/movimento';

// o cartão grande (2 × 2) que inspeciona uma letra, como o "S" e o "A" da Feixen: a letra inteira com os nós e as
// coordenadas, uma lente de transferidor ampliando um trecho (com retícula de pontos e o contorno preto), os círculos
// do raio das quinas, as leituras dos controles e a janela com os dois controles (quinas de fora e de dentro).
// Os nós são as quinas da Cut: quando a quina se gasta, o nó vira dois (os pontos de tangência do arco).
const L = 885; // o cartão tem 885 × 885

export type Inspetor = {
    letra: string;
    cor: string;
    corPontos: string;
    escala: number; // u por unidade da fonte, na letra inteira
    capTopo: number; // onde fica o topo da maiúscula, no cartão
    foco: Ponto; // o ponto da letra que fica no centro da lente
    zoom: number; // u por unidade, dentro da lente
    raioLente: number;
    marcar: Ponto[]; // perto de quais quinas a lente mostra o círculo do raio
    roteiro: 'sequencia' | 'dentro';
    maxFora: number;
    maxDentro: number;
    janela: CSSProperties;
    ficha?: { codigo: string; focoMiniatura: Ponto; marcarMiniatura: Ponto[] };
};

const dois = (n: number) => n.toFixed(2);
const pct = (s: number, max: number) => (max > 0 ? (100 * s) / max : 0).toFixed(2).padStart(5, '0');
function estiloDe(f: number, d: number) {
    if (f > 1 && d < 1) return 'SÓ FORA';
    if (d > 1 && f < 1) return 'SÓ DENTRO';
    const m = (f + d) / 2;
    return m < 13 ? 'CUT' : m < 38 ? 'POLISHED' : 'WORN';
}

// o roteiro dos controles: o de fora sobe, depois o de dentro, e os dois descem juntos (S); ou só o de dentro (A)
function roteiro(t: number, tipo: Inspetor['roteiro']) {
    if (tipo === 'dentro') return { f: 0, d: vaiEVolta(t, { parado0: 0.7, sobe: 1.4, parado1: 1.3, desce: 1.4 }) };
    const p = t % 8;
    const seg = (a: number, b: number) => suave((p - a) / (b - a));
    if (p < 0.8) return { f: 0, d: 0 };
    if (p < 2.0) return { f: seg(0.8, 2.0), d: 0 };
    if (p < 3.0) return { f: 1, d: 0 };
    if (p < 4.2) return { f: 1, d: seg(3.0, 4.2) };
    if (p < 5.4) return { f: 1, d: 1 };
    if (p < 6.8) return { f: 1 - seg(5.4, 6.8), d: 1 - seg(5.4, 6.8) };
    return { f: 0, d: 0 };
}

export default function CartaoInspetor({ cfg, estilo }: { cfg: Inspetor; estilo?: CSSProperties }) {
    const id = useId().replace(/:/g, '');
    const ref = useRef<HTMLDivElement>(null);
    const nos = useRef<(SVGCircleElement | null)[]>([]);
    const nosLente = useRef<(SVGCircleElement | null)[]>([]);
    const alcas = useRef<(SVGPathElement | null)[]>([]);
    const rotulos = useRef<(SVGTextElement | null)[]>([]);
    const circulos = useRef<(SVGGElement | null)[]>([]);
    const leituras = useRef<(SVGTextElement | null)[]>([]);
    const pegadores = useRef<(HTMLSpanElement | null)[]>([]);
    const estiloFicha = useRef<HTMLSpanElement>(null);
    const seta = useRef<SVGSVGElement>(null);

    const g = PALAVRAS[cfg.letra].glifos[0];
    const largura = PALAVRAS[cfg.letra].largura;
    const s = cfg.escala;
    const x0 = (L - largura * s) / 2;
    const base = cfg.capTopo + LINHAS.maiuscula * s;
    const naCarta = (p: Ponto): Ponto => [x0 + p[0] * s, base + p[1] * s];
    const centro = naCarta(cfg.foco);
    const z = cfg.zoom;
    const naLente = (p: Ponto): Ponto => [centro[0] + (p[0] - cfg.foco[0]) * z, centro[1] + (p[1] - cfg.foco[1]) * z];
    const dentroDaLente = (p: Ponto) => Math.hypot(p[0] - centro[0], p[1] - centro[1]) < cfg.raioLente + 6;

    const quinas = useMemo(() => g.pedras.flatMap(p => quinasDe(p.vertices)), [g]);
    // o canto da caixa da letra (onde começa o ladrilho da retícula)
    const canto = useMemo(() => {
        const pts = g.pedras.flatMap(p => p.vertices.flat());
        return { x: Math.min(...pts.map(p => p[0])), y: Math.min(...pts.map(p => p[1])) };
    }, [g]);
    const marcadas = useMemo(() => cfg.marcar.map(m => quinas.indexOf(quinaPerto(quinas, m))), [cfg.marcar, quinas]);
    // a direção de cada rótulo: para fora, a partir do meio da letra
    const meio: Ponto = [largura / 2, -LINHAS.maiuscula / 2];

    const sigmaDe = (q: Quina, f: number, d: number) => (q.convexa ? f : d);
    const modo = cfg.roteiro === 'dentro' ? 'dentro' : 'livre';

    useLaco(ref, t => {
        const { f, d } = roteiro(t, cfg.roteiro);
        const sf = f * cfg.maxFora;
        const sd = d * cfg.maxDentro;
        ajustarDesgaste(ref.current, sf, sd);
        quinas.forEach((q, i) => {
            const sg = sigmaDe(q, sf, sd);
            const a = arco(q, raioDe(sg));
            const unico = sg < 1.5;
            const pts = unico ? [q.v, q.v] : [a.p, a.t];
            pts.forEach((pt, k) => {
                const c = nos.current[i * 2 + k];
                if (c) {
                    const [x, y] = naCarta(pt);
                    c.setAttribute('cx', x.toFixed(1));
                    c.setAttribute('cy', y.toFixed(1));
                }
                const cl = nosLente.current[i * 2 + k];
                if (cl) {
                    const [x, y] = naLente(pt);
                    cl.setAttribute('cx', x.toFixed(1));
                    cl.setAttribute('cy', y.toFixed(1));
                }
            });
            const al = alcas.current[i];
            if (al) {
                if (unico) al.setAttribute('d', '');
                else {
                    const [px, py] = naLente(a.p);
                    const [vx, vy] = naLente(q.v);
                    const [tx, ty] = naLente(a.t);
                    al.setAttribute('d', `M${px.toFixed(1)} ${py.toFixed(1)}L${vx.toFixed(1)} ${vy.toFixed(1)}L${tx.toFixed(1)} ${ty.toFixed(1)}`);
                }
            }
            const rt = rotulos.current[i];
            if (rt) rt.textContent = `${dois(pts[0][0])};${dois(-pts[0][1])}`;
        });
        marcadas.forEach((qi, k) => {
            const el = circulos.current[k];
            if (!el) return;
            const q = quinas[qi];
            const sg = sigmaDe(q, sf, sd);
            const a = arco(q, Math.max(6, raioDe(sg)));
            const [x, y] = naLente(a.centro);
            el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
            const c = el.firstElementChild as SVGCircleElement | null;
            c?.setAttribute('r', (a.r * z).toFixed(1));
            const tx = el.lastElementChild as SVGTextElement | null;
            if (tx) tx.textContent = `${Math.round(sg < 1.5 ? 0 : a.r)}u`;
        });
        const textos = [`FORA     ${pct(sf, 50)}`, `DENTRO   ${pct(sd, 50)}`, `ESTILO   ${estiloDe(sf, sd)}`];
        leituras.current.forEach((el, i) => {
            if (el) el.textContent = textos[i % 3];
        });
        if (pegadores.current[0]) pegadores.current[0].style.left = `${(100 * sf / 50).toFixed(2)}%`;
        if (pegadores.current[1]) pegadores.current[1].style.left = `${(100 * sd / 50).toFixed(2)}%`;
        if (estiloFicha.current) estiloFicha.current.textContent = estiloDe(sf, sd);
        if (seta.current) {
            const ang = ((128 + 26 * Math.sin(t * 0.55)) * Math.PI) / 180;
            const x = centro[0] + Math.cos(ang) * (cfg.raioLente + 6) - 20;
            const y = centro[1] + Math.sin(ang) * (cfg.raioLente + 6) - 30;
            seta.current.style.left = `calc(${x.toFixed(1)} * var(--u))`;
            seta.current.style.top = `calc(${y.toFixed(1)} * var(--u))`;
        }
    }, 30);

    const pedras = (fill: string, filtro?: string) =>
        g.pedras.map((p, i) => <path key={i} d={p.d} fill={fill} fillRule="evenodd" filter={filtro ? `url(#${filtro})` : undefined} />);

    const ficha = cfg.ficha;
    const mini = ficha ? { foco: ficha.focoMiniatura, z: 0.55 } : null;
    return (
        <Painel colunas={2} linhas={2} rotulo={`${cfg.letra}, de perto`} estilo={estilo}>
            <div ref={ref} style={{ position: 'absolute', inset: 0 }}>
                <svg className="fx-cartao-svg" viewBox={`0 0 ${L} ${L}`} aria-hidden>
                    <defs>
                        <FiltroDesgaste id={`${id}-f`} modo={modo} />
                        {/* na lente: o contorno preto fino e a retícula de pontos, feitos dentro do próprio filtro */}
                        <FiltroDesgaste id={`${id}-fl`} modo={modo} contorno="#111" raioContorno={1.5 / z} pontos={{ cor: cfg.corPontos, passo: 5.5 / z, ...canto }} />
                    </defs>
                    <Faixas topos={[cfg.capTopo, base - LINHAS.x * s, base - 27]} x1={L - 57} />
                    <g transform={`translate(${x0} ${base}) scale(${s})`}>{pedras(cfg.cor, `${id}-f`)}</g>
                    {quinas.map((q, i) =>
                        [0, 1].map(k => (
                            <circle
                                key={`${i}-${k}`}
                                ref={el => {
                                    nos.current[i * 2 + k] = el;
                                }}
                                cx={naCarta(q.v)[0]}
                                cy={naCarta(q.v)[1]}
                                r="5.5"
                                fill="#fff"
                                stroke="#111"
                                strokeWidth="1.4"
                            />
                        )),
                    )}
                    {quinas.map((q, i) => {
                        const [x, y] = naCarta(q.v);
                        if (dentroDaLente([x, y])) return null;
                        const dx = q.v[0] - meio[0];
                        const dy = q.v[1] - meio[1];
                        const n = Math.hypot(dx, dy) || 1;
                        return (
                            <text
                                key={i}
                                ref={el => {
                                    rotulos.current[i] = el;
                                }}
                                x={x + (dx / n) * 16}
                                y={y + (dy / n) * 16 + 5}
                                textAnchor={dx >= 0 ? 'start' : 'end'}
                                className="fx-coordenada"
                            >
                                {`${dois(q.v[0])};${dois(-q.v[1])}`}
                            </text>
                        );
                    })}
                    <Transferidor id={`${id}-lente`} cx={centro[0]} cy={centro[1]} r={cfg.raioLente}>
                        <g transform={`translate(${centro[0]} ${centro[1]}) scale(${z}) translate(${-cfg.foco[0]} ${-cfg.foco[1]})`}>{pedras(cfg.cor, `${id}-fl`)}</g>
                        {quinas.map((_, i) => (
                            <path
                                key={i}
                                ref={el => {
                                    alcas.current[i] = el;
                                }}
                                d=""
                                stroke="#111"
                                strokeWidth="1.2"
                                fill="none"
                            />
                        ))}
                        {marcadas.map((qi, k) => (
                            <g
                                key={k}
                                ref={el => {
                                    circulos.current[k] = el;
                                }}
                            >
                                <circle r="10" fill="none" stroke="#111" strokeWidth="1.5" />
                                <text className="fx-raio" textAnchor="middle" y="5" fill="#111">
                                    0u
                                </text>
                            </g>
                        ))}
                        {quinas.map((q, i) =>
                            [0, 1].map(k => (
                                <circle
                                    key={`${i}-${k}`}
                                    ref={el => {
                                        nosLente.current[i * 2 + k] = el;
                                    }}
                                    cx={naLente(q.v)[0]}
                                    cy={naLente(q.v)[1]}
                                    r="7"
                                    fill="#fff"
                                    stroke="#111"
                                    strokeWidth="1.6"
                                />
                            )),
                        )}
                        <g className="fx-leitura" transform={`translate(${centro[0] - cfg.raioLente * 0.72} ${centro[1] - cfg.raioLente * 0.5})`}>
                            {[0, 1, 2].map(i => (
                                <text
                                    key={i}
                                    y={i * 13.5}
                                    ref={el => {
                                        leituras.current[i] = el;
                                    }}
                                />
                            ))}
                        </g>
                    </Transferidor>
                    <g className="fx-leitura" transform="translate(708 68)">
                        {[0, 1, 2].map(i => (
                            <text
                                key={i}
                                y={i * 13.5}
                                ref={el => {
                                    leituras.current[3 + i] = el;
                                }}
                            />
                        ))}
                    </g>
                </svg>

                <Ferramentas lupa />
                <ReguaV altura={L} />
                <Janela
                    itens={[
                        { nome: 'QUINAS DE FORA', cor: 'var(--laranja)' },
                        { nome: 'QUINAS DE DENTRO', cor: 'var(--roxo)' },
                    ]}
                    pegadores={pegadores}
                    escura
                    estilo={{ ...cfg.janela, width: 'calc(197 * var(--u))' }}
                />
                {ficha && mini && (
                    <div className="fx-ficha" aria-hidden>
                        <div className="fx-ficha-icones">
                            <svg viewBox="0 0 40 40">
                                <circle cx="20" cy="20" r="11" fill="none" stroke="#111" strokeWidth="2.4" />
                                <circle cx="20" cy="20" r="5" fill="#111" />
                                <path d="M20 3v34M3 20h34" stroke="#111" strokeWidth="2" />
                            </svg>
                            <svg viewBox="0 0 60 40">
                                <path d="M4 12L56 4V36L4 28Z" fill="none" stroke="#111" strokeWidth="1.8" />
                                <path d="M14 20h32" stroke="#111" strokeWidth="1.6" strokeDasharray="4 3" />
                            </svg>
                            <span className="fx-ficha-letra">{cfg.letra}</span>
                        </div>
                        <div className="fx-ficha-codigo">{ficha.codigo}</div>
                        <div className="fx-ficha-linha">FÖEGER RUNE</div>
                        <div className="fx-ficha-linha">
                            <span ref={estiloFicha}>CUT</span>
                        </div>
                        <svg className="fx-ficha-mini" viewBox="0 0 116 168">
                            <g transform={`translate(58 84) scale(${mini.z}) translate(${-mini.foco[0]} ${-mini.foco[1]})`}>{pedras('#111')}</g>
                            {ficha.marcarMiniatura.map((m, k) => {
                                const q = quinaPerto(quinas, m);
                                const [x, y] = [58 + (q.v[0] - mini.foco[0]) * mini.z, 84 + (q.v[1] - mini.foco[1]) * mini.z];
                                return <circle key={k} cx={x} cy={y} r="13" fill="#fff" stroke="#111" strokeWidth="1.4" />;
                            })}
                        </svg>
                    </div>
                )}
                <SetaLupa ref={seta} />
            </div>
        </Painel>
    );
}
