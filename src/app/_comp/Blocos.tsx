'use client';

import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from 'react';
import Painel from './Painel';
import { PALAVRAS, type Palavra } from '../_lib/glifos';
import { PALAVRAS_EXTRA } from '../_lib/glifos-extra';

// os blocos do desgaste, no lugar da grade de cartões com lupa e transferidor: em cada cartão, a letra dividida por
// uma divisa. À esquerda, a pedra nova (o Cut, cheio); à direita, a pedra gasta (o Worn), com a hachura do que o
// tempo levou e as linhas do Cut (tracejada, em preto) e do Polished por cima. A divisa do cartão grande vai e vem sozinha; nas
// outras, ela fica no meio. Em todas, segue o mouse quando ele passa por cima.
const M = 413;
const G = 59;
const tam = (n: number) => n * M + (n - 1) * G;
const PAL: Record<string, Palavra> = { ...PALAVRAS, ...PALAVRAS_EXTRA };
const ROTULO = { fontFamily: 'var(--ff-ui)', fontSize: 15, letterSpacing: '0.04em' } as CSSProperties;
const SEM_TROCAS = { fontFeatureSettings: '"calt" 0, "kern" 0' } as CSSProperties;

// as fontes Polished e Worn foram geradas com espaçamento próprio (desgastes.js da fonte: a letra anda para a esquerda
// o que a ponta recuou mais o aperto, e o avanço encolhe; o x do Worn tem 473, o do Cut 597). Para cair em cima do
// Cut, cada letra anda até o centro da tinta coincidir com o centro do polígono do Cut (a altura já é a mesma). Os
// desvios saem das caixas exatas dos .otf do site, em unidades da fonte.
const DESVIOS: Record<string, { polished: number; worn: number }> = {
    E: { polished: 12, worn: 18.8 },
    i: { polished: 11.5, worn: 19.5 },
    '!': { polished: 15.3, worn: 25 },
    R: { polished: 24, worn: 42.1 },
    H: { polished: 14.6, worn: 24 },
    Y: { polished: 34, worn: 61.7 },
};

type Bloco = { chave: string; col: number; lin: number; lugar: CSSProperties; anda?: boolean };
const BLOCOS: Bloco[] = [
    { chave: 'Y', col: 2, lin: 2, lugar: { gridColumn: '1 / span 2', gridRow: '1 / span 2' }, anda: true },
    { chave: 'R', col: 1, lin: 1, lugar: { gridColumn: '3', gridRow: '1' } },
    { chave: 'H', col: 1, lin: 1, lugar: { gridColumn: '4', gridRow: '1' } },
    { chave: 'Ei!', col: 2, lin: 1, lugar: { gridColumn: '3 / span 2', gridRow: '2' } },
];

// a letra centrada no painel pela caixa da tinta
function encaixe(p: Palavra, W: number, H: number) {
    const vs = p.glifos.flatMap(g => g.pedras.flatMap(pd => pd.vertices.flat()));
    const [xa, xb] = [Math.min(...vs.map(v => v[0])), Math.max(...vs.map(v => v[0]))];
    const [ya, yb] = [Math.min(...vs.map(v => v[1])), Math.max(...vs.map(v => v[1]))];
    const s = Math.min((W - 140) / (xb - xa), (H - 140) / (yb - ya));
    return { s, x0: (W - (xb - xa) * s) / 2 - xa * s, base: (H - (yb - ya) * s) / 2 - ya * s };
}

const Cut = ({ p, ...resto }: { p: Palavra } & React.SVGProps<SVGPathElement>) => (
    <>{p.glifos.flatMap((g, gi) => g.pedras.map((pd, pi) => <path key={`${gi}-${pi}`} d={pd.d} fillRule="evenodd" {...resto} />))}</>
);

// a letra numa das fontes gastas, no lugar do Cut; com "linha" (em unidades da fonte), só o contorno
function Gasta({ p, fam, cor, linha }: { p: Palavra; fam: 'polished' | 'worn'; cor: string; linha?: number }) {
    return (
        <>
            {p.glifos.map((gl, gi) => (
                <text
                    key={gi}
                    x={gl.x + (DESVIOS[gl.ch]?.[fam] ?? 0)}
                    y={0}
                    fontSize={1000}
                    style={{ fontFamily: `var(--ff-${fam})`, ...SEM_TROCAS }}
                    fill={linha ? 'none' : cor}
                    stroke={linha ? cor : undefined}
                    strokeWidth={linha}
                >
                    {gl.ch}
                </text>
            ))}
        </>
    );
}

function CartaoDivisa({ cfg }: { cfg: Bloco }) {
    const p = PAL[cfg.chave];
    const W = tam(cfg.col);
    const H = tam(cfg.lin);
    const grande = cfg.col * cfg.lin >= 4;
    const pequeno = cfg.col * cfg.lin === 1;
    const id = useId().replace(/:/g, '');
    const { s, x0, base } = encaixe(p, W, grande ? H - 60 : H);
    const esq = useRef<SVGRectElement>(null);
    const dir = useRef<SVGRectElement>(null);
    const alca = useRef<SVGGElement>(null);
    const caixa = useRef<SVGSVGElement>(null);
    const mouse = useRef<number | null>(null);
    const passo = 10 / s;
    const cy = grande ? H / 2 - 30 : H / 2;

    useEffect(() => {
        let quadro = 0;
        let x = W / 2;
        const t0 = performance.now();
        const anda = (agora: number) => {
            // a do cartão grande vai e vem devagar entre 22% e 78%; as outras esperam no meio. Com o mouse em cima,
            // a divisa chega nele com um pouco de atraso, e volta do mesmo jeito quando ele sai
            const solta = cfg.anda ? W * (0.5 + 0.28 * Math.sin((agora - t0) / 2600)) : W / 2;
            const alvo = mouse.current ?? solta;
            x += (alvo - x) * (mouse.current === null && cfg.anda ? 1 : 0.18);
            esq.current?.setAttribute('width', String(x));
            dir.current?.setAttribute('x', String(x));
            dir.current?.setAttribute('width', String(W - x));
            alca.current?.setAttribute('transform', `translate(${x.toFixed(1)} 0)`);
            quadro = requestAnimationFrame(anda);
        };
        quadro = requestAnimationFrame(anda);
        return () => cancelAnimationFrame(quadro);
    }, [W, cfg.anda]);

    const letra = (filho: ReactNode) => <g transform={`translate(${x0} ${base}) scale(${s})`}>{filho}</g>;
    return (
        <Painel colunas={cfg.col} linhas={cfg.lin} rotulo={`${cfg.chave}: do corte ao desgaste`} estilo={cfg.lugar}>
            <svg
                ref={caixa}
                className="fx-divisa"
                viewBox={`0 0 ${W} ${H}`}
                onPointerMove={e => {
                    const r = caixa.current!.getBoundingClientRect();
                    mouse.current = Math.min(W, Math.max(0, ((e.clientX - r.left) / r.width) * W));
                }}
                onPointerLeave={() => {
                    mouse.current = null;
                }}
                aria-hidden
            >
                <defs>
                    <clipPath id={`${id}-e`}>
                        <rect ref={esq} x="0" y="0" width={W / 2} height={H} />
                    </clipPath>
                    <clipPath id={`${id}-d`}>
                        <rect ref={dir} x={W / 2} y="0" width={W / 2} height={H} />
                    </clipPath>
                    <pattern id={`${id}-h`} width={passo} height={passo} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                        <path d={`M0 0V${passo}`} stroke="var(--p-quente)" strokeWidth={2.4 / s} />
                    </pattern>
                </defs>
                {/* a pedra nova */}
                <g clipPath={`url(#${id}-e)`}>{letra(<Cut p={p} fill="var(--p-quente-claro)" />)}</g>
                {/* a pedra gasta: o que sumiu em hachura, o Worn cheio, o Polished e o Cut em linha */}
                <g clipPath={`url(#${id}-d)`}>
                    {letra(
                        <>
                            <Cut p={p} fill={`url(#${id}-h)`} />
                            <Gasta p={p} fam="worn" cor="var(--p-quente-claro)" />
                            <Gasta p={p} fam="polished" cor="var(--p-frio)" linha={1.6 / s} />
                            <Cut p={p} fill="none" stroke="#111" strokeWidth={1.6} strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />
                        </>,
                    )}
                </g>
                {/* a divisa, com os nomes dos dois lados */}
                <g ref={alca} transform={`translate(${W / 2} 0)`} style={{ pointerEvents: 'none' }}>
                    <path d={`M0 0V${grande ? H - 62 : H}`} stroke="#111" strokeWidth="1.4" />
                    <g className="fx-divisa-pegador" style={{ transformOrigin: `0px ${cy}px` }}>
                        <circle cx="0" cy={cy} r="20" fill="#f8f8f8" stroke="#111" strokeWidth="1.4" />
                        <path d={`M-7 ${cy - 6}l-6 6 6 6M7 ${cy - 6}l6 6-6 6`} fill="none" stroke="#111" strokeWidth="1.4" />
                    </g>
                    <text className="fx-divisa-rotulo" x="-16" y="40" textAnchor="end" style={ROTULO}>
                        CUT{!pequeno && <tspan className="fx-divisa-longo"> · DIA 1</tspan>}
                    </text>
                    <text className="fx-divisa-rotulo" x="16" y="40" style={ROTULO}>
                        WORN{!pequeno && <tspan className="fx-divisa-longo"> · 10 000 ANOS</tspan>}
                    </text>
                </g>
                {/* a legenda, só no cartão grande */}
                {grande && (
                    <>
                        <g className="fx-divisa-legenda" style={ROTULO} transform={`translate(30 ${H - 30})`}>
                            <rect x="0" y="-13" width="26" height="16" fill="var(--p-quente-claro)" />
                            <text x="36" y="0">A PEDRA</text>
                            <path d="M130 -5h28" stroke="#111" strokeWidth="1.6" strokeDasharray="6 5" />
                            <text x="168" y="0">CUT</text>
                            <path d="M230 -5h28" stroke="var(--p-frio)" strokeWidth="1.6" />
                            <text x="268" y="0">POLISHED</text>
                            <rect x="375" y="-13" width="26" height="16" fill={`url(#${id}-h)`} stroke="var(--p-quente)" strokeWidth="1.2" />
                            <text x="411" y="0">O QUE O TEMPO LEVOU</text>
                        </g>
                        <text className="fx-divisa-legenda" x={W - 30} y={H - 30} textAnchor="end" style={{ ...ROTULO, opacity: 0.6 }}>
                            ARRASTE PARA GASTAR
                        </text>
                    </>
                )}
            </svg>
        </Painel>
    );
}

export default function Blocos() {
    return (
        <div className="fx-grade">
            {BLOCOS.map(c => (
                <CartaoDivisa key={c.chave} cfg={c} />
            ))}
        </div>
    );
}
