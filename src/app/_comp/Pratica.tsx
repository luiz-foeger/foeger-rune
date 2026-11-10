'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Painel from './Painel';
import { familiaDe } from './Faixa';

// as faixas no padrão novo: depois da frase que corre, cada estilo aparece onde ele seria usado de verdade, numa peça
// grande e numa peça de texto pequeno (com os tamanhos medidos na tela de quem lê). No Cut, o cartaz lambe-lambe de
// um festival (cada linha na largura inteira, em corpos diferentes, como o tipo de madeira da gráfica de cartaz de
// rua) e o ingresso do mesmo festival, com as regras em letra miúda.

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

// ——— Cut: o cartaz do festival ———
type Bloco = { linhas: string[]; faixa?: boolean };
const CARTAZ_LARGO: Bloco[] = [
    { linhas: ['21 MAR ★ 20H ★ GALPÃO DA PEDREIRA'] },
    { linhas: ['QUEBRA PEDRA'] },
    { linhas: ['OS LASCADOS ★ CINZEL ★ BRITA 3'], faixa: true },
    { linhas: ['festival de rock bruto'] },
    { linhas: ['pista a R$ 20 ★ traga seu capacete'] },
];
// no celular o cartaz fica em pé, então as mesmas frases quebram em mais linhas
const CARTAZ_CELULAR: Bloco[] = [
    { linhas: ['21 MAR ★ 20H', 'GALPÃO DA PEDREIRA'] },
    { linhas: ['QUEBRA', 'PEDRA'] },
    { linhas: ['OS LASCADOS', 'CINZEL ★ BRITA 3'], faixa: true },
    { linhas: ['festival de', 'rock bruto'] },
    { linhas: ['pista a R$ 20', 'traga seu capacete'] },
];

function Lambe({ blocos, tela, largura }: { blocos: Bloco[]; tela: 'largo' | 'celular'; largura: number }) {
    return (
        <div className="fx-lambe" data-tela={tela} aria-hidden>
            {blocos.map(b => (
                <div key={b.linhas.join(' ')} className="fx-lambe-bloco" data-faixa={b.faixa || undefined}>
                    {b.linhas.map(l => (
                        <LinhaCheia key={l} texto={l} largura={largura} />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function CartazCut() {
    const texto = CARTAZ_LARGO.flatMap(b => b.linhas).join('. ');
    return (
        <Painel colunas={4} linhas={2} rotulo={`Cartaz: ${texto}`} celular={{ colunas: 2, linhas: 3 }}>
            <div className="fx-lambe-papel" style={{ fontFamily: familiaDe('cut') }}>
                <Lambe blocos={CARTAZ_LARGO} tela="largo" largura={1733} />
                <Lambe blocos={CARTAZ_CELULAR} tela="celular" largura={813} />
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
        <Painel colunas={4} linhas={1} rotulo="Ingresso do festival, em texto pequeno" celular={{ colunas: 2, linhas: 2 }}>
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
