'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import Painel from './Painel';
import Seta from './Seta';
import { familiaDe } from './Faixa';
import { RUNE, VARIACOES } from '../_lib/conteudo';
import { useVisivel } from '../_lib/movimento';

// a seção escura (as quatro letras grandes e o texto que troca de caixa) e os recursos da fonte com os botões de
// ligar e desligar: as variações das letras repetidas, o L do meio e o f do começo (calt), os acentos como pedras à
// parte e as frações prontas.
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

const CORES_LETRA = ['#9d5af9', '#ff3d00', '#bdbdbd'];
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

// ——— os recursos ———
type Parte = { t: string; destaque?: boolean };
type Recurso = { tag: string; nome: string; partes: Parte[]; cor: string; estilo?: CSSProperties };
const CARTAS: Recurso[][] = [
    [
        { tag: 'calt', nome: 'Variação do s', partes: [{ t: 's' }, { t: 's', destaque: true }], cor: '#00d372' },
        { tag: 'calt', nome: 'Variação do e', partes: [{ t: 'e' }, { t: 'e', destaque: true }], cor: '#9d5af9' },
    ],
    [
        { tag: 'calt', nome: 'L do meio', partes: [{ t: 'A' }, { t: 'L', destaque: true }], cor: '#ff3502' },
        { tag: 'calt', nome: 'f do começo', partes: [{ t: 'f', destaque: true }, { t: 'é' }], cor: '#00d372' },
    ],
];

function Pares({ partes, ligado, cor, cinza = '#bdbdbd' }: { partes: Parte[]; ligado: boolean; cor: string; cinza?: string }) {
    return (
        <span style={{ fontFeatureSettings: `"calt" ${ligado ? 1 : 0}` }}>
            {partes.map((p, i) => (
                <span key={i} style={{ color: p.destaque ? (ligado ? cor : 'var(--tinta)') : cinza }}>
                    {p.t}
                </span>
            ))}
        </span>
    );
}

function Botoes({ ligado, cor, desligado, ligadoRotulo, estilo }: { ligado: boolean; cor: string; desligado: ReactNode; ligadoRotulo: ReactNode; estilo: CSSProperties }) {
    return (
        <div className="fx-alterna" style={estilo} aria-hidden>
            <div className="fx-janela-barra">
                <span>×</span>
                <span>»</span>
            </div>
            <span className="fx-alterna-botao" data-ativo={!ligado || undefined} style={{ '--cor-botao': 'var(--tinta)' } as CSSProperties}>
                {desligado}
            </span>
            <span className="fx-alterna-botao" data-ativo={ligado || undefined} style={{ '--cor-botao': cor } as CSSProperties}>
                {ligadoRotulo}
            </span>
            <Seta style={{ left: u(30), top: u(ligado ? 70 : 26), transition: 'top 0.3s ease' }} />
        </div>
    );
}

function CartaRecurso({ r, ligado }: { r: Recurso; ligado: boolean }) {
    const fonte = { fontFamily: 'var(--ff-cut)' };
    return (
        <div className="fx-recurso">
            <div className="fx-recurso-cabeca">
                <span>{r.tag}</span>
                <span>{ligado ? 'Ligado' : 'Desligado'}</span>
                <span>{r.nome}</span>
            </div>
            <div className="fx-recurso-letras" data-minusculas={r.partes.every(p => p.t === p.t.toLowerCase()) || undefined} style={fonte}>
                <Pares partes={r.partes} ligado={ligado} cor={r.cor} />
            </div>
            <Botoes
                ligado={ligado}
                cor={r.cor}
                estilo={{ right: u(26), top: u(70) }}
                desligado={<span style={{ ...fonte, fontFeatureSettings: '"calt" 0' }}>{r.partes.map(p => p.t).join('')}</span>}
                ligadoRotulo={<span style={{ ...fonte, fontFeatureSettings: '"calt" 1' }}>{r.partes.map(p => p.t).join('')}</span>}
            />
        </div>
    );
}

function PainelRecursos({ cartas, atraso, estilo }: { cartas: Recurso[]; atraso: number; estilo: CSSProperties }) {
    const ref = useRef<HTMLDivElement>(null);
    const a = useAlterna(ref, 2300, atraso);
    const b = useAlterna(ref, 2300, atraso + 1150);
    return (
        <Painel colunas={2} linhas={1} rotulo={cartas.map(c => c.nome).join(', ')} estilo={estilo}>
            <div ref={ref} className="fx-recursos-dupla">
                <CartaRecurso r={cartas[0]} ligado={a} />
                <CartaRecurso r={cartas[1]} ligado={b} />
            </div>
        </Painel>
    );
}

const ACENTOS = 'Ôh, é só açaí!';
const DESTACADOS = new Set('Ôéóçí!,'.split(''));
function PainelAcentos() {
    const ref = useRef<HTMLDivElement>(null);
    const gasta = useAlterna(ref, 2600, 600);
    return (
        <Painel colunas={4} linhas={1} rotulo="Acentos: pedras à parte">
            <div ref={ref} className="fx-recurso" data-largo>
                <div className="fx-recurso-cabeca" data-largo>
                    <span>Acentos</span>
                    <span>Pedras à parte</span>
                    <span>{gasta ? 'Worn' : 'Cut'}</span>
                </div>
                <div className="fx-recurso-letras" data-largo style={{ fontFamily: gasta ? 'var(--ff-worn)' : 'var(--ff-cut)' }}>
                    <span>
                        {ACENTOS.split('').map((ch, i) => (
                            <span key={i} style={{ color: DESTACADOS.has(ch) ? 'var(--tinta)' : '#bdbdbd' }}>
                                {ch}
                            </span>
                        ))}
                    </span>
                </div>
                <Botoes
                    ligado={gasta}
                    cor="var(--tinta)"
                    estilo={{ right: u(300), top: u(40) }}
                    desligado={<i className="fx-icone-quadrado" />}
                    ligadoRotulo={<i className="fx-icone-circulo" />}
                />
            </div>
        </Painel>
    );
}

function PainelFracoes() {
    const ref = useRef<HTMLDivElement>(null);
    const prontas = useAlterna(ref, 2400, 300);
    const partes: Parte[][] = prontas
        ? [[{ t: '1' }, { t: '½', destaque: true }], [{ t: '2' }, { t: '¼', destaque: true }], [{ t: '3' }, { t: '¾', destaque: true }]]
        : [[{ t: '1 ' }, { t: '1/2', destaque: true }], [{ t: '2 ' }, { t: '1/4', destaque: true }], [{ t: '3 ' }, { t: '3/4', destaque: true }]];
    return (
        <Painel colunas={4} linhas={1} rotulo="Frações prontas">
            <div ref={ref} className="fx-recurso" data-largo>
                <div className="fx-recurso-cabeca" data-largo>
                    <span>Frações</span>
                    <span>Prontas</span>
                    <span>{prontas ? 'Ligado' : 'Desligado'}</span>
                </div>
                <div className="fx-recurso-letras" data-largo data-fracoes style={{ fontFamily: 'var(--ff-cut)' }}>
                    <span>
                        {partes.map((p, i) => (
                            <span key={i} className="fx-fracao">
                                {p.map((q, j) => (
                                    <span key={j} style={{ color: q.destaque ? 'var(--tinta)' : '#bdbdbd' }}>
                                        {q.t}
                                    </span>
                                ))}
                            </span>
                        ))}
                    </span>
                </div>
                <Botoes ligado={prontas} cor="var(--tinta)" estilo={{ right: u(60), bottom: u(40) }} desligado="1/2" ligadoRotulo={<span style={{ fontFamily: 'var(--ff-cut)' }}>½</span>} />
            </div>
        </Painel>
    );
}

export function Recursos() {
    return (
        <>
            <div className="fx-grade">
                <PainelRecursos cartas={CARTAS[0]} atraso={400} estilo={{ gridColumn: '1 / span 2' }} />
                <PainelRecursos cartas={CARTAS[1]} atraso={1000} estilo={{ gridColumn: '3 / span 2' }} />
            </div>
            <PainelAcentos />
            <PainelFracoes />
        </>
    );
}
