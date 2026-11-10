'use client';

import { useId, useRef, useState, type CSSProperties, type RefObject } from 'react';
import Painel from './Painel';
import Seta from './Seta';
import { DefsDesgaste, ajustarDesgaste } from './Desgaste';
import { Ferramentas, Janela, ReguaFonte } from './Moldura';
import { familiaDe } from './Faixa';
import type { Estilo } from '../_lib/conteudo';
import { LINHAS } from '../_lib/glifos';
import { ESTILOS as ESTILOS_SIGMA } from '../_lib/medidas';
import { useLaco, vaiEVolta } from '../_lib/movimento';

// as composições de cada faixa, no lugar das da Ease (palavras soltas, contador, cartaz, citação, onomatopeias,
// letra grande com seleção). Os controles que se mexem sozinhos: "QUINAS DE FORA" gasta as pontas das letras (o mesmo
// filtro dos cartões, aplicado no texto, com o σ de agora na janela), "DESGASTE" gasta o n do Cut até virar o Worn, e
// "ALTERNATIVAS" liga e desliga o calt, trocando as letras repetidas pelas variações da fonte (toda palavra que passa
// por ele tem uma minúscula repetida a até duas letras de distância, a regra do calt, para a troca aparecer). Os números
// são da fonte: os glifos contados na prévia, o σ de cada estilo e as réguas em unidades da fonte.
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

// ——— Cut (marrom): quatro colunas de palavras soltas ———
// os 311 glifos de cada estilo por tipo, contados na prévia da fonte: uma amostra e quantos são. O "ss" mostra uma
// variante de verdade (o segundo s já sai trocado pelo calt), e o ␣ conta os três glifos vazios (o espaço, o espaço
// fixo e o .notdef, que nesta fonte não tem desenho)
const GRUPOS: [string, number, string][] = [
    ['A', 26, 'maiúsculas'],
    ['a', 26, 'minúsculas'],
    ['Á', 74, 'acentuadas e especiais'],
    ['1', 16, 'números'],
    ['?', 45, 'pontuação'],
    ['★', 43, 'símbolos'],
    ['ss', 78, 'variantes'],
    ['␣', 3, 'vazios'],
];
const TOTAL_GLIFOS = GRUPOS.reduce((s, g) => s + g[1], 0);
const TAMANHOS: [string, number][] = [
    ['Rocha', 118],
    ['Cinzel', 94],
    ['G&Lasca', 74],
    ['Lapidar 311', 54],
    ['Quina & Seixo', 42],
];

export function GradePalavras({ estilo }: { estilo: Estilo }) {
    const id = useId().replace(/:/g, '');
    const familia = familiaDe(estilo);
    const contador = useRef<HTMLDivElement>(null);
    const numero = useRef<HTMLSpanElement>(null);
    const inicio = useRef<number | null>(null);
    const fora = useRef<HTMLDivElement>(null);
    const pilhaFora = useRef<HTMLDivElement>(null);
    const pegFora = useRef<(HTMLSpanElement | null)[]>([]);
    const valFora = useRef<(HTMLSpanElement | null)[]>([]);
    const alt = useRef<HTMLDivElement>(null);
    const { pegadores: pegAlt, ligado } = useAlternativas(alt, 0.7);

    // o contador: quando o painel sobe na tela, conta até o total de glifos em ~1,6 s e para nele; abaixo da tela de
    // novo, volta a zero para contar outra vez
    useLaco(contador, t => {
        const el = contador.current;
        if (!el || !numero.current) return;
        if (el.getBoundingClientRect().top > window.innerHeight * 0.85) {
            inicio.current = null;
            numero.current.textContent = '0';
            return;
        }
        inicio.current ??= t;
        const k = Math.min(1, (t - inicio.current) / 1.6);
        numero.current.textContent = String(Math.round(TOTAL_GLIFOS * (1 - (1 - k) ** 3)));
    });
    // as quinas de fora das palavras da terceira coluna, do Cut (σ 0) até o σ do Worn
    useLaco(
        fora,
        t => {
            const k = vaiEVolta(t, { parado0: 0.8, sobe: 1.1, parado1: 1.2, desce: 1.1 });
            const px = (SIGMA_WORN * k * pxDaLetra(pilhaFora.current)) / 1000;
            ajustarDesgaste(fora.current, px, 0);
            if (pegFora.current[0]) pegFora.current[0].style.left = `${(k * 100).toFixed(1)}%`;
            if (valFora.current[0]) valFora.current[0].textContent = `σ ${Math.round(SIGMA_WORN * k)}`;
        },
        30,
    );

    return (
        <div className="fx-grade">
            <Painel colunas={1} linhas={1} solto rotulo="Contador de glifos">
                <div ref={contador} className="fx-solto" style={{ fontFamily: familia }}>
                    <div className="fx-pilha" style={{ fontSize: u(120), lineHeight: 0.84 }}>
                        <div>RUNE</div>
                        <div>R</div>
                        <div>RU</div>
                        <div>RUN</div>
                        <div style={{ fontSize: u(36), lineHeight: 1.2 }}>FÖEGER RUNE CUT</div>
                    </div>
                    <div className="fx-contador" aria-hidden>
                        <span className="fx-contador-letra">R</span>
                        <span ref={numero} className="fx-contador-numero">
                            0
                        </span>
                    </div>
                    <ul className="fx-codigos" aria-label={GRUPOS.map(([, n, nome]) => `${n} ${nome}`).join(', ')}>
                        {GRUPOS.map(([a, n, nome]) => (
                            <li key={nome} aria-hidden>
                                <span>{a}</span>
                                <span>{n}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </Painel>
            <Painel colunas={1} linhas={1} solto rotulo="Tamanhos">
                <div className="fx-solto" style={{ fontFamily: familia }}>
                    <div className="fx-pilha">
                        {TAMANHOS.map(([p, t]) => (
                            <div key={p} style={{ fontSize: u(t), lineHeight: 1.02 }}>
                                {p}
                            </div>
                        ))}
                    </div>
                </div>
            </Painel>
            <Painel colunas={1} linhas={1} solto rotulo="Quinas de fora">
                <div ref={fora} className="fx-solto">
                    <DefsDesgaste id={`${id}-fora`} modo="fora" />
                    <div ref={pilhaFora} className="fx-pilha" style={{ fontFamily: familia, fontSize: u(80), lineHeight: 1.08, filter: `url(#${id}-fora)` }}>
                        <div>Granito</div>
                        <div>Basalto</div>
                        <div>Ardósia</div>
                        <div>Mármore</div>
                    </div>
                    <Ferramentas estilo={{ left: u(-58), top: u(-4) }} />
                    <Janela itens={[{ nome: 'QUINAS DE FORA', cor: 'var(--p-quente)' }]} pegadores={pegFora} valores={valFora} seta={0} estilo={{ left: u(150), top: u(352) }} />
                </div>
            </Painel>
            <Painel colunas={1} linhas={1} solto rotulo="Letras alternativas">
                <div ref={alt} className="fx-solto">
                    <div className="fx-pilha" style={{ fontFamily: familia, fontSize: u(80), lineHeight: 1.08, fontFeatureSettings: `"calt" ${ligado ? 1 : 0}` }}>
                        <div>Terra</div>
                        <div>Barro</div>
                        <div>Cascalho</div>
                        <div>Massapê</div>
                    </div>
                    <Janela itens={[{ nome: 'ALTERNATIVAS', cor: 'var(--tinta)' }]} pegadores={pegAlt} seta={0} estilo={{ left: u(250), top: u(70) }} />
                </div>
            </Painel>
        </div>
    );
}

// ——— Cut (marrom): os símbolos da fonte se gastando, no lugar dos pictogramas da Ease ———
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

// ——— Polished (azul): o cartaz do R com a lente e a pilha de palavras, e a citação emoldurada ———
// o R do cartaz: corpo 540 u, cortado na maiúscula (text-box), então a linha de base fica na altura da maiúscula
const CORPO_R = 540;
// a citação, uma linha por estilo, cada uma na sua fonte e com o σ de verdade do estilo
const CITACAO: [Estilo, string][] = [
    ['cut', 'Ditado de rio, verdade de pedra:'],
    ['polished', 'rolar tira as quinas e o limo'],
    ['worn', 'e deixa tudo mais liso.'],
];
export function CartazPolido({ estilo }: { estilo: Estilo }) {
    const familia = familiaDe(estilo);
    const sigma = (e: Estilo) => ESTILOS_SIGMA.find(s => s.nome.toLowerCase() === e)!.sigma;
    return (
        <div className="fx-grade">
            <Painel colunas={2} linhas={1} solto rotulo="Cartaz" estilo={{ gridColumn: '1 / span 2' }}>
                <div className="fx-solto" style={{ fontFamily: familia }}>
                    <ReguaFonte corpo={CORPO_R} base={(CORPO_R * LINHAS.maiuscula) / 1000} linha={LINHAS.maiuscula} estilo={{ left: 0, right: 'auto' }} />
                    <span className="fx-cartaz-r" aria-hidden>
                        R
                    </span>
                    <div className="fx-cartaz-lente" aria-hidden>
                        <span>R</span>
                    </div>
                    <div className="fx-cartaz-pilha">
                        <div style={{ fontSize: u(104) }}>SEIXO</div>
                        <div style={{ fontSize: u(92) }}>RIO</div>
                        <div style={{ fontSize: u(80) }}>RODA</div>
                        <div className="fx-dupla" style={{ fontSize: u(60) }}>
                            <span>LIXA</span>
                            <span>σ{sigma(estilo)}</span>
                        </div>
                        <div className="fx-dupla" style={{ fontSize: u(44) }}>
                            <span>RUNE</span>
                            <span>POLISHED</span>
                        </div>
                    </div>
                </div>
            </Painel>
            <Painel colunas={2} linhas={1} solto rotulo="Pedra que rola não cria limo" estilo={{ gridColumn: '3 / span 2' }}>
                <div className="fx-solto" style={{ fontFamily: familia }}>
                    <div className="fx-citacao">
                        Pedra que rola
                        <br />
                        não cria limo!
                    </div>
                    <div className="fx-citacao-linhas">
                        {CITACAO.map(([e, l]) => (
                            <div key={l} style={{ fontFamily: familiaDe(e) }}>
                                <small>{ESTILOS_SIGMA.find(s => s.nome.toLowerCase() === e)!.nome}</small>
                                <span>{l}</span>
                                <b>σ{sigma(e)}</b>
                            </div>
                        ))}
                    </div>
                </div>
            </Painel>
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
