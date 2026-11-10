'use client';

import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import Painel from './Painel';
import { corte } from './Desgaste';
import { ESTILOS, type Estilo } from '../_lib/conteudo';

// o "escreva aqui": um editor para quem gostou da fonte brincar com ela de verdade. Na arte, um título e um texto
// corrido, os dois escritos direto na tela; na barra, tudo o que muda o bloco escolhido (o estilo, a caixa, o
// alinhamento, as variações do calt, o tamanho, a entrelinha, o espaço entre as letras, o desgaste, a cor e o efeito)
// e o fundo da arte (a cor e o papel). Os modelos prontos trocam a combinação inteira sem mexer no texto escrito; o
// "Surpreenda-me" sorteia uma combinação que funciona; o "Recomeçar" volta ao começo. O desgaste é a conta da própria
// fonte (o desfoque e o corte no meio-tom do Desgaste.tsx), em unidades da fonte: com 26 a letra fica perto da
// Polished, com 50 perto da Worn.

type Caixa = 'normal' | 'maiusculas' | 'minusculas';
type Alinhamento = 'left' | 'center' | 'right';
type Efeito = 'nenhum' | 'sombra' | 'longa' | 'contorno' | 'relevo' | 'brilho';
type Ajustes = {
    estilo: Estilo;
    tamanho: number; // em u
    entrelinha: number;
    espaco: number; // em em
    caixa: Caixa;
    alinhamento: Alinhamento;
    cor: string;
    efeito: Efeito;
    corEfeito: string;
    desgaste: number; // σ em unidades da fonte
    calt: boolean;
};
type Id = 'titulo' | 'texto';
type Arte = { fundo: string; papel: boolean; blocos: Record<Id, Ajustes> };

const TEXTOS: Record<Id, string> = {
    titulo: 'Toda pedra começa bruta',
    texto: 'Rolando no rio, a pedra perde as quinas e fica lisa. Tanto bate até que fura: com o tempo, ela se gasta e ganha outra cara. Clique aqui, escreva o que quiser e brinque com os estilos, as cores e os efeitos.',
};
const NOMES_BLOCO: Record<Id, string> = { titulo: 'Título', texto: 'Texto' };
const CORES = ['#111111', '#ffffff', '#f1ece1', '#e3b55a', '#c95a40', '#e86f9a', '#8aa4da', '#2d4ca3', '#62b08d'];
const EFEITOS: { id: Efeito; nome: string }[] = [
    { id: 'nenhum', nome: 'Nenhum' },
    { id: 'sombra', nome: 'Sombra' },
    { id: 'longa', nome: 'Longa' },
    { id: 'contorno', nome: 'Contorno' },
    { id: 'relevo', nome: 'Relevo' },
    { id: 'brilho', nome: 'Brilho' },
];
const CAIXAS: { id: Caixa; nome: string }[] = [
    { id: 'normal', nome: 'Aa' },
    { id: 'maiusculas', nome: 'AA' },
    { id: 'minusculas', nome: 'aa' },
];

const BASE: Ajustes = {
    estilo: 'cut',
    tamanho: 160,
    entrelinha: 0.95,
    espaco: 0,
    caixa: 'normal',
    alinhamento: 'left',
    cor: '#111111',
    efeito: 'nenhum',
    corEfeito: '#c95a40',
    desgaste: 0,
    calt: true,
};
const arte = (fundo: string, papel: boolean, titulo: Partial<Ajustes>, texto: Partial<Ajustes>): Arte => ({
    fundo,
    papel,
    blocos: {
        titulo: { ...BASE, ...titulo },
        texto: { ...BASE, tamanho: 36, entrelinha: 1.35, ...texto },
    },
});
// os modelos: combinações prontas, cada uma puxando para um lado da fonte
const MODELOS: { nome: string; arte: Arte }[] = [
    { nome: 'Manchete', arte: arte('#e3b55a', true, { estilo: 'cut', tamanho: 170, caixa: 'maiusculas' }, { estilo: 'polished' }) },
    {
        nome: 'Cartaz',
        arte: arte(
            '#c95a40',
            true,
            { estilo: 'worn', tamanho: 190, entrelinha: 0.9, alinhamento: 'center', cor: '#f1ece1', efeito: 'longa', corEfeito: '#111111' },
            { estilo: 'worn', alinhamento: 'center', cor: '#f1ece1', tamanho: 40 },
        ),
    },
    {
        nome: 'Neon',
        arte: arte(
            '#111111',
            false,
            { estilo: 'polished', tamanho: 160, alinhamento: 'center', cor: '#fff6dc', efeito: 'brilho', corEfeito: '#e86f9a' },
            { estilo: 'polished', alinhamento: 'center', cor: '#8aa4da' },
        ),
    },
    {
        nome: 'Recorte',
        arte: arte(
            '#f1ece1',
            true,
            { estilo: 'cut', tamanho: 175, caixa: 'maiusculas', cor: '#2d4ca3', efeito: 'contorno', corEfeito: '#e3b55a' },
            { estilo: 'cut', cor: '#2d4ca3' },
        ),
    },
    {
        nome: 'Gibi',
        arte: arte(
            '#8aa4da',
            false,
            { estilo: 'polished', tamanho: 175, entrelinha: 0.9, alinhamento: 'center', cor: '#e3b55a', efeito: 'relevo', corEfeito: '#111111', espaco: 0.02 },
            { estilo: 'polished', alinhamento: 'center' },
        ),
    },
    {
        nome: 'Gasta',
        arte: arte(
            '#62b08d',
            true,
            { estilo: 'worn', tamanho: 200, entrelinha: 0.88, desgaste: 40, efeito: 'sombra', corEfeito: '#f1ece1' },
            { estilo: 'worn', desgaste: 12 },
        ),
    },
];
const INICIAL = MODELOS[0].arte;

// as combinações de cor que funcionam juntas, para o sorteio: [fundo, texto, efeito]
const PARES: [string, string, string][] = [
    ['#e3b55a', '#111111', '#c95a40'],
    ['#c95a40', '#f1ece1', '#111111'],
    ['#111111', '#fff6dc', '#e86f9a'],
    ['#f1ece1', '#2d4ca3', '#e3b55a'],
    ['#8aa4da', '#e3b55a', '#111111'],
    ['#62b08d', '#111111', '#f1ece1'],
    ['#2d4ca3', '#f1ece1', '#e86f9a'],
    ['#e86f9a', '#111111', '#ffffff'],
    ['#ffffff', '#c95a40', '#111111'],
];
const sortear = <T,>(lista: readonly T[]) => lista[Math.floor(Math.random() * lista.length)];
function surpresa(): Arte {
    const [fundo, cor, corEfeito] = sortear(PARES);
    const efeito = sortear(EFEITOS).id;
    const alinhamento = sortear<Alinhamento>(['left', 'center', 'center', 'right']);
    return arte(
        fundo,
        Math.random() < 0.6,
        {
            estilo: sortear(ESTILOS).id,
            tamanho: 140 + Math.round(Math.random() * 70),
            entrelinha: 0.85 + Math.round(Math.random() * 3) * 0.05,
            espaco: sortear([-0.02, 0, 0, 0.03, 0.08]),
            caixa: sortear<Caixa>(['normal', 'normal', 'maiusculas', 'minusculas']),
            alinhamento,
            cor,
            efeito,
            corEfeito,
            desgaste: sortear([0, 0, 0, 18, 34]),
        },
        { estilo: sortear(ESTILOS).id, alinhamento, cor },
    );
}

// o efeito: as sombras (em em, crescem com a letra) e, no contorno, o traço do WebKit com o recheio vazado. As sombras
// saem numa lista: sem desgaste, viram o text-shadow; com desgaste, vão depois do filtro, como drop-shadow, para a
// letra se gastar sozinha e a sombra sair nítida (com o text-shadow, o desfoque misturava a cor da letra com a da sombra).
// Encadeados, os drop-shadow somam: cada um repete tudo o que já veio, então ali todos têm o mesmo passo (e menos passos)
function efeitoDe(a: Ajustes, gasto: boolean): { sombras: string[]; extra: CSSProperties } {
    // sem desgaste, cada sombra no seu lugar (1, 2, 3… passos); com desgaste, todas com o mesmo passo, que se somam
    const passos = (n: number, d: number) =>
        Array.from({ length: n }, (_, i) => {
            const k = gasto ? d : (i + 1) * d;
            return `${k.toFixed(4)}em ${k.toFixed(4)}em 0 ${a.corEfeito}`;
        });
    switch (a.efeito) {
        case 'sombra':
            return { sombras: [`0.05em 0.06em 0 ${a.corEfeito}`], extra: {} };
        case 'longa':
            return { sombras: gasto ? passos(10, 0.0156) : passos(26, 0.006), extra: {} };
        case 'contorno':
            return { sombras: [`0.07em 0.07em 0 ${a.corEfeito}`], extra: { color: 'transparent', WebkitTextStroke: `0.03em ${a.cor}` } };
        case 'relevo':
            return { sombras: [...(gasto ? passos(5, 0.0126) : passos(9, 0.007)), `0.1em 0.14em 0.12em rgb(0 0 0 / 0.3)`], extra: {} };
        case 'brilho':
            return { sombras: [`0 0 0.06em ${a.corEfeito}`, `0 0 0.2em ${a.corEfeito}`, `0 0 0.5em ${a.corEfeito}`], extra: {} };
        default:
            return { sombras: [], extra: {} };
    }
}

// um bloco da arte: o texto escrito direto nele (só texto, sem formatação colada) e o filtro do desgaste, com o σ
// passado para px pelo corpo de verdade do bloco
function Bloco({
    id,
    filtro,
    ajustes,
    ativo,
    versao,
    uPx,
    onEscolher,
}: {
    id: Id;
    filtro: string;
    ajustes: Ajustes;
    ativo: boolean;
    versao: number;
    uPx: number;
    onEscolher: () => void;
}) {
    const a = ajustes;
    const familia = ESTILOS.find(e => e.id === a.estilo)!.familia;
    const pxPorUnidade = (a.tamanho * uPx) / 1000;
    const gasto = a.desgaste > 0 && uPx > 0;
    const { sombras, extra } = efeitoDe(a, gasto);
    return (
        <div className="fx-editor-bloco" data-bloco={id} data-ativo={ativo}>
            {gasto && (
                <svg className="fx-defs" width="0" height="0" aria-hidden>
                    <filter id={filtro} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
                        <feGaussianBlur stdDeviation={(a.desgaste * pxPorUnidade).toFixed(2)} />
                        <feColorMatrix type="matrix" values={corte(a.desgaste, pxPorUnidade)} />
                    </filter>
                </svg>
            )}
            <span className="fx-editor-etiqueta" aria-hidden>
                {NOMES_BLOCO[id]}
            </span>
            <div
                key={versao}
                className="fx-editor-texto"
                contentEditable="plaintext-only"
                suppressContentEditableWarning
                spellCheck={false}
                role="textbox"
                aria-multiline
                aria-label={`${NOMES_BLOCO[id]} da arte`}
                onFocus={onEscolher}
                onPointerDown={onEscolher}
                style={{
                    fontFamily: familia,
                    fontSize: `calc(${a.tamanho} * var(--u))`,
                    lineHeight: a.entrelinha,
                    letterSpacing: `${a.espaco}em`,
                    textTransform: a.caixa === 'maiusculas' ? 'uppercase' : a.caixa === 'minusculas' ? 'lowercase' : 'none',
                    textAlign: a.alinhamento,
                    color: a.cor,
                    fontFeatureSettings: `'calt' ${a.calt ? 1 : 0}`,
                    filter: gasto ? [`url(#${filtro})`, ...sombras.map(s => `drop-shadow(${s})`)].join(' ') : undefined,
                    textShadow: !gasto && sombras.length ? sombras.join(', ') : undefined,
                    caretColor: a.cor,
                    ...extra,
                }}
            >
                {TEXTOS[id]}
            </div>
        </div>
    );
}

// as peças da barra
function Grupo({ nome, children, classe }: { nome: string; children: ReactNode; classe?: string }) {
    return (
        <div className={classe ? `fx-editor-grupo ${classe}` : 'fx-editor-grupo'} role="group" aria-label={nome}>
            <span className="fx-editor-grupo-nome">{nome}</span>
            {children}
        </div>
    );
}
function Botao({ ativo, onClick, children, estilo, rotulo }: { ativo?: boolean; onClick: () => void; children: ReactNode; estilo?: CSSProperties; rotulo?: string }) {
    return (
        <button type="button" className="fx-editor-botao" data-ativo={ativo || undefined} aria-pressed={ativo} aria-label={rotulo} style={estilo} onClick={onClick}>
            {children}
        </button>
    );
}
function Regua({ nome, valor, min, max, passo, mostrar, onChange }: { nome: string; valor: number; min: number; max: number; passo: number; mostrar: string; onChange: (v: number) => void }) {
    return (
        <label className="fx-editor-regua">
            <span className="fx-editor-grupo-nome">{nome}</span>
            <input type="range" min={min} max={max} step={passo} value={valor} onChange={e => onChange(Number(e.target.value))} />
            <span className="fx-editor-valor">{mostrar}</span>
        </label>
    );
}
function Cores({ nome, valor, onChange }: { nome: string; valor: string; onChange: (c: string) => void }) {
    return (
        <Grupo nome={nome}>
            {CORES.map(c => (
                <button
                    key={c}
                    type="button"
                    className="fx-editor-cor"
                    data-ativo={c === valor.toLowerCase() || undefined}
                    aria-pressed={c === valor.toLowerCase()}
                    aria-label={`${nome}: ${c}`}
                    style={{ background: c }}
                    onClick={() => onChange(c)}
                />
            ))}
            <label className="fx-editor-cor fx-editor-cor-livre" title="Outra cor" style={{ background: CORES.includes(valor.toLowerCase()) ? undefined : valor }}>
                <input type="color" value={valor} onChange={e => onChange(e.target.value)} aria-label={`${nome}: outra cor`} />
            </label>
        </Grupo>
    );
}
// o ícone do alinhamento: três barras de larguras diferentes, encostadas no lado escolhido (ou no meio)
const BARRAS = [12, 16, 9];
function Icone({ alinhar }: { alinhar: Alinhamento }) {
    const x = (w: number) => (alinhar === 'left' ? 0 : alinhar === 'center' ? (16 - w) / 2 : 16 - w);
    return (
        <svg viewBox="0 0 16 12" width="1.2em" height="0.9em" aria-hidden>
            {BARRAS.map((w, k) => (
                <rect key={k} x={x(w)} y={k * 5} width={w} height="2" rx="1" fill="currentColor" />
            ))}
        </svg>
    );
}

export default function Editor() {
    const id = useId().replace(/:/g, '');
    const [estado, setEstado] = useState<Arte>(INICIAL);
    const [ativo, setAtivo] = useState<Id>('titulo');
    const [versao, setVersao] = useState(0);
    const [uPx, setUPx] = useState(0);
    const sonda = useRef<HTMLElement>(null);
    // o tamanho de 1 u em px (para passar o σ do desgaste para px)
    useLayoutEffect(() => {
        const el = sonda.current;
        if (!el) return;
        const medir = () => setUPx(el.getBoundingClientRect().width / 1000);
        medir();
        const obs = new ResizeObserver(medir);
        obs.observe(el);
        return () => obs.disconnect();
    }, []);
    const a = estado.blocos[ativo];
    const mudar = (parte: Partial<Ajustes>) => setEstado(s => ({ ...s, blocos: { ...s.blocos, [ativo]: { ...s.blocos[ativo], ...parte } } }));
    const fmt = (n: number, casas = 2) => n.toFixed(casas).replace('.', ',');
    return (
        <div className="fx-editor">
            <i ref={sonda} className="fx-editor-sonda" aria-hidden />
            {/* a barra: o bloco que está sendo mexido e os ajustes dele; o fundo; os modelos e o sorteio */}
            <div className="fx-editor-barra">
                <div className="fx-editor-linha">
                    <Grupo nome="Editando">
                        {(['titulo', 'texto'] as Id[]).map(b => (
                            <Botao key={b} ativo={b === ativo} onClick={() => setAtivo(b)}>
                                {NOMES_BLOCO[b]}
                            </Botao>
                        ))}
                    </Grupo>
                    <Grupo nome="Estilo">
                        {ESTILOS.map(e => (
                            <Botao key={e.id} ativo={e.id === a.estilo} estilo={{ fontFamily: e.familia }} onClick={() => mudar({ estilo: e.id })}>
                                {e.nome}
                            </Botao>
                        ))}
                    </Grupo>
                    <Grupo nome="Caixa">
                        {CAIXAS.map(c => (
                            <Botao key={c.id} ativo={c.id === a.caixa} onClick={() => mudar({ caixa: c.id })}>
                                {c.nome}
                            </Botao>
                        ))}
                    </Grupo>
                    <Grupo nome="Alinhar">
                        {(['left', 'center', 'right'] as Alinhamento[]).map(al => (
                            <Botao key={al} ativo={al === a.alinhamento} rotulo={{ left: 'À esquerda', center: 'No centro', right: 'À direita' }[al]} onClick={() => mudar({ alinhamento: al })}>
                                <Icone alinhar={al} />
                            </Botao>
                        ))}
                    </Grupo>
                    <Grupo nome="Variações">
                        <Botao ativo={a.calt} onClick={() => mudar({ calt: !a.calt })}>
                            {a.calt ? 'Ligadas' : 'Desligadas'}
                        </Botao>
                    </Grupo>
                </div>
                <div className="fx-editor-linha">
                    <Regua nome="Tamanho" valor={a.tamanho} min={14} max={320} passo={1} mostrar={`${a.tamanho}`} onChange={v => mudar({ tamanho: v })} />
                    <Regua nome="Entrelinha" valor={a.entrelinha} min={0.7} max={2} passo={0.05} mostrar={fmt(a.entrelinha)} onChange={v => mudar({ entrelinha: v })} />
                    <Regua nome="Espaço" valor={a.espaco} min={-0.08} max={0.4} passo={0.01} mostrar={fmt(a.espaco)} onChange={v => mudar({ espaco: v })} />
                    <Regua nome="Gastar" valor={a.desgaste} min={0} max={60} passo={1} mostrar={`${a.desgaste}`} onChange={v => mudar({ desgaste: v })} />
                </div>
                <div className="fx-editor-linha">
                    <Cores nome="Cor" valor={a.cor} onChange={c => mudar({ cor: c })} />
                    <Grupo nome="Efeito">
                        {EFEITOS.map(e => (
                            <Botao key={e.id} ativo={e.id === a.efeito} onClick={() => mudar({ efeito: e.id })}>
                                {e.nome}
                            </Botao>
                        ))}
                    </Grupo>
                </div>
                <div className="fx-editor-linha">
                    <Cores nome="Cor do efeito" valor={a.corEfeito} onChange={c => mudar({ corEfeito: c })} />
                    <Cores nome="Fundo" valor={estado.fundo} onChange={c => setEstado(s => ({ ...s, fundo: c }))} />
                    <Grupo nome="Papel">
                        <Botao ativo={estado.papel} onClick={() => setEstado(s => ({ ...s, papel: !s.papel }))}>
                            {estado.papel ? 'Com grão' : 'Liso'}
                        </Botao>
                    </Grupo>
                </div>
                <div className="fx-editor-linha">
                    <Grupo nome="Modelos">
                        {MODELOS.map(m => (
                            <Botao key={m.nome} onClick={() => setEstado(m.arte)}>
                                {m.nome}
                            </Botao>
                        ))}
                    </Grupo>
                    <div className="fx-editor-acoes">
                        <button type="button" className="fx-editor-botao fx-editor-sorteio" onClick={() => setEstado(surpresa())}>
                            Surpreenda-me
                        </button>
                        <button
                            type="button"
                            className="fx-editor-botao"
                            onClick={() => {
                                setEstado(INICIAL);
                                setAtivo('titulo');
                                setVersao(v => v + 1);
                            }}
                        >
                            Recomeçar
                        </button>
                    </div>
                </div>
            </div>
            {/* a arte (no celular, ela vem antes da barra e fica presa no alto enquanto a barra passa por baixo) */}
            <Painel colunas={4} linhas={2} rotulo="A arte do editor, com o título e o texto" celular={{ colunas: 2, linhas: 2 }}>
                <div className="fx-editor-arte" data-papel={estado.papel || undefined} style={{ background: estado.fundo }}>
                    {(['titulo', 'texto'] as Id[]).map(b => (
                        <Bloco
                            key={b}
                            id={b}
                            filtro={`${id}-${b}`}
                            ajustes={estado.blocos[b]}
                            ativo={b === ativo}
                            versao={versao}
                            uPx={uPx}
                            onEscolher={() => setAtivo(b)}
                        />
                    ))}
                </div>
            </Painel>
        </div>
    );
}
