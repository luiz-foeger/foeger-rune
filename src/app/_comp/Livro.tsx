'use client';

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import Painel from './Painel';
import Seta from './Seta';
import { familiaDe } from './Faixa';
import { RUNE, VARIACOES } from '../_lib/conteudo';
import { useVisivel } from '../_lib/movimento';

// a seção escura da página "Na prática": as quatro letras grandes e o texto que troca de caixa (as variações das letras
// repetidas só existem nas minúsculas). As variações da home, com a chave de ligar e desligar, ficam em SecaoVariacoes.tsx.
const u = (n: number) => `calc(${n} * var(--u))`;

// um sorteio fixo, para as cores e as posições serem as mesmas a cada visita
function sorteador(semente: number) {
    let s = semente;
    return () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
    };
}

// troca de estado a cada "ms" enquanto o elemento está na tela
function useAlterna(ref: RefObject<HTMLElement | null>, ms: number, atraso = 0) {
    const visivel = useVisivel(ref, { limiar: 0.25 });
    const [ligado, setLigado] = useState(false);
    useEffect(() => {
        if (!visivel) return;
        let id = 0;
        const t = window.setTimeout(() => {
            setLigado(l => !l);
            id = window.setInterval(() => setLigado(l => !l), ms);
        }, atraso);
        return () => {
            window.clearTimeout(t);
            window.clearInterval(id);
        };
    }, [visivel, ms, atraso]);
    return ligado;
}

// ——— a seção escura ———
export function Escura({ children }: { children: ReactNode }) {
    return (
        <section className="fx-escura" aria-label="Variações">
            <div className="fx-faixa-miolo">{children}</div>
        </section>
    );
}

export function LetrasRune() {
    return (
        <div className="fx-grade">
            {RUNE.map(r => (
                <Painel key={r.letra} colunas={1} linhas={1} rotulo={r.letra}>
                    <div className="fx-letra-rune" style={{ color: r.cor, fontFamily: familiaDe(r.estilo) }}>
                        {r.letra}
                    </div>
                </Painel>
            ))}
        </div>
    );
}

const CORES_LETRA = ['var(--p-polished)', 'var(--p-quente-claro)', '#bdbdbd'];
function colorir(texto: string, semente: number) {
    const sorteio = sorteador(semente);
    return texto.split('').map((ch, i) => (
        <span key={i} style={{ color: CORES_LETRA[Math.floor(sorteio() * 3)] }}>
            {ch}
        </span>
    ));
}

// o texto das variações: em minúsculas, as letras repetidas trocam de corte (o calt da fonte); em maiúsculas, não
// (as variações são só das minúsculas). A janelinha "AA / Aa" alterna sozinha.
export function TextoVariacoes() {
    const ref = useRef<HTMLDivElement>(null);
    const minusculas = useAlterna(ref, 2600, 900);
    return (
        <Painel colunas={4} linhas={1} rotulo="Texto com as variações" celular={{ colunas: 2, linhas: 2 }}>
            <div ref={ref} className="fx-variacoes" data-maiusculas={!minusculas || undefined}>
                {VARIACOES.map((v, k) => (
                    <div key={v.titulo} className="fx-variacoes-metade">
                        <p className="fx-variacoes-titulo">{v.titulo}</p>
                        <p className="fx-variacoes-texto" style={{ fontFamily: familiaDe(v.estilo) }}>
                            {v.linhas.map((l, i) => (
                                <span key={l}>
                                    {i > 0 && <br />}
                                    {colorir(l, 7 + k * 97 + i * 31)}
                                </span>
                            ))}
                        </p>
                    </div>
                ))}
                <div className="fx-alterna" style={{ left: u(40), top: u(150) }} aria-hidden>
                    <div className="fx-janela-barra">
                        <span>×</span>
                        <span>»</span>
                    </div>
                    <span className="fx-alterna-botao" data-ativo={!minusculas || undefined}>
                        AA
                    </span>
                    <span className="fx-alterna-botao" data-ativo={minusculas || undefined}>
                        Aa
                    </span>
                    <Seta style={{ left: u(30), top: u(minusculas ? 70 : 26), transition: 'top 0.3s ease' }} />
                </div>
            </div>
        </Painel>
    );
}
