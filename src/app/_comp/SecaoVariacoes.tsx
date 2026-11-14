'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import Painel from './Painel';
import { useVisivel } from '../_lib/movimento';

// as variações: as trocas que a fonte faz sozinha pela vizinha (o calt dos três estilos), cada uma num painel com a
// chave "Sem | Com". São as três que a fonte tem de verdade (conferidas nos .otf):
// - as letras repetidas: a mesma minúscula seguida se reveza em quatro cortes (a, a.v2, a.v3, a.v4, e volta ao a);
// - o L do meio: depois de outra letra, o L troca de corte (L.alt); no começo da palavra, fica como é;
// - o f do começo: no começo da palavra, o f troca de corte (f.ini), a não ser que outro f venha depois.
// Enquanto o painel está na tela, a chave alterna sozinha; com o mouse em cima ela para, e depois que a pessoa usa a
// chave, fica onde ela deixou. Com movimento reduzido, fica parada no "Com".

type Letra = { t: string; troca?: boolean };
type Variacao = { nome: string; texto: string; grupos: Letra[][]; cor: string; atraso: number };

const repetida = (c: string): Letra[] => [{ t: c }, { t: c, troca: true }, { t: c, troca: true }, { t: c, troca: true }];
const palavra = (s: string, trocas: number[]): Letra[] => s.split('').map((t, i) => ({ t, troca: trocas.includes(i) }));

const VARIACOES: Variacao[] = [
    {
        nome: 'Letras repetidas',
        texto: 'A mesma letra seguida nunca sai igual: quatro cortes que se revezam',
        grupos: [repetida('a'), repetida('e'), repetida('s')],
        cor: 'var(--p-worn)',
        atraso: 600,
    },
    {
        nome: 'L do meio',
        texto: 'No meio da palavra, o L muda; no começo, não',
        grupos: [palavra('LEAL', [3])],
        cor: 'var(--p-quente)',
        atraso: 1400,
    },
    {
        nome: 'f do começo',
        texto: 'No começo da palavra, o f muda; no meio, não',
        grupos: [palavra('fenda', [0])],
        cor: 'var(--p-frio)',
        atraso: 2200,
    },
];

const ALTERNA = 2400;

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
    const [ligado, setLigado] = useState(true);
    const [manual, setManual] = useState(false);
    const [pausa, setPausa] = useState(false);
    const reduzido = useSyncExternalStore(ouvirReduzido, lerReduzido, () => false);
    // a alternância sozinha: parado, o painel mostra o "Com"; na tela, vai ao "Sem" depois do atraso (um painel de
    // cada vez) e troca a cada 2,4 s
    useEffect(() => {
        if (!visivel || manual || pausa || reduzido) return;
        let id = 0;
        const t = window.setTimeout(() => {
            setLigado(l => !l);
            id = window.setInterval(() => setLigado(l => !l), ALTERNA);
        }, v.atraso);
        return () => {
            window.clearTimeout(t);
            window.clearInterval(id);
        };
    }, [visivel, manual, pausa, reduzido, v.atraso]);
    const escolher = (sim: boolean) => {
        setManual(true);
        setLigado(sim);
    };
    const minusculas = v.grupos.flat().every(l => l.t === l.t.toLowerCase());
    const lido = v.grupos.map(g => g.map(l => l.t).join('')).join(' ');
    return (
        <Painel
            colunas={largo ? 4 : 2}
            linhas={1}
            celular={largo ? { colunas: 2, linhas: 2 } : undefined}
            rotulo={v.nome}
            estilo={{ gridColumn: largo ? '1 / span 4' : 'span 2' }}
        >
            <div
                ref={ref}
                className="fx-var"
                data-largo={largo || undefined}
                style={{ '--cor-troca': v.cor } as CSSProperties}
                onPointerEnter={e => e.pointerType === 'mouse' && setPausa(true)}
                onPointerLeave={() => setPausa(false)}
            >
                <div className="fx-var-cabeca">
                    <div>
                        <h3 className="fx-var-nome">{v.nome}</h3>
                        <p className="fx-var-texto">{v.texto}</p>
                    </div>
                    <div className="fx-var-chave" role="radiogroup" aria-label={v.nome}>
                        {[false, true].map(sim => (
                            <button
                                key={String(sim)}
                                type="button"
                                role="radio"
                                aria-checked={ligado === sim}
                                className="fx-var-opcao"
                                data-ativo={ligado === sim}
                                onClick={() => escolher(sim)}
                            >
                                {sim ? 'Com' : 'Sem'}
                            </button>
                        ))}
                    </div>
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
                <PainelVariacao key={v.nome} v={v} largo={i === 0} />
            ))}
        </div>
    );
}
