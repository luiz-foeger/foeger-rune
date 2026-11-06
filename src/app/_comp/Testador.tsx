'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Painel from './Painel';
import Seta from './Seta';
import { CORES_ESTILO, ESTILOS, HUMOR, PARAGRAFO, type Estilo } from '../_lib/conteudo';
import { useVisivel } from '../_lib/movimento';

// o testador da Feixen (2 × 4 módulos): o nome do estilo no alto, o parágrafo grande no estilo escolhido (as duas
// primeiras linhas passam por baixo da janela do seletor) e, embaixo, o "Mood" com uma barra por qualidade, na cor do
// estilo. A seta do seletor troca de estilo sozinha a cada ~2,4 s (como na gravação); clicar escolhe e reinicia a
// conta. As barras mudam de altura em ~1 s (saída exponencial) e de cor junto.
const TROCA = 2400;

export default function Testador() {
    const ref = useRef<HTMLDivElement>(null);
    const visivel = useVisivel(ref, { limiar: 0.3 });
    const [ativo, setAtivo] = useState(0);
    const [rodada, setRodada] = useState(0); // muda a cada clique, para reiniciar a troca automática
    useEffect(() => {
        if (!visivel) return;
        const id = window.setInterval(() => setAtivo(a => (a + 1) % ESTILOS.length), TROCA);
        return () => window.clearInterval(id);
    }, [visivel, rodada]);

    const estilo = ESTILOS[ativo];
    const id: Estilo = estilo.id;
    const cor = CORES_ESTILO[id];
    const valores = HUMOR.valores[id];
    const escala = [0, 20, 40, 60, 80, 100];
    const regua = (lado: 'esq' | 'dir') => (
        <div className="fx-humor-regua" data-lado={lado} aria-hidden>
            {escala.map(v => (
                <span key={v} style={{ bottom: `${v}%` }}>
                    {v}
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

                <div className="fx-seletor" role="radiogroup" aria-label="Estilo do texto">
                    <div className="fx-janela-barra">
                        <span>×</span>
                        <span>»</span>
                    </div>
                    <div className="fx-seletor-corpo">
                        <div className="fx-seletor-ferramentas" aria-hidden>
                            <div className="fx-ferramenta">
                                <svg viewBox="0 0 30 30">
                                    <path d="M7 24L14 5h2l7 19M10 17h10" fill="none" stroke="#111" strokeWidth="1.8" />
                                    <path d="M22 22l4 4" stroke="#111" strokeWidth="1.6" />
                                </svg>
                            </div>
                            <div className="fx-ferramenta">
                                <svg viewBox="0 0 30 30">
                                    <path d="M6 24L24 6" stroke="#111" strokeWidth="1.6" />
                                    <path d="M4 24h4M22 6h4" stroke="#111" strokeWidth="1.6" />
                                </svg>
                            </div>
                        </div>
                        <div className="fx-seletor-lista">
                            {ESTILOS.map((e, i) => (
                                <button
                                    key={e.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={i === ativo}
                                    className="fx-seletor-item"
                                    data-ativo={i === ativo || undefined}
                                    style={{ '--cor-item': CORES_ESTILO[e.id] } as CSSProperties}
                                    onClick={() => {
                                        setAtivo(i);
                                        setRodada(r => r + 1);
                                    }}
                                >
                                    {e.nome}
                                </button>
                            ))}
                            <Seta style={{ left: 'calc(214 * var(--u))', top: `calc(${12 + ativo * 45} * var(--u))`, transition: 'top 0.35s cubic-bezier(0.22, 1, 0.36, 1)' }} />
                        </div>
                    </div>
                </div>

                <div className="fx-humor">
                    <p className="fx-humor-titulo">{HUMOR.titulo}</p>
                    <div className="fx-humor-barras">
                        {regua('esq')}
                        {HUMOR.nomes.map((nome, i) => (
                            <div key={nome} className="fx-humor-coluna">
                                <div className="fx-humor-trilho">
                                    <i className="fx-humor-barra" style={{ '--v': `${Math.max(12, valores[i])}%` } as CSSProperties} />
                                </div>
                                <p className="fx-humor-valor">{valores[i]}%</p>
                                <p className="fx-humor-nome">{nome}</p>
                            </div>
                        ))}
                        {regua('dir')}
                    </div>
                </div>
            </div>
        </Painel>
    );
}
