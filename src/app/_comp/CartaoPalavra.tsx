'use client';

import { useId, useRef, type CSSProperties } from 'react';
import Painel from './Painel';
import { FiltroDesgaste, ajustarDesgaste } from './Desgaste';
import { Faixas } from './Moldura';
import { LINHAS, PALAVRAS, type Ponto } from '../_lib/glifos';
import { PALAVRAS_EXTRA } from '../_lib/glifos-extra';
import { MEDIDAS, PASSO_SIGMA, emSigma } from '../_lib/medidas';
import { sigmaAgora } from '../_lib/sigma';
import { useLaco } from '../_lib/movimento';

// o cartão de uma palavra (2 × 1): a palavra inteira se gasta, e uma letra vai na cor, com as quinas marcadas andando
// com o contorno (cada uma pela bissetriz, até onde o contorno gasto passa, da mesma conta que gerou a fonte; a da
// fenda do a corre fundo, e as do espaço de dentro somem quando ele fecha) e o miolo do Cut tracejado por cima (para ver
// onde ele era). A leitura é quantos miolos da palavra
// continuam abertos: no "Opa!", o miolo do a fecha em σ 40, e na Worn sobram 2 de 3 (medidas.ts). O desgaste vai por
// pedra, para o ponto do ! não grudar.
const L = 885;
const A = 413;
const MARGEM = 140; // folga do desenho em volta da palavra, em unidades da fonte
const TOPO = -980;
const ALTURA = 1260;
const PAL = { ...PALAVRAS, ...PALAVRAS_EXTRA };

export type PalavraCfg = {
    chave: string;
    destaque: number; // qual letra vai colorida
    cor: string;
};

export default function CartaoPalavra({ cfg, estilo }: { cfg: PalavraCfg; estilo?: CSSProperties }) {
    const id = useId().replace(/:/g, '');
    const ref = useRef<HTMLDivElement>(null);
    const leitura = useRef<SVGTextElement>(null);
    const bolinhas = useRef<(SVGCircleElement | null)[]>([]);
    const p = PAL[cfg.chave];
    const destaque = p.glifos[cfg.destaque];
    const miolos = destaque.pedras.flatMap(pd => pd.vertices.slice(1));
    const total = MEDIDAS[cfg.chave].miolos[0];
    // em que σ o primeiro espaço de dentro fecha
    const fecha = MEDIDAS[cfg.chave].miolos.findIndex(m => m < total) * PASSO_SIGMA;
    const contornos = destaque.pedras.flatMap(pd => pd.vertices);
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
        return { ...n, dir: [(ua[0] + ub[0]) / sd, (ua[1] + ub[1]) / sd] as Ponto };
    });
    // a palavra cabe no cartão com a maiúscula em até 250 u, encostada embaixo como as letras da gravação
    const s = Math.min((L - 200) / p.largura, 250 / LINHAS.maiuscula);
    const esq = (L - p.largura * s) / 2 - 30;
    const base = A - 92;

    useLaco(
        ref,
        t => {
            const sg = sigmaAgora(t);
            ajustarDesgaste(ref.current, sg, sg);
            if (leitura.current) leitura.current.textContent = `${Math.round(emSigma(MEDIDAS[cfg.chave].miolos, sg))} DE ${total}`;
            nos.forEach((n, i) => {
                const el = bolinhas.current[i];
                if (!el) return;
                // entre dois passos de σ, a reta entre eles; se num dos dois o contorno já sumiu, a bolinha some
                const f = Math.min(n.recuo.length - 1, sg / PASSO_SIGMA);
                const a = n.recuo[Math.floor(f)];
                const b = n.recuo[Math.min(n.recuo.length - 1, Math.floor(f) + 1)];
                if (a < 0 || b < 0) {
                    el.setAttribute('visibility', 'hidden');
                    return;
                }
                const r = a + (b - a) * (f - Math.floor(f));
                el.setAttribute('visibility', 'visible');
                el.setAttribute('cx', (n.v[0] + n.dir[0] * r).toFixed(1));
                el.setAttribute('cy', (n.v[1] + n.dir[1] * r).toFixed(1));
            });
        },
        30,
    );

    const largura = p.largura + 2 * MARGEM;
    const u = (n: number) => `calc(${n} * var(--u))`;
    return (
        <Painel colunas={2} linhas={1} rotulo={`${cfg.chave}: os espaços de dentro que ficam abertos`} estilo={estilo}>
            <div ref={ref} style={{ position: 'absolute', inset: 0 }}>
                <svg className="fx-cartao-svg" viewBox={`0 0 ${L} ${A}`} aria-hidden>
                    <Faixas faixas={[{ topo: base - LINHAS.maiuscula * s }, { topo: base - LINHAS.x * s }, { topo: base - 27 }]} x1={L - 30} x0={30} />
                    <text className="fx-guia-rotulo" x={L - 36} y="30" textAnchor="end" fill="#111" opacity="0.6">
                        ESPAÇOS DE DENTRO ABERTOS
                    </text>
                    <text ref={leitura} className="fx-raio" x={L - 36} y="50" textAnchor="end" fill="#111">
                        {`${total} DE ${total}`}
                    </text>
                    <text className="fx-guia-rotulo" x={L - 36} y="70" textAnchor="end" fill="#111" opacity="0.6">
                        O DO {destaque.ch} FECHA EM σ {fecha}
                    </text>
                </svg>
                <svg
                    className="fx-palavra"
                    viewBox={`${-MARGEM} ${TOPO} ${largura} ${ALTURA}`}
                    style={{ left: u(esq - MARGEM * s), top: u(base + TOPO * s), width: u(largura * s), height: u(ALTURA * s) }}
                    role="img"
                    aria-label={cfg.chave}
                >
                    <defs>
                        <FiltroDesgaste id={`${id}-d`} modo="ambos" contorno="#1a1a1a" raioContorno={1.5 / s} />
                        <FiltroDesgaste id={`${id}-p`} modo="ambos" />
                    </defs>
                    {p.glifos.map((gl, gi) =>
                        gl.pedras.map((pd, pi) => (
                            <path key={`${gi}-${pi}`} d={pd.d} fill={gi === cfg.destaque ? cfg.cor : '#111'} fillRule="evenodd" filter={`url(#${id}-${gi === cfg.destaque ? 'd' : 'p'})`} />
                        )),
                    )}
                    {nos.map((n, i) => (
                        <circle
                            key={`n${i}`}
                            ref={el => {
                                bolinhas.current[i] = el;
                            }}
                            cx={n.v[0]}
                            cy={n.v[1]}
                            r={4.5 / s}
                            fill="#fff"
                            stroke="#1a1a1a"
                            strokeWidth={1.3 / s}
                        />
                    ))}
                    {miolos.map((c, i) => (
                        <path key={i} d={`M${c.map(v => v.join(' ')).join('L')}Z`} fill="none" stroke="#fff" strokeWidth={1.4 / s} strokeDasharray={`${5 / s} ${4 / s}`} />
                    ))}
                </svg>
            </div>
        </Painel>
    );
}
