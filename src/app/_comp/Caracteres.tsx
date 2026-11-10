'use client';

import { useState, type CSSProperties } from 'react';
import Painel from './Painel';
import { Simbolos } from './Composicoes';
import { LinhaCheia } from './Pratica';
import { ESTILOS, type Estilo } from '../_lib/conteudo';

// a seção dos caracteres, depois das faixas: o que a Föeger Rune tem além do alfabeto, nos três estilos (o escolhido
// vale para a seção inteira). Os números grandes de ponta a ponta; o mostruário, com os grupos (números, acentos,
// pontuação e símbolos) e, passando o mouse num caractere, ele grande com as linhas da fonte (a altura das maiúsculas,
// a das minúsculas, a linha de base e a descendente), o nome e o código; e os quatro símbolos se gastando, que saíram
// da faixa Cut. Sem o calt: cada caractere no desenho de base.

// os caracteres de cada grupo, tirados da própria fonte (os 16 números, as 45 pontuações, os 43 símbolos e as 73 letras
// com acento ou de outras línguas)
const GRUPOS: { id: string; nome: string; chars: string[] }[] = [
    { id: 'numeros', nome: 'Números', chars: [...'0123456789¹²³¼½¾'] },
    { id: 'acentos', nome: 'Acentos', chars: [...'ÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝŸŠŽàáâãäåçèéêëìíîïñòóôõöùúûüýÿšžÆæŒœØøÐðÞßıªºµƒ'] },
    { id: 'pontuacao', nome: 'Pontuação', chars: [...`!?¡¿.,:;…'"‘’‚“”„‹›«»-–—()[]{}/\\_*&@#%‰§¶·•†‡`] },
    { id: 'simbolos', nome: 'Símbolos', chars: [...'$¢£¥€¤+−±×÷=≠≈<>≤≥∞¬|¦^ˆ~˜`´¨¯¸°©®™№←↑→↓★♥✓'] },
];

// os nomes, em português; os acentuados saem da letra de base e da marca (o Ç é "C com cedilha")
const NOMES: Record<string, string> = {
    '0': 'zero', '1': 'um', '2': 'dois', '3': 'três', '4': 'quatro', '5': 'cinco', '6': 'seis', '7': 'sete', '8': 'oito', '9': 'nove',
    '¹': 'um sobrescrito', '²': 'dois sobrescrito', '³': 'três sobrescrito', '¼': 'um quarto', '½': 'meio', '¾': 'três quartos',
    'Æ': 'AE ligados', 'æ': 'ae ligados', 'Œ': 'OE ligados', 'œ': 'oe ligados', 'Ø': 'O cortado', 'ø': 'o cortado',
    'Ð': 'eth maiúsculo', 'ð': 'eth', 'Þ': 'thorn maiúsculo', 'ß': 'eszett, o s duplo do alemão', 'ı': 'i sem pingo',
    'ª': 'ordinal feminino', 'º': 'ordinal masculino', 'µ': 'micro', 'ƒ': 'florim',
    '!': 'exclamação', '?': 'interrogação', '¡': 'exclamação invertida', '¿': 'interrogação invertida', '.': 'ponto',
    ',': 'vírgula', ':': 'dois-pontos', ';': 'ponto e vírgula', '…': 'reticências', "'": 'apóstrofo reto', '"': 'aspas retas',
    '‘': 'aspa simples de abertura', '’': 'aspa simples de fechamento', '‚': 'aspa simples baixa', '“': 'aspas de abertura',
    '”': 'aspas de fechamento', '„': 'aspas baixas', '‹': 'aspa angular simples de abertura', '›': 'aspa angular simples de fechamento',
    '«': 'aspas angulares de abertura', '»': 'aspas angulares de fechamento', '-': 'hífen', '–': 'meia-risca', '—': 'travessão',
    '(': 'abre parêntese', ')': 'fecha parêntese', '[': 'abre colchete', ']': 'fecha colchete', '{': 'abre chave', '}': 'fecha chave',
    '/': 'barra', '\\': 'barra invertida', '_': 'sublinhado', '*': 'asterisco', '&': 'e comercial', '@': 'arroba', '#': 'cerquilha',
    '%': 'por cento', '‰': 'por mil', '§': 'parágrafo', '¶': 'pé de mosca', '·': 'ponto médio', '•': 'marcador', '†': 'adaga',
    '‡': 'adaga dupla',
    '$': 'cifrão', '¢': 'centavo', '£': 'libra', '¥': 'iene', '€': 'euro', '¤': 'moeda', '+': 'mais', '−': 'menos',
    '±': 'mais ou menos', '×': 'multiplicação', '÷': 'divisão', '=': 'igual', '≠': 'diferente', '≈': 'aproximadamente igual',
    '<': 'menor que', '>': 'maior que', '≤': 'menor ou igual', '≥': 'maior ou igual', '∞': 'infinito', '¬': 'negação',
    '|': 'barra vertical', '¦': 'barra partida', '^': 'circunflexo', 'ˆ': 'circunflexo modificador', '~': 'til', '˜': 'til pequeno',
    '`': 'acento grave', '´': 'acento agudo', '¨': 'trema', '¯': 'mácron', '¸': 'cedilha', '°': 'grau', '©': 'copyright',
    '®': 'marca registrada', '™': 'marca comercial', '№': 'numeral', '←': 'seta para a esquerda', '↑': 'seta para cima',
    '→': 'seta para a direita', '↓': 'seta para baixo', '★': 'estrela', '♥': 'coração', '✓': 'visto',
};
const MARCAS: Record<string, string> = {
    '̀': 'acento grave', '́': 'acento agudo', '̂': 'circunflexo', '̃': 'til', '̈': 'trema',
    '̊': 'anel', '̧': 'cedilha', '̌': 'caron',
};
function nomeDe(c: string) {
    if (NOMES[c]) return NOMES[c];
    const [base, ...marcas] = [...c.normalize('NFD')];
    const m = marcas.map(x => MARCAS[x]).filter(Boolean);
    return m.length ? `${base} com ${m.join(' e ')}` : c;
}
const codigo = (c: string) => `U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`;

// as linhas de cada estilo, em fração da altura das maiúsculas (a caixa da letra grande vai da altura das maiúsculas
// até a linha de base): a altura das minúsculas e a descendente, tiradas das tabelas da fonte
const LINHAS: Record<Estilo, { x: number; desc: number }> = {
    cut: { x: 570 / 778, desc: 250 / 778 },
    polished: { x: 554 / 773, desc: 250 / 773 },
    worn: { x: 540 / 770, desc: 250 / 770 },
};

function Numeros({ familia }: { familia: string }) {
    return (
        <Painel colunas={4} linhas={1} rotulo="Os números de 0 a 9" celular={{ colunas: 2, linhas: 1 }}>
            <div className="fx-car-numeros fx-so-largo" style={{ fontFamily: familia }} aria-hidden>
                <LinhaCheia texto="0123456789" largura={1590} />
            </div>
            <div className="fx-car-numeros fx-so-celular" style={{ fontFamily: familia }} aria-hidden>
                <LinhaCheia texto="01234" largura={600} />
                <LinhaCheia texto="56789" largura={600} />
            </div>
        </Painel>
    );
}

function Mostruario({ estilo, setEstilo }: { estilo: Estilo; setEstilo: (e: Estilo) => void }) {
    const [grupo, setGrupo] = useState(GRUPOS[1].id);
    const [atual, setAtual] = useState('Ç');
    const familia = ESTILOS.find(e => e.id === estilo)!.familia;
    const chars = GRUPOS.find(g => g.id === grupo)!.chars;
    const linhas = LINHAS[estilo];
    return (
        <Painel colunas={4} linhas={2} rotulo="Mostruário dos caracteres" ancora="mostruario" celular={{ colunas: 2, linhas: 4 }}>
            <div className="fx-car">
                {/* o caractere grande, com as linhas da fonte, o nome e o código */}
                <div className="fx-car-vista">
                    <div
                        className="fx-car-letra"
                        style={{ fontFamily: familia, '--x': linhas.x, '--desc': linhas.desc } as CSSProperties}
                    >
                        <i className="fx-car-guia" data-guia="maiusculas">
                            <span>maiúsculas</span>
                        </i>
                        <i className="fx-car-guia" data-guia="minusculas">
                            <span>minúsculas</span>
                        </i>
                        <i className="fx-car-guia" data-guia="base">
                            <span>linha de base</span>
                        </i>
                        <i className="fx-car-guia" data-guia="descendente">
                            <span>descendente</span>
                        </i>
                        <span className="fx-car-grande" aria-live="polite">
                            {atual}
                        </span>
                    </div>
                    <p className="fx-car-nome">{nomeDe(atual)}</p>
                    <p className="fx-car-codigo">{codigo(atual)}</p>
                    <div className="fx-estilos fx-car-estilos" role="radiogroup" aria-label="Estilos">
                        {ESTILOS.map(e => (
                            <button
                                key={e.id}
                                type="button"
                                role="radio"
                                aria-checked={e.id === estilo}
                                className="fx-estilo"
                                data-ativo={e.id === estilo}
                                onMouseEnter={() => setEstilo(e.id)}
                                onFocus={() => setEstilo(e.id)}
                                onClick={() => setEstilo(e.id)}
                            >
                                <span className="fx-estilo-nome">{e.nome}</span>
                                <span className="fx-estilo-aa" style={{ fontFamily: e.familia }}>
                                    Aa
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
                {/* os grupos e a grade dos caracteres do grupo escolhido */}
                <div className="fx-car-lista">
                    <div className="fx-car-grupos" role="tablist" aria-label="Grupos de caracteres">
                        {GRUPOS.map(g => (
                            <button
                                key={g.id}
                                type="button"
                                role="tab"
                                aria-selected={g.id === grupo}
                                className="fx-car-grupo"
                                data-ativo={g.id === grupo}
                                onClick={() => {
                                    setGrupo(g.id);
                                    setAtual(g.chars[0]);
                                }}
                            >
                                {g.nome} <span>{g.chars.length}</span>
                            </button>
                        ))}
                    </div>
                    <div className="fx-car-grade" role="tabpanel" style={{ fontFamily: familia }}>
                        {chars.map(c => (
                            <button
                                key={c}
                                type="button"
                                className="fx-car-celula"
                                data-ativo={c === atual}
                                aria-label={nomeDe(c)}
                                onMouseEnter={() => setAtual(c)}
                                onFocus={() => setAtual(c)}
                                onClick={() => setAtual(c)}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </Painel>
    );
}

export default function Caracteres() {
    const [estilo, setEstilo] = useState<Estilo>('polished');
    const familia = ESTILOS.find(e => e.id === estilo)!.familia;
    return (
        <>
            <Numeros familia={familia} />
            <Mostruario estilo={estilo} setEstilo={setEstilo} />
            <Simbolos estilo={estilo} />
        </>
    );
}
