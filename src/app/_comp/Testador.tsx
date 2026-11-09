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
// (a seta desenhada some e a troca sozinha para), e clicar também escolhe. As barras mudam de altura em ~1 s (saída
// exponencial) e de cor junto.
const TROCA = 2400;

export default function Testador() {
    const ref = useRef<HTMLDivElement>(null);
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

                <div className="fx-seletor" role="radiogroup" aria-label="Estilo do texto">
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
