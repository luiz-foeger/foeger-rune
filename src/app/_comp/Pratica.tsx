'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import Painel from './Painel';
import { familiaDe } from './Faixa';

// as faixas no padrão novo: depois da frase que corre, cada estilo aparece onde ele seria usado de verdade, numa peça
// grande e numa peça de texto pequeno (com os tamanhos medidos na tela de quem lê), soltas na cor da faixa, sem régua
// nem trama: a régua fica com a frase que corre, a letra medida; embaixo, a mesma letra em uso. No Cut, o cartaz
// lambe-lambe de um festival colado na parede (cada linha na largura inteira, em corpos diferentes, como o tipo de
// madeira da gráfica de cartaz de rua) e o ingresso do mesmo festival, com as regras em letra miúda.

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
function Barras({ numero }: { numero: string }) {
    const modulos = `101${[...numero].map(d => EAN_L[Number(d)]).join('')}101`;
    return (
        <svg className="fx-ingresso-barras" viewBox={`0 0 ${modulos.length} 10`} preserveAspectRatio="none" aria-hidden>
            {[...modulos].map((m, i) => (m === '1' ? <rect key={i} x={i} y="0" width="1.02" height="10" fill="currentColor" /> : null))}
        </svg>
    );
}

const NUMERO = '000311';
export function IngressoCut() {
    const caixa = useRef<HTMLDivElement>(null);
    const titulo = useRef<HTMLParagraphElement>(null);
    const texto = useRef<HTMLParagraphElement>(null);
    const miudo = useRef<HTMLParagraphElement>(null);
    // os tamanhos de verdade, medidos na tela (os corpos são em u; só na largura de desenho dão 84, 17 e 14 px)
    const [px, setPx] = useState({ titulo: 84, texto: 17, miudo: 14 });
    useEffect(() => {
        const el = caixa.current;
        if (!el) return;
        const tam = (e: Element | null, padrao: number) => (e ? Math.round(parseFloat(getComputedStyle(e).fontSize)) || padrao : padrao);
        const medir = () => setPx({ titulo: tam(titulo.current, 84), texto: tam(texto.current, 17), miudo: tam(miudo.current, 14) });
        medir();
        const obs = new ResizeObserver(medir);
        obs.observe(el);
        return () => obs.disconnect();
    }, []);
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
