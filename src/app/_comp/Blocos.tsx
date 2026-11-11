'use client';

import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from 'react';
import Painel from './Painel';
import { Faixas } from './Moldura';
import { PALAVRAS, type Palavra } from '../_lib/glifos';
import { PALAVRAS_EXTRA } from '../_lib/glifos-extra';
import { LINHAS, type Ponto } from '../_lib/glifos';
import { MEDIDAS } from '../_lib/medidas';
import { pausado } from '../_lib/movimento';

// o bloco do Y na seção do desgaste: a letra dividida por uma divisa. À esquerda, a pedra nova (o Cut, cheio); à
// direita, a pedra gasta (o Worn), com a hachura do que o tempo levou, na cor da letra. As quinas vão marcadas com as
// coordenadas: do lado do Cut, no vértice; do lado da Worn, onde o contorno gasto cruza a bissetriz (da mesma conta que
// gerou a fonte, medidas.ts; cai a menos de 1,1 unidade do contorno da Worn de verdade). Atrás, as faixas das linhas da
// fonte; no canto, a ficha da letra; embaixo, quanto da tinta o tempo levou. A divisa vai e vem sozinha e segue o mouse
// quando ele passa por cima, andando como uma mola sem balanço: rápida atrás do mouse, mais mole de volta ao passeio.
const M = 413;
const G = 59;
const tam = (n: number) => n * M + (n - 1) * G;
const PAL: Record<string, Palavra> = { ...PALAVRAS, ...PALAVRAS_EXTRA };
const ROTULO = { fontFamily: 'var(--ff-ui)', fontSize: 14, letterSpacing: '0.04em' } as CSSProperties; // o rótulo (14 u)
const SEM_TROCAS = { fontFeatureSettings: '"calt" 0, "kern" 0' } as CSSProperties;

// as fontes Polished e Worn foram geradas com espaçamento próprio (desgastes.js da fonte: a letra anda para a esquerda
// o que a ponta recuou mais o aperto, e o avanço encolhe; o x do Worn tem 473, o do Cut 597). Para cair em cima do
// Cut, cada letra anda até o centro da tinta coincidir com o centro do polígono do Cut (a altura já é a mesma). Os
// desvios saem das caixas exatas dos .otf do site, em unidades da fonte.
const DESVIOS: Record<string, { polished: number; worn: number }> = {
    Y: { polished: 34, worn: 61.7 },
};

type Bloco = { chave: string; col: number; lin: number; lugar?: CSSProperties; anda?: boolean };
// quanto da tinta do Y o tempo levou do Cut à Worn (σ 0 a σ 50), em %, com uma casa
const PERDA = (() => {
    const t = MEDIDAS.Y.tinta;
    return (100 * (1 - t[t.length - 1] / t[0])).toFixed(1).replace('.', ',');
})();

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
        let velocidade = 0;
        const t0 = performance.now();
        let antes = t0;
        const anda = (agora: number) => {
            // a do cartão grande vai e vem devagar entre 22% e 78%; as outras esperam no meio. A divisa vai atrás do
            // alvo (o mouse, ou o passeio) como uma mola sem balanço
            const dt = Math.min(0.05, Math.max(0, (agora - antes) / 1000));
            antes = agora;
            // coberta pela cortina (do menu ou da troca de página): a divisa espera parada
            if (pausado()) {
                quadro = requestAnimationFrame(anda);
                return;
            }
            const solta = cfg.anda ? W * (0.5 + 0.28 * Math.sin((agora - t0) / 2600)) : W / 2;
            const w = mouse.current !== null ? 14 : 4.5;
            velocidade += (w * w * ((mouse.current ?? solta) - x) - 2 * w * velocidade) * dt;
            x = Math.min(W, Math.max(0, x + velocidade * dt));
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
    // as quinas: no Cut, o vértice; na Worn, o ponto da bissetriz em que o contorno gasto passa
    const contornos = p.glifos[0].pedras.flatMap(pd => pd.vertices);
    const nos = (MEDIDAS[cfg.chave].nos ?? []).map(n => {
        const c = contornos.find(cc => cc.some(v => v[0] === n.v[0] && v[1] === n.v[1]))!;
        const i = c.findIndex(v => v[0] === n.v[0] && v[1] === n.v[1]);
        const un = (a: Ponto) => {
            const d = Math.hypot(a[0] - n.v[0], a[1] - n.v[1]);
            return [(a[0] - n.v[0]) / d, (a[1] - n.v[1]) / d];
        };
        const ua = un(c[(i - 1 + c.length) % c.length]);
        const ub = un(c[(i + 1) % c.length]);
        const sd = Math.hypot(ua[0] + ub[0], ua[1] + ub[1]) || 1;
        const r = n.recuo[n.recuo.length - 1];
        return { cut: n.v, worn: [n.v[0] + ((ua[0] + ub[0]) / sd) * r, n.v[1] + ((ua[1] + ub[1]) / sd) * r] as Ponto };
    });
    const vs = contornos.flat();
    const meio: Ponto = [(Math.min(...vs.map(v => v[0])) + Math.max(...vs.map(v => v[0]))) / 2, (Math.min(...vs.map(v => v[1])) + Math.max(...vs.map(v => v[1]))) / 2];
    const naCarta = (q: Ponto): Ponto => [x0 + q[0] * s, base + q[1] * s];
    const marcas = (lado: 'cut' | 'worn') =>
        nos.map((n, i) => {
            const q = n[lado];
            const [x, y] = naCarta(q);
            const dx = n.cut[0] - meio[0];
            const dy = n.cut[1] - meio[1];
            const d = Math.hypot(dx, dy) || 1;
            return (
                <g key={i}>
                    <circle cx={x} cy={y} r="5.5" fill="#fff" stroke="#111" strokeWidth="1.4" />
                    <text x={x + (dx / d) * 16} y={y + (dy / d) * 16 + 5} textAnchor={dx >= 0 ? 'start' : 'end'} className="fx-coordenada">
                        {`${Math.round(q[0])}, ${-Math.round(q[1])}`}
                    </text>
                </g>
            );
        });
    const tinta = MEDIDAS[cfg.chave].tinta;
    const milhar = (n: number) => n.toLocaleString('pt-BR').replace(/\./g, ' ');
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
                        <path d={`M0 0V${passo}`} stroke="var(--p-cut)" strokeWidth={2.4 / s} />
                    </pattern>
                </defs>
                {/* as linhas da fonte, atrás das letras */}
                {grande && (
                    <>
                        <Faixas
                            faixas={[
                                { topo: base - LINHAS.maiuscula * s, rotulo: `MAIÚSCULA ${LINHAS.maiuscula}` },
                                { topo: base - LINHAS.x * s, rotulo: `ALTURA DO X ${LINHAS.x}` },
                                { topo: base - 27 },
                            ]}
                            x0={30}
                            x1={W - 30}
                        />
                        <text className="fx-guia-rotulo" x={W - 38} y={base + 20} textAnchor="end" fill="#111">
                            LINHA DE BASE 0
                        </text>
                        {/* a ficha da letra */}
                        <g className="fx-guia-rotulo" fill="#111">
                            <text x="30" y="40">
                                {cfg.chave} · U+{cfg.chave.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}
                            </text>
                            <text x="30" y="58" opacity="0.6">
                                AVANÇO {p.largura} · {nos.length} QUINAS
                            </text>
                            <text x="30" y="76" opacity="0.6">
                                TINTA {milhar(tinta[0])} → {milhar(tinta[tinta.length - 1])} u²
                            </text>
                        </g>
                    </>
                )}
                {/* a pedra nova */}
                <g clipPath={`url(#${id}-e)`}>
                    {letra(<Cut p={p} fill="var(--p-cut)" />)}
                    {grande && marcas('cut')}
                </g>
                {/* a pedra gasta: o Worn cheio sobre a hachura do que sumiu */}
                <g clipPath={`url(#${id}-d)`}>
                    {letra(
                        <>
                            <Cut p={p} fill={`url(#${id}-h)`} />
                            <Gasta p={p} fam="worn" cor="var(--p-cut)" />
                        </>,
                    )}
                    {grande && marcas('worn')}
                </g>
                {/* a divisa, com os nomes dos dois lados */}
                <g ref={alca} transform={`translate(${W / 2} 0)`} style={{ pointerEvents: 'none' }}>
                    <path d={`M0 0V${grande ? H - 62 : H}`} stroke="#111" strokeWidth="1.4" />
                    <g className="fx-divisa-pegador" style={{ transformOrigin: `0px ${cy}px` }}>
                        <circle cx="0" cy={cy} r="20" fill="#f8f8f8" stroke="#111" strokeWidth="1.4" />
                        <path d={`M-7 ${cy - 6}l-6 6 6 6M7 ${cy - 6}l6 6-6 6`} fill="none" stroke="#111" strokeWidth="1.4" />
                    </g>
                    <text className="fx-divisa-rotulo" x="-16" y="40" textAnchor="end" style={ROTULO}>
                        CUT{!pequeno && <tspan className="fx-divisa-longo"> · σ 0</tspan>}
                    </text>
                    <text className="fx-divisa-rotulo" x="16" y="40" style={ROTULO}>
                        WORN{!pequeno && <tspan className="fx-divisa-longo"> · σ 50</tspan>}
                    </text>
                </g>
                {/* a legenda, só no cartão grande */}
                {grande && (
                    <>
                        <g className="fx-divisa-legenda" style={ROTULO} transform={`translate(30 ${H - 30})`}>
                            <rect x="0" y="-13" width="26" height="16" fill={`url(#${id}-h)`} stroke="var(--p-cut)" strokeWidth="1.2" />
                            <text x="36" y="0">{PERDA}%</text>
                        </g>
                    </>
                )}
            </svg>
        </Painel>
    );
}

export function BlocoY({ estilo }: { estilo?: CSSProperties }) {
    return <CartaoDivisa cfg={{ chave: 'Y', col: 2, lin: 2, lugar: estilo, anda: true }} />;
}
