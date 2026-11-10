'use client';

import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import Painel from './Painel';
import { familiaDe } from './Faixa';
import type { Estilo } from '../_lib/conteudo';

// as faixas no padrão novo: depois da frase que corre, cada estilo aparece onde ele seria usado de verdade, numa peça
// grande e em quatro caixinhas de texto pequeno (a fonte e o tamanho de cada texto aparecem passando o mouse), sem régua
// nem trama: a régua fica com a frase que corre, a letra medida; embaixo, a mesma letra em uso. No Cut, o cartaz
// lambe-lambe de um festival colado na parede (cada linha na largura inteira, em corpos diferentes, como o tipo de
// madeira da gráfica de cartaz de rua) e, embaixo, quatro caixinhas do mesmo festival em texto pequeno (o ingresso,
// a pulseira, o crachá e a setlist). No Polished, o
// livro infantil e o guia de viagem (as capas e, nas caixinhas, a página, o marcador, a ficha da biblioteca e o
// ex-libris); no Worn, o
// disco gasto (a capa e o disco e, nas caixinhas, a contracapa, o selo do lado B, a etiqueta do sebo e a ficha técnica).

// uma linha que ocupa a largura inteira da caixa: mede a frase a 100 px e escala o corpo até a largura bater. Só refaz
// a conta quando a largura da caixa muda (a altura muda junto com o corpo e não pode disparar outra conta)
export function LinhaCheia({ texto, largura }: { texto: string; largura: number }) {
    const ref = useRef<HTMLSpanElement>(null);
    useLayoutEffect(() => {
        const el = ref.current;
        const caixa = el?.parentElement;
        if (!el || !caixa) return;
        let ultima = -1;
        let vivo = true;
        const ajustar = (forcar = false) => {
            const cs = getComputedStyle(caixa);
            const W = caixa.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
            if (W <= 0 || (!forcar && W === ultima)) return;
            ultima = W;
            el.style.fontSize = '100px';
            const w = el.getBoundingClientRect().width;
            if (w) el.style.fontSize = `${((100 * W) / w).toFixed(2)}px`;
        };
        ajustar();
        document.fonts.ready.then(() => vivo && ajustar(true));
        const obs = new ResizeObserver(() => ajustar());
        obs.observe(caixa);
        return () => {
            vivo = false;
            obs.disconnect();
        };
    }, [texto]);
    // o corpo de antes da conta, estimado pelo número de letras, para a página não pular quando a conta chega
    const estimado = largura / (texto.length * 0.62);
    return (
        <span ref={ref} className="fx-linha-cheia" style={{ fontSize: `calc(${estimado.toFixed(1)} * var(--u))` }}>
            {texto}
        </span>
    );
}

// ——— Cut: os cartazes do festival, colados na parede ———
// três cartazes em pé (2:3) da mesma noite, lado a lado, como o lambe-lambe é colado na rua: cada um num papel, um pouco
// torto, com a textura e os vincos da cola, e o último com o canto rasgado. O do festival empilha as linhas na largura
// inteira; o do show dos Lascados gira em volta da data enorme; o da programação é uma tabela de horários, com os fios
// de metal da gráfica entre as linhas e o nome de cada banda no corpo que couber. A tinta passa por um filtro que deixa
// a borda áspera e umas falhas onde ela não pegou, como na impressão de cartaz de rua. No pé, a linha da gráfica em
// letra de texto, como nos lambe-lambes de verdade. Os papéis são claro, vermelho e preto (no preto, a tinta é creme).
// No celular fica só o do festival
// recuo: a margem dos dois lados do bloco (em u), para a linha não ocupar a largura toda
type Bloco = { linhas: string[]; faixa?: boolean; recuo?: number; grade?: undefined } | { grade: [string, string][]; linhas?: undefined };
const CARTAZES: Bloco[][] = [
    [
        { linhas: ['21 MAR ★ 20H', 'GALPÃO DA PEDREIRA'] },
        { linhas: ['QUEBRA', 'PEDRA'] },
        { linhas: ['OS LASCADOS', 'CINZEL ★ BRITA 3'], faixa: true },
        { linhas: ['festival de', 'rock bruto'] },
        { linhas: ['pista a R$ 20', 'traga seu capacete'] },
    ],
    [
        { linhas: ['SÁBADO ★ 22H'] },
        { linhas: ['21'], recuo: 46 },
        { linhas: ['DE MARÇO'] },
        { linhas: ['OS LASCADOS'], faixa: true },
        { linhas: ['lançam o disco', 'CASCALHO'] },
        { linhas: ['entrada R$ 15'] },
    ],
    [
        { linhas: ['QUEBRA PEDRA ★ 21 MAR'] },
        { linhas: ['PROGRAMA'], faixa: true },
        {
            grade: [
                ['20H', 'CINZEL'],
                ['21H', 'BRITA 3'],
                ['22H', 'OS LASCADOS'],
                ['23H30', 'DJ MARRETA'],
            ],
        },
        { linhas: ['entrada pela', 'rua da brita →'] },
    ],
];
const COPIAS: { papel: string; tinta: string; giro: number; desce: number; rasgo?: boolean }[] = [
    { papel: 'var(--p-papel)', tinta: '#111', giro: -1.6, desce: 14 },
    { papel: 'var(--p-quente)', tinta: '#111', giro: 0.9, desce: -6 },
    { papel: '#161616', tinta: '#efe7d6', giro: -0.5, desce: 8, rasgo: true },
];
const textoDo = (cartaz: Bloco[]) => cartaz.flatMap(b => b.linhas ?? b.grade.map(l => l.join(' '))).join('. ');

// a tinta do cartaz: a borda tremida (o ruído empurra a borda uns 2 px) e as falhas, onde um segundo ruído passa do
// limite e a tinta some. Cada cópia tem a sua semente: duas cópias impressas nunca saem iguais
export function FiltroTinta({ id, semente }: { id: string; semente: number }) {
    return (
        <svg className="fx-defs" width="0" height="0" aria-hidden>
            <filter id={id} x="-2%" y="-2%" width="104%" height="104%" colorInterpolationFilters="sRGB">
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={3 + semente} result="ruido" />
                <feDisplacementMap in="SourceGraphic" in2="ruido" scale="1.6" xChannelSelector="R" yChannelSelector="G" result="borda" />
                <feTurbulence type="fractalNoise" baseFrequency="0.16" numOctaves="2" seed={11 + 7 * semente} result="manchas" />
                <feColorMatrix in="manchas" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -30 0 0 0 22.3" result="falhas" />
                <feComposite in="borda" in2="falhas" operator="in" />
            </filter>
        </svg>
    );
}

function Lambe({ filtro, cartaz }: { filtro: string; cartaz: Bloco[] }) {
    return (
        <div className="fx-lambe" style={{ filter: `url(#${filtro})` }} aria-hidden>
            {cartaz.map((b, k) =>
                b.grade ? (
                    // a tabela da programação: o horário num corpo fixo e a banda na largura que sobra, com o fio
                    // de metal em cima de cada linha
                    <div key={k} className="fx-lambe-grade">
                        {b.grade.map(([hora, banda]) => (
                            <div key={banda} className="fx-lambe-grade-linha">
                                <span className="fx-lambe-hora">{hora}</span>
                                <div className="fx-lambe-banda">
                                    <LinhaCheia texto={banda} largura={330} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div
                        key={k}
                        className="fx-lambe-bloco"
                        data-faixa={b.faixa || undefined}
                        style={b.recuo ? { paddingInline: `calc(${b.recuo} * var(--u))` } : undefined}
                    >
                        {b.linhas.map(l => (
                            <LinhaCheia key={l} texto={l} largura={472} />
                        ))}
                    </div>
                ),
            )}
            <p className="fx-lambe-credito">Gráfica Pedreira ★ impressão em tipo de madeira</p>
        </div>
    );
}

export function CartazCut() {
    const filtro = `${useId().replace(/:/g, '')}-tinta`;
    const texto = CARTAZES.map(textoDo).join(' | ');
    return (
        <Painel colunas={4} linhas={2} rotulo={`Três cartazes colados na parede: ${texto}`} celular={{ colunas: 2, linhas: 3 }} nu>
            <div className="fx-muro" style={{ fontFamily: familiaDe('cut') }}>
                {COPIAS.map((c, i) => (
                    <div
                        key={i}
                        className="fx-cartaz-folha"
                        data-copia={i}
                        data-rasgo={c.rasgo || undefined}
                        style={{ '--papel': c.papel, '--tinta-cartaz': c.tinta, '--giro': `${c.giro}deg`, '--desce': `calc(${c.desce} * var(--u))` } as CSSProperties}
                    >
                        <FiltroTinta id={`${filtro}-${i}`} semente={i} />
                        <div className="fx-cartaz-papel">
                            <Lambe filtro={`${filtro}-${i}`} cartaz={CARTAZES[i]} />
                        </div>
                    </div>
                ))}
            </div>
        </Painel>
    );
}

// ——— as peças de apoio das caixinhas e da gaveta: o código de barras e a medida dos textos ———
// as barras do número do ingresso, na codificação do EAN (o lado esquerdo, 7 módulos por algarismo, com as guardas)
const EAN_L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
export function Barras({ numero, classe = 'fx-ingresso-barras' }: { numero: string; classe?: string }) {
    const modulos = `101${[...numero].map(d => EAN_L[Number(d)]).join('')}101`;
    return (
        <svg className={classe} viewBox={`0 0 ${modulos.length} 10`} preserveAspectRatio="none" aria-hidden>
            {[...modulos].map((m, i) => (m === '1' ? <rect key={i} x={i} y="0" width="1.02" height="10" fill="currentColor" /> : null))}
        </svg>
    );
}

// os tamanhos de verdade de três textos de uma peça, medidos na tela (os corpos são em u, então só na largura de
// desenho dão o número do CSS); refaz quando a peça muda de tamanho
type Tres = { a: number; b: number; c: number };
export function usePx(caixa: RefObject<HTMLElement | null>, alvos: [RefObject<HTMLElement | null>, RefObject<HTMLElement | null>, RefObject<HTMLElement | null>], padrao: Tres) {
    const [px, setPx] = useState(padrao);
    useEffect(() => {
        const el = caixa.current;
        if (!el) return;
        const tam = (e: Element | null, p: number) => (e ? Math.round(parseFloat(getComputedStyle(e).fontSize)) || p : p);
        const medir = () => setPx({ a: tam(alvos[0].current, padrao.a), b: tam(alvos[1].current, padrao.b), c: tam(alvos[2].current, padrao.c) });
        medir();
        const obs = new ResizeObserver(medir);
        obs.observe(el);
        return () => obs.disconnect();
        // as refs e os padrões não mudam
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return px;
}

// ——— as caixinhas de texto pequeno (as quatro, lado a lado, como os painéis de texto de antes) ———
// cada caixinha é um módulo 1 × 1, sem régua nem moldura (como as peças grandes), com um objeto pequeno do mesmo
// mundo da peça grande. A fonte e o tamanho de cada
// texto aparecem passando o mouse (o Inspetor, na página). No celular, cada caixinha ocupa a largura toda e o objeto
// cresce junto (o CSS aumenta o u dentro dela), para o texto continuar legível
function Caixinha({ rotulo, children }: { rotulo: string; children: ReactNode }) {
    return (
        <Painel colunas={1} linhas={1} rotulo={rotulo} celular={{ colunas: 2, linhas: 2 }} nu>
            <div className="fx-caixinha">{children}</div>
        </Painel>
    );
}

// ——— Cut: as quatro caixinhas do festival ———
// o ingresso em pé, a pulseira de acesso, o crachá da equipe com o cordão e a setlist colada no palco com fita
const SETLIST = ['Pedra no sapato', 'Cinzel', 'Rocha bruta', 'Lasca', 'Brita 3', 'Quebra pedra'];
export function CaixinhasCut() {
    const fonte = { fontFamily: familiaDe('cut') };
    return (
        <div className="fx-grade" style={fonte}>
            <Caixinha rotulo="O ingresso do festival, em pé">
                <div className="fx-sombra">
                    <div className="fx-mini-ingresso">
                        <div className="fx-mini-ingresso-corpo">
                            <p className="fx-apoio fx-apoio-caixa">Ingresso ★ pista</p>
                            <p className="fx-mini-ingresso-titulo">Quebra Pedra</p>
                            <p className="fx-apoio">21 de março ★ 20h ★ Galpão da Pedreira</p>
                            <p className="fx-mini-ingresso-texto">
                                Vale uma entrada, uma vez só. Guarde o canhoto até o fim da noite.
                            </p>
                        </div>
                        <div className="fx-mini-ingresso-canhoto">
                            <p className="fx-mono">Nº 000311 ★ R$ 20,00</p>
                            <Barras numero="000311" classe="fx-mini-barras" />
                        </div>
                    </div>
                </div>
            </Caixinha>
            <Caixinha rotulo="A pulseira de acesso do festival">
                <div className="fx-pulseira">
                    <p className="fx-pulseira-texto">
                        QUEBRA PEDRA ★ 21.03 ★ PISTA ★ QUEBRA PEDRA ★
                    </p>
                    <p className="fx-pulseira-ponta fx-mono">Nº 000311</p>
                </div>
            </Caixinha>
            <Caixinha rotulo="O crachá da equipe do festival">
                <div className="fx-cracha">
                    <span className="fx-cracha-cordao">
                        <span>QUEBRA PEDRA ★ QUEBRA PEDRA ★ QUEBRA PEDRA</span>
                    </span>
                    <i className="fx-cracha-presilha" />
                    <div className="fx-cracha-cartao">
                        <i className="fx-cracha-furo" />
                        <p className="fx-cracha-faixa">STAFF</p>
                        <p className="fx-apoio fx-cracha-nome">Joana Lasca</p>
                        <p className="fx-apoio fx-cracha-funcao">técnica de palco</p>
                        <p className="fx-cracha-acesso">
                            acesso ao palco, ao camarim e à área técnica
                        </p>
                        <Barras numero="000042" classe="fx-cracha-barras" />
                        <p className="fx-mono">Nº 0042 ★ 21 MAR</p>
                    </div>
                </div>
            </Caixinha>
            <Caixinha rotulo="A setlist dos Lascados, colada no palco">
                <div className="fx-setlist">
                    <i className="fx-setlist-fita" data-lado="esq" />
                    <i className="fx-setlist-fita" data-lado="dir" />
                    <i className="fx-setlist-mancha" />
                    <p className="fx-setlist-banda">OS LASCADOS</p>
                    <p className="fx-apoio">21.03 ★ Quebra Pedra ★ 45 min</p>
                    <ol>
                        {SETLIST.map((m, i) => (
                            <li key={m}>
                                {m}
                            </li>
                        ))}
                    </ol>
                    <p className="fx-setlist-bis">bis: Cascalho</p>
                </div>
            </Caixinha>
        </div>
    );
}

// ——— Polished: o livro infantil e o guia de viagem ———
// a Polished em dois livros de nichos diferentes, lado a lado, com o mesmo acabamento (a capa plastificada com o brilho
// do verniz, o grão da impressão, o miolo nas bordas e as sombras da mesma luz do livro 3D). A Rune fica com o principal
// (os títulos e a placa); os detalhes vão em letra de texto, como num livro de verdade: a autoria, a coleção, o selo e a
// editora na Inter Tight, as coordenadas na DM Mono. O infantil é a pedrinha que rolou, a personagem com olhos e
// sorriso caindo no rio depois de rolar morro abaixo, com o sol, as nuvens, o peixinho e o barquinho de papel; o guia de bolso é a Serra do Seixo, com a faixa da coleção em cima e a paisagem embaixo:
// a serra, o rio descendo e a placa do parque na margem, com as direções (as letras, os números e as setas da fonte)
const INFANTIL = { titulo: ['A pedrinha', 'que rolou'], autoria: 'Lia Seixas', capa: '#3f74c4', tinta: '#fff6e4', onda: '#9cc2ee', selo: '#f3c24a', giro: -3 };
// as ondas do rio, impressas na capa: três linhas onduladas, em SVG
function Ondas() {
    const onda = (y: number) => `M0 ${y}` + Array.from({ length: 8 }, (_, i) => ` q 25 ${i % 2 ? 14 : -14} 50 0`).join('');
    return (
        <svg className="fx-v-livro-ondas" viewBox="0 0 400 150" preserveAspectRatio="none" aria-hidden>
            {[30, 75, 120].map(y => (
                <path key={y} d={onda(y)} fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
            ))}
        </svg>
    );
}
// a pedrinha personagem: o seixo com os dois olhos (com o brilho) e o sorriso
function Pedrinha({ classe }: { classe: string }) {
    return (
        <span className={`fx-pedrinha ${classe}`} aria-hidden>
            <i />
            <i />
            <b />
        </span>
    );
}
// a ilustração do livro infantil, desenhada nas medidas da capa (590 × 760, como as peças em CSS): atrás da pedrinha,
// o sol espiando no canto, as nuvens fofas, os passarinhos, o morro com a árvore de onde ela veio rolando (os pulinhos
// descendo a encosta e a poeirinha de cada pulo) e as taboas na beira do rio
// o recorte acima da primeira onda, na mesma curva das ondas (o SVG delas vai de 550 a 680 u, a primeira linha em 576)
const ACIMA_DA_AGUA =
    'M0 0 H590 V576' + Array.from({ length: 8 }, (_, k) => ` q-36.875 ${(7 - k) % 2 ? 12.13 : -12.13} -73.75 0`).join('') + 'Z';
function CenaInfantil() {
    const nuvem = (x: number, y: number, s: number) => (
        <path
            key={`${x}-${y}`}
            d={`M${x - 46 * s} ${y} q-2 ${-20 * s} ${20 * s} ${-20 * s} q${6 * s} ${-22 * s} ${30 * s} ${-16 * s} q${16 * s} ${-14 * s} ${32 * s} ${4 * s} q${20 * s} ${-2 * s} ${18 * s} ${32 * s}Z`}
            fill="#fff6e4"
        />
    );
    return (
        <svg className="fx-v-livro-cena" viewBox="0 0 590 760" preserveAspectRatio="none" aria-hidden>
            <defs>
                <clipPath id="infantil-agua">
                    <path d={ACIMA_DA_AGUA} />
                </clipPath>
            </defs>
            <g fill="#f3c24a">
                {Array.from({ length: 7 }, (_, i) => {
                    const a = Math.PI * (0.5 + (i / 6) * 0.5);
                    const p = (r: number) => `${(566 + Math.cos(a) * r).toFixed(1)} ${(26 + Math.sin(a) * r).toFixed(1)}`;
                    return <path key={i} d={`M${p(64)} L${p(84)}`} stroke="#f3c24a" strokeWidth="7" strokeLinecap="round" />;
                })}
                <circle cx="566" cy="26" r="52" />
            </g>
            <circle cx="548" cy="12" r="22" fill="#fff" opacity="0.22" />
            {nuvem(150, 392, 1)}
            {nuvem(318, 336, 0.62)}
            <g fill="none" stroke="#fff6e4" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M196 334 q7 -8 14 0 q7 -8 14 0" />
                <path d="M228 318 q5 -6 10 0 q5 -6 10 0" />
            </g>
            {/* o morro de onde a pedrinha veio, com o brilho no alto da encosta e a árvore */}
            <g clipPath="url(#infantil-agua)">
            <path d="M150 590 Q290 404 446 360 Q540 338 610 384 V600 H150Z" fill="#5f9e7c" />
            <path d="M318 452 Q380 392 446 372 Q506 356 560 370" fill="none" stroke="#8cc49a" strokeWidth="10" strokeLinecap="round" opacity="0.7" />
            <rect x="485" y="318" width="10" height="44" rx="4" fill="#8a5a3a" />
            <circle cx="490" cy="306" r="34" fill="#3f8f64" />
            <circle cx="478" cy="294" r="13" fill="#7cc49a" opacity="0.8" />
            {[
                [462, 318],
                [512, 300],
                [496, 330],
            ].map(([x, y]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r="4" fill="#ef8a5e" />
            ))}
            {/* os pulinhos da pedrinha rolando morro abaixo, com a poeirinha de cada pulo */}
            <path d="M452 362 Q433 330 414 371 Q396 340 378 386 Q360 356 342 404 Q324 376 306 426 Q290 400 274 452" fill="none" stroke="#fff6e4" strokeWidth="3.4" strokeLinecap="round" opacity="0.6" />
            <g fill="#fff6e4" opacity="0.75">
                {[
                    [414, 371],
                    [378, 386],
                    [342, 404],
                    [306, 426],
                ].map(([x, y]) => (
                    <g key={`${x}-${y}`}>
                        <circle cx={x - 6} cy={y + 2} r="4" />
                        <circle cx={x + 5} cy={y + 1} r="3" />
                    </g>
                ))}
            </g>
            {/* as taboas na beira do rio */}
            {[
                [92, 592, 92, -4],
                [112, 594, 110, 3],
                [132, 596, 84, 7],
            ].map(([x, base, h, inc]) => (
                <g key={x}>
                    <path d={`M${x} ${base} q${inc} ${-h / 2} ${inc * 1.6} ${-h}`} fill="none" stroke="#4f8a5e" strokeWidth="4" strokeLinecap="round" />
                    <rect x={x + inc * 1.6 - 5} y={base - h + 4} width="10" height="26" rx="5" fill="#8a5a3a" />
                </g>
            ))}
            <path d="M80 596 q-14 -40 -6 -76 M146 598 q16 -34 12 -66" fill="none" stroke="#6fae7c" strokeWidth="4" strokeLinecap="round" />
            </g>
        </svg>
    );
}
// na frente das ondas: os risquinhos de quem acabou de rolar, os respingos em volta da pedrinha, o peixinho pulando com
// o arco do pulo, as bolhas e o barquinho de papel navegando na última onda
function FrenteInfantil() {
    return (
        <svg className="fx-v-livro-cena" viewBox="0 0 590 760" preserveAspectRatio="none" aria-hidden>
            <g fill="none" stroke="#fff6e4" strokeWidth="4" strokeLinecap="round">
                <path d="M402 480 q14 -4 26 2" />
                <path d="M408 500 q16 -2 30 6" />
                <path d="M404 520 q12 0 22 8" />
            </g>
            <g fill="#fff6e4">
                <circle cx="178" cy="566" r="6" />
                <circle cx="164" cy="548" r="4" />
                <circle cx="190" cy="540" r="3" />
                <circle cx="404" cy="560" r="5" />
                <circle cx="420" cy="546" r="3.5" />
            </g>
            {/* o peixinho pulando entre as ondas */}
            <path d="M30 654 q10 -34 36 -48" fill="none" stroke="#fff6e4" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
            <g transform="rotate(-28 92 596)">
                <ellipse cx="92" cy="596" rx="24" ry="13" fill="#ef8a5e" />
                <path d="M68 596 l-16 -12 v24Z" fill="#ef8a5e" />
                <path d="M88 584 q8 -10 16 -2" fill="#f3c24a" />
                <circle cx="104" cy="593" r="3.6" fill="#1f2a44" />
                <circle cx="105.2" cy="591.8" r="1.2" fill="#fff" />
            </g>
            <g fill="none" stroke="#fff6e4" strokeWidth="2.4" opacity="0.8">
                <circle cx="250" cy="640" r="6" />
                <circle cx="266" cy="628" r="4" />
                <circle cx="258" cy="616" r="2.6" />
            </g>
            {/* o barquinho de papel, com as dobras */}
            <g transform="translate(-74 0)">
                <path d="M426 650 H514 L498 670 H442Z" fill="#fff6e4" />
                <path d="M470 604 V650 H432Z" fill="#fff6e4" />
                <path d="M470 610 L506 650 H470Z" fill="#e6d8bd" />
                <path d="M442 670 L470 650 L498 670" fill="none" stroke="#d5c4a4" strokeWidth="2" />
                <path d="M432 672 q38 8 80 0" fill="none" stroke="#1f2a44" strokeWidth="3" opacity="0.18" strokeLinecap="round" />
            </g>
        </svg>
    );
}
// a placa do parque, na paisagem do guia: os dois postes de madeira fincados na margem, a placa de boas-vindas e as
// três direções com a seta, o lugar e a distância
const DESTINOS: [string, string, string][] = [
    ['→', 'Prainha do rio', '300 m'],
    ['←', 'Trilha das lajes', '1,2 km'],
    ['↑', 'Mirante', '600 m'],
];
function Placas() {
    return (
        <span className="fx-placa-mini" aria-hidden>
            <i className="fx-placa-mini-poste" data-lado="esq" />
            <i className="fx-placa-mini-poste" data-lado="dir" />
            <span className="fx-placa-mini-nome">
                <span className="fx-placa-mini-miudo">BEM-VINDO AO</span>
                <span className="fx-placa-mini-titulo">Parque das Pedras Roladas</span>
            </span>
            {DESTINOS.map(([seta, lugar, distancia], k) => (
                <span key={lugar} className="fx-placa-mini-destino" data-i={k}>
                    <span className="fx-placa-mini-seta">{seta}</span>
                    <span>{lugar}</span>
                    <span className="fx-placa-mini-distancia">{distancia}</span>
                </span>
            ))}
        </span>
    );
}
// os pinheiros da serra, na beira do campo: [x, altura]
const PINHEIROS: [number, number][] = [
    [18, 34], [40, 46], [62, 30], [128, 26], [146, 38], [372, 30], [392, 44], [414, 28], [512, 36], [534, 48], [560, 32], [582, 40],
];
// as pedras roladas na beira do rio: [x, y, largura, altura]
const PEDRAS: [number, number, number, number][] = [
    [76, 352, 34, 18], [102, 372, 22, 12], [42, 400, 46, 24], [252, 300, 20, 10], [270, 318, 28, 14], [292, 412, 30, 14],
];
// a paisagem impressa do guia, em camadas como um cartaz de viagem: o céu do fim de tarde com o sol, a serra ao longe
// na névoa, os morros, o campo com os pinheiros e o rio descendo até a frente, com o brilho na água e as pedras na margem
function Paisagem() {
    return (
        <svg className="fx-guia-paisagem" viewBox="0 0 600 440" preserveAspectRatio="xMidYMax slice" aria-hidden>
            <defs>
                <linearGradient id="guia-ceu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#86bfdc" />
                    <stop offset="0.6" stopColor="#cfe5e1" />
                    <stop offset="1" stopColor="#f6dfae" />
                </linearGradient>
                <radialGradient id="guia-sol">
                    <stop offset="0" stopColor="#fff6dc" stopOpacity="0.95" />
                    <stop offset="1" stopColor="#fff6dc" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="guia-campo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#86ab62" />
                    <stop offset="1" stopColor="#4c7a3c" />
                </linearGradient>
                <linearGradient id="guia-rio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#b9dde6" />
                    <stop offset="0.5" stopColor="#6ea9c6" />
                    <stop offset="1" stopColor="#3f7ea4" />
                </linearGradient>
            </defs>
            <rect width="600" height="250" fill="url(#guia-ceu)" />
            <circle cx="470" cy="92" r="120" fill="url(#guia-sol)" />
            <circle cx="470" cy="92" r="30" fill="#fff4d2" />
            <ellipse cx="150" cy="70" rx="70" ry="12" fill="#fff" opacity="0.55" />
            <ellipse cx="200" cy="58" rx="40" ry="10" fill="#fff" opacity="0.5" />
            <path d="M0 176 Q40 140 80 158 Q120 118 170 150 Q210 126 250 146 Q300 102 350 140 Q400 118 440 146 Q500 112 540 140 Q570 128 600 146 V250 H0Z" fill="#a8c4c2" />
            <path d="M0 206 Q60 168 130 196 Q190 160 260 194 Q330 172 380 190 Q450 158 520 186 Q560 176 600 190 V250 H0Z" fill="#78a08d" />
            <rect y="224" width="600" height="216" fill="url(#guia-campo)" />
            {PINHEIROS.map(([x, h]) => (
                <path key={x} d={`M${x} ${230 - h} L${x + h * 0.32} 232 H${x - h * 0.32}Z`} fill="#355f3c" />
            ))}
            <path d="M236 226 Q218 258 178 282 Q110 318 86 380 Q74 412 70 440 H280 Q250 388 274 336 Q294 290 266 252 Q256 238 250 226Z" fill="url(#guia-rio)" />
            <g fill="none" stroke="#fff" strokeLinecap="round" opacity="0.5">
                <path d="M240 246 q8 -3 16 0" strokeWidth="2" />
                <path d="M202 284 q12 -4 24 0" strokeWidth="2.5" />
                <path d="M146 326 q16 -5 32 0" strokeWidth="3" />
                <path d="M190 352 q18 -5 36 0" strokeWidth="3" />
                <path d="M120 404 q22 -6 44 0" strokeWidth="3.5" />
            </g>
            {PEDRAS.map(([x, y, w, h]) => (
                <g key={`${x}-${y}`}>
                    <ellipse cx={x + 3} cy={y + h * 0.45} rx={w / 2} ry={h / 2} fill="#000" opacity="0.18" />
                    <ellipse cx={x} cy={y} rx={w / 2} ry={h / 2} fill="#b4ada0" />
                    <ellipse cx={x - w * 0.12} cy={y - h * 0.18} rx={w * 0.26} ry={h * 0.2} fill="#ddd7cb" opacity="0.8" />
                </g>
            ))}
        </svg>
    );
}
// o guia de bolso: a faixa da coleção com o título e as coordenadas, a faixa amarela da série, a paisagem com a placa,
// a etiqueta da edição, o vinco da capa mole perto da lombada (com o verniz por cima de tudo) e o selo do mapa colado
function GuiaViagem() {
    return (
        <div className="fx-v-livro fx-guia" style={{ '--capa': '#1f4d42', '--tinta': '#f6efdd', '--giro': '2.5deg' } as CSSProperties}>
            <p className="fx-v-livro-colecao">
                guias <b>Lajedo</b> ★ de bolso
            </p>
            <p className="fx-v-livro-titulo">
                Serra
                <br />
                do Seixo
            </p>
            <p className="fx-v-livro-autoria">trilhas, prainhas de rio e mirantes</p>
            <p className="fx-mono fx-guia-coordenadas">21°47′ S ★ 47°03′ O</p>
            <div className="fx-guia-foto">
                <Paisagem />
                <Placas />
            </div>
            <p className="fx-guia-edicao">edição 2026</p>
            <i className="fx-guia-vinco" />
            <p className="fx-guia-selo">
                inclui
                <b>mapa</b>
                destacável
            </p>
        </div>
    );
}
export function LivroPolished({ estilo = 'polished' }: { estilo?: Estilo }) {
    const familia = familiaDe(estilo);
    const l = INFANTIL;
    return (
        <Painel colunas={4} linhas={2} rotulo="Capas de dois livros: o infantil A pedrinha que rolou e o guia de viagem Serra do Seixo" celular={{ colunas: 2, linhas: 3 }} nu>
            <div className="fx-v-mesa fx-v-estante" style={{ fontFamily: familia }} aria-hidden>
                <div
                    className="fx-v-livro"
                    style={{ '--capa': l.capa, '--tinta': l.tinta, '--onda': l.onda, '--selo': l.selo, '--giro': `${l.giro}deg` } as CSSProperties}
                >
                    <i className="fx-v-livro-junta" />
                    <p className="fx-v-livro-colecao">
                        coleção <b>Correnteza</b>
                    </p>
                    <p className="fx-v-livro-titulo">
                        {l.titulo[0]}
                        <br />
                        {l.titulo[1]}
                    </p>
                    <p className="fx-v-livro-autoria">texto e ilustrações de {l.autoria}</p>
                    <CenaInfantil />
                    <Pedrinha classe="fx-v-livro-pedrinha" />
                    <Ondas />
                    <FrenteInfantil />
                    <p className="fx-v-livro-idade">
                        a partir de
                        <b>4 anos</b>
                    </p>
                    <p className="fx-v-livro-editora">
                        <svg className="fx-v-livro-logo" viewBox="0 0 20 20" aria-hidden>
                            <circle cx="10" cy="10" r="10" fill="currentColor" />
                            <path d="M3 11 q3.5 -4 7 0 t7 0" fill="none" stroke="var(--capa)" strokeWidth="2.2" strokeLinecap="round" />
                        </svg>
                        Edições Correnteza
                    </p>
                </div>
                <GuiaViagem />
            </div>
        </Painel>
    );
}

// ——— Polished: as quatro caixinhas do livro ———
// uma página da história, o marcador com o cordão, a ficha de empréstimo da biblioteca (as datas carimbadas e os
// nomes de quem levou) e o ex-libris colado na capa. A Rune fica com o texto que a caixinha mede (a história, a frase
// do marcador, os nomes escritos na ficha, o recado do ex-libris) e com os títulos; os impressos miúdos vão na Inter
// Tight e as datas do carimbo na DM Mono, como os carimbos de data de verdade
const EMPRESTIMOS: [string, string][] = [
    ['12 MAR', 'Ana'],
    ['02 ABR', 'Pedro'],
    ['23 ABR', 'Lia'],
    ['15 MAI', 'Caio'],
    ['06 JUN', 'Bia'],
];
export function CaixinhasPolished() {
    const id = `${useId().replace(/:/g, '')}-carimbo`;
    return (
        <div className="fx-grade" style={{ fontFamily: familiaDe('polished') }}>
            <Caixinha rotulo="Uma página do livro A pedrinha que rolou">
                <div className="fx-mini-pagina">
                    <p className="fx-apoio fx-apoio-caixa">A pedrinha que rolou</p>
                    <p className="fx-mini-pagina-texto">
                        Era uma vez uma pedra cheia de quinas. Ela morava no alto do morro e espetava tudo o que chegava perto: o vento, a chuva e até as
                        formigas.
                    </p>
                    <Pedrinha classe="fx-mini-pagina-pedrinha" />
                    <p className="fx-apoio fx-mini-pagina-numero">12</p>
                </div>
            </Caixinha>
            <Caixinha rotulo="O marcador de página da coleção">
                <div className="fx-marcador">
                    <span className="fx-marcador-cordao" />
                    <i className="fx-marcador-furo" />
                    <p className="fx-marcador-titulo">leia devagar</p>
                    <p className="fx-marcador-texto">
                        a pedra também levou tempo para ficar lisa
                    </p>
                    <Pedrinha classe="fx-marcador-pedrinha" />
                    <p className="fx-apoio">
                        coleção <b>Correnteza</b>
                    </p>
                </div>
            </Caixinha>
            <Caixinha rotulo="A ficha de empréstimo da biblioteca, com as datas carimbadas">
                <div className="fx-ficha">
                    <FiltroTinta id={id} semente={7} />
                    <p className="fx-apoio fx-apoio-caixa">Biblioteca da escola ★ ficha de empréstimo</p>
                    <p className="fx-ficha-livro">A pedrinha que rolou</p>
                    <div className="fx-ficha-tabela">
                        <p className="fx-apoio fx-apoio-caixa">Devolver até</p>
                        <p className="fx-apoio fx-apoio-caixa">Nome</p>
                        {EMPRESTIMOS.map(([data, nome], i) => (
                            <Fragment key={data}>
                                <p className="fx-ficha-carimbo" style={{ filter: `url(#${id})`, rotate: `${[-4, 3, -2, 5, -3][i]}deg` }}>
                                    {data}
                                </p>
                                <p className="fx-ficha-nome">
                                    {nome}
                                </p>
                            </Fragment>
                        ))}
                    </div>
                </div>
            </Caixinha>
            <Caixinha rotulo="O ex-libris colado na capa: este livro pertence a Nina">
                <div className="fx-exlibris">
                    <p className="fx-apoio fx-apoio-caixa">Ex-libris</p>
                    <Pedrinha classe="fx-exlibris-pedrinha" />
                    <p className="fx-apoio fx-apoio-caixa">Este livro pertence a</p>
                    <p className="fx-exlibris-nome">Nina</p>
                    <p className="fx-exlibris-texto">
                        se encontrar, devolva: ele sempre rola de volta para casa
                    </p>
                </div>
            </Caixinha>
        </div>
    );
}


// ——— Worn: o disco gasto ———
// o LP "foz", dos Rolados: a capa desbotada com a marca redonda que o disco deixou de tanto entrar e sair da estante e
// os cantos moles, e o disco saindo de dentro (os sulcos, o brilho e o selo do lado A). A Rune fica com o título; os
// créditos, o selo "estéreo" e o número de matriz gravado no fim do sulco vão em letra de texto, como num LP de verdade
export function DiscoWorn() {
    return (
        <Painel colunas={4} linhas={2} rotulo="A capa do disco foz, dos Rolados, gasta pelo tempo, com o disco saindo de dentro" celular={{ colunas: 2, linhas: 3 }} nu>
            <div className="fx-v-mesa" style={{ fontFamily: familiaDe('worn') }} aria-hidden>
                <div className="fx-disco">
                    <p className="fx-mono fx-disco-matriz">LP-026-A ★ 1</p>
                    <div className="fx-disco-selo">
                        <p className="fx-apoio fx-apoio-caixa">Os Rolados</p>
                        <p className="fx-disco-selo-titulo">foz</p>
                        <p className="fx-apoio fx-apoio-caixa">Lado A ★ 33 rpm</p>
                    </div>
                </div>
                <div className="fx-capa">
                    <span className="fx-capa-sol" />
                    <p className="fx-capa-estereo">ESTÉREO</p>
                    <p className="fx-apoio fx-apoio-caixa fx-capa-artista">Os Rolados</p>
                    <p className="fx-capa-titulo">foz</p>
                    <p className="fx-apoio fx-apoio-caixa fx-capa-rodape">Discos Correnteza ★ LP-026</p>
                </div>
            </div>
        </Painel>
    );
}

// o encarte, em texto pequeno: as faixas dos dois lados com a duração, o tempo de cada lado (somado das faixas), o
// texto do disco e os créditos
export const LADOS: [string, [string, string][]][] = [
    [
        'LADO A',
        [
            ['Correnteza', '3:41'],
            ['Seixo rolado', '4:02'],
            ['Água mole em pedra dura', '3:18'],
            ['Beira-rio', '4:25'],
            ['Cascalho', '3:16'],
        ],
    ],
    [
        'LADO B',
        [
            ['Tanto bate até que fura', '4:10'],
            ['Pedra lisa', '3:33'],
            ['Maré mansa', '3:58'],
            ['Lajedo', '2:49'],
            ['Foz', '5:12'],
        ],
    ],
];
export const somaTempo = (faixas: [string, string][]) => {
    const s = faixas.reduce((t, [, d]) => t + Number(d.split(':')[0]) * 60 + Number(d.split(':')[1]), 0);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// ——— Worn: as quatro caixinhas do disco ———
// a contracapa com as faixas, o selo do lado B, a etiqueta de preço do sebo no canto da capa e a ficha técnica
const FICHA: [string, string][] = [
    ['voz e violão', 'Ana Seixas'],
    ['baixo', 'Beto Calhau'],
    ['bateria', 'Caio Rocha'],
    ['gravação', 'Estúdio Correnteza'],
    ['capa', 'Os Rolados'],
];
export function CaixinhasWorn() {
    const [ladoA, ladoB] = [LADOS[0][1], LADOS[1][1]];
    return (
        <div className="fx-grade" style={{ fontFamily: familiaDe('worn') }}>
            <Caixinha rotulo="A contracapa do disco foz, com as faixas">
                <div className="fx-contracapa">
                    <p className="fx-apoio fx-apoio-caixa">Os Rolados ★ foz</p>
                    <div className="fx-contracapa-lados">
                        {[ladoA, ladoB].map((faixas, i) => (
                            <ol key={i}>
                                {faixas.map(([nome], k) => (
                                    <li key={nome}>
                                        {nome}
                                    </li>
                                ))}
                            </ol>
                        ))}
                    </div>
                    <div className="fx-contracapa-pe">
                        <div>
                            <p className="fx-apoio fx-apoio-caixa">Discos Correnteza ★ LP-026</p>
                            <p className="fx-mono fx-contracapa-miudo">Fabricado no Brasil ★ Indústria Brasileira</p>
                        </div>
                        <Barras numero="000026" classe="fx-contracapa-barras" />
                    </div>
                </div>
            </Caixinha>
            <Caixinha rotulo="O selo do lado B do disco">
                <div className="fx-selo-b">
                    {/* como num selo de verdade: o furo no centro exato, a banda e o título em cima, o lado e a rotação
                        um de cada lado do furo e as faixas embaixo */}
                    <div className="fx-selo-b-papel">
                        <div className="fx-selo-b-cima">
                            <p className="fx-apoio fx-apoio-caixa">Os Rolados</p>
                            <p className="fx-selo-b-titulo">foz</p>
                        </div>
                        <div className="fx-selo-b-meio">
                            <p className="fx-apoio fx-apoio-caixa">Lado B</p>
                            <p className="fx-apoio fx-apoio-caixa">33 rpm</p>
                        </div>
                        <i className="fx-selo-b-furo" />
                        <div className="fx-selo-b-baixo">
                            <ol>
                                {ladoB.map(([nome, tempo]) => (
                                    <li key={nome}>
                                        {nome} <span>{tempo}</span>
                                    </li>
                                ))}
                            </ol>
                            <p className="fx-mono fx-disco-selo-miudo">LP-026-B</p>
                        </div>
                    </div>
                </div>
            </Caixinha>
            <Caixinha rotulo="A etiqueta de preço do sebo, colada no canto da capa">
                <div className="fx-sebo">
                    <span className="fx-sebo-capa" />
                    <div className="fx-sebo-etiqueta">
                        <p className="fx-apoio fx-apoio-caixa">Sebo Beira-Rio ★ discos usados</p>
                        <p className="fx-sebo-preco">R$ 35</p>
                        <p className="fx-sebo-texto">
                            LP usado, capa com marcas. Chia um pouco no lado B, faixa 2.
                        </p>
                    </div>
                </div>
            </Caixinha>
            <Caixinha rotulo="A ficha técnica do disco">
                <div className="fx-ficha-tecnica">
                    <p className="fx-ficha-tecnica-titulo">ficha técnica</p>
                    <dl>
                        {FICHA.map(([papel, nome], i) => (
                            <Fragment key={papel}>
                                <dt className="fx-apoio">{papel}</dt>
                                <dd>{nome}</dd>
                            </Fragment>
                        ))}
                    </dl>
                    <p className="fx-apoio fx-apoio-caixa">© Discos Correnteza ★ gravado ao vivo no estúdio</p>
                </div>
            </Caixinha>
        </div>
    );
}
