'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Regua } from './Painel';
import { FiltroDesgaste, ajustarDesgaste } from './Desgaste';
import { CABECALHO, HERO } from '../_lib/conteudo';
import { LINHAS, PALAVRAS } from '../_lib/glifos';
import { useLaco } from '../_lib/movimento';

// o topo da página da Feixen: o cabeçalho branco (a logo digitada em máquina de escrever, o menu e o link da
// direita), a faixa cinza das fontes e o hero com a palavra animada. Fica preso no alto (sticky), meio transparente.
const u = (n: number) => `calc(${n} * var(--u))`;

// a logo: digita a frase, espera ~3,9 s, apaga só o que muda para a próxima e digita o resto (70–230 ms por tecla,
// ~80 ms para apagar), como na gravação
function useMaquina(frases: string[]) {
    const [texto, setTexto] = useState('');
    const [digitando, setDigitando] = useState(false);
    useEffect(() => {
        let s = 3;
        const sorteio = () => {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
        let atual = '';
        let alvo = 0;
        let id = 0;
        const passo = () => {
            const destino = frases[alvo];
            if (!destino.startsWith(atual)) {
                atual = atual.slice(0, -1);
                setTexto(atual);
                setDigitando(true);
                id = window.setTimeout(passo, 75 + sorteio() * 10);
            } else if (atual.length < destino.length) {
                atual = destino.slice(0, atual.length + 1);
                setTexto(atual);
                setDigitando(true);
                id = window.setTimeout(passo, 70 + sorteio() * 160);
            } else {
                setDigitando(false);
                alvo = (alvo + 1) % frases.length;
                id = window.setTimeout(passo, 3900);
            }
        };
        id = window.setTimeout(passo, 500);
        return () => window.clearTimeout(id);
    }, [frases]);
    return { texto, digitando };
}

export function Cabecalho() {
    const { texto, digitando } = useMaquina(CABECALHO.frases);
    return (
        <div className="fx-topo">
            <header className="fx-cabecalho">
                <a className="fx-logo" href="#" aria-label={CABECALHO.frases[0]}>
                    <span aria-hidden>{texto}</span>
                    <i className="fx-logo-cursor" data-digitando={digitando || undefined} aria-hidden />
                </a>
                <nav className="fx-menu" aria-label="Menu">
                    {CABECALHO.menu.map((grupo, g) => (
                        <div key={g} className="fx-menu-grupo">
                            {grupo.map((item, i) => (
                                <a key={item} href="#" data-ativo={(g === 0 && i === 0) || undefined}>
                                    {item}
                                </a>
                            ))}
                        </div>
                    ))}
                    <i className="fx-menu-seta" aria-hidden />
                </nav>
                <a className="fx-cabecalho-direita" href={CABECALHO.direita.href}>
                    {CABECALHO.direita.texto} <span aria-hidden>→</span>
                </a>
            </header>
            <nav className="fx-submenu" aria-label="Fontes">
                {CABECALHO.fontes.map(f => (
                    <a key={f.texto} href={f.href} data-ativo={f.ativo || undefined}>
                        {f.texto}
                    </a>
                ))}
                <a className="fx-pilula" href={CABECALHO.pilula.href}>
                    {CABECALHO.pilula.texto}
                </a>
            </nav>
        </div>
    );
}

// ——— o hero: "Rune" grande na Cut, e cada letra se gasta inteira quando o cursor passa por ela ———
// Cada letra tem o seu filtro de desgaste, com a mesma conta da fonte (desfoque σ e corte no meio-tom; 26 = Polished,
// 50 = Worn). Com o cursor em cima, a letra vai da Cut à Worn em ~0,3 s; quando ele sai, ela espera um pouco e volta
// à Cut (~1,2 s). O corte acompanha a escala da tela (pxPorUnidade), para a borda não serrilhar em nenhum σ. Passar o mouse pela palavra deixa as letras em estágios diferentes. Sem ninguém mexendo (e
// no começo), uma letra por vez se gasta e volta.
const ESCALA = 400 / LINHAS.maiuscula; // a maiúscula com 400 u
const MARGEM = 260;
const TOPO = -1150;
const ALTURA = 1500;
const BASE = 560; // a linha de base no hero, em u
const WORN = 50;
const SOBE = WORN / 0.3; // σ por segundo, gastando
const DESCE = WORN / 1.2; // σ por segundo, voltando
const ESPERA = 0.4; // segundos parada na Worn depois que o cursor sai
const VEZ = 1; // sem ninguém mexendo, uma letra nova a cada segundo

export function Hero() {
    const id = useId().replace(/:/g, '');
    const ref = useRef<HTMLElement>(null);
    const svg = useRef<SVGSVGElement>(null);
    const letras = useRef<(SVGGElement | null)[]>([]);
    const palavra = PALAVRAS.Rune;
    // a letra sob o cursor (ou -1), quando o cursor saiu, e o σ e o último toque de cada letra
    const estado = useRef({
        sob: -1,
        mexeu: -Infinity,
        antes: 0,
        sigma: palavra.glifos.map(() => 0),
        tocada: palavra.glifos.map(() => -Infinity),
        pu: 0,
    });

    useEffect(() => {
        const sec = ref.current;
        if (!sec) return;
        // qual letra está sob o cursor: pela faixa do avanço de cada uma, na altura das letras
        const mover = (e: PointerEvent) => {
            const m = svg.current?.getScreenCTM();
            if (!m) return;
            const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
            const dentro = p.y > -900 && p.y < 120;
            estado.current.sob = dentro ? palavra.glifos.findIndex(g => p.x >= g.x && p.x < g.x + g.avanco) : -1;
            estado.current.mexeu = performance.now() / 1000;
        };
        const sair = () => {
            estado.current.sob = -1;
            estado.current.mexeu = performance.now() / 1000;
        };
        sec.addEventListener('pointermove', mover);
        sec.addEventListener('pointerdown', mover);
        sec.addEventListener('pointerleave', sair);
        return () => {
            sec.removeEventListener('pointermove', mover);
            sec.removeEventListener('pointerdown', mover);
            sec.removeEventListener('pointerleave', sair);
        };
    }, [palavra]);

    useLaco(
        ref,
        s => {
            const e = estado.current;
            // pixels do aparelho por unidade da fonte (muda com a largura da janela); no primeiro quadro, ajusta tudo
            const pu = (svg.current?.getScreenCTM()?.a ?? ESCALA) * (window.devicePixelRatio || 1);
            const mudouEscala = Math.abs(pu - e.pu) > 0.01;
            e.pu = pu;
            const dt = Math.min(0.1, Math.max(0, s - e.antes));
            e.antes = s;
            // sem ninguém mexendo há 3 s, uma letra por vez, em ordem
            const sozinha = s - e.mexeu > 3 ? Math.floor(s / VEZ) % palavra.glifos.length : -1;
            const naVez = sozinha >= 0 && s % VEZ < 0.35 ? sozinha : -1;
            e.sigma.forEach((sg, i) => {
                if (i === e.sob || i === naVez) e.tocada[i] = s;
                const gastando = s - e.tocada[i] < ESPERA;
                const novo = gastando ? Math.min(WORN, sg + SOBE * dt) : Math.max(0, sg - DESCE * dt);
                e.sigma[i] = novo;
                if (novo !== sg || mudouEscala) ajustarDesgaste(letras.current[i], novo, novo, pu);
            });
        },
        30,
    );

    const largura = palavra.largura + 2 * MARGEM;
    const esq = (-palavra.largura / 2 - MARGEM) * ESCALA;
    return (
        <section ref={ref} className="fx-hero" aria-label={HERO.legenda.join('. ')}>
            {/* a cena encolhe no celular, onde a palavra passaria da largura */}
            <div className="fx-hero-cena">
                <svg
                    ref={svg}
                    className="fx-hero-palavra"
                    viewBox={`${-MARGEM} ${TOPO} ${largura} ${ALTURA}`}
                    style={{ left: `calc(50% + ${esq.toFixed(1)} * var(--u))`, top: u(BASE + TOPO * ESCALA), width: u(largura * ESCALA), height: u(ALTURA * ESCALA) }}
                    role="img"
                    aria-label="Rune"
                >
                    {/* cada filtro fica dentro do grupo da sua letra: o ajuste do σ procura as primitivas ali dentro */}
                    {palavra.glifos.map((g, i) => (
                        <g
                            key={i}
                            ref={el => {
                                letras.current[i] = el;
                            }}
                        >
                            <FiltroDesgaste id={`${id}-${i}`} modo="ambos" />
                            {g.pedras.map((p, k) => (
                                <path key={k} d={p.d} fill="#111" fillRule="evenodd" filter={`url(#${id}-${i})`} />
                            ))}
                        </g>
                    ))}
                </svg>
            </div>
            <p className="fx-hero-legenda">
                {HERO.legenda[0]}
                <br />
                {HERO.legenda[1]}
            </p>
            <div className="fx-hero-regua" aria-hidden>
                <Regua colunas={4} lado="base" classe="fx-so-largo" />
                <Regua colunas={2} lado="base" classe="fx-so-celular" />
            </div>
        </section>
    );
}
