'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import Painel from './Painel';
import { familiaDe } from './Faixa';
import type { Estilo } from '../_lib/conteudo';

// as faixas no padrão novo: depois da frase que corre, cada estilo aparece onde ele seria usado de verdade, numa peça
// grande e numa peça de texto pequeno (com os tamanhos medidos na tela de quem lê), soltas na cor da faixa, sem régua
// nem trama: a régua fica com a frase que corre, a letra medida; embaixo, a mesma letra em uso. No Cut, o cartaz
// lambe-lambe de um festival colado na parede (cada linha na largura inteira, em corpos diferentes, como o tipo de
// madeira da gráfica de cartaz de rua) e o ingresso do mesmo festival, com as regras em letra miúda. No Polished, o
// livro infantil (as capas e uma página dupla da história); no Worn, os bordados e as etiquetas da roupa.

// uma linha que ocupa a largura inteira da caixa: mede a frase a 100 px e escala o corpo até a largura bater. Só refaz
// a conta quando a largura da caixa muda (a altura muda junto com o corpo e não pode disparar outra conta)
function LinhaCheia({ texto, largura }: { texto: string; largura: number }) {
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

// ——— Cut: o cartaz do festival, colado na parede ———
// o cartaz em pé (2:3), em três cópias lado a lado, como o lambe-lambe é colado na rua: cada cópia num papel, um pouco
// torta, com a textura e os vincos da cola, e a última com o canto rasgado. A tinta passa por um filtro que deixa a
// borda áspera e umas falhas onde ela não pegou, como na impressão de cartaz de rua. No celular fica uma cópia só
type Bloco = { linhas: string[]; faixa?: boolean };
const CARTAZ: Bloco[] = [
    { linhas: ['21 MAR ★ 20H', 'GALPÃO DA PEDREIRA'] },
    { linhas: ['QUEBRA', 'PEDRA'] },
    { linhas: ['OS LASCADOS', 'CINZEL ★ BRITA 3'], faixa: true },
    { linhas: ['festival de', 'rock bruto'] },
    { linhas: ['pista a R$ 20', 'traga seu capacete'] },
];
const COPIAS: { papel: string; giro: number; desce: number; rasgo?: boolean }[] = [
    { papel: 'var(--p-papel)', giro: -1.6, desce: 14 },
    { papel: 'var(--p-quente)', giro: 0.9, desce: -6 },
    { papel: 'var(--p-papel)', giro: -0.5, desce: 8, rasgo: true },
];

// a tinta do cartaz: a borda tremida (o ruído empurra a borda uns 2 px) e as falhas, onde um segundo ruído passa do
// limite e a tinta some. Cada cópia tem a sua semente: duas cópias impressas nunca saem iguais
function FiltroTinta({ id, semente }: { id: string; semente: number }) {
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

function Lambe({ filtro }: { filtro: string }) {
    return (
        <div className="fx-lambe" style={{ filter: `url(#${filtro})` }} aria-hidden>
            {CARTAZ.map(b => (
                <div key={b.linhas.join(' ')} className="fx-lambe-bloco" data-faixa={b.faixa || undefined}>
                    {b.linhas.map(l => (
                        <LinhaCheia key={l} texto={l} largura={472} />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function CartazCut() {
    const filtro = `${useId().replace(/:/g, '')}-tinta`;
    const texto = CARTAZ.flatMap(b => b.linhas).join('. ');
    return (
        <Painel colunas={4} linhas={2} rotulo={`Cartaz colado na parede: ${texto}`} celular={{ colunas: 2, linhas: 3 }} nu>
            <div className="fx-muro" style={{ fontFamily: familiaDe('cut') }}>
                {COPIAS.map((c, i) => (
                    <div
                        key={i}
                        className="fx-cartaz-folha"
                        data-copia={i}
                        data-rasgo={c.rasgo || undefined}
                        style={{ '--papel': c.papel, '--giro': `${c.giro}deg`, '--desce': `calc(${c.desce} * var(--u))` } as CSSProperties}
                    >
                        <FiltroTinta id={`${filtro}-${i}`} semente={i} />
                        <div className="fx-cartaz-papel">
                            <Lambe filtro={`${filtro}-${i}`} />
                        </div>
                    </div>
                ))}
            </div>
        </Painel>
    );
}

// ——— Cut: o ingresso, em texto pequeno ———
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

// ——— Polished: o livro infantil ———
// a pedra que rolou no rio vira a história: as capas de dois livros da mesma coleção (capa dura vista de cima, com a
// lombada, o miolo aparecendo na borda, a pedrinha e as ondas do rio)
const LIVROS = [
    { titulo: ['A pedrinha', 'que rolou'], capa: 'var(--p-frio)', tinta: 'var(--p-papel)', onda: 'var(--p-polished)', giro: -3 },
    { titulo: ['O rio que', 'não parava'], capa: 'var(--p-quente-claro)', tinta: 'var(--p-frio)', onda: 'var(--p-tinta-quente)', giro: 2.5 },
];
// as ondas do rio na capa: três linhas onduladas, em SVG, embaixo do título
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
export function LivroPolished({ estilo = 'polished' }: { estilo?: Estilo }) {
    const familia = familiaDe(estilo);
    return (
        <Painel colunas={4} linhas={2} rotulo="Capas de dois livros infantis: A pedrinha que rolou e O rio que não parava" celular={{ colunas: 2, linhas: 3 }} nu>
            <div className="fx-v-mesa fx-v-estante" style={{ fontFamily: familia }} aria-hidden>
                {LIVROS.map(l => (
                    <div
                        key={l.titulo.join(' ')}
                        className="fx-v-livro"
                        style={{ '--capa': l.capa, '--tinta': l.tinta, '--onda': l.onda, '--giro': `${l.giro}deg` } as CSSProperties}
                    >
                        <p className="fx-v-livro-colecao">COLEÇÃO CORRENTEZA</p>
                        <p className="fx-v-livro-titulo">
                            {l.titulo[0]}
                            <br />
                            {l.titulo[1]}
                        </p>
                        <span className="fx-v-livro-seixo" />
                        <Ondas />
                        <p className="fx-v-livro-pe">uma história de pedra e água ★ 4 a 8 anos</p>
                    </div>
                ))}
            </div>
        </Painel>
    );
}

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

// ——— Worn: os bordados da puído ———
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

// ——— Worn: a etiqueta de papel e a de lavagem, em texto pequeno ———
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
