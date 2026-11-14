'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import Painel from './Painel';
import Seta from './Seta';
import { useVisivel } from '../_lib/movimento';

// as variações: as trocas que a fonte faz sozinha pela vizinha (o calt dos três estilos), cada uma num painel. São as
// três que a fonte tem de verdade (conferidas nos .otf):
// - as letras repetidas: a mesma minúscula seguida se reveza em quatro cortes (a, a.v2, a.v3, a.v4, e volta ao a);
// - o L do meio: depois de outra letra, o L troca de corte (L.alt); no começo da palavra, fica como é;
// - o f do começo: no começo da palavra, o f troca de corte (f.ini), a não ser que outro f venha depois.
// No alto à esquerda, o rótulo dos cartões do desgaste (duas linhas em caixa alta, a segunda apagada); no canto direito,
// a caixinha de ligar e desligar, que funciona como o seletor do testador: troca sozinha a cada 2,4 s; com o mouse em
// cima, a opção sob ele é a escolhida (a seta desenhada some e a troca sozinha para); clicar também escolhe. Com
// movimento reduzido, fica parada no ligado.

type Letra = { t: string; troca?: boolean };
type Variacao = { rotulo: string; nome: string; legenda: string; amostra: string; grupos: Letra[][]; cor: string; atraso: number };

const repetida = (c: string): Letra[] => [{ t: c }, { t: c, troca: true }, { t: c, troca: true }, { t: c, troca: true }];
const palavra = (s: string, trocas: number[]): Letra[] => s.split('').map((t, i) => ({ t, troca: trocas.includes(i) }));
const u = (n: number) => `calc(${n} * var(--u))`;

const VARIACOES: Variacao[] = [
    {
        rotulo: 'Letras repetidas',
        nome: 'LETRAS REPETIDAS',
        legenda: 'A MESMA LETRA SEGUIDA, EM QUATRO CORTES',
        amostra: 'ee',
        grupos: [repetida('a'), repetida('e'), repetida('s')],
        cor: 'var(--p-worn)',
        atraso: 600,
    },
    {
        rotulo: 'L do meio',
        nome: 'L DO MEIO',
        legenda: 'DEPOIS DE OUTRA LETRA, O L MUDA',
        amostra: 'AL',
        grupos: [palavra('LEAL', [3])],
        cor: 'var(--p-quente)',
        atraso: 1400,
    },
    {
        rotulo: 'f do começo',
        nome: 'f DO COMEÇO',
        legenda: 'NO COMEÇO DA PALAVRA, O f MUDA',
        amostra: 'fé',
        grupos: [palavra('fenda', [0])],
        cor: 'var(--p-frio)',
        atraso: 2200,
    },
];

const TROCA = 2400;

// o movimento reduzido do sistema (lido no navegador; no servidor, falso)
const REDUZIDO = '(prefers-reduced-motion: reduce)';
const lerReduzido = () => window.matchMedia(REDUZIDO).matches;
const ouvirReduzido = (avisar: () => void) => {
    const m = window.matchMedia(REDUZIDO);
    m.addEventListener('change', avisar);
    return () => m.removeEventListener('change', avisar);
};

function PainelVariacao({ v, largo }: { v: Variacao; largo: boolean }) {
    const ref = useRef<HTMLDivElement>(null);
    const visivel = useVisivel(ref, { limiar: 0.4 });
    const reduzido = useSyncExternalStore(ouvirReduzido, lerReduzido, () => false);
    const [ligado, setLigado] = useState(true);
    const [sobre, setSobre] = useState(false); // o mouse em cima da caixinha: a troca sozinha para
    const [rodada, setRodada] = useState(0); // muda a cada clique, para reiniciar a troca sozinha
    // a troca sozinha: parado, o painel mostra o ligado; na tela, troca a cada 2,4 s, a primeira depois do atraso do
    // painel (um de cada vez) ou, depois de um clique, de uma troca inteira
    useEffect(() => {
        if (!visivel || sobre || reduzido) return;
        let id = 0;
        const t = window.setTimeout(
            () => {
                setLigado(l => !l);
                id = window.setInterval(() => setLigado(l => !l), TROCA);
            },
            rodada ? TROCA : v.atraso,
        );
        return () => {
            window.clearTimeout(t);
            window.clearInterval(id);
        };
    }, [visivel, sobre, reduzido, rodada, v.atraso]);
    const minusculas = v.grupos.flat().every(l => l.t === l.t.toLowerCase());
    const lido = v.grupos.map(g => g.map(l => l.t).join('')).join(' ');
    return (
        <Painel
            colunas={largo ? 4 : 2}
            linhas={1}
            celular={largo ? { colunas: 2, linhas: 2 } : undefined}
            rotulo={v.rotulo}
            estilo={{ gridColumn: largo ? '1 / span 4' : 'span 2' }}
        >
            <div ref={ref} className="fx-var" data-largo={largo || undefined} style={{ '--cor-troca': v.cor } as CSSProperties}>
                <div className="fx-var-cabeca">
                    <h3 className="fx-var-nome">{v.nome}</h3>
                    <p className="fx-var-legenda">{v.legenda}</p>
                </div>
                <div className="fx-alterna fx-var-janela" role="radiogroup" aria-label={v.rotulo} onMouseLeave={() => setSobre(false)}>
                    <div className="fx-janela-barra" aria-hidden>
                        <span>×</span>
                        <span>»</span>
                    </div>
                    {[false, true].map(sim => (
                        <button
                            key={String(sim)}
                            type="button"
                            role="radio"
                            aria-checked={ligado === sim}
                            aria-label={sim ? 'Ligado' : 'Desligado'}
                            className="fx-alterna-botao"
                            data-ativo={ligado === sim || undefined}
                            style={{ '--cor-botao': sim ? v.cor : 'var(--tinta)' } as CSSProperties}
                            onMouseEnter={() => {
                                setSobre(true);
                                setLigado(sim);
                            }}
                            onFocus={() => setLigado(sim)}
                            onClick={() => {
                                setLigado(sim);
                                setRodada(r => r + 1);
                            }}
                        >
                            <span className="fx-var-amostra" style={{ fontFeatureSettings: `"calt" ${sim ? 1 : 0}` }}>
                                {v.amostra}
                            </span>
                        </button>
                    ))}
                    {!sobre && <Seta style={{ left: u(30), top: u(ligado ? 70 : 26), transition: 'top 0.3s ease' }} />}
                </div>
                <p
                    className="fx-var-letras"
                    data-minusculas={minusculas || undefined}
                    data-ligado={ligado || undefined}
                    style={{ fontFeatureSettings: `"calt" ${ligado ? 1 : 0}` }}
                    aria-label={lido}
                >
                    {v.grupos.map((g, i) => (
                        <span key={i} className="fx-var-grupo" aria-hidden>
                            {g.map((l, j) => (
                                <span key={j} data-troca={l.troca || undefined}>
                                    {l.t}
                                </span>
                            ))}
                        </span>
                    ))}
                </p>
            </div>
        </Painel>
    );
}

export default function SecaoVariacoes() {
    return (
        <div className="fx-grade">
            {VARIACOES.map((v, i) => (
                <PainelVariacao key={v.rotulo} v={v} largo={i === 0} />
            ))}
        </div>
    );
}
