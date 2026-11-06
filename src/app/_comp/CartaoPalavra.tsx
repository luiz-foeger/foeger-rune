'use client';

import { useId, useMemo, useRef, type CSSProperties } from 'react';
import Painel from './Painel';
import { FiltroDesgaste, ajustarDesgaste } from './Desgaste';
import { Faixas, Ferramentas, Janela, ReguaV } from './Moldura';
import { LINHAS, PALAVRAS, type Ponto } from '../_lib/glifos';
import { arco, quinasDe, raioDe } from '../_lib/geometria';
import { useLaco, vaiEVolta } from '../_lib/movimento';

// os cartões de uma palavra grande (2 × 1), como o "Ehi!" e o "Aha" da Feixen: a seta arrasta o controle e a palavra
// se gasta (no "Ei!", o desgaste inteiro da fonte; no "Ahá", só as quinas de dentro do h). A letra colorida mostra os
// nós da Cut: cada quina que se gasta vira dois pontos que se afastam conforme o arco cresce; dentro da lupa, os pontos
// aparecem maiores. O desgaste vai por pedra, para os pingos e acentos não grudarem.
const L = 885;
const A = 413;
const MARGEM = 140; // folga do desenho em volta da palavra, em unidades da fonte
const TOPO = -980;
const ALTURA = 1260;

export type PalavraCfg = {
    chave: string;
    destaque: number; // qual letra vai colorida
    cor: string;
    escala: number; // u por unidade da fonte
    esq: number; // onde a palavra começa no cartão
    base: number; // a linha de base no cartão
    modo: 'ambos' | 'dentro';
    max: number;
    soDestaque: boolean; // o desgaste só na letra colorida
    contorno: boolean; // o contorno preto fino na letra colorida
    controle: { nome: string; cor: string; estilo: CSSProperties };
    lupa: { x: number; y: number; r: number }; // em unidades da fonte
    atraso: number;
    rotulo: string;
};

const f1 = (n: number) => n.toFixed(1);

export default function CartaoPalavra({ cfg, estilo }: { cfg: PalavraCfg; estilo?: CSSProperties }) {
    const id = useId().replace(/:/g, '');
    const ref = useRef<HTMLDivElement>(null);
    const pontos = useRef<(SVGCircleElement | null)[]>([]);
    const pegadores = useRef<(HTMLSpanElement | null)[]>([]);
    const p = PALAVRAS[cfg.chave];
    const destaque = p.glifos[cfg.destaque];
    const quinas = useMemo(() => destaque.pedras.flatMap(pd => quinasDe(pd.vertices)), [destaque]);
    const lupa = cfg.lupa;
    const naLupa = ([x, y]: Ponto) => Math.hypot(x - lupa.x, y - lupa.y) < lupa.r - 8;
    const ativa = (convexa: boolean) => cfg.modo === 'ambos' || !convexa;

    useLaco(ref, t => {
        const k = vaiEVolta(t + cfg.atraso, { parado0: 0.6, sobe: 1.0, parado1: 1.2, desce: 1.0 });
        const sigma = cfg.max * k;
        ajustarDesgaste(ref.current, cfg.modo === 'ambos' ? sigma : 0, sigma);
        quinas.forEach((q, i) => {
            const a = arco(q, raioDe(sigma));
            const pts = !ativa(q.convexa) || sigma < 1.6 ? [q.v, q.v] : [a.p, a.t];
            pts.forEach((pt, j) => {
                const c = pontos.current[i * 2 + j];
                if (!c) return;
                c.setAttribute('cx', f1(pt[0]));
                c.setAttribute('cy', f1(pt[1]));
                const grande = naLupa(pt);
                c.setAttribute('r', grande ? '15' : '10.5');
                c.setAttribute('fill', grande ? '#fff' : 'none');
            });
        });
        if (pegadores.current[0]) pegadores.current[0].style.left = `${(k * 100).toFixed(2)}%`;
    }, 30);

    const s = cfg.escala;
    const largura = p.largura + 2 * MARGEM;
    const u = (n: number) => `calc(${n} * var(--u))`;
    return (
        <Painel colunas={2} linhas={1} rotulo={cfg.rotulo} estilo={estilo}>
            <div ref={ref} style={{ position: 'absolute', inset: 0 }}>
                <svg className="fx-cartao-svg" viewBox={`0 0 ${L} ${A}`} aria-hidden>
                    <Faixas topos={[cfg.base - LINHAS.maiuscula * s, cfg.base - LINHAS.x * s, cfg.base - 27]} x1={L - 57} />
                </svg>
                <svg
                    className="fx-palavra"
                    viewBox={`${-MARGEM} ${TOPO} ${largura} ${ALTURA}`}
                    style={{ left: u(cfg.esq - MARGEM * s), top: u(cfg.base + TOPO * s), width: u(largura * s), height: u(ALTURA * s) }}
                    role="img"
                    aria-label={cfg.chave}
                >
                    <defs>
                        <FiltroDesgaste id={`${id}-d`} modo={cfg.modo} contorno={cfg.contorno ? '#1a1a1a' : undefined} raioContorno={1.5 / s} />
                        <FiltroDesgaste id={`${id}-p`} modo={cfg.modo} />
                    </defs>
                    <circle cx={lupa.x} cy={lupa.y} r={lupa.r} fill="#fcfcfc" stroke="#8f8f8f" strokeWidth={1.2 / s} />
                    {p.glifos.map((g, gi) =>
                        g.pedras.map((pd, pi) => {
                            const eDestaque = gi === cfg.destaque;
                            const filtro = eDestaque ? `${id}-d` : cfg.soDestaque ? undefined : `${id}-p`;
                            return (
                                <path
                                    key={`${gi}-${pi}`}
                                    d={pd.d}
                                    fill={eDestaque ? cfg.cor : '#111'}
                                    fillRule="evenodd"
                                    filter={filtro ? `url(#${filtro})` : undefined}
                                />
                            );
                        }),
                    )}
                    {quinas.flatMap((q, i) =>
                        [0, 1].map(j => (
                            <circle
                                key={`${i}-${j}`}
                                ref={el => {
                                    pontos.current[i * 2 + j] = el;
                                }}
                                cx={q.v[0]}
                                cy={q.v[1]}
                                r={naLupa(q.v) ? 15 : 10.5}
                                fill={naLupa(q.v) ? '#fff' : 'none'}
                                stroke="#1a1a1a"
                                strokeWidth={1.3 / s}
                            />
                        )),
                    )}
                </svg>
                <Ferramentas />
                <ReguaV altura={A} />
                <Janela itens={[{ nome: cfg.controle.nome, cor: cfg.controle.cor }]} pegadores={pegadores} seta={0} estilo={cfg.controle.estilo} />
            </div>
        </Painel>
    );
}
