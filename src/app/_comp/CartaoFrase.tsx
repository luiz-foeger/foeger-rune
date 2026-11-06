'use client';

import { useId, useMemo, useRef, type CSSProperties } from 'react';
import Painel from './Painel';
import { FiltroDesgaste, ajustarDesgaste } from './Desgaste';
import { Faixas, Ferramentas, Janela, Lente, ReguaV } from './Moldura';
import { LINHAS, PALAVRAS, type Ponto } from '../_lib/glifos';
import { arco, quinasDe, raioDe } from '../_lib/geometria';
import { useLaco, vaiEVolta } from '../_lib/movimento';

// os cartões de frase em duas linhas (2 × 1), como o "Squarly Rounded" e o "New Ring Subway" da Feixen: a frase em
// preto sobre as faixas cinza e uma lente redonda com um pedaço de letra ampliado e colorido, com os nós. No primeiro,
// a seta arrasta o controle e a frase inteira se gasta junto com a lente; no segundo, só a lente se mexe.
const L = 885;
const A = 413;

export type Frase = {
    linhas: [string, string];
    escala: number;
    bases: [number, number];
    esquerdas: [number, number];
    modo: 'fora' | 'dentro';
    max: number;
    animarTexto: boolean;
    lente: { cx: number; cy: number; r: number; linha: 0 | 1; glifo: number; pedra?: number; foco: Ponto; zoom: number; cor: string };
    janela?: { nome: string; cor: string; estilo: CSSProperties };
    rotulo: string;
};

export default function CartaoFrase({ cfg, estilo }: { cfg: Frase; estilo?: CSSProperties }) {
    const id = useId().replace(/:/g, '');
    const ref = useRef<HTMLDivElement>(null);
    const nos = useRef<(SVGCircleElement | null)[]>([]);
    const pegadores = useRef<(HTMLSpanElement | null)[]>([]);
    const lt = cfg.lente;
    const glifoLente = PALAVRAS[cfg.linhas[lt.linha]].glifos[lt.glifo];
    const pedrasLente = useMemo(() => (lt.pedra === undefined ? glifoLente.pedras : [glifoLente.pedras[lt.pedra]]), [glifoLente, lt.pedra]);
    const quinas = useMemo(() => pedrasLente.flatMap(p => quinasDe(p.vertices)), [pedrasLente]);
    const naLente = (p: Ponto): Ponto => [lt.cx + (p[0] - lt.foco[0]) * lt.zoom, lt.cy + (p[1] - lt.foco[1]) * lt.zoom];

    useLaco(ref, t => {
        const sigma = cfg.max * vaiEVolta(t, { parado0: 0.6, sobe: 1.1, parado1: 1.3, desce: 1.1 });
        ajustarDesgaste(ref.current, cfg.modo === 'fora' ? sigma : 0, cfg.modo === 'dentro' ? sigma : 0);
        quinas.forEach((q, i) => {
            const ativa = cfg.modo === 'fora' ? q.convexa : !q.convexa;
            const a = arco(q, raioDe(sigma));
            const pts = !ativa || sigma < 1.5 ? [q.v, q.v] : [a.p, a.t];
            pts.forEach((pt, k) => {
                const c = nos.current[i * 2 + k];
                if (!c) return;
                const [x, y] = naLente(pt);
                c.setAttribute('cx', x.toFixed(1));
                c.setAttribute('cy', y.toFixed(1));
            });
        });
        if (pegadores.current[0]) pegadores.current[0].style.left = `${((100 * sigma) / cfg.max).toFixed(2)}%`;
    }, 30);

    const linha = (k: 0 | 1, filtro?: string) => {
        const p = PALAVRAS[cfg.linhas[k]];
        return (
            <g transform={`translate(${cfg.esquerdas[k]} ${cfg.bases[k]}) scale(${cfg.escala})`}>
                {p.glifos.flatMap((g, gi) =>
                    g.pedras.map((pd, pi) => <path key={`${gi}-${pi}`} d={pd.d} fill="#111" fillRule="evenodd" filter={filtro ? `url(#${filtro})` : undefined} />),
                )}
            </g>
        );
    };
    const s = cfg.escala;
    return (
        <Painel colunas={2} linhas={1} rotulo={cfg.rotulo} estilo={estilo}>
            <div ref={ref} style={{ position: 'absolute', inset: 0 }}>
                <svg className="fx-cartao-svg" viewBox={`0 0 ${L} ${A}`} aria-hidden>
                    <defs>
                        <FiltroDesgaste id={`${id}-f`} modo={cfg.modo} />
                        <FiltroDesgaste id={`${id}-fl`} modo={cfg.modo} contorno="#111" raioContorno={1.4 / lt.zoom} />
                    </defs>
                    <Faixas topos={[cfg.bases[0] - LINHAS.maiuscula * s - 23, cfg.bases[0] - 9, cfg.bases[1] + 7]} x1={L - 57} />
                    {linha(0, cfg.animarTexto ? `${id}-f` : undefined)}
                    {linha(1, cfg.animarTexto ? `${id}-f` : undefined)}
                    <Lente id={`${id}-lente`} cx={lt.cx} cy={lt.cy} r={lt.r}>
                        <g transform={`translate(${lt.cx} ${lt.cy}) scale(${lt.zoom}) translate(${-lt.foco[0]} ${-lt.foco[1]})`}>
                            {pedrasLente.map((p, i) => (
                                <path key={i} d={p.d} fill={lt.cor} fillRule="evenodd" filter={`url(#${id}-fl)`} />
                            ))}
                        </g>
                        {quinas.map((q, i) =>
                            [0, 1].map(k => (
                                <circle
                                    key={`${i}-${k}`}
                                    ref={el => {
                                        nos.current[i * 2 + k] = el;
                                    }}
                                    cx={naLente(q.v)[0]}
                                    cy={naLente(q.v)[1]}
                                    r="6.5"
                                    fill={cfg.modo === 'fora' ? lt.cor : '#fff'}
                                    stroke="#111"
                                    strokeWidth="1.5"
                                />
                            )),
                        )}
                    </Lente>
                </svg>
                <Ferramentas />
                <ReguaV altura={A} />
                {cfg.janela && (
                    <Janela itens={[{ nome: cfg.janela.nome, cor: cfg.janela.cor }]} pegadores={pegadores} seta={0} estilo={cfg.janela.estilo} />
                )}
            </div>
        </Painel>
    );
}
