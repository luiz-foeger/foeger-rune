'use client';

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useLenis } from 'lenis/react';
import { Regua } from './Painel';
import { Logo } from './LogoFoeger';
import { FiltroDesgaste, ajustarDesgaste } from './Desgaste';
import { CABECALHO, HERO } from '../_lib/conteudo';
import { LINHAS, PALAVRAS } from '../_lib/glifos';
import { useLaco } from '../_lib/movimento';

// o topo: o cabeçalho e o hero com a palavra que se gasta
const u = (n: number) => `calc(${n} * var(--u))`;

// ——— o cabeçalho, igual ao do site principal (luizfoeger.vercel.app; portfolio: rumo/_fa/Cabecalho.tsx) ———
// Fixo e transparente, em modo diferença, com as três peças de lá: à esquerda o "Menu" com o hambúrguer (no hover, as
// linhas correm e o texto rola; aberto, as linhas viram um X e o rótulo troca para "Fechar"), no meio a logo da
// Föeger na versão escrita (leva ao topo) e à direita, no lugar do PT/EN de lá, o "Baixar" do PDF. O menu é a cortina
// de lá, mas preta (lá é azul-marinho), com as seções da página: os itens entram do desfoque e, no hover de um, os outros apagam e
// desfocam e o sublinhado corre. Fica num portal no body: o [data-clone] tem container-type, que prenderia o fixed.
function Rola({ texto }: { texto: string }) {
    return (
        <span className="fx-rola">
            <span>{texto}</span>
            <span aria-hidden>{texto}</span>
        </span>
    );
}

export function Cabecalho() {
    const lenis = useLenis();
    const [aberto, setAberto] = useState(false);
    const [montado, setMontado] = useState(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- o portal só existe no navegador
    useEffect(() => setMontado(true), []);

    // com a cortina aberta, a página não rola; o Esc fecha
    useEffect(() => {
        if (aberto) lenis?.stop();
        else lenis?.start();
    }, [aberto, lenis]);
    useEffect(() => {
        const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false);
        window.addEventListener('keydown', tecla);
        return () => window.removeEventListener('keydown', tecla);
    }, []);

    // a posição do alvo sem o deslocamento da entrada (o painel ainda fora da tela está 80 u abaixo do lugar dele)
    const rolarPara = (alvo: string | number) => {
        const el = typeof alvo === 'string' ? document.getElementById(alvo) : null;
        let y = typeof alvo === 'number' ? alvo : 0;
        if (el) {
            const t = getComputedStyle(el).transform;
            y = el.getBoundingClientRect().top + window.scrollY - new DOMMatrix(t === 'none' ? undefined : t).m42 - 90;
        }
        if (lenis) lenis.scrollTo(y);
        else window.scrollTo({ top: y, behavior: 'smooth' });
    };
    // fecha a cortina e rola depois que ela sobe
    const ir = (alvo: string | number) => () => {
        const estava = aberto;
        setAberto(false);
        window.setTimeout(() => rolarPara(alvo), estava ? 350 : 0);
    };

    if (!montado) return null;
    return createPortal(
        <>
            <div className="fx-cortina" data-aberto={aberto || undefined} aria-hidden={!aberto}>
                <nav className="fx-cortina-lista" aria-label="Seções">
                    {CABECALHO.itens.map((m, i) => (
                        <button key={m.alvo} type="button" onClick={ir(m.alvo)} tabIndex={aberto ? 0 : -1} style={{ '--i': i } as CSSProperties}>
                            <span className="fx-sublinha">{m.texto}</span>
                        </button>
                    ))}
                </nav>
            </div>
            <div className="fx-desfoque" aria-hidden />
            <header className="fx-cab" data-aberto={aberto || undefined}>
                <button type="button" className="fx-cab-menu" onClick={() => setAberto(a => !a)} aria-expanded={aberto}>
                    <span className="fx-hamburguer" aria-hidden>
                        <span>
                            <i />
                        </span>
                        <span>
                            <i />
                        </span>
                    </span>
                    <span className="fx-cab-rotulo">
                        <span>
                            <Rola texto={CABECALHO.menu} />
                        </span>
                        <span aria-hidden>
                            <Rola texto={CABECALHO.fechar} />
                        </span>
                    </span>
                </button>
                <a
                    className="fx-cab-logo"
                    href="#"
                    aria-label="Föeger"
                    onClick={e => {
                        e.preventDefault();
                        ir(0)();
                    }}
                >
                    <Logo />
                </a>
                <a className="fx-cab-acao" href={CABECALHO.acao.href} download>
                    <Rola texto={`${CABECALHO.acao.texto} ↓`} />
                </a>
            </header>
        </>,
        document.body,
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
