'use client';

import { useId, useRef, type CSSProperties } from 'react';
import Painel from './Painel';
import { familiaDe } from './Faixa';
import { Barras, FiltroTinta, LADOS, LinhaCheia, somaTempo, usePx } from './Pratica';
import type { Estilo } from '../_lib/conteudo';

// a gaveta: as peças das faixas que não estão na home, guardadas para o "escreva aqui" (onde a pessoa vai poder ver o
// texto dela em cada uma) e para as páginas de comparação (/versoes/polished e /versoes/worn, que não sobem). Cada
// uma com a peça grande e a de texto pequeno, no estilo pedido: 1 o sabonete; 2 o picolé (as embalagens e a tabela
// nutricional); 4 a placa do parque (a sinalização e o painel que explica por que o seixo é redondo); 5 o bolo da vó
// (as bandeirinhas, o bolo com as velas e a receita); 7 o café (os sacos, o copo e a lousa); 8 o cartaz da exposição
// (o quadro e as etiquetas de museu); 9 os bordados da puído (os patches e as etiquetas da roupa). O 3, o livro, e o 6,
// o disco, foram para a home (Pratica.tsx)

function Legenda({ texto }: { texto: string }) {
    return <p className="fx-ingresso-legenda">{texto}</p>;
}

// ——— 1. o sabonete (era a Polished da home) ———
// a pedra que o rio alisou vira sabonete: uma barra com a cinta de papel do rótulo (a cinta fica presa no contorno da
// barra, como o papel que abraça o sabão) e outra já sem embalagem, com a marca gravada no sabão
export function SabonetePolished() {
    return (
        <Painel colunas={4} linhas={2} rotulo="Sabonete seixo: uma barra com a cinta do rótulo e outra com a marca gravada" celular={{ colunas: 2, linhas: 3 }} nu>
            <div className="fx-pia" style={{ fontFamily: familiaDe('polished') }} aria-hidden>
                <div className="fx-sabonete" data-barra="cinta">
                    <div className="fx-sabonete-cinta">
                        <p className="fx-cinta-miudo">FEITO À MÃO ★ ARGILA BRANCA</p>
                        <p className="fx-cinta-marca">seixo</p>
                        <p className="fx-cinta-sub">sabonete liso como pedra de rio</p>
                        <p className="fx-cinta-peso">100 g</p>
                    </div>
                </div>
                <div className="fx-sabonete" data-barra="nua">
                    <p className="fx-sabonete-gravado">seixo</p>
                </div>
            </div>
        </Painel>
    );
}

// ——— Polished: o rótulo de trás, em texto pequeno ———
const ROTULO: [string, string][] = [
    [
        'INGREDIENTES',
        'Óleo de coco, azeite de oliva, manteiga de karité, argila branca, água filtrada, hidróxido de sódio (ele some na cura e vira sabão) e óleo essencial de alecrim.',
    ],
    ['MODO DE USAR', 'Molhe as mãos e o sabonete, faça espuma e espalhe pela pele. Enxágue bem. Guarde fora d’água: como a pedra no rio, ele fica mais liso a cada uso.'],
    ['CUIDADOS', 'Uso externo. Evite o contato com os olhos; se acontecer, lave com água corrente. Em caso de irritação, suspenda o uso.'],
];
const LOTE = '000026';
export function RotuloPolished() {
    const caixa = useRef<HTMLDivElement>(null);
    const marca = useRef<HTMLParagraphElement>(null);
    const texto = useRef<HTMLParagraphElement>(null);
    const titulo = useRef<HTMLParagraphElement>(null);
    const { a: pxMarca, b: pxTexto, c: pxTitulo } = usePx(caixa, [marca, texto, titulo], { a: 72, b: 16, c: 13 });
    return (
        <Painel colunas={4} linhas={1} rotulo="Rótulo de trás do sabonete, em texto pequeno" celular={{ colunas: 2, linhas: 2 }} nu>
            <div ref={caixa} className="fx-ingresso-painel">
                <div className="fx-rotulo" style={{ fontFamily: familiaDe('polished') }}>
                    <div className="fx-rotulo-marca">
                        <p ref={marca} className="fx-rotulo-logo">
                            seixo
                        </p>
                        <p className="fx-rotulo-sub">sabonete de argila branca</p>
                        <p className="fx-rotulo-sub">100 g ★ feito à mão</p>
                    </div>
                    {ROTULO.map(([t, p], i) => (
                        <div key={t} className="fx-rotulo-coluna">
                            <p ref={i === 0 ? titulo : undefined} className="fx-rotulo-titulo">
                                {t}
                            </p>
                            <p ref={i === 0 ? texto : undefined} className="fx-rotulo-texto">
                                {p}
                            </p>
                        </div>
                    ))}
                    <div className="fx-rotulo-pe">
                        <p className="fx-rotulo-titulo">LOTE 026 ★ VALIDADE 03/2028</p>
                        <Barras numero={LOTE} classe="fx-rotulo-barras" />
                    </div>
                </div>
                <p className="fx-ingresso-legenda">
                    No rótulo: marca a {pxMarca} px, texto a {pxTexto} px e títulos a {pxTitulo} px
                </p>
            </div>
        </Painel>
    );
}

// ——— 2. o picolé ———
// a serrilha das pontas da embalagem (onde o plástico é selado), como um polígono: dentes em % da largura e da altura
function serrilha(dentes: number, fundo: number) {
    const n = dentes * 2;
    const dir = Array.from({ length: n + 1 }, (_, k) => `${k % 2 ? 100 - fundo : 100}% ${((k * 100) / n).toFixed(2)}%`);
    const esq = Array.from({ length: n + 1 }, (_, k) => `${(n - k) % 2 ? fundo : 0}% ${(((n - k) * 100) / n).toFixed(2)}%`);
    return `polygon(${[...dir, ...esq].join(', ')})`;
}
const SERRILHA = serrilha(9, 1.6);
// na faixa Worn (verde), a embalagem verde de limão sumiria no fundo: o primeiro sabor vira maracujá, em ocre
const PRIMEIRO: Record<Estilo, { sabor: string; cor: string; fruta: string }> = {
    cut: { sabor: 'limão com hortelã', cor: 'var(--p-worn)', fruta: 'suco de limão (12%), folhas de hortelã' },
    polished: { sabor: 'limão com hortelã', cor: 'var(--p-worn)', fruta: 'suco de limão (12%), folhas de hortelã' },
    worn: { sabor: 'maracujá azedinho', cor: 'var(--p-cut)', fruta: 'polpa de maracujá (14%)' },
};
const SABORES = [
    { sabor: 'limão com hortelã', cor: 'var(--p-worn)', tinta: 'var(--p-papel)', giro: -5, x: 130, y: 40 },
    { sabor: 'morango do sítio', cor: 'var(--p-quente-claro)', tinta: 'var(--p-papel)', giro: 3, x: 700, y: 290 },
    { sabor: 'coco queimado', cor: 'var(--p-papel)', tinta: 'var(--p-frio)', giro: -2, x: 240, y: 540 },
];

function Lupa({ texto }: { texto: string }) {
    return (
        <span className="fx-v-lupa">
            <i aria-hidden />
            <span>{texto}</span>
        </span>
    );
}

export function PicolePolished({ estilo = 'polished' }: { estilo?: Estilo }) {
    const familia = familiaDe(estilo);
    const sabores = SABORES.map((s, i) => (i === 0 ? { ...s, sabor: PRIMEIRO[estilo].sabor, cor: PRIMEIRO[estilo].cor, tinta: estilo === 'worn' ? 'var(--p-frio)' : s.tinta } : s));
    return (
        <Painel colunas={4} linhas={2} rotulo={`Três embalagens do picolé rolê: ${sabores.map(s => s.sabor).join(', ')}`} celular={{ colunas: 2, linhas: 3 }} nu>
            <div className="fx-v-mesa" style={{ fontFamily: familia }} aria-hidden>
                {sabores.map((s, i) => (
                    <div
                        key={s.sabor}
                        className="fx-v-picole"
                        data-i={i}
                        style={{ '--x': `calc(${s.x} * var(--u))`, '--y': `calc(${s.y} * var(--u))`, '--giro': `${s.giro}deg` } as CSSProperties}
                    >
                        <div className="fx-v-picole-plastico" style={{ background: s.cor, color: s.tinta, clipPath: SERRILHA }}>
                            <p className="fx-v-picole-marca">rolê</p>
                            <div className="fx-v-picole-info">
                                <p className="fx-v-picole-sabor">{s.sabor}</p>
                                <p className="fx-v-picole-miudo">picolé de fruta ★ 60 g</p>
                            </div>
                            <Lupa texto="ALTO EM AÇÚCAR ADICIONADO" />
                        </div>
                    </div>
                ))}
            </div>
        </Painel>
    );
}

// a tabela nutricional do picolé de limão (no formato da RDC 429 da Anvisa): por 100 g, pela porção de 60 g e o %VD da
// porção, com os valores diários de referência (2000 kcal, 300 g de carboidratos, 50 g de açúcares adicionados, 50 g de
// proteínas, 65 g de gorduras, 20 g de saturadas, 25 g de fibras e 2000 mg de sódio)
const TABELA: [string, string, string, string, boolean?][] = [
    ['Valor energético (kcal)', '120', '72', '4'],
    ['Carboidratos totais (g)', '30', '18', '6'],
    ['Açúcares totais (g)', '27', '16', '', true],
    ['Açúcares adicionados (g)', '25', '15', '30', true],
    ['Proteínas (g)', '0', '0', '0'],
    ['Gorduras totais (g)', '0', '0', '0'],
    ['Gorduras saturadas (g)', '0', '0', '0'],
    ['Gorduras trans (g)', '0', '0', '**'],
    ['Fibras alimentares (g)', '0,5', '0,3', '1'],
    ['Sódio (mg)', '10', '6', '0'],
];
export function TabelaPolished({ estilo = 'polished' }: { estilo?: Estilo }) {
    const familia = familiaDe(estilo);
    const sabor = PRIMEIRO[estilo];
    const caixa = useRef<HTMLDivElement>(null);
    const titulo = useRef<HTMLParagraphElement>(null);
    const texto = useRef<HTMLParagraphElement>(null);
    const tabela = useRef<HTMLTableElement>(null);
    const { a, b, c } = usePx(caixa, [titulo, texto, tabela], { a: 34, b: 15, c: 13 });
    return (
        <Painel colunas={4} linhas={1} rotulo="O verso da embalagem do picolé, em texto pequeno" celular={{ colunas: 2, linhas: 2 }} nu>
            <div ref={caixa} className="fx-ingresso-painel">
                <div className="fx-v-verso" style={{ fontFamily: familia }}>
                    <div className="fx-v-verso-texto">
                        <p ref={titulo} className="fx-v-verso-titulo">
                            rolê ★ {sabor.sabor}
                        </p>
                        <p ref={texto} className="fx-v-verso-corpo">
                            INGREDIENTES: água, açúcar, {sabor.fruta}, estabilizante goma guar e acidulante ácido cítrico. NÃO CONTÉM
                            GLÚTEN. ALÉRGICOS: PODE CONTER LEITE.
                        </p>
                        <p className="fx-v-verso-corpo">Conserve a −18 °C ou mais frio. Depois de descongelado, não congele de novo.</p>
                        <div className="fx-v-verso-pe">
                            <Lupa texto="ALTO EM AÇÚCAR ADICIONADO" />
                            <Barras numero="000026" classe="fx-v-verso-barras" />
                        </div>
                    </div>
                    <table ref={tabela} className="fx-v-tabela">
                        <caption>INFORMAÇÃO NUTRICIONAL</caption>
                        <thead>
                            <tr>
                                <th colSpan={4} className="fx-v-tabela-porcao">
                                    Porções por embalagem: 1 ★ Porção: 60 g (1 picolé)
                                </th>
                            </tr>
                            <tr>
                                <th />
                                <th>100 g</th>
                                <th>60 g</th>
                                <th>%VD*</th>
                            </tr>
                        </thead>
                        <tbody>
                            {TABELA.map(([nome, cem, porcao, vd, dentro]) => (
                                <tr key={nome}>
                                    <td data-dentro={dentro || undefined}>{nome}</td>
                                    <td>{cem}</td>
                                    <td>{porcao}</td>
                                    <td>{vd}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={4}>*Percentual de valores diários fornecidos pela porção. **VD não estabelecido.</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                <Legenda texto={`No verso: nome a ${a} px, texto a ${b} px e tabela a ${c} px`} />
            </div>
        </Painel>
    );
}

// ——— 4. a placa do parque ———
const DESTINOS: [string, string, string][] = [
    ['→', 'Prainha do rio', '300 m'],
    ['←', 'Trilha das lajes', '1,2 km'],
    ['↑', 'Mirante', '600 m'],
];
export function PlacaPolished({ estilo = 'polished' }: { estilo?: Estilo }) {
    const familia = familiaDe(estilo);
    return (
        <Painel colunas={4} linhas={2} rotulo="Placa do Parque das Pedras Roladas, com a direção da prainha, da trilha e do mirante" celular={{ colunas: 2, linhas: 3 }} nu>
            <div className="fx-v-mesa" style={{ fontFamily: familia }} aria-hidden>
                <div className="fx-v-placa">
                    <i className="fx-v-poste" data-lado="esq" />
                    <i className="fx-v-poste" data-lado="dir" />
                    <div className="fx-v-placa-nome">
                        <p className="fx-v-placa-miudo">BEM-VINDO AO</p>
                        <p className="fx-v-placa-titulo">Parque das Pedras Roladas</p>
                    </div>
                    {DESTINOS.map(([seta, lugar, distancia], i) => (
                        <div key={lugar} className="fx-v-placa-destino" data-i={i}>
                            <span className="fx-v-placa-seta">{seta}</span>
                            <span>{lugar}</span>
                            <span className="fx-v-placa-distancia">{distancia}</span>
                        </div>
                    ))}
                </div>
            </div>
        </Painel>
    );
}

// o painel que explica o seixo: o texto e os três "o" da fonte como as três idades da pedra
export function PainelPolished({ estilo = 'polished' }: { estilo?: Estilo }) {
    const familia = familiaDe(estilo);
    const caixa = useRef<HTMLDivElement>(null);
    const titulo = useRef<HTMLParagraphElement>(null);
    const texto = useRef<HTMLParagraphElement>(null);
    const rotulo = useRef<HTMLSpanElement>(null);
    const { a, b, c } = usePx(caixa, [titulo, texto, rotulo], { a: 40, b: 17, c: 14 });
    return (
        <Painel colunas={4} linhas={1} rotulo="Painel do parque: por que o seixo é redondo, em texto pequeno" celular={{ colunas: 2, linhas: 2 }} nu>
            <div ref={caixa} className="fx-ingresso-painel">
                <div className="fx-v-painel" style={{ fontFamily: familia }}>
                    <div className="fx-v-painel-texto">
                        <p ref={titulo} className="fx-v-painel-titulo">
                            Por que o seixo é redondo?
                        </p>
                        <p ref={texto} className="fx-v-painel-corpo">
                            A pedra chega ao rio com quinas vivas. A correnteza arrasta cada uma contra a areia e contra as outras pedras, e o atrito gasta
                            primeiro as pontas, onde a pedra é mais fina. Com o tempo, sobra a forma lisa e redonda do seixo.
                        </p>
                        <p className="fx-v-painel-corpo">Deixe as pedras no rio: elas ainda têm muito o que rolar.</p>
                    </div>
                    <div className="fx-v-painel-idades">
                        {(
                            [
                                ['cut', 'chegou ao rio'],
                                ['polished', 'rolou um pouco'],
                                ['worn', 'rolou muito'],
                            ] as const
                        ).map(([e, r], i) => (
                            <div key={e} className="fx-v-painel-idade">
                                <span className="fx-v-painel-o" style={{ fontFamily: familiaDe(e) }}>
                                    o
                                </span>
                                <span ref={i === 0 ? rotulo : undefined} className="fx-v-painel-rotulo">
                                    {r}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
                <Legenda texto={`No painel: título a ${a} px, texto a ${b} px e legendas a ${c} px`} />
            </div>
        </Painel>
    );
}

// ——— 5. o bolo da vó (uma opção para a Worn) ———
// as letras moles do Worn como confeito: a festa dos 80 anos da vó, de frente, com as bandeirinhas "VIVA A VÓ!", o bolo
// de chocolate com a cobertura escorrendo, "parabéns!" escrito de bico na lateral e as velas de número 8 e 0 (os
// próprios algarismos da fonte, de cera, acesos). Tudo em SVG, em duas montagens: deitada (desktop) e em pé (celular)
const CORES_BANDEIRA = ['var(--p-quente-claro)', 'var(--p-cut)', 'var(--p-polished)', 'var(--p-papel)', 'var(--p-quente)'];

// as bandeirinhas num barbante que cede no meio (uma curva de Bézier): cada bandeira pendurada na curva, inclinada
// com ela, com uma letra; o espaço do texto vira um vão sem bandeira
function Bandeirinhas({ p, texto, x0, x1, y, queda, w, h, corpo }: { p: string; texto: string; x0: number; x1: number; y: number; queda: number; w: number; h: number; corpo: number }) {
    const n = texto.length;
    const ponto = (t: number) => {
        const cx = (x0 + x1) / 2;
        const cy = y + 2 * queda;
        const px = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
        const py = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * cy + t * t * y;
        const dx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx);
        const dy = 2 * (1 - t) * (cy - y) + 2 * t * (y - cy);
        return { px, py, giro: (Math.atan2(dy, dx) * 180) / Math.PI };
    };
    let cor = 0;
    return (
        <g>
            <path d={`M${x0} ${y} Q${(x0 + x1) / 2} ${y + 2 * queda} ${x1} ${y}`} fill="none" stroke="#5a4636" strokeWidth="3" />
            {[...texto].map((ch, i) => {
                if (ch === ' ') return null;
                const { px, py, giro } = ponto((i + 0.5) / n);
                const fundo = CORES_BANDEIRA[cor++ % CORES_BANDEIRA.length];
                const tinta = fundo === 'var(--p-papel)' || fundo === 'var(--p-cut)' ? 'var(--p-frio)' : 'var(--p-papel)';
                return (
                    <g key={i} transform={`translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${giro.toFixed(1)})`}>
                        <path d={`M${-w / 2} 0 H${w / 2} L0 ${h} Z`} fill={fundo} />
                        <path d={`M${-w / 2} 0 H${w / 2} L0 ${h} Z`} fill={`url(#${p}-dobra)`} />
                        <text x="0" y={h * 0.52} textAnchor="middle" fontSize={corpo * 0.86} fill={tinta}>
                            {ch}
                        </text>
                    </g>
                );
            })}
        </g>
    );
}

// o bolo de frente: a boleira (o prato e o pé), o corpo de chocolate com a sombra de cilindro, a cobertura rosa que
// escorre em pingos, os confeitos de bico na base, "parabéns!" na lateral e as velas 8 e 0 com pavio e chama
const PINGOS = [46, 78, 34, 92, 58, 40, 84, 50, 70, 36, 88, 54, 42];
function Bolo({ p, cx, topo, largura, altura }: { p: string; cx: number; topo: number; largura: number; altura: number }) {
    const esq = cx - largura / 2;
    const base = topo + altura;
    const ry = largura * 0.07;
    const passo = largura / PINGOS.length;
    return (
        <g>
            {/* a boleira */}
            <path d={`M${cx - 70} ${base + 26} L${cx - 110} ${base + 96} H${cx + 110} L${cx + 70} ${base + 26} Z`} fill="var(--p-papel)" />
            <path d={`M${cx - 70} ${base + 26} L${cx - 110} ${base + 96} H${cx + 110} L${cx + 70} ${base + 26} Z`} fill={`url(#${p}-cilindro)`} />
            <ellipse cx={cx} cy={base + 14} rx={largura / 2 + 60} ry={ry * 0.6} fill="var(--p-papel)" />
            <ellipse cx={cx} cy={base + 20} rx={largura / 2 + 60} ry={ry * 0.6} fill="none" stroke="#000" strokeOpacity="0.12" strokeWidth="4" />
            {/* o corpo */}
            <rect x={esq} y={topo} width={largura} height={altura} rx="18" fill="#6b4330" />
            <rect x={esq} y={topo} width={largura} height={altura} rx="18" fill={`url(#${p}-cilindro)`} />
            {/* os confeitos da base */}
            {Array.from({ length: Math.floor(largura / 34) }, (_, i) => (
                <circle key={i} cx={esq + 17 + i * 34} cy={base - 6} r="15" fill="var(--p-papel)" filter={`url(#${p}-relevo)`} />
            ))}
            {/* a cobertura: a tampa de cima e os pingos */}
            {PINGOS.map((l, i) => (
                <rect key={i} x={esq + i * passo + passo * 0.18} y={topo} width={passo * 0.64} height={l + 22} rx={passo * 0.32} fill="var(--p-tinta-quente)" />
            ))}
            <rect x={esq} y={topo - 4} width={largura} height="30" rx="12" fill="var(--p-tinta-quente)" />
            <ellipse cx={cx} cy={topo} rx={largura / 2} ry={ry} fill="var(--p-tinta-quente)" />
            <ellipse cx={cx - largura * 0.12} cy={topo - ry * 0.25} rx={largura * 0.28} ry={ry * 0.45} fill="#fff" opacity="0.35" />
            {/* "parabéns!" de bico na lateral, por cima da cobertura que escorreu */}
            <text x={cx} y={topo + altura * 0.8} textAnchor="middle" fontSize={largura * 0.18} fill="var(--p-papel)" filter={`url(#${p}-relevo)`}>
                parabéns!
            </text>
            {/* as velas: os algarismos da fonte, de cera, com pavio e chama */}
            {(
                [
                    ['8', cx - largura * 0.16, 'var(--p-quente-claro)'],
                    ['0', cx + largura * 0.16, 'var(--p-polished)'],
                ] as const
            ).map(([d, x, cor]) => (
                <g key={d}>
                    <text x={x} y={topo + ry * 0.4} textAnchor="middle" fontSize={largura * 0.3} fill={cor} filter={`url(#${p}-relevo)`}>
                        {d}
                    </text>
                    <path d={`M${x} ${topo - largura * 0.22} v-18`} stroke="#3a2a20" strokeWidth="4" strokeLinecap="round" />
                    <path
                        d={`M${x} ${topo - largura * 0.22 - 74} C${x + 16} ${topo - largura * 0.22 - 50} ${x + 18} ${topo - largura * 0.22 - 24} ${x} ${topo - largura * 0.22 - 18} C${x - 18} ${topo - largura * 0.22 - 24} ${x - 16} ${topo - largura * 0.22 - 50} ${x} ${topo - largura * 0.22 - 74} Z`}
                        fill={`url(#${p}-chama)`}
                        filter={`url(#${p}-brilho)`}
                    />
                </g>
            ))}
        </g>
    );
}

function DefsBolo({ p }: { p: string }) {
    return (
        <defs>
            <linearGradient id={`${p}-cilindro`} x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor="#000" stopOpacity="0.35" />
                <stop offset="0.35" stopColor="#fff" stopOpacity="0.12" />
                <stop offset="0.6" stopColor="#000" stopOpacity="0" />
                <stop offset="1" stopColor="#000" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id={`${p}-dobra`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#000" stopOpacity="0.18" />
                <stop offset="0.25" stopColor="#000" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`${p}-chama`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#fff3b0" />
                <stop offset="0.55" stopColor="#ffb238" />
                <stop offset="1" stopColor="#e8602c" />
            </linearGradient>
            <filter id={`${p}-relevo`} x="-10%" y="-10%" width="120%" height="130%">
                <feDropShadow dx="1.5" dy="3" stdDeviation="2" floodColor="#000" floodOpacity="0.35" />
            </filter>
            <filter id={`${p}-brilho`} x="-100%" y="-60%" width="300%" height="220%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="halo" />
                <feMerge>
                    <feMergeNode in="halo" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>
    );
}

export function BoloWorn() {
    // cada montagem com os seus ids: o SVG escondido (o deitado no celular) não empresta gradiente para o outro
    const id = useId().replace(/:/g, '');
    const fonte = { fontFamily: familiaDe('worn') };
    return (
        <Painel colunas={4} linhas={2} rotulo="A festa da vó: bandeirinhas com viva a vó e o bolo com parabéns e as velas 8 e 0" celular={{ colunas: 2, linhas: 3 }} nu>
            <div className="fx-v-mesa" aria-hidden>
                <svg className="fx-festa" data-tela="largo" viewBox="0 0 1829 826" style={fonte}>
                    <DefsBolo p={`${id}-l`} />
                    <Bandeirinhas p={`${id}-l`} texto="VIVA A VÓ!" x0={40} x1={1789} y={40} queda={70} w={118} h={150} corpo={84} />
                    <Bolo p={`${id}-l`} cx={914} topo={500} largura={600} altura={230} />
                </svg>
                <svg className="fx-festa" data-tela="celular" viewBox="0 0 885 1357" style={fonte}>
                    <DefsBolo p={`${id}-c`} />
                    <Bandeirinhas p={`${id}-c`} texto="VIVA" x0={20} x1={865} y={40} queda={50} w={150} h={190} corpo={110} />
                    <Bandeirinhas p={`${id}-c`} texto="A VÓ!" x0={20} x1={865} y={300} queda={50} w={150} h={190} corpo={110} />
                    <Bolo p={`${id}-c`} cx={442} topo={900} largura={640} altura={270} />
                </svg>
            </div>
        </Painel>
    );
}

// ——— 5. a receita do bolo, em texto pequeno ———
// a ficha pautada da receita, amarelada e com os cantos gastos de tanto uso (como a pedra), com a margem vermelha, a
// mancha de café e uma de gordura
const INGREDIENTES = ['3 ovos', '2 xícaras de farinha de trigo', '1 ½ xícara de açúcar', '1 xícara de chocolate em pó', '1 xícara de leite morno e ½ de óleo', '1 colher (sopa) de fermento'];
export function ReceitaWorn() {
    const caixa = useRef<HTMLDivElement>(null);
    const titulo = useRef<HTMLParagraphElement>(null);
    const texto = useRef<HTMLParagraphElement>(null);
    const nota = useRef<HTMLParagraphElement>(null);
    const { a, b, c } = usePx(caixa, [titulo, texto, nota], { a: 36, b: 16, c: 13 });
    return (
        <Painel colunas={4} linhas={1} rotulo="A receita do bolo de chocolate da vó, numa ficha pautada, em texto pequeno" celular={{ colunas: 2, linhas: 2 }} nu>
            <div ref={caixa} className="fx-ingresso-painel">
                <div className="fx-receita" style={{ fontFamily: familiaDe('worn') }}>
                    <div className="fx-receita-cabeca">
                        <p ref={titulo} className="fx-receita-titulo">
                            Bolo de chocolate da vó
                        </p>
                        <p className="fx-receita-rende">rende 12 pedaços</p>
                    </div>
                    <ul className="fx-receita-lista">
                        {INGREDIENTES.map(i => (
                            <li key={i}>{i}</li>
                        ))}
                    </ul>
                    <div className="fx-receita-modo">
                        <p ref={texto} className="fx-receita-texto">
                            Bata os ovos com o açúcar até clarear. Junte o leite, o óleo e o chocolate e, por último, a farinha e o fermento, mexendo devagar.
                            Asse em forno médio por uns 40 minutos, até o palito sair limpo. Cubra ainda morno.
                        </p>
                        <p ref={nota} className="fx-receita-nota">
                            (a receita é da minha mãe, que era da mãe dela)
                        </p>
                    </div>
                </div>
                <p className="fx-ingresso-legenda">
                    Na receita: título a {a} px, texto a {b} px e nota a {c} px
                </p>
            </div>
        </Painel>
    );
}

// ——— 7. o café artesanal (uma opção para a Worn) ———
// os sacos de papel kraft com a marca carimbada (a mesma tinta áspera do cartaz da Cut) e o copo com a cinta
const SACOS = [
    { cor: '#c49a6c', tinta: '#4a2c1e', torra: 'torra média', giro: -3 },
    { cor: '#2b2522', tinta: 'var(--p-papel)', torra: 'torra escura', giro: 2 },
];
export function CafeWorn() {
    const id = `${useId().replace(/:/g, '')}-cafe`;
    return (
        <Painel colunas={4} linhas={2} rotulo="Dois sacos do café moenda, um de torra média e um de torra escura, e um copo de café" celular={{ colunas: 2, linhas: 3 }} nu>
            <div className="fx-v-mesa fx-balcao" style={{ fontFamily: familiaDe('worn') }} aria-hidden>
                {SACOS.map((s, i) => (
                    <div key={s.torra} className="fx-saco" data-i={i} style={{ '--saco': s.cor, '--carimbo': s.tinta, '--giro': `${s.giro}deg` } as CSSProperties}>
                        <FiltroTinta id={`${id}-${i}`} semente={i + 4} />
                        <div className="fx-saco-carimbo" style={{ filter: `url(#${id}-${i})` }}>
                            <p className="fx-saco-miudo">CAFÉ DO SÍTIO</p>
                            <p className="fx-saco-marca">moenda</p>
                            <p className="fx-saco-miudo">
                                {s.torra} ★ 250 g
                            </p>
                            <p className="fx-saco-selo">moído na hora</p>
                        </div>
                    </div>
                ))}
                <div className="fx-copo">
                    <span className="fx-copo-tampa" />
                    <div className="fx-copo-cinta">
                        <p>moenda</p>
                    </div>
                </div>
            </div>
        </Painel>
    );
}

// o cardápio na lousa, escrito a giz, em texto pequeno: os preços com a linha de pontinhos até o valor
const CARDAPIO: [string, string][][] = [
    [
        ['Espresso', '6'],
        ['Coado na hora', '8'],
        ['Cappuccino', '12'],
        ['Café com leite', '9'],
    ],
    [
        ['Pão de queijo', '7'],
        ['Bolo do dia', '9'],
        ['Misto quente', '14'],
        ['Suco da fruta', '10'],
    ],
];
export function CardapioWorn() {
    const caixa = useRef<HTMLDivElement>(null);
    const titulo = useRef<HTMLParagraphElement>(null);
    const item = useRef<HTMLLIElement>(null);
    const nota = useRef<HTMLParagraphElement>(null);
    const { a, b, c } = usePx(caixa, [titulo, item, nota], { a: 52, b: 20, c: 15 });
    return (
        <Painel colunas={4} linhas={1} rotulo="O cardápio da cafeteria, escrito a giz numa lousa, em texto pequeno" celular={{ colunas: 2, linhas: 2 }} nu>
            <div ref={caixa} className="fx-ingresso-painel">
                <div className="fx-lousa" style={{ fontFamily: familiaDe('worn') }}>
                    <div className="fx-lousa-cabeca">
                        <p ref={titulo} className="fx-lousa-titulo">
                            cardápio
                        </p>
                        <p ref={nota} className="fx-lousa-nota">
                            o café é moído na hora: se demorar um pouquinho, é por isso
                        </p>
                    </div>
                    {CARDAPIO.map((coluna, i) => (
                        <ul key={i} className="fx-lousa-lista">
                            {coluna.map(([nome, preco], k) => (
                                <li key={nome} ref={i === 0 && k === 0 ? item : undefined}>
                                    <span>{nome}</span>
                                    <i />
                                    <span>R$ {preco}</span>
                                </li>
                            ))}
                        </ul>
                    ))}
                </div>
                <p className="fx-ingresso-legenda">
                    Na lousa: título a {a} px, itens a {b} px e nota a {c} px
                </p>
            </div>
        </Painel>
    );
}

// ——— 8. o cartaz da exposição (uma opção para a Worn) ———
// só a letra: o pôster emoldurado da exposição "o tempo das pedras", com "erosão" de uma borda à outra
export function ExposicaoWorn() {
    return (
        <Painel colunas={4} linhas={2} rotulo="Cartaz emoldurado da exposição o tempo das pedras: erosão, no Museu do Rio" celular={{ colunas: 2, linhas: 3 }} nu>
            <div className="fx-v-mesa" style={{ fontFamily: familiaDe('worn') }} aria-hidden>
                <div className="fx-quadro">
                    <div className="fx-quadro-cartaz">
                        <div className="fx-quadro-linha">
                            <span>EXPOSIÇÃO ★ O TEMPO DAS PEDRAS</span>
                            <span>12 MAR — 30 JUN</span>
                        </div>
                        <div className="fx-quadro-palavra">
                            <LinhaCheia texto="erosão" largura={1330} />
                        </div>
                        <div className="fx-quadro-linha">
                            <span>MUSEU DO RIO ★ ENTRADA GRATUITA</span>
                            <span>TER A DOM, 10H ÀS 18H</span>
                        </div>
                    </div>
                </div>
            </div>
        </Painel>
    );
}

// as etiquetas de museu de duas pedras da exposição, em texto pequeno: a lasca (o começo) e o seixo (o fim)
const OBRAS = [
    {
        titulo: 'Lasca nº 1',
        origem: 'Encosta do morro, sem data',
        material: 'Quartzo bruto, 6 × 4 × 3 cm',
        texto: 'Uma lasca recém-solta da rocha: quinas vivas, faces planas e nenhum sinal de água. Assim começa toda pedra de rio.',
    },
    {
        titulo: 'Seixo nº 26',
        origem: 'Leito do rio, sem data',
        material: 'Quartzo rolado, 4 × 3 × 2 cm',
        texto: 'A mesma pedra depois de muito tempo no fundo do rio. A correnteza gastou as pontas primeiro, e o que sobrou foi esta forma lisa, que ainda não terminou.',
    },
];
export function EtiquetasMuseuWorn() {
    const caixa = useRef<HTMLDivElement>(null);
    const titulo = useRef<HTMLParagraphElement>(null);
    const texto = useRef<HTMLParagraphElement>(null);
    const ficha = useRef<HTMLParagraphElement>(null);
    const { a, b, c } = usePx(caixa, [titulo, texto, ficha], { a: 30, b: 16, c: 14 });
    return (
        <Painel colunas={4} linhas={1} rotulo="As etiquetas de museu da lasca e do seixo, em texto pequeno" celular={{ colunas: 2, linhas: 2 }} nu>
            <div ref={caixa} className="fx-ingresso-painel">
                <div className="fx-etiquetas-museu" style={{ fontFamily: familiaDe('worn') }}>
                    {OBRAS.map((o, i) => (
                        <div key={o.titulo} className="fx-etiqueta-museu">
                            <p ref={i === 0 ? titulo : undefined} className="fx-etiqueta-museu-titulo">
                                {o.titulo}
                            </p>
                            <p ref={i === 0 ? ficha : undefined} className="fx-etiqueta-museu-ficha">
                                {o.origem}
                                <br />
                                {o.material}
                            </p>
                            <p ref={i === 0 ? texto : undefined} className="fx-etiqueta-museu-texto">
                                {o.texto}
                            </p>
                            <p className="fx-etiqueta-museu-ficha">Acervo do Museu do Rio</p>
                        </div>
                    ))}
                </div>
                <p className="fx-ingresso-legenda">
                    Nas etiquetas: título a {a} px, texto a {b} px e ficha a {c} px
                </p>
            </div>
        </Painel>
    );
}
// ——— 9. os bordados da puído (era a Worn da home) ———
// a pedra que a correnteza gastou vira a roupa que o uso amaciou: a marca "puído" (o pano gasto de tanto usar) em três
// patches bordados, com a sarja do fundo, a borda de overloque, as letras em ponto cetim (as listrinhas do fio) e o
// relevo do bordado (a sombra embaixo das letras). Tudo em SVG, com a própria fonte nos textos
function Tramas({ id }: { id: string }) {
    // a sarja (o fundo do patch) e o cetim (o fio das letras), um par por cor
    const sarja = (n: string, base: string) => (
        <pattern id={`${id}-sarja-${n}`} patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)">
            <rect width="7" height="7" fill={base} />
            <rect width="2.2" height="7" fill="#000" opacity="0.12" />
        </pattern>
    );
    const cetim = (n: string, base: string) => (
        <pattern id={`${id}-cetim-${n}`} patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(62)">
            <rect width="4" height="4" fill={base} />
            <rect width="1.3" height="4" fill="#fff" opacity="0.35" />
        </pattern>
    );
    return (
        <defs>
            {sarja('verde', 'var(--p-worn-escuro)')}
            {sarja('barro', 'var(--p-quente-claro)')}
            {sarja('ocre', 'var(--p-cut)')}
            {cetim('papel', 'var(--p-papel)')}
            {cetim('azul', 'var(--p-frio)')}
            {/* o relevo do bordado: a linha alta faz sombra no tecido */}
            <filter id={`${id}-relevo`} x="-10%" y="-10%" width="120%" height="130%">
                <feDropShadow dx="1.5" dy="2.5" stdDeviation="1.6" floodColor="#000" floodOpacity="0.4" />
            </filter>
        </defs>
    );
}

// a borda de overloque: o fio grosso enrolado na beirada (a linha tracejada por cima faz os pontos do fio)
function Borda({ d, fio = 'var(--p-papel)' }: { d: string; fio?: string }) {
    return (
        <g fill="none">
            <path d={d} stroke={fio} strokeWidth="24" strokeLinejoin="round" />
            <path d={d} stroke="#000" strokeOpacity="0.16" strokeWidth="24" strokeDasharray="1.6 2.4" strokeLinejoin="round" />
        </g>
    );
}

export function BordadosWorn() {
    const id = `${useId().replace(/:/g, '')}-bordado`;
    const fonte = { fontFamily: familiaDe('worn') };
    const oval = 'M360 18 A342 212 0 1 1 359.9 18 Z';
    const fita = 'M14 30 H746 L716 100 L746 170 H14 L44 100 Z';
    return (
        <Painel colunas={4} linhas={2} rotulo="Três patches bordados da marca puído: o nome, um coração e a frase macio de tanto lavar" celular={{ colunas: 2, linhas: 3 }} nu>
            <div className="fx-v-mesa fx-armarinho" aria-hidden>
                <svg className="fx-patch" data-patch="oval" viewBox="0 0 720 460" style={fonte}>
                    <Tramas id={id} />
                    <path d={oval} fill={`url(#${id}-sarja-verde)`} />
                    <ellipse cx="360" cy="230" rx="306" ry="178" fill="none" stroke="var(--p-papel)" strokeWidth="3" strokeDasharray="12 8" opacity="0.8" />
                    <g filter={`url(#${id}-relevo)`}>
                        <text x="360" y="258" textAnchor="middle" fontSize="230" fill={`url(#${id}-cetim-papel)`}>
                            puído
                        </text>
                        <text x="360" y="334" textAnchor="middle" fontSize="34" fill={`url(#${id}-cetim-papel)`}>
                            roupa que melhora com o uso
                        </text>
                    </g>
                    <Borda d={oval} />
                </svg>
                <svg className="fx-patch" data-patch="redondo" viewBox="0 0 420 420" style={fonte}>
                    <Tramas id={`${id}-r`} />
                    <circle cx="210" cy="210" r="196" fill={`url(#${id}-r-sarja-barro)`} />
                    <circle cx="210" cy="210" r="160" fill="none" stroke="var(--p-papel)" strokeWidth="3" strokeDasharray="10 7" opacity="0.8" />
                    <path id={`${id}-arco-cima`} d="M80 210 A130 130 0 0 1 340 210" fill="none" />
                    <path id={`${id}-arco-baixo`} d="M58 210 A152 152 0 0 0 362 210" fill="none" />
                    <g filter={`url(#${id}-r-relevo)`} fill={`url(#${id}-r-cetim-papel)`}>
                        <text fontSize="34" letterSpacing="2">
                            <textPath href={`#${id}-arco-cima`} startOffset="50%" textAnchor="middle">
                                feito para gastar
                            </textPath>
                        </text>
                        <text fontSize="150" x="210" y="262" textAnchor="middle">
                            ♥
                        </text>
                        <text fontSize="28" letterSpacing="2">
                            <textPath href={`#${id}-arco-baixo`} startOffset="50%" textAnchor="middle">
                                lava ★ seca ★ repete
                            </textPath>
                        </text>
                    </g>
                    <Borda d="M210 14 A196 196 0 1 1 209.9 14 Z" />
                </svg>
                <svg className="fx-patch" data-patch="fita" viewBox="0 0 760 200" style={fonte}>
                    <Tramas id={`${id}-f`} />
                    <path d={fita} fill={`url(#${id}-f-sarja-ocre)`} />
                    <g filter={`url(#${id}-f-relevo)`}>
                        <text x="380" y="121" textAnchor="middle" fontSize="58" fill={`url(#${id}-f-cetim-azul)`}>
                            macio de tanto lavar
                        </text>
                    </g>
                    <Borda d={fita} />
                </svg>
            </div>
        </Painel>
    );
}

// ——— 9. a etiqueta de papel e a de lavagem, em texto pequeno ———
// os símbolos de lavagem (NBR ISO 3758): à mão a 30 °C, não alvejar, secar à sombra pendurada, passar em temperatura
// baixa e não lavar a seco
function Cuidados() {
    const traco = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
    return (
        <div className="fx-cuidados" aria-label="Lavar à mão a 30 graus, não usar alvejante, secar à sombra, passar em temperatura baixa, não lavar a seco">
            <svg viewBox="0 0 40 40" aria-hidden>
                <path d="M4 13 L9 33 H31 L36 13" {...traco} />
                <path d="M4 13 q4 -4 8 0 t8 0 t8 0 t8 0" {...traco} />
                <text x="20" y="28" textAnchor="middle" fontSize="11" fill="currentColor" fontFamily="var(--ff-ui)">
                    30
                </text>
            </svg>
            <svg viewBox="0 0 40 40" aria-hidden>
                <path d="M20 6 L36 33 H4 Z" {...traco} />
                <path d="M8 8 L32 36 M32 8 L8 36" {...traco} />
            </svg>
            <svg viewBox="0 0 40 40" aria-hidden>
                <rect x="5" y="5" width="30" height="30" {...traco} />
                <path d="M5 17 L17 5 M5 24 L24 5" {...traco} />
                <path d="M20 12 V30" {...traco} />
            </svg>
            <svg viewBox="0 0 40 40" aria-hidden>
                <path d="M6 30 H35 V24 C35 16 30 12 22 12 H12 L8 18" {...traco} />
                <path d="M8 18 L6 30" {...traco} />
                <circle cx="21" cy="23" r="1.8" fill="currentColor" />
            </svg>
            <svg viewBox="0 0 40 40" aria-hidden>
                <circle cx="20" cy="20" r="14" {...traco} />
                <path d="M7 7 L33 33 M33 7 L7 33" {...traco} />
            </svg>
        </div>
    );
}

export function EtiquetaWorn() {
    const caixa = useRef<HTMLDivElement>(null);
    const marca = useRef<HTMLParagraphElement>(null);
    const texto = useRef<HTMLParagraphElement>(null);
    const miudo = useRef<HTMLParagraphElement>(null);
    const { a: pxMarca, b: pxTexto, c: pxMiudo } = usePx(caixa, [marca, texto, miudo], { a: 64, b: 16, c: 12 });
    const fonte = { fontFamily: familiaDe('worn') };
    return (
        <Painel colunas={4} linhas={1} rotulo="A etiqueta de papel e a etiqueta de lavagem da camiseta, em texto pequeno" celular={{ colunas: 2, linhas: 2 }} nu>
            <div ref={caixa} className="fx-ingresso-painel">
                <div className="fx-etiquetas" style={fonte}>
                    <div className="fx-tag">
                        <svg className="fx-tag-cordao" viewBox="0 0 120 120" aria-hidden>
                            <path d="M118 62 C80 58 52 20 6 40" fill="none" stroke="var(--p-papel)" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                        <div className="fx-tag-marca">
                            <p ref={marca} className="fx-tag-logo">
                                puído
                            </p>
                            <p className="fx-tag-sub">roupa que melhora com o uso</p>
                        </div>
                        <p ref={texto} className="fx-tag-texto">
                            Esta camiseta foi feita para gastar. A cada lavagem o algodão fica mais macio e a cor desbota um pouco, como a pedra que o rio
                            arredonda. Isso não é defeito: é o uso.
                        </p>
                        <div className="fx-tag-pe">
                            <p className="fx-tag-miudo">TAMANHO M ★ 100% ALGODÃO</p>
                            <p className="fx-tag-preco">R$ 89</p>
                        </div>
                    </div>
                    <div className="fx-lavagem">
                        <p ref={miudo} className="fx-lavagem-texto">
                            100% ALGODÃO
                            <br />
                            FIO PENTEADO 30.1
                            <br />
                            FEITO NO BRASIL
                        </p>
                        <Cuidados />
                        <p className="fx-lavagem-texto">LAVE DO AVESSO E SEM PRESSA</p>
                    </div>
                </div>
                <p className="fx-ingresso-legenda">
                    Nas etiquetas: marca a {pxMarca} px, texto a {pxTexto} px e detalhes a {pxMiudo} px
                </p>
            </div>
        </Painel>
    );
}

// ——— 10. o ingresso comprido (era o texto pequeno da Cut, antes das caixinhas) ———
const NUMERO = '000311';
export function IngressoCut() {
    const caixa = useRef<HTMLDivElement>(null);
    const titulo = useRef<HTMLParagraphElement>(null);
    const texto = useRef<HTMLParagraphElement>(null);
    const miudo = useRef<HTMLParagraphElement>(null);
    const { a: pxTitulo, b: pxTexto, c: pxMiudo } = usePx(caixa, [titulo, texto, miudo], { a: 84, b: 17, c: 14 });
    const px = { titulo: pxTitulo, texto: pxTexto, miudo: pxMiudo };
    return (
        <Painel colunas={4} linhas={1} rotulo="Ingresso do festival, em texto pequeno" celular={{ colunas: 2, linhas: 2 }} nu>
            <div ref={caixa} className="fx-ingresso-painel">
                <div className="fx-ingresso" style={{ fontFamily: familiaDe('cut') }}>
                    <div className="fx-ingresso-corpo">
                        <p ref={miudo} className="fx-ingresso-miudo">
                            <span>INGRESSO ★ PISTA ★ 2º LOTE</span>
                            <span>Nº {NUMERO}</span>
                        </p>
                        <p ref={titulo} className="fx-ingresso-titulo">
                            Quebra Pedra
                        </p>
                        <p className="fx-ingresso-sub">festival de rock bruto ★ 21 de março ★ 20h ★ Galpão da Pedreira</p>
                        <p ref={texto} className="fx-ingresso-texto">
                            Vale uma entrada, uma vez só. Guarde o canhoto até o fim: na saída, ele vira uma lasca da pedra do palco. Não entra vidro nem
                            pedra de fora, e o capacete é por sua conta.
                        </p>
                    </div>
                    <div className="fx-ingresso-canhoto">
                        <p className="fx-ingresso-setor">
                            <span>PISTA</span>
                            <span>R$ 20</span>
                        </p>
                        <p className="fx-ingresso-miudo">
                            <span>21/03 ★ 20H</span>
                            <span>Nº {NUMERO}</span>
                        </p>
                        <Barras numero={NUMERO} />
                    </div>
                </div>
                <p className="fx-ingresso-legenda">
                    No ingresso: título a {px.titulo} px, texto a {px.texto} px e detalhes a {px.miudo} px
                </p>
            </div>
        </Painel>
    );
}

// ——— 11. a página dupla do livro (era o texto pequeno da Polished, antes das caixinhas) ———
// a página dupla da história, em texto pequeno: o texto corrido no tamanho de leitura, o cabeçalho e o número
const PAGINAS = [
    {
        n: 12,
        texto: 'Era uma vez uma pedra cheia de quinas. Ela morava no alto do morro e espetava tudo o que chegava perto: o vento, a chuva e até as formigas. Um dia a chuva veio mais forte, e a pedra desceu o morro rolando, tum, tum, tum, até cair no rio.',
    },
    {
        n: 13,
        texto: 'A água era fria e não parava nunca. Levava a pedra para baixo, para cima, para o lado, e a cada volta uma quina ia embora. Quando o rio ficou calmo, a pedra se olhou no fundo e quase não se reconheceu: estava lisinha, redonda, boa de segurar.',
    },
];
export function PaginaPolished({ estilo = 'polished' }: { estilo?: Estilo }) {
    const familia = familiaDe(estilo);
    const caixa = useRef<HTMLDivElement>(null);
    const cabeca = useRef<HTMLParagraphElement>(null);
    const texto = useRef<HTMLParagraphElement>(null);
    const numero = useRef<HTMLParagraphElement>(null);
    const { a, b, c } = usePx(caixa, [texto, cabeca, numero], { a: 20, b: 13, c: 13 });
    return (
        <Painel colunas={4} linhas={1} rotulo="Uma página dupla do livro, em texto pequeno" celular={{ colunas: 2, linhas: 2 }} nu>
            <div ref={caixa} className="fx-ingresso-painel">
                <div className="fx-v-paginas" style={{ fontFamily: familia }}>
                    {PAGINAS.map((p, i) => (
                        <div key={p.n} className="fx-v-pagina">
                            <p ref={i === 0 ? cabeca : undefined} className="fx-v-pagina-cabeca">
                                A PEDRINHA QUE ROLOU
                            </p>
                            <p ref={i === 0 ? texto : undefined} className="fx-v-pagina-texto">
                                {p.texto}
                            </p>
                            <p ref={i === 0 ? numero : undefined} className="fx-v-pagina-numero">
                                {p.n}
                            </p>
                        </div>
                    ))}
                </div>
                <p className="fx-ingresso-legenda">
                    Na página: texto a {a} px, cabeçalho e número a {b} px
                </p>
            </div>
        </Painel>
    );
}

// ——— 12. o encarte do disco (era o texto pequeno da Worn, antes das caixinhas) ———
export function EncarteWorn() {
    const caixa = useRef<HTMLDivElement>(null);
    const titulo = useRef<HTMLParagraphElement>(null);
    const faixa = useRef<HTMLLIElement>(null);
    const texto = useRef<HTMLParagraphElement>(null);
    const { a, b, c } = usePx(caixa, [titulo, faixa, texto], { a: 22, b: 16, c: 15 });
    return (
        <Painel colunas={4} linhas={1} rotulo="O encarte do disco: as faixas, o texto e os créditos, em texto pequeno" celular={{ colunas: 2, linhas: 2 }} nu>
            <div ref={caixa} className="fx-ingresso-painel">
                <div className="fx-encarte" style={{ fontFamily: familiaDe('worn') }}>
                    {LADOS.map(([lado, faixas], i) => (
                        <div key={lado} className="fx-encarte-lado">
                            <p ref={i === 0 ? titulo : undefined} className="fx-encarte-titulo">
                                {lado} <span>{somaTempo(faixas)}</span>
                            </p>
                            <ol>
                                {faixas.map(([nome, tempo], k) => (
                                    <li key={nome} ref={i === 0 && k === 0 ? faixa : undefined}>
                                        <span>{nome}</span>
                                        <i />
                                        <span>{tempo}</span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    ))}
                    <div className="fx-encarte-notas">
                        <p ref={texto} className="fx-encarte-texto">
                            Gravado quase sem cortes, este disco tem o som de um rio que passa por cima das pedras há muito tempo: nada aqui é novo, tudo foi
                            gasto até ficar macio. Ouça do começo ao fim, com o volume baixo e a janela aberta.
                        </p>
                        <p className="fx-encarte-creditos">Discos Correnteza ★ LP-026 ★ 33 rpm ★ estéreo</p>
                    </div>
                </div>
                <p className="fx-ingresso-legenda">
                    No encarte: lados a {a} px, faixas a {b} px e texto a {c} px
                </p>
            </div>
        </Painel>
    );
}
