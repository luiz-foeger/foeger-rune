'use client';

import { useId, useRef, useState, type CSSProperties, type RefObject } from 'react';
import Painel from './Painel';
import Seta from './Seta';
import { DefsDesgaste, ajustarDesgaste } from './Desgaste';
import { Ferramentas, Janela, ReguaFonte } from './Moldura';
import { familiaDe } from './Faixa';
import type { Estilo } from '../_lib/conteudo';
import { LINHAS } from '../_lib/glifos';
import { useLaco, vaiEVolta } from '../_lib/movimento';

// as composições da faixa Worn, que ainda não passou para o padrão novo (o Cut e o Polished já estão em Pratica.tsx):
// onomatopeias e letra grande com seleção. Os controles que se mexem sozinhos: "DESGASTE" gasta o n do
// Cut até virar o Worn (com o σ de agora na janela), e "ALTERNATIVAS" liga e desliga o calt, trocando as letras
// repetidas pelas variações da fonte (toda palavra que passa por ele tem uma minúscula repetida a até duas letras de
// distância, a regra do calt, para a troca aparecer). Os números são da fonte: o σ de cada estilo e as réguas em
// unidades da fonte.
const u = (n: number) => `calc(${n} * var(--u))`;
const SIGMA_WORN = 50;

// o tamanho da letra de um elemento, para passar o σ (em unidades da fonte) para px
const pxDaLetra = (el: Element | null) => (el ? parseFloat(getComputedStyle(el).fontSize) || 0 : 0);

// liga e desliga o calt num vai e volta (o pegador anda de um lado ao outro)
function useAlternativas(ref: RefObject<HTMLDivElement | null>, atraso = 0) {
    const pegadores = useRef<(HTMLSpanElement | null)[]>([]);
    const [ligado, setLigado] = useState(false);
    const ultimo = useRef(false);
    useLaco(
        ref,
        t => {
            const k = vaiEVolta(t + atraso, { parado0: 1.2, sobe: 0.5, parado1: 1.6, desce: 0.5 });
            if (pegadores.current[0]) pegadores.current[0].style.left = `${(k * 100).toFixed(1)}%`;
            const agora = k > 0.5;
            if (agora !== ultimo.current) {
                ultimo.current = agora;
                setLigado(agora);
            }
        },
        30,
    );
    return { pegadores, ligado };
}

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

// ——— Worn (verde): as onomatopeias com as alternativas, o n do Cut se gastando até o Worn e a moldura de palavras ———
// o n grande: corpo 520 u, cortado na altura do x (text-box) a 64 u do alto, então a linha de base fica em 64 u + x
const CORPO_N = 520;
const TOPO_N = 64;
export function Onomatopeias({ estilo }: { estilo: Estilo }) {
    const id = useId().replace(/:/g, '');
    const familia = familiaDe(estilo);
    const alt = useRef<HTMLDivElement>(null);
    const { pegadores: pegAlt, ligado } = useAlternativas(alt, 0.2);
    const grande = useRef<HTMLDivElement>(null);
    const letraN = useRef<HTMLSpanElement>(null);
    const pegDesgaste = useRef<(HTMLSpanElement | null)[]>([]);
    const valDesgaste = useRef<(HTMLSpanElement | null)[]>([]);
    // o n do Cut gasta de σ 0 até o σ do Worn (quinas de fora e de dentro, a mesma conta que fez a fonte), para e volta
    useLaco(
        grande,
        t => {
            const k = vaiEVolta(t + 0.5, { parado0: 0.8, sobe: 1.6, parado1: 1.4, desce: 1.6 });
            const px = (SIGMA_WORN * k * pxDaLetra(letraN.current)) / 1000;
            ajustarDesgaste(grande.current, px, px);
            if (pegDesgaste.current[0]) pegDesgaste.current[0].style.left = `${(k * 100).toFixed(1)}%`;
            if (valDesgaste.current[0]) valDesgaste.current[0].textContent = `σ ${Math.round(SIGMA_WORN * k)}`;
        },
        30,
    );
    return (
        <div className="fx-grade">
            <Painel colunas={2} linhas={1} solto rotulo="Onomatopeias" estilo={{ gridColumn: '1 / span 2' }}>
                <div ref={alt} className="fx-solto">
                    <Ferramentas estilo={{ left: u(0), top: u(0) }} />
                    <div className="fx-onomatopeias" style={{ fontFamily: familia, fontFeatureSettings: `"calt" ${ligado ? 1 : 0}` }}>
                        <div>Psst!Puff!</div>
                        <div>Grrr!Shhh!</div>
                        <div>Tooom!Zzz!</div>
                    </div>
                    <Janela itens={[{ nome: 'ALTERNATIVAS', cor: 'var(--tinta)' }]} pegadores={pegAlt} seta={0} estilo={{ left: u(560), top: u(200) }} />
                </div>
            </Painel>
            <Painel colunas={1} linhas={1} solto rotulo="O n do Cut se gastando até o Worn" estilo={{ gridColumn: '3' }}>
                <div ref={grande} className="fx-solto">
                    <DefsDesgaste id={`${id}-a`} modo="ambos" />
                    <ReguaFonte corpo={CORPO_N} base={TOPO_N + (CORPO_N * LINHAS.x) / 1000} linha={LINHAS.x} estilo={{ left: 0, right: 'auto' }} />
                    <span ref={letraN} className="fx-letra-grande" style={{ fontFamily: familiaDe('cut'), filter: `url(#${id}-a)` }} aria-hidden>
                        n
                    </span>
                    <div className="fx-selecao" aria-hidden>
                        <i />
                        <i />
                        <i />
                        <i />
                        <svg viewBox="0 0 60 60" className="fx-pena">
                            <path d="M8 8L36 18L50 46L44 52L18 38Z" fill="#111" />
                            <circle cx="30" cy="28" r="4" fill="#fff" />
                            <path d="M44 52L54 58" stroke="#111" strokeWidth="5" />
                        </svg>
                    </div>
                    <Janela itens={[{ nome: 'DESGASTE', cor: 'var(--p-quente)' }]} pegadores={pegDesgaste} valores={valDesgaste} seta={0} estilo={{ left: u(214), top: u(318) }} />
                </div>
            </Painel>
            <Painel colunas={1} linhas={1} rotulo="Liso, macio, rolado, redondo" estilo={{ gridColumn: '4' }}>
                <div className="fx-moldura-palavras" style={{ fontFamily: familia }}>
                    <div>Liso</div>
                    <div>Macio</div>
                    <div>Rolado</div>
                    <div>Redondo</div>
                </div>
            </Painel>
        </div>
    );
}
