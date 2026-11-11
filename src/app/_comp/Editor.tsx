'use client';

import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import Painel from './Painel';
import { corte } from './Desgaste';
import { ESTILOS, type Estilo } from '../_lib/conteudo';

// o playground: um editor para quem gostou da fonte testar o uso dela do seu jeito. Na arte (3 × 2 módulos), começa
// uma linha só, "Escreva aqui", escrita direto na tela; o "+" do inspetor acrescenta mais textos (até cinco), cada um
// com os seus ajustes. Ao lado, o inspetor (1 × 2), como o de um programa de desenho: o texto que está sendo mexido e,
// para ele, o estilo, o tamanho, a entrelinha, o espaço entre as letras, o desgaste, a caixa, o alinhamento, as
// variações do calt, o efeito e as cores; depois o fundo da arte (a cor e o grão do papel) e os modelos prontos, o
// sorteio e o recomeçar. Os controles seguem o resto do site: segmentos retos com a borda fina, réguas finas com o
// valor na DM Mono e amostras quadradas só com as cores da paleta. O desgaste é a conta da própria fonte (o desfoque e
// o corte no meio-tom do Desgaste.tsx), em unidades da fonte: com 26 a letra fica perto da Polished, com 50 perto da
// Worn. No celular, a arte vem antes e fica presa no alto enquanto o inspetor passa por baixo.

type Caixa = 'normal' | 'maiusculas' | 'minusculas';
type Alinhamento = 'left' | 'center' | 'right';
type Efeito = 'nenhum' | 'sombra' | 'longa' | 'contorno' | 'relevo';
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
// um texto da arte: a chave (para o React e para escolher), o texto com que ele nasce e os ajustes
type Texto = { chave: number; inicial: string; ajustes: Ajustes };

const MAXIMO = 5;
const FUNDO = '#ffffff';
// só as cores da paleta do site
const CORES = ['#111111', '#ffffff', '#f1ece1', '#e3b55a', '#c95a40', '#8aa4da', '#2d4ca3', '#62b08d'];
const EFEITOS: { id: Efeito; nome: string }[] = [
    { id: 'nenhum', nome: 'Nenhum' },
    { id: 'sombra', nome: 'Sombra' },
    { id: 'longa', nome: 'Longa' },
    { id: 'contorno', nome: 'Contorno' },
    { id: 'relevo', nome: 'Relevo' },
];

// o primeiro texto (a linha grande) e os que entram depois (menores, de texto corrido)
const PRIMEIRO: Ajustes = {
    estilo: 'cut',
    tamanho: 150,
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
const DEMAIS: Ajustes = { ...PRIMEIRO, estilo: 'polished', tamanho: 40, entrelinha: 1.3 };
const base = (i: number) => (i === 0 ? PRIMEIRO : DEMAIS);
const TEXTO_INICIAL = 'Escreva aqui';
const TEXTO_NOVO = 'Mais um texto: clique e escreva o que quiser.';
const comecar = (): Texto[] => [{ chave: 1, inicial: TEXTO_INICIAL, ajustes: PRIMEIRO }];

// os modelos: o fundo, o grão e os ajustes do primeiro texto e dos demais, cada um puxando a fonte para um uso
type Modelo = { nome: string; fundo: string; papel: boolean; primeiro: Partial<Ajustes>; demais: Partial<Ajustes> };
const MODELOS: Modelo[] = [
    { nome: 'Editorial', fundo: '#f1ece1', papel: true, primeiro: {}, demais: {} },
    {
        nome: 'Cartaz',
        fundo: '#c95a40',
        papel: true,
        primeiro: { estilo: 'worn', tamanho: 180, entrelinha: 0.9, caixa: 'maiusculas', cor: '#f1ece1', efeito: 'longa', corEfeito: '#111111' },
        demais: { estilo: 'worn', cor: '#f1ece1' },
    },
    { nome: 'Negativo', fundo: '#111111', papel: false, primeiro: { estilo: 'polished', tamanho: 165, cor: '#f1ece1' }, demais: { cor: '#8aa4da' } },
    {
        nome: 'Capa',
        fundo: '#2d4ca3',
        papel: true,
        primeiro: { estilo: 'cut', tamanho: 160, caixa: 'maiusculas', espaco: 0.02, cor: '#f1ece1', efeito: 'contorno', corEfeito: '#e3b55a' },
        demais: { estilo: 'cut', cor: '#f1ece1' },
    },
    {
        nome: 'Gasta',
        fundo: '#62b08d',
        papel: true,
        primeiro: { estilo: 'worn', tamanho: 190, entrelinha: 0.88, desgaste: 40, efeito: 'sombra', corEfeito: '#f1ece1' },
        demais: { estilo: 'worn', desgaste: 12 },
    },
];

// as combinações de cor que funcionam juntas, para o sorteio: [fundo, texto, efeito]
const PARES: [string, string, string][] = [
    ['#ffffff', '#111111', '#c95a40'],
    ['#f1ece1', '#111111', '#c95a40'],
    ['#e3b55a', '#111111', '#f1ece1'],
    ['#c95a40', '#f1ece1', '#111111'],
    ['#111111', '#f1ece1', '#c95a40'],
    ['#2d4ca3', '#f1ece1', '#e3b55a'],
    ['#8aa4da', '#111111', '#f1ece1'],
    ['#62b08d', '#111111', '#f1ece1'],
];
const sortear = <T,>(lista: readonly T[]) => lista[Math.floor(Math.random() * lista.length)];
function sorteio(): Modelo {
    const [fundo, cor, corEfeito] = sortear(PARES);
    const alinhamento = sortear<Alinhamento>(['left', 'left', 'center', 'right']);
    return {
        nome: '',
        fundo,
        papel: Math.random() < 0.6,
        primeiro: {
            estilo: sortear(ESTILOS).id,
            tamanho: 140 + Math.round(Math.random() * 60),
            entrelinha: 0.85 + Math.round(Math.random() * 3) * 0.05,
            espaco: sortear([-0.02, 0, 0, 0.03, 0.06]),
            caixa: sortear<Caixa>(['normal', 'normal', 'maiusculas', 'minusculas']),
            alinhamento,
            cor,
            efeito: sortear(EFEITOS).id,
            corEfeito,
            desgaste: sortear([0, 0, 0, 18, 34]),
        },
        demais: { estilo: sortear(ESTILOS).id, alinhamento, cor },
    };
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
        default:
            return { sombras: [], extra: {} };
    }
}

// um texto da arte: escrito direto nele (só texto, sem formatação colada) e o filtro do desgaste, com o σ passado para
// px pelo corpo de verdade do texto. O escolhido ganha a moldura de seleção, com as alças nos cantos
function Bloco({ nome, filtro, texto, ativo, uPx, onEscolher }: { nome: string; filtro: string; texto: Texto; ativo: boolean; uPx: number; onEscolher: () => void }) {
    const a = texto.ajustes;
    const familia = ESTILOS.find(e => e.id === a.estilo)!.familia;
    const pxPorUnidade = (a.tamanho * uPx) / 1000;
    const gasto = a.desgaste > 0 && uPx > 0;
    const { sombras, extra } = efeitoDe(a, gasto);
    return (
        <div className="fx-editor-bloco" data-ativo={ativo}>
            {gasto && (
                <svg className="fx-defs" width="0" height="0" aria-hidden>
                    <filter id={filtro} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
                        <feGaussianBlur stdDeviation={(a.desgaste * pxPorUnidade).toFixed(2)} />
                        <feColorMatrix type="matrix" values={corte(a.desgaste, pxPorUnidade)} />
                    </filter>
                </svg>
            )}
            <span className="fx-editor-selecao" aria-hidden>
                <i />
                <i />
                <i />
                <i />
                <b>{nome}</b>
            </span>
            <div
                className="fx-editor-texto"
                contentEditable="plaintext-only"
                suppressContentEditableWarning
                spellCheck={false}
                role="textbox"
                aria-multiline
                aria-label={`${nome} da arte`}
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
                    caretColor: a.cor,
                    fontFeatureSettings: `'calt' ${a.calt ? 1 : 0}`,
                    filter: gasto ? [`url(#${filtro})`, ...sombras.map(s => `drop-shadow(${s})`)].join(' ') : undefined,
                    textShadow: !gasto && sombras.length ? sombras.join(', ') : undefined,
                    ...extra,
                }}
            >
                {texto.inicial}
            </div>
        </div>
    );
}

// ——— as peças do inspetor ———
// uma linha: o nome à esquerda e o controle à direita (ou embaixo, quando ele precisa da largura toda)
function Linha({ nome, children, embaixo = false }: { nome: string; children: ReactNode; embaixo?: boolean }) {
    return (
        <div className="fx-inspetor-linha" data-embaixo={embaixo || undefined}>
            <span className="fx-inspetor-nome">{nome}</span>
            <div className="fx-inspetor-controle">{children}</div>
        </div>
    );
}
// os segmentos: as opções lado a lado numa caixa de borda fina, a escolhida cheia
function Segmentos<T extends string | number>({ nome, opcoes, valor, onChange }: { nome: string; opcoes: { id: T; rotulo: ReactNode; titulo?: string }[]; valor: T; onChange: (v: T) => void }) {
    return (
        <div className="fx-segmentos" role="radiogroup" aria-label={nome}>
            {opcoes.map(o => (
                <button key={o.id} type="button" role="radio" aria-checked={o.id === valor} aria-label={o.titulo} className="fx-segmento" data-ativo={o.id === valor || undefined} onClick={() => onChange(o.id)}>
                    {o.rotulo}
                </button>
            ))}
        </div>
    );
}
function Regua({ nome, valor, min, max, passo, mostrar, onChange }: { nome: string; valor: number; min: number; max: number; passo: number; mostrar: string; onChange: (v: number) => void }) {
    return (
        <label className="fx-inspetor-linha fx-inspetor-regua">
            <span className="fx-inspetor-nome">{nome}</span>
            <input type="range" min={min} max={max} step={passo} value={valor} onChange={e => onChange(Number(e.target.value))} style={{ '--cheio': `${(100 * (valor - min)) / (max - min)}%` } as CSSProperties} />
            <span className="fx-inspetor-valor">{mostrar}</span>
        </label>
    );
}
function Chave({ nome, ligada, onChange }: { nome: string; ligada: boolean; onChange: () => void }) {
    return (
        <Linha nome={nome}>
            <button type="button" role="switch" aria-checked={ligada} aria-label={nome} className="fx-chave" data-ligada={ligada || undefined} onClick={onChange}>
                <i />
            </button>
            <span className="fx-inspetor-valor">{ligada ? 'ligado' : 'desligado'}</span>
        </Linha>
    );
}
function Amostras({ nome, valor, onChange }: { nome: string; valor: string; onChange: (c: string) => void }) {
    const v = valor.toLowerCase();
    const livre = !CORES.includes(v);
    return (
        <Linha nome={nome}>
            <div className="fx-amostras" role="radiogroup" aria-label={nome}>
                {CORES.map(c => (
                    <button key={c} type="button" role="radio" aria-checked={c === v} aria-label={`${nome}: ${c}`} className="fx-amostra" data-ativo={c === v || undefined} style={{ background: c }} onClick={() => onChange(c)} />
                ))}
                {/* outra cor: o seletor do navegador por cima, invisível; com uma cor de fora, a amostra fica nela */}
                <label className="fx-amostra fx-amostra-livre" data-ativo={livre || undefined} style={livre ? { background: valor } : undefined} title="Outra cor">
                    <input type="color" value={valor} onChange={e => onChange(e.target.value)} aria-label={`${nome}: outra cor`} />
                </label>
            </div>
        </Linha>
    );
}
// o ícone do alinhamento: três barras de larguras diferentes, encostadas no lado escolhido (ou no meio)
const BARRAS = [12, 16, 9];
function Icone({ alinhar }: { alinhar: Alinhamento }) {
    const x = (w: number) => (alinhar === 'left' ? 0 : alinhar === 'center' ? (16 - w) / 2 : 16 - w);
    return (
        <svg viewBox="0 0 16 12" width="1.15em" height="0.85em" aria-hidden>
            {BARRAS.map((w, k) => (
                <rect key={k} x={x(w)} y={k * 5} width={w} height="2" rx="1" fill="currentColor" />
            ))}
        </svg>
    );
}

export default function Editor() {
    const id = useId().replace(/:/g, '');
    const [textos, setTextos] = useState<Texto[]>(comecar);
    const [ativo, setAtivo] = useState(1);
    const [fundo, setFundo] = useState(FUNDO);
    const [papel, setPapel] = useState(false);
    // a geração da arte: o recomeçar troca a chave, e os textos voltam ao que eram
    const [versao, setVersao] = useState(0);
    const proxima = useRef(2);
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
    const indice = Math.max(0, textos.findIndex(t => t.chave === ativo));
    const a = textos[indice].ajustes;
    const nomeDe = (i: number) => `Texto ${i + 1}`;
    const mudar = (parte: Partial<Ajustes>) => setTextos(ts => ts.map((t, i) => (i === indice ? { ...t, ajustes: { ...t.ajustes, ...parte } } : t)));
    const aplicar = (m: Modelo) => {
        setFundo(m.fundo);
        setPapel(m.papel);
        setTextos(ts => ts.map((t, i) => ({ ...t, ajustes: { ...base(i), ...(i === 0 ? m.primeiro : m.demais) } })));
    };
    const acrescentar = () => {
        if (textos.length >= MAXIMO) return;
        const chave = proxima.current++;
        setTextos(ts => [...ts, { chave, inicial: TEXTO_NOVO, ajustes: { ...DEMAIS, cor: ts[0].ajustes.cor } }]);
        setAtivo(chave);
    };
    const remover = () => {
        if (textos.length < 2) return;
        const resto = textos.filter(t => t.chave !== ativo);
        setTextos(resto);
        setAtivo(resto[Math.max(0, indice - 1)].chave);
    };
    const fmt = (n: number, casas = 2) => n.toFixed(casas).replace('.', ',');
    return (
        <div className="fx-editor">
            <i ref={sonda} className="fx-editor-sonda" aria-hidden />
            {/* a arte (no celular, ela vem antes do inspetor e fica presa no alto enquanto ele passa por baixo) */}
            <Painel colunas={3} linhas={2} rotulo="A arte do playground" celular={{ colunas: 2, linhas: 2 }}>
                <div key={versao} className="fx-editor-arte" data-papel={papel || undefined} style={{ background: fundo }}>
                    {textos.map((t, i) => (
                        <Bloco key={t.chave} nome={nomeDe(i)} filtro={`${id}-${t.chave}`} texto={t} ativo={t.chave === ativo} uPx={uPx} onEscolher={() => setAtivo(t.chave)} />
                    ))}
                </div>
            </Painel>
            {/* o inspetor */}
            <Painel colunas={1} linhas={2} rotulo="Os ajustes do playground" celular={{ colunas: 2, linhas: 4 }}>
                <div className="fx-inspetor-editor">
                    {/* os textos da arte, o "+" que acrescenta mais um e o remover (só com mais de um) */}
                    <div className="fx-inspetor-textos">
                        <Segmentos nome="Texto" valor={ativo} onChange={setAtivo} opcoes={textos.map((t, i) => ({ id: t.chave, rotulo: textos.length > 3 ? `${i + 1}` : nomeDe(i), titulo: nomeDe(i) }))} />
                        <button type="button" className="fx-inspetor-mais" onClick={acrescentar} disabled={textos.length >= MAXIMO} aria-label="Acrescentar um texto" title="Acrescentar um texto">
                            +
                        </button>
                    </div>
                    {textos.length > 1 && (
                        <button type="button" className="fx-inspetor-link fx-inspetor-remover" onClick={remover}>
                            Remover o {nomeDe(indice).toLowerCase()}
                        </button>
                    )}
                    <div className="fx-inspetor-grupo">
                        <Linha nome="Estilo">
                            <Segmentos nome="Estilo" valor={a.estilo} onChange={e => mudar({ estilo: e })} opcoes={ESTILOS.map(e => ({ id: e.id, rotulo: e.nome }))} />
                        </Linha>
                        <Regua nome="Tamanho" valor={a.tamanho} min={14} max={320} passo={1} mostrar={`${a.tamanho}`} onChange={v => mudar({ tamanho: v })} />
                        <Regua nome="Entrelinha" valor={a.entrelinha} min={0.7} max={2} passo={0.05} mostrar={fmt(a.entrelinha)} onChange={v => mudar({ entrelinha: v })} />
                        <Regua nome="Espaço" valor={a.espaco} min={-0.08} max={0.4} passo={0.01} mostrar={fmt(a.espaco)} onChange={v => mudar({ espaco: v })} />
                        <Regua nome="Desgaste" valor={a.desgaste} min={0} max={60} passo={1} mostrar={`${a.desgaste}`} onChange={v => mudar({ desgaste: v })} />
                        <Linha nome="Caixa">
                            <Segmentos
                                nome="Caixa"
                                valor={a.caixa}
                                onChange={c => mudar({ caixa: c })}
                                opcoes={[
                                    { id: 'normal', rotulo: 'Aa', titulo: 'Como foi escrito' },
                                    { id: 'maiusculas', rotulo: 'AA', titulo: 'Maiúsculas' },
                                    { id: 'minusculas', rotulo: 'aa', titulo: 'Minúsculas' },
                                ]}
                            />
                        </Linha>
                        <Linha nome="Alinhar">
                            <Segmentos
                                nome="Alinhar"
                                valor={a.alinhamento}
                                onChange={al => mudar({ alinhamento: al })}
                                opcoes={(['left', 'center', 'right'] as Alinhamento[]).map(al => ({ id: al, rotulo: <Icone alinhar={al} />, titulo: { left: 'À esquerda', center: 'No centro', right: 'À direita' }[al] }))}
                            />
                        </Linha>
                        <Chave nome="Variações" ligada={a.calt} onChange={() => mudar({ calt: !a.calt })} />
                    </div>
                    <div className="fx-inspetor-grupo">
                        <Linha nome="Efeito" embaixo>
                            <Segmentos nome="Efeito" valor={a.efeito} onChange={e => mudar({ efeito: e })} opcoes={EFEITOS.map(e => ({ id: e.id, rotulo: e.nome }))} />
                        </Linha>
                        <Amostras nome="Cor" valor={a.cor} onChange={c => mudar({ cor: c })} />
                        <Amostras nome="Do efeito" valor={a.corEfeito} onChange={c => mudar({ corEfeito: c })} />
                    </div>
                    <div className="fx-inspetor-grupo">
                        <Amostras nome="Fundo" valor={fundo} onChange={setFundo} />
                        <Chave nome="Grão" ligada={papel} onChange={() => setPapel(p => !p)} />
                    </div>
                    <div className="fx-inspetor-grupo">
                        <Linha nome="Modelos" embaixo>
                            <div className="fx-inspetor-modelos">
                                {MODELOS.map(m => (
                                    <button key={m.nome} type="button" className="fx-inspetor-link" onClick={() => aplicar(m)}>
                                        {m.nome}
                                    </button>
                                ))}
                            </div>
                        </Linha>
                        <div className="fx-inspetor-acoes">
                            <button type="button" className="fx-inspetor-acao" onClick={() => aplicar(sorteio())}>
                                Sortear
                            </button>
                            <button
                                type="button"
                                className="fx-inspetor-acao"
                                onClick={() => {
                                    setTextos(comecar());
                                    setAtivo(1);
                                    setFundo(FUNDO);
                                    setPapel(false);
                                    proxima.current = 2;
                                    setVersao(v => v + 1);
                                }}
                            >
                                Recomeçar
                            </button>
                        </div>
                    </div>
                </div>
            </Painel>
        </div>
    );
}
