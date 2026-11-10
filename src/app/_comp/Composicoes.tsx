'use client';

import { useId, useRef, type CSSProperties } from 'react';
import Painel from './Painel';
import Seta from './Seta';
import { DefsDesgaste, ajustarDesgaste } from './Desgaste';
import { familiaDe } from './Faixa';
import type { Estilo } from '../_lib/conteudo';
import { useLaco, vaiEVolta } from '../_lib/movimento';

// o que sobrou das composições das faixas antigas (as faixas agora estão em Pratica.tsx): os símbolos da fonte se
// gastando, guardados para a seção dos números, símbolos e acentos.
const u = (n: number) => `calc(${n} * var(--u))`;

// o tamanho da letra de um elemento, para passar o σ (em unidades da fonte) para px
const pxDaLetra = (el: Element | null) => (el ? parseFloat(getComputedStyle(el).fontSize) || 0 : 0);

// ——— os símbolos da fonte se gastando (saíram da faixa Cut; ficam para a seção dos números, símbolos e acentos) ———
// (o & ficou de fora: no desgaste máximo, os miolos pequenos dele fecham)
const SIMBOLOS = ['★', '♥', '→', '✓'];
export function Simbolos({ estilo }: { estilo: Estilo }) {
    const id = useId().replace(/:/g, '');
    const ref = useRef<HTMLDivElement>(null);
    const letras = useRef<(HTMLSpanElement | null)[]>([]);
    useLaco(
        ref,
        t => {
            letras.current.forEach((el, i) => {
                const raiz = el?.parentElement ?? null;
                const k = vaiEVolta(t + i * 0.9, { parado0: 0.9, sobe: 1.3, parado1: 1.1, desce: 1.3 });
                const px = (50 * k * pxDaLetra(el)) / 1000;
                ajustarDesgaste(raiz, px, px);
            });
        },
        30,
    );
    const setas: CSSProperties[] = [
        { left: u(118), top: u(170) },
        { left: u(282), top: u(130) },
        { left: u(70), top: u(80) },
        { left: u(236), top: u(250) },
    ];
    return (
        <div ref={ref} className="fx-grade">
            {SIMBOLOS.map((s, i) => (
                <Painel key={s} colunas={1} linhas={1} rotulo={`Símbolo ${s}`}>
                    <div className="fx-simbolo">
                        <DefsDesgaste id={`${id}-${i}`} modo="ambos" />
                        <span
                            ref={el => {
                                letras.current[i] = el;
                            }}
                            style={{ fontFamily: familiaDe(estilo), filter: `url(#${id}-${i})` }}
                        >
                            {s}
                        </span>
                        <Seta style={setas[i]} />
                    </div>
                </Painel>
            ))}
        </div>
    );
}
