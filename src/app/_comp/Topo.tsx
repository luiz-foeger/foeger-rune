'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Regua } from './Painel';
import Seta from './Seta';
import { FiltroDesgaste, ajustarDesgaste } from './Desgaste';
import { CABECALHO, HERO } from '../_lib/conteudo';
import { LINHAS, PALAVRAS, type Ponto } from '../_lib/glifos';
import { arco, quinasDe, raioDe } from '../_lib/geometria';
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

// ——— o hero: "Rune" no lugar do "Ease", cada letra com o papel da letra da gravação ———
//   R (cinza, como o E): as quinas de fora se gastam e endireitam, depois as de dentro, com os nós
//   u (vermelho, como o a): os nós quadrados e as coordenadas, que somem e voltam
//   n (preto, como o s, que muda de peso): vai da Cut ao desgaste máximo e volta
//   e (roxo): cai, quica e volta a subir a cada 3 s; no fundo da queda, troca de desenho (e, e.v2, e.v3, e.v4)
const ESCALA = 265 / LINHAS.maiuscula; // a maiúscula com 265 u, como o E da gravação
const MARGEM = 160;
const TOPO = -1020;
const ALTURA = 1440;
const BASE = 464; // a linha de base no hero

type Chave = [number, number, ('entra' | 'sai' | 'suave')?];
// valor de um roteiro em quadros-chave (tempo, valor, curva do trecho que chega nele)
function roteiro(t: number, chaves: Chave[]) {
    for (let i = 1; i < chaves.length; i++) {
        const [t1, v1, curva = 'suave'] = chaves[i];
        const [t0, v0] = chaves[i - 1];
        if (t <= t1) {
            const k = t1 === t0 ? 1 : (t - t0) / (t1 - t0);
            const e = curva === 'entra' ? k * k : curva === 'sai' ? 1 - (1 - k) * (1 - k) : k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
            return v0 + (v1 - v0) * e;
        }
    }
    return chaves[chaves.length - 1][1];
}
const R_FORA: Chave[] = [[0, 50], [0.4, 50], [1.0, 0], [4.4, 0], [5.3, 50], [6, 50]];
const R_DENTRO: Chave[] = [[0, 0], [2.4, 0], [3.0, 40], [4.4, 40], [5.3, 0], [6, 0]];
const N_SIGMA: Chave[] = [[0, 50], [0.3, 50], [1.0, 0], [1.33, 0], [2.2, 50], [3.3, 50], [4.0, 0], [5.27, 0], [6, 50]];
const E_QUEDA: Chave[] = [[0, -51], [0.3, -51], [0.6, 115, 'entra'], [0.9, -9, 'sai'], [1.2, 13], [1.33, 13], [1.5, 0, 'sai'], [2.27, 0], [2.97, -51], [3, -51]];

export function Hero() {
    const id = useId().replace(/:/g, '');
    const ref = useRef<HTMLDivElement>(null);
    const nosR = useRef<(SVGCircleElement | null)[]>([]);
    const marcasU = useRef<SVGGElement>(null);
    const letraE = useRef<SVGGElement>(null);
    const variantes = useRef<(SVGGElement | null)[]>([]);
    const setas = useRef<(SVGSVGElement | null)[]>([]);
    const palavra = PALAVRAS.Rune;
    const [R, U, N, E] = palavra.glifos;
    const quinasR = useMemo(() => R.pedras.flatMap(p => quinasDe(p.vertices)), [R]);
    const verticesU = useMemo(() => U.pedras.flatMap(p => p.vertices.flat()), [U]);
    const desenhosE = useMemo(() => [E, PALAVRAS['#e.v2'].glifos[0], PALAVRAS['#e.v3'].glifos[0], PALAVRAS['#e.v4'].glifos[0]], [E]);

    useLaco(ref, s => {
        const t = s % 6;
        const sf = roteiro(t, R_FORA);
        const sd = roteiro(t, R_DENTRO);
        ajustarDesgaste(ref.current?.querySelector('[data-letra="R"]') ?? null, sf, sd);
        ajustarDesgaste(ref.current?.querySelector('[data-letra="n"]') ?? null, roteiro(t, N_SIGMA), 0);
        quinasR.forEach((q, i) => {
            const sg = q.convexa ? sf : sd;
            const a = arco(q, raioDe(sg));
            const pts: Ponto[] = sg < 1.5 ? [q.v, q.v] : [a.p, a.t];
            pts.forEach((p, k) => {
                const c = nosR.current[i * 2 + k];
                if (!c) return;
                c.setAttribute('cx', p[0].toFixed(1));
                c.setAttribute('cy', p[1].toFixed(1));
            });
        });
        const comPontos = !((t >= 1.43 && t < 2.6) || (t >= 4.53 && t < 5.97));
        marcasU.current?.setAttribute('opacity', comPontos ? '1' : '0');
        const c3 = s % 3;
        letraE.current?.setAttribute('transform', `translate(0 ${(roteiro(c3, E_QUEDA) / ESCALA).toFixed(1)})`);
        const qual = Math.floor((s + 3 - 0.43) / 3) % 4;
        variantes.current.forEach((g, i) => g?.setAttribute('opacity', i === qual ? '1' : '0'));
        // as setas "editando" cada letra, com um balanço pequeno
        setas.current.forEach((el, i) => {
            if (!el) return;
            const dx = Math.sin(s * 0.9 + i * 1.7) * 8;
            const dy = Math.cos(s * 0.7 + i * 2.3) * 6;
            el.style.transform = `translate(calc(${dx.toFixed(1)} * var(--u)), calc(${dy.toFixed(1)} * var(--u)))`;
        });
    });

    const largura = palavra.largura + 2 * MARGEM;
    const esq = (-palavra.largura / 2 - MARGEM) * ESCALA;
    const pedras = (g: typeof R, cor: string, filtro?: string) =>
        g.pedras.map((p, i) => <path key={i} d={p.d} fill={cor} fillRule="evenodd" filter={filtro ? `url(#${filtro})` : undefined} />);
    // onde ficam as setas, em unidades da fonte (depois convertidas para o hero)
    const setasFonte: Ponto[] = [
        [-40, -60],
        [U.x + 300, 60],
        [N.x + 120, -110],
        [E.x + 300, -660],
    ];
    return (
        <section ref={ref} className="fx-hero" aria-label={HERO.legenda.join('. ')}>
            {/* a cena (a palavra e as setas) encolhe junto no celular, onde a palavra passaria da largura */}
            <div className="fx-hero-cena">
                <svg
                    className="fx-hero-palavra"
                    viewBox={`${-MARGEM} ${TOPO} ${largura} ${ALTURA}`}
                    style={{ left: `calc(50% + ${esq.toFixed(1)} * var(--u))`, top: u(BASE + TOPO * ESCALA), width: u(largura * ESCALA), height: u(ALTURA * ESCALA) }}
                    role="img"
                    aria-label="Rune"
                >
                    {/* cada filtro fica dentro do grupo da sua letra: o ajuste do σ procura as primitivas ali dentro */}
                    <g data-letra="R">
                        <FiltroDesgaste id={`${id}-r`} modo="livre" contorno="#3a3a3a" raioContorno={1.3 / ESCALA} />
                        {pedras(R, '#bababa', `${id}-r`)}
                    </g>
                    {quinasR.flatMap((q, i) =>
                        [0, 1].map(k => (
                            <circle
                                key={`${i}-${k}`}
                                ref={el => {
                                    nosR.current[i * 2 + k] = el;
                                }}
                                cx={q.v[0]}
                                cy={q.v[1]}
                                r={5 / ESCALA}
                                fill="none"
                                stroke="#2a2a2a"
                                strokeWidth={1.2 / ESCALA}
                            />
                        )),
                    )}
                    <g>{pedras(U, '#fe3700')}</g>
                    <g ref={marcasU}>
                        {verticesU.map(([x, y], i) => (
                            <g key={i}>
                                <rect x={x - 4 / ESCALA} y={y - 4 / ESCALA} width={8 / ESCALA} height={8 / ESCALA} fill="#111" />
                                <text x={x + 6 / ESCALA} y={y + (i % 2 ? 14 : -8) / ESCALA} className="fx-hero-coordenada" style={{ fontSize: 8.5 / ESCALA }}>
                                    {`${(x - U.x).toFixed(1)} ${(-y).toFixed(1)}`}
                                </text>
                            </g>
                        ))}
                    </g>
                    <g data-letra="n">
                        <FiltroDesgaste id={`${id}-n`} modo="ambos" />
                        {pedras(N, '#111', `${id}-n`)}
                    </g>
                    <g ref={letraE}>
                        {desenhosE.map((g, i) => (
                            <g
                                key={i}
                                ref={el => {
                                    variantes.current[i] = el;
                                }}
                                opacity={i === 0 ? 1 : 0}
                                transform={i === 0 ? undefined : `translate(${E.x} 0)`}
                            >
                                {pedras(g, '#9d5af9')}
                            </g>
                        ))}
                    </g>
                </svg>
                {setasFonte.map(([x, y], i) => (
                    <Seta
                        key={i}
                        ref={el => {
                            setas.current[i] = el;
                        }}
                        style={{ left: `calc(50% + ${((x - palavra.largura / 2) * ESCALA).toFixed(1)} * var(--u))`, top: u(BASE + y * ESCALA) }}
                    />
                ))}
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
