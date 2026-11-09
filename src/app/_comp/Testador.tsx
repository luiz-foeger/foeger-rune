'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Painel from './Painel';
import Seta from './Seta';
import { CORES_ESTILO, ESTILOS, PARAGRAFO, type Estilo } from '../_lib/conteudo';
import { ESTILO_MEDIDAS } from '../_lib/medidas';
import { useVisivel } from '../_lib/movimento';

// o testador (2 × 4 módulos): o nome do estilo no alto, o parágrafo grande no estilo escolhido (o fim da primeira
// linha passa por baixo da janela do seletor, que é pequena, no canto) e, embaixo, as medidas do estilo no alfabeto
// inteiro, uma barra por medida, na cor do estilo: o σ do desfoque, quanto as quinas recuam, os espaços de dentro, os
// pontos por letra, a largura e o espaço entre as letras (medidas.ts, das fontes de verdade e da conta que as gerou).
// O número embaixo é o de verdade, na unidade dele; a barra vai até o maior dos três estilos naquela medida, que é o
// que a régua de 0 a 100% dos lados mede. No seletor, cada estilo tem a sua pedra numa caixinha (as fotos do Föeger, da mais
// angulosa à mais redonda). A seta troca de estilo sozinha a cada ~2,4 s; com o mouse em cima, a escolha segue o mouse
// (a seta desenhada some e a troca sozinha para), e clicar também escolhe. A janela do seletor inteira é arrastável
// (pela barra, pelas pedras ou pelos nomes), sem sair do testador: assim a pessoa a tira de cima do texto. O arrasto só
// começa depois de o ponteiro andar uns pixels, então um clique parado num nome continua escolhendo. A mão fica aberta
// na janela, aponta nos nomes e fecha enquanto o botão do mouse está apertado. As barras mudam de altura em ~1 s (saída exponencial) e de
// cor junto.
const TROCA = 2400;
const FOLGA = 4; // px que o ponteiro anda antes de virar arrasto

// arrastar a janela dentro do testador: guarda a posição em % do testador, para ela acompanhar o tamanho da tela. Com o
// botão apertado, o movimento e o soltar são ouvidos na página inteira (um puxão rápido sai da janela antes de virar
// arrasto, e o soltar pode cair fora dela); passada a folga, a janela captura o ponteiro, e o soltar não vira clique
function useArrastar(janela: React.RefObject<HTMLDivElement | null>, area: React.RefObject<HTMLDivElement | null>) {
    const fim = useRef<(() => void) | null>(null);
    useEffect(() => () => fim.current?.(), []);
    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        const el = janela.current;
        if (!el || e.button !== 0 || fim.current) return;
        const r = el.getBoundingClientRect();
        const id = e.pointerId;
        const x0 = e.clientX;
        const y0 = e.clientY;
        let andou = false;
        const mover = (ev: PointerEvent) => {
            if (ev.pointerId !== id) return;
            if (!(ev.buttons & 1)) return soltar(ev); // o soltar se perdeu: não arrasta com o botão solto
            const a = area.current?.getBoundingClientRect();
            if (!a) return;
            if (!andou) {
                if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < FOLGA) return;
                andou = true;
                try {
                    el.setPointerCapture(id);
                } catch {}
            }
            const x = Math.min(a.width - el.offsetWidth, Math.max(0, ev.clientX - a.left - (x0 - r.left)));
            const y = Math.min(a.height - el.offsetHeight, Math.max(0, ev.clientY - a.top - (y0 - r.top)));
            el.style.left = `${((100 * x) / a.width).toFixed(3)}%`;
            el.style.top = `${((100 * y) / a.height).toFixed(3)}%`;
            el.style.right = 'auto';
        };
        const soltar = (ev: PointerEvent) => {
            if (ev.pointerId === id) fim.current?.();
        };
        fim.current = () => {
            window.removeEventListener('pointermove', mover);
            window.removeEventListener('pointerup', soltar);
            window.removeEventListener('pointercancel', soltar);
            if (el.hasPointerCapture(id)) el.releasePointerCapture(id);
            delete el.dataset.segurando;
            fim.current = null;
        };
        window.addEventListener('pointermove', mover);
        window.addEventListener('pointerup', soltar);
        window.addEventListener('pointercancel', soltar);
        el.dataset.segurando = '';
    };
    return { onPointerDown };
}

export default function Testador() {
    const ref = useRef<HTMLDivElement>(null);
    const janela = useRef<HTMLDivElement>(null);
    const arrastar = useArrastar(janela, ref);
    const visivel = useVisivel(ref, { limiar: 0.3 });
    const [ativo, setAtivo] = useState(0);
    const [rodada, setRodada] = useState(0); // muda a cada clique, para reiniciar a troca automática
    const [sobre, setSobre] = useState(false); // o mouse em cima do seletor: a troca sozinha para
    useEffect(() => {
        if (!visivel || sobre) return;
        const id = window.setInterval(() => setAtivo(a => (a + 1) % ESTILOS.length), TROCA);
        return () => window.clearInterval(id);
    }, [visivel, rodada, sobre]);

    const estilo = ESTILOS[ativo];
    const id: Estilo = estilo.id;
    const cor = CORES_ESTILO[id];
    const escala = [0, 20, 40, 60, 80, 100];
    const regua = (lado: 'esq' | 'dir') => (
        <div className="fx-humor-regua" data-lado={lado} aria-hidden>
            {escala.map(v => (
                <span key={v} style={{ bottom: `${v}%` }}>
                    {v}%
                </span>
            ))}
        </div>
    );
    return (
        <Painel colunas={4} linhas={2} rotulo="Testador de estilos" celular={{ colunas: 2, linhas: 3 }}>
            <div ref={ref} className="fx-testador" style={{ '--cor-estilo': cor } as CSSProperties}>
                <p className="fx-testador-nome">{estilo.nome}</p>
                <p className="fx-testador-texto" style={{ fontFamily: estilo.familia }}>
                    {PARAGRAFO.map((l, i) => (
                        <span key={l}>
                            {i > 0 && <br />}
                            {l}
                        </span>
                    ))}
                </p>

                <div ref={janela} className="fx-seletor" role="radiogroup" aria-label="Estilo do texto (arraste a janela para tirá-la de cima do texto)" {...arrastar}>
                    <div className="fx-janela-barra">
                        <span>×</span>
                        <span>»</span>
                    </div>
                    <div className="fx-seletor-corpo">
                        <div className="fx-seletor-lista" onMouseLeave={() => setSobre(false)}>
                            {ESTILOS.map((e, i) => (
                                <div
                                    key={e.id}
                                    className="fx-seletor-linha"
                                    onMouseEnter={() => {
                                        setSobre(true);
                                        setAtivo(i);
                                    }}
                                >
                                    <span className="fx-seletor-pedra" aria-hidden>
                                        <img src={`/pedra-seletor-${e.id}.webp`} alt="" />
                                    </span>
                                    <button
                                        type="button"
                                        role="radio"
                                        aria-checked={i === ativo}
                                        className="fx-seletor-item"
                                        data-ativo={i === ativo || undefined}
                                        style={{ '--cor-item': CORES_ESTILO[e.id] } as CSSProperties}
                                        onFocus={() => setAtivo(i)}
                                        onClick={() => {
                                            setAtivo(i);
                                            setRodada(r => r + 1);
                                        }}
                                    >
                                        {e.nome}
                                    </button>
                                </div>
                            ))}
                            {!sobre && <Seta style={{ left: 'calc(167 * var(--u))', top: `calc(${12 + ativo * 45} * var(--u))`, transition: 'top 0.35s cubic-bezier(0.22, 1, 0.36, 1)' }} />}
                        </div>
                    </div>
                </div>

                <div className="fx-humor">
                    <p className="fx-humor-titulo">No alfabeto inteiro</p>
                    <div className="fx-humor-barras">
                        {regua('esq')}
                        {ESTILO_MEDIDAS.map(m => {
                            const v = m.valores[ativo];
                            const maior = Math.max(...m.valores);
                            const numero = m.antes ? `${m.unidade} ${v}` : m.unidade ? `${v} ${m.unidade}` : String(v);
                            return (
                                <div key={m.nome} className="fx-humor-coluna">
                                    <div className="fx-humor-trilho">
                                        <i className="fx-humor-barra" style={{ '--v': `${Math.max(4, (100 * v) / maior)}%` } as CSSProperties} />
                                    </div>
                                    <p className="fx-humor-valor">{numero}</p>
                                    <p className="fx-humor-nome">{m.nome}</p>
                                </div>
                            );
                        })}
                        {regua('dir')}
                    </div>
                </div>
            </div>
        </Painel>
    );
}
