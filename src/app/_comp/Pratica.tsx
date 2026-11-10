'use client';

import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import Painel from './Painel';
import { familiaDe } from './Faixa';
import type { Estilo } from '../_lib/conteudo';

// as faixas no padrão novo: depois da frase que corre, cada estilo aparece onde ele seria usado de verdade, numa peça
// grande e numa peça de texto pequeno (com os tamanhos medidos na tela de quem lê), soltas na cor da faixa, sem régua
// nem trama: a régua fica com a frase que corre, a letra medida; embaixo, a mesma letra em uso. No Cut, o cartaz
// lambe-lambe de um festival colado na parede (cada linha na largura inteira, em corpos diferentes, como o tipo de
// madeira da gráfica de cartaz de rua) e, embaixo, quatro caixinhas do mesmo festival em texto pequeno (o ingresso,
// a pulseira, o crachá e a setlist). No Polished, o
// livro infantil (as capas e, nas caixinhas, a página, o marcador, a ficha da biblioteca e o ex-libris); no Worn, o
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
// cada caixinha é um painel 1 × 1 com um objeto pequeno do mesmo mundo da peça grande, e no alto o tamanho de verdade
// do texto dele na tela (o do elemento marcado com data-medida, medido e refeito quando a tela muda). No celular, cada
// caixinha ocupa a largura toda e o objeto cresce junto (o CSS aumenta o u dentro dela), para o texto continuar legível
function Caixinha({ rotulo, children }: { rotulo: string; children: ReactNode }) {
    const caixa = useRef<HTMLDivElement>(null);
    const [px, setPx] = useState<number | null>(null);
    useEffect(() => {
        const el = caixa.current;
        if (!el) return;
        const medir = () => {
            const alvo = el.querySelector('[data-medida]');
            if (alvo) setPx(Math.round(parseFloat(getComputedStyle(alvo).fontSize)));
        };
        medir();
        const obs = new ResizeObserver(medir);
        obs.observe(el);
        return () => obs.disconnect();
    }, []);
    return (
        <Painel colunas={1} linhas={1} rotulo={rotulo} celular={{ colunas: 2, linhas: 2 }}>
            <div ref={caixa} className="fx-caixinha">
                <p className="fx-caixinha-tamanho">{px ?? '…'} px</p>
                {children}
            </div>
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
                <div className="fx-mini-ingresso">
                    <div className="fx-mini-ingresso-corpo">
                        <p className="fx-mini-miudo">INGRESSO ★ PISTA</p>
                        <p className="fx-mini-ingresso-titulo">Quebra Pedra</p>
                        <p className="fx-mini-ingresso-data">21 de março ★ 20h</p>
                        <p data-medida className="fx-mini-ingresso-texto">
                            Vale uma entrada, uma vez só. Guarde o canhoto até o fim da noite.
                        </p>
                    </div>
                    <div className="fx-mini-ingresso-canhoto">
                        <p className="fx-mini-miudo">Nº 000311</p>
                        <Barras numero="000311" classe="fx-mini-barras" />
                    </div>
                </div>
            </Caixinha>
            <Caixinha rotulo="A pulseira de acesso do festival">
                <div className="fx-pulseira">
                    <p data-medida className="fx-pulseira-texto">
                        QUEBRA PEDRA ★ 21.03 ★ PISTA ★ QUEBRA PEDRA ★
                    </p>
                    <p className="fx-pulseira-ponta">000311</p>
                </div>
            </Caixinha>
            <Caixinha rotulo="O crachá da equipe do festival">
                <div className="fx-cracha">
                    <span className="fx-cracha-cordao">
                        <span>QUEBRA PEDRA ★ QUEBRA PEDRA ★ QUEBRA PEDRA</span>
                    </span>
                    <div className="fx-cracha-cartao">
                        <i className="fx-cracha-furo" />
                        <p className="fx-cracha-faixa">STAFF</p>
                        <p className="fx-cracha-nome">Joana Lasca</p>
                        <p className="fx-cracha-funcao">técnica de palco</p>
                        <p data-medida className="fx-cracha-acesso">
                            acesso ao palco, ao camarim e à área técnica
                        </p>
                        <p className="fx-mini-miudo">21 MAR ★ QUEBRA PEDRA</p>
                    </div>
                </div>
            </Caixinha>
            <Caixinha rotulo="A setlist dos Lascados, colada no palco">
                <div className="fx-setlist">
                    <i className="fx-setlist-fita" data-lado="esq" />
                    <i className="fx-setlist-fita" data-lado="dir" />
                    <p className="fx-setlist-banda">OS LASCADOS</p>
                    <p className="fx-mini-miudo">21.03 ★ QUEBRA PEDRA</p>
                    <ol>
                        {SETLIST.map((m, i) => (
                            <li key={m} data-medida={i === 0 || undefined}>
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

// ——— Polished: as quatro caixinhas do livro ———
// uma página da história, o marcador com o cordão, a ficha de empréstimo da biblioteca (as datas carimbadas e os
// nomes de quem levou) e o ex-libris colado na capa
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
                    <p className="fx-mini-miudo">A PEDRINHA QUE ROLOU</p>
                    <p data-medida className="fx-mini-pagina-texto">
                        Era uma vez uma pedra cheia de quinas. Ela morava no alto do morro e espetava tudo o que chegava perto: o vento, a chuva e até as
                        formigas.
                    </p>
                    <p className="fx-mini-miudo fx-mini-pagina-numero">12</p>
                </div>
            </Caixinha>
            <Caixinha rotulo="O marcador de página da coleção">
                <div className="fx-marcador">
                    <span className="fx-marcador-cordao" />
                    <i className="fx-marcador-furo" />
                    <p className="fx-marcador-titulo">leia devagar</p>
                    <p data-medida className="fx-marcador-texto">
                        a pedra também levou tempo para ficar lisa
                    </p>
                    <span className="fx-marcador-seixo" />
                    <p className="fx-mini-miudo">COLEÇÃO CORRENTEZA</p>
                </div>
            </Caixinha>
            <Caixinha rotulo="A ficha de empréstimo da biblioteca, com as datas carimbadas">
                <div className="fx-ficha">
                    <FiltroTinta id={id} semente={7} />
                    <p className="fx-mini-miudo">BIBLIOTECA DA ESCOLA</p>
                    <p className="fx-ficha-livro">A pedrinha que rolou</p>
                    <div className="fx-ficha-tabela">
                        <p className="fx-mini-miudo">DEVOLVER ATÉ</p>
                        <p className="fx-mini-miudo">NOME</p>
                        {EMPRESTIMOS.map(([data, nome], i) => (
                            <Fragment key={data}>
                                <p className="fx-ficha-carimbo" style={{ filter: `url(#${id})`, rotate: `${[-4, 3, -2, 5, -3][i]}deg` }}>
                                    {data}
                                </p>
                                <p data-medida={i === 0 || undefined} className="fx-ficha-nome">
                                    {nome}
                                </p>
                            </Fragment>
                        ))}
                    </div>
                </div>
            </Caixinha>
            <Caixinha rotulo="O ex-libris colado na capa: este livro pertence a Lia">
                <div className="fx-exlibris">
                    <p className="fx-mini-miudo">EX-LIBRIS</p>
                    <span className="fx-exlibris-seixo" />
                    <p className="fx-mini-miudo">ESTE LIVRO PERTENCE A</p>
                    <p className="fx-exlibris-nome">Lia</p>
                    <p data-medida className="fx-exlibris-texto">
                        se encontrar, devolva: ele sempre rola de volta para casa
                    </p>
                </div>
            </Caixinha>
        </div>
    );
}


// ——— Worn: o disco gasto ———
// o LP "foz", dos Rolados: a capa desbotada com a marca redonda que o disco deixou de tanto entrar e sair da estante e
// os cantos moles, e o disco saindo de dentro (os sulcos, o brilho e o selo do lado A)
export function DiscoWorn() {
    return (
        <Painel colunas={4} linhas={2} rotulo="A capa do disco foz, dos Rolados, gasta pelo tempo, com o disco saindo de dentro" celular={{ colunas: 2, linhas: 3 }} nu>
            <div className="fx-v-mesa" style={{ fontFamily: familiaDe('worn') }} aria-hidden>
                <div className="fx-disco">
                    <div className="fx-disco-selo">
                        <p>OS ROLADOS</p>
                        <p className="fx-disco-selo-titulo">foz</p>
                        <p>LADO A ★ 33 RPM</p>
                    </div>
                </div>
                <div className="fx-capa">
                    <span className="fx-capa-sol" />
                    <p className="fx-capa-artista">OS ROLADOS</p>
                    <p className="fx-capa-titulo">foz</p>
                    <p className="fx-capa-rodape">DISCOS CORRENTEZA ★ LP-026</p>
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
    ['baixo', 'Beto Lajes'],
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
                    <p className="fx-mini-miudo">OS ROLADOS ★ FOZ</p>
                    <div className="fx-contracapa-lados">
                        {[ladoA, ladoB].map((faixas, i) => (
                            <ol key={i}>
                                {faixas.map(([nome], k) => (
                                    <li key={nome} data-medida={(i === 0 && k === 0) || undefined}>
                                        {nome}
                                    </li>
                                ))}
                            </ol>
                        ))}
                    </div>
                    <div className="fx-contracapa-pe">
                        <p className="fx-mini-miudo">DISCOS CORRENTEZA ★ LP-026</p>
                        <Barras numero="000026" classe="fx-contracapa-barras" />
                    </div>
                </div>
            </Caixinha>
            <Caixinha rotulo="O selo do lado B do disco">
                <div className="fx-selo-b">
                    <div className="fx-selo-b-papel">
                        <p className="fx-mini-miudo">OS ROLADOS</p>
                        <p className="fx-selo-b-titulo">foz</p>
                        <i className="fx-selo-b-furo" />
                        <ol>
                            {ladoB.map(([nome, tempo], k) => (
                                <li key={nome} data-medida={k === 0 || undefined}>
                                    {nome} <span>{tempo}</span>
                                </li>
                            ))}
                        </ol>
                        <p className="fx-mini-miudo">LADO B ★ 33 RPM</p>
                    </div>
                </div>
            </Caixinha>
            <Caixinha rotulo="A etiqueta de preço do sebo, colada no canto da capa">
                <div className="fx-sebo">
                    <span className="fx-sebo-capa" />
                    <div className="fx-sebo-etiqueta">
                        <p className="fx-mini-miudo">SEBO BEIRA-RIO</p>
                        <p className="fx-sebo-preco">R$ 35</p>
                        <p data-medida className="fx-sebo-texto">
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
                                <dt>{papel}</dt>
                                <dd data-medida={i === 0 || undefined}>{nome}</dd>
                            </Fragment>
                        ))}
                    </dl>
                    <p className="fx-mini-miudo">© DISCOS CORRENTEZA</p>
                </div>
            </Caixinha>
        </div>
    );
}
