// as páginas do espécime, na grade do livro do clone-tantan (unidades de 1/1000 da largura da página, que tem
// 1000 × 1500): margem de 29, rótulos em mono de 12,5, texto corrido de 18,5 com entrelinha de 23,5, título da matéria
// de 32, prancha com moldura e legenda de 459 × 444 e a prancha inteira do pé com 500 de altura. No lugar das fotos
// do tantan entram pranchas de letras da Föeger Rune nas cores dos estilos. Tudo passa pelo pincel (canvas para as
// texturas, SVG para o PDF), e cada página devolve as áreas clicáveis (o sumário) em fração da página.
import { CAPITULOS, COR, EXTRAS, LIVRO, type Pagina } from './conteudo';
import { medir, TINTA, type Estilo, type Familia, type Pincel } from './pincel';
import { PALAVRAS, type Glifo } from '../glifos';
import { ESTILO_MEDIDAS } from '../medidas';

export type Alvo = { x: number; y: number; l: number; a: number; cap?: number; caracteres?: boolean };
type Ctx = { p: Pincel; alvos: Alvo[] };

export const PAPEL = '#efeeea';
export const CAPA = '#26231f';
const CINZA = '#5f5f5b';
const FIO = '#cfcec9';
const ESCURA = '#1b1a18';
// a altura da maiúscula e a do x da Föeger Rune, em fração do corpo
const MAIUSCULA = 0.778;
const ALTURA_X = 0.57;

// a tinta que se lê sobre um fundo da paleta: clara nos fundos escuros (como o tom mais fundo da paleta azul) e escura
// nos claros, pela luminância relativa
function luminancia(hex: string) {
    const h = hex.replace('#', '');
    const [r, g, b] = [0, 2, 4].map(i => {
        const c = parseInt(h.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const tintaSobre = (fundo: string) => (luminancia(fundo) < 0.18 ? COR.claroFrio : ESCURA);

// ---------- ajudantes de texto (entrada em unidades da página) ----------

type Linha = { tam: number; fam?: Familia; peso?: number; cor?: string; alinhar?: 'left' | 'right' | 'center'; espaco?: number; semCalt?: boolean };
const estilo = (o: Linha): Estilo => ({ fam: o.fam ?? 'ui', tam: o.tam, peso: o.peso ?? 300, cor: o.cor ?? TINTA, espaco: o.espaco, semCalt: o.semCalt });
const largura = (c: Ctx, t: string, o: Linha) => medir(c.p.fam, t, estilo(o));

// uma linha de texto; devolve o começo e o fim em x
function linha(c: Ctx, t: string, x: number, y: number, o: Linha) {
    const w = largura(c, t, o);
    const x0 = o.alinhar === 'right' ? x - w : o.alinhar === 'center' ? x - w / 2 : x;
    c.p.texto(t, x0, y, estilo(o));
    return { x0, x1: x0 + w };
}

// o corpo que faz o texto caber na largura
const ajustar = (c: Ctx, t: string, o: Omit<Linha, 'tam'>, larg: number) => (100 * larg) / largura(c, t, { ...o, tam: 100 });

// os rótulos em mono caixa-alta (cabeço, pé, legendas)
function rotulo(c: Ctx, t: string, x: number, y: number, o: { alinhar?: 'left' | 'right' | 'center'; cor?: string; tam?: number } = {}) {
    return linha(c, t.toUpperCase(), x, y, { tam: o.tam ?? 12.5, fam: 'mono', peso: 400, cor: o.cor, alinhar: o.alinhar, espaco: 0.05 });
}

const fio = (c: Ctx, x1: number, y1: number, x2: number, y2: number, cor = FIO, esp = 1.3) => c.p.fio(x1, y1, x2, y2, { cor, esp });

// o rodapé das páginas de texto, igual em todas, como nos livros: o número no canto de fora e, junto dele, o nome do
// livro nas páginas da esquerda e o do capítulo (ou da parte) nas da direita. As ímpares são as da direita. Nas
// pranchas, a cor vem da tinta que se lê sobre elas
function rodape(c: Ctx, num: number | undefined, texto: string, cor?: string) {
    if (!num) return;
    const numero = cor ?? TINTA;
    const nome = cor ?? CINZA;
    if (num % 2 === 1) {
        const r = rotulo(c, String(num).padStart(2, '0'), 973, 1468, { alinhar: 'right', cor: numero });
        rotulo(c, texto, r.x0 - 26, 1468, { alinhar: 'right', cor: nome });
    } else {
        const r = rotulo(c, String(num).padStart(2, '0'), 29, 1468, { cor: numero });
        rotulo(c, texto, r.x1 + 26, 1468, { cor: nome });
    }
}
const fundo = (c: Ctx, cor: string) => c.p.ret(0, 0, 1000, 1500, cor);

type Paragrafo = { tam: number; entre: number; fam?: Familia; peso?: number; cor?: string; justificar?: boolean; recuo?: number; alinhar?: 'left' | 'right' | 'center' };
const estiloP = (o: Paragrafo): Estilo => ({ fam: o.fam ?? 'ui', tam: o.tam, peso: o.peso ?? 400, cor: o.cor ?? TINTA });

function quebrar(c: Ctx, palavras: string[], larg: number, recuo: number, e: Estilo) {
    const esp = medir(c.p.fam, ' ', e);
    const linhas: string[][] = [];
    let atual: string[] = [];
    let w = 0;
    for (const p of palavras) {
        const pw = medir(c.p.fam, p, e);
        const lim = linhas.length === 0 ? larg - recuo : larg;
        if (atual.length && w + esp + pw > lim) {
            linhas.push(atual);
            atual = [p];
            w = pw;
        } else {
            w = atual.length ? w + esp + pw : pw;
            atual.push(p);
        }
    }
    if (atual.length) linhas.push(atual);
    return linhas;
}

// um parágrafo quebrado na largura, justificado (menos a última linha) ou alinhado; devolve a linha de base seguinte
function paragrafo(c: Ctx, texto: string, x: number, y: number, larg: number, o: Paragrafo) {
    const e = estiloP(o);
    const recuo = o.recuo ?? 0;
    const linhas = quebrar(c, texto.split(/\s+/).filter(Boolean), larg, recuo, e);
    const esp = medir(c.p.fam, ' ', e);
    linhas.forEach((ln, i) => {
        const yy = y + i * o.entre;
        const x0 = x + (i === 0 ? recuo : 0);
        const lim = larg - (i === 0 ? recuo : 0);
        const ws = ln.map(p => medir(c.p.fam, p, e));
        const soma = ws.reduce((a, b) => a + b, 0);
        if (o.justificar && i < linhas.length - 1 && ln.length > 1) {
            const vao = (lim - soma) / (ln.length - 1);
            let xx = x0;
            ln.forEach((p, k) => {
                c.p.texto(p, xx, yy, e);
                xx += ws[k] + vao;
            });
        } else {
            const total = soma + esp * (ln.length - 1);
            const xx = o.alinhar === 'right' ? x0 + lim - total : o.alinhar === 'center' ? x0 + (lim - total) / 2 : x0;
            c.p.texto(ln.join(' '), xx, yy, e);
        }
    });
    return y + linhas.length * o.entre;
}

function contarLinhas(c: Ctx, texto: string, larg: number, o: Paragrafo) {
    return quebrar(c, texto.split(/\s+/).filter(Boolean), larg, o.recuo ?? 0, estiloP(o)).length;
}

function alvo(c: Ctx, x0: number, y0: number, x1: number, y1: number, extra: Omit<Alvo, 'x' | 'y' | 'l' | 'a'>) {
    c.alvos.push({ x: x0 / 1000, y: y0 / 1500, l: (x1 - x0) / 1000, a: (y1 - y0) / 1500, ...extra });
}

// o relevo seco da capa: a letra mais escura que o pano, com a luz batendo na borda de baixo
function relevo(c: Ctx, t: string, x: number, y: number, o: Linha) {
    linha(c, t, x + 1.4, y + 1.6, { ...o, cor: 'rgba(255,250,240,0.07)' });
    linha(c, t, x - 0.8, y - 0.9, { ...o, cor: 'rgba(0,0,0,0.32)' });
    linha(c, t, x, y, { ...o, cor: 'rgba(0,0,0,0.16)' });
}

// um texto da Rune centrado numa caixa: o corpo faz a palavra ocupar a fração da largura (sem passar da altura) e a
// altura usada para centrar é a da maiúscula ou a do x
function centrado(c: Ctx, t: string, fam: Familia, cor: string, x: number, y: number, l: number, a: number, o: { frac?: number; altura?: number; dy?: number; semCalt?: boolean } = {}) {
    const alt = o.altura ?? MAIUSCULA;
    const tam = Math.min(ajustar(c, t, { fam, semCalt: o.semCalt }, l * (o.frac ?? 0.84)), (a * 0.8) / alt);
    const base = y + a / 2 + (alt * tam) / 2 + (o.dy ?? 0);
    linha(c, t, x + l / 2, base, { tam, fam, peso: 400, cor, alinhar: 'center', semCalt: o.semCalt });
    return { tam, base };
}

// ---------- as letras desenhadas pelo contorno (glifos.ts, da Cut) ----------

function glifoDe(palavra: string, ch: string): Glifo {
    return PALAVRAS[palavra].glifos.find(g => g.ch === ch)!;
}

// um glifo posto com a origem (linha de base, começo do avanço) em (x, y) e o corpo tam
function contorno(c: Ctx, g: Glifo, x: number, y: number, tam: number, cor: string | null, traco?: { cor: string; esp: number }) {
    const esc = tam / 1000;
    for (const pd of g.pedras) c.p.caminho(pd.d, x - g.x * esc, y, esc, cor, traco);
}

function vertices(c: Ctx, g: Glifo, x: number, y: number, tam: number, r: number, cor: string, borda: string) {
    const esc = tam / 1000;
    for (const pd of g.pedras) for (const anel of pd.vertices) for (const [vx, vy] of anel) c.p.quadrado(x + (vx - g.x) * esc, y + vy * esc, r, cor, { cor: borda, esp: 1.2 });
}

// ---------- as pranchas (no lugar das fotos) ----------

type Prancha =
    | 'aa'
    | 'ssss'
    | 'seixo'
    | 'acai'
    | 'maiusculas'
    | 'minusculas'
    | 'numeros'
    | 'tres-pedras'
    | 'r-desgaste'
    | 'tanto'
    | 'trocas'
    | 'l-f'
    | 'correnteza'
    | 'acentos'
    | 'tamanhos'
    | 'ploc';

// as linhas de uma prancha, cada uma ajustada à largura, centradas na altura
function linhasNaCaixa(c: Ctx, linhas: string[], fam: Familia, cor: string, x: number, y: number, l: number, a: number, o: { frac?: number; entre?: number; semCalt?: boolean; alinhar?: 'left' | 'center' } = {}) {
    const tam = Math.min(...linhas.map(t => ajustar(c, t, { fam, semCalt: o.semCalt }, l * (o.frac ?? 0.84))));
    const entre = tam * (o.entre ?? 1.05);
    const total = MAIUSCULA * tam + (linhas.length - 1) * entre;
    const y0 = y + (a - total) / 2 + MAIUSCULA * tam;
    const centro = o.alinhar !== 'left';
    linhas.forEach((t, i) => linha(c, t, centro ? x + l / 2 : x + (l * (1 - (o.frac ?? 0.84))) / 2, y0 + i * entre, { tam, fam, peso: 400, cor, alinhar: centro ? 'center' : 'left', semCalt: o.semCalt }));
    return tam;
}

const PRANCHAS: Record<Prancha, (c: Ctx, x: number, y: number, l: number, a: number) => void> = {
    // o Aa da Cut no marrom
    aa(c, x, y, l, a) {
        c.p.ret(x, y, l, a, COR.cut);
        if (a > l * 1.2) {
            // a página inteira: o Aa enorme, com o a cortado pela borda como uma foto de perto
            linha(c, 'Aa', x - 34, y + a * 0.73, { tam: a * 0.62, fam: 'cut', peso: 400, cor: tintaSobre(COR.cut) });
        } else centrado(c, 'Aa', 'cut', tintaSobre(COR.cut), x, y, l, a, { frac: 0.86 });
    },
    // os quatro cortes do s, um depois do outro, com o nome de cada glifo embaixo
    ssss(c, x, y, l, a) {
        c.p.ret(x, y, l, a, COR.roxo);
        const claro = COR.claroFrio;
        const pagina = a > l * 1.2;
        const frac = pagina ? 0.9 : 0.86;
        const { tam, base } = centrado(c, 'ssss', 'worn', claro, x, y, l, a, { frac, altura: ALTURA_X, dy: pagina ? -40 : -a * 0.04 });
        const w = (t: string) => largura(c, t, { tam, fam: 'worn' });
        const x0 = x + l / 2 - w('ssss') / 2;
        const nomes = ['s', 's.v2', 's.v3', 's.v4'];
        const prefixo = ['', 's', 'ss', 'sss', 'ssss'].map(t => (t ? w(t) : 0));
        nomes.forEach((nome, i) => {
            const meio = x0 + (prefixo[i] + prefixo[i + 1]) / 2;
            const yr = base + (pagina ? 90 : a * 0.12);
            c.p.fio(meio, base + (pagina ? 26 : a * 0.03), meio, yr - (pagina ? 26 : a * 0.05), { cor: claro, esp: pagina ? 1.6 : 1.2 });
            rotulo(c, nome, meio, yr, { alinhar: 'center', cor: claro, tam: pagina ? 15 : Math.max(9, a * 0.032) });
        });
    },
    // a palavra enorme nas duas páginas (a abertura dupla do capítulo 2)
    seixo(c, x, y, l, a) {
        c.p.ret(x, y, l, a, COR.polished);
        const tam = ajustar(c, 'Seixo', { fam: 'polished' }, l * 0.9);
        linha(c, 'Seixo', x + l / 2, y + a * 0.68, { tam, fam: 'polished', peso: 400, cor: tintaSobre(COR.polished), alinhar: 'center' });
    },
    // a frase em duas linhas, nas duas páginas (a abertura dupla do capítulo 4)
    acai(c, x, y, l, a) {
        c.p.ret(x, y, l, a, COR.laranja);
        const linhas = ['Ôh, é só', 'açaí!'];
        const tam = Math.min(...linhas.map(t => ajustar(c, t, { fam: 'cut' }, l * 0.78)));
        linha(c, linhas[0], x + l * 0.06, y + a * 0.47, { tam, fam: 'cut', peso: 400, cor: tintaSobre(COR.laranja) });
        linha(c, linhas[1], x + l * 0.94, y + a * 0.47 + tam * 0.98, { tam, fam: 'cut', peso: 400, cor: tintaSobre(COR.laranja), alinhar: 'right' });
    },
    maiusculas(c, x, y, l, a) {
        c.p.ret(x, y, l, a, '#e4e1da');
        linhasNaCaixa(c, ['ABCDEFGHI', 'JKLMNOPQR', 'STUVWXYZ'], 'cut', ESCURA, x, y, l, a, { semCalt: true, entre: 1.08, frac: 0.86, alinhar: 'left' });
    },
    minusculas(c, x, y, l, a) {
        c.p.ret(x, y, l, a, '#e4e1da');
        linhasNaCaixa(c, ['abcdefghi', 'jklmnopqr', 'stuvwxyz'], 'cut', ESCURA, x, y, l, a, { semCalt: true, entre: 1.2, frac: 0.86, alinhar: 'left' });
    },
    // os números e alguns símbolos, claros no escuro (a prancha do pé)
    numeros(c, x, y, l, a) {
        c.p.ret(x, y, l, a, ESCURA);
        const tam = ajustar(c, '0123456789', { fam: 'cut', semCalt: true }, l * 0.9);
        linha(c, '0123456789', x + l * 0.05, y + a * 0.44, { tam, fam: 'cut', peso: 400, cor: PAPEL, semCalt: true });
        const simbolos = '★ ♥ → ✓ ½ ¾ €';
        const ts = Math.min(tam * 0.72, ajustar(c, simbolos, { fam: 'cut', semCalt: true }, l * 0.9));
        linha(c, simbolos, x + l * 0.05, y + a * 0.44 + tam * 1.25, { tam: ts, fam: 'cut', peso: 400, cor: COR.cut, semCalt: true });
    },
    // a mesma palavra nos três estilos: cada um mais estreito que o anterior
    'tres-pedras'(c, x, y, l, a) {
        c.p.ret(x, y, l, a, COR.tintaPolished);
        const tam = ajustar(c, 'Pedra', { fam: 'cut' }, l * 0.66);
        const estilos: [Familia, string][] = [['cut', 'Cut'], ['polished', 'Polished'], ['worn', 'Worn']];
        const entre = Math.min(tam * 1.02, (a * 0.86) / 3);
        const y0 = y + (a - (MAIUSCULA * tam + 2 * entre)) / 2 + MAIUSCULA * tam;
        estilos.forEach(([fam, nome], i) => {
            const yy = y0 + i * entre;
            const r = linha(c, 'Pedra', x + l * 0.26, yy, { tam, fam, peso: 400, cor: ESCURA });
            rotulo(c, nome, x + l * 0.05, yy - MAIUSCULA * tam * 0.5 + 5, { tam: Math.max(9, a * 0.026) });
            c.p.fio(r.x1 + 8, yy - MAIUSCULA * tam * 0.5, x + l - 14, yy - MAIUSCULA * tam * 0.5, { cor: 'rgba(27,26,24,0.35)', esp: 1 }, 3);
        });
    },
    // o R nos três desgastes, um por cima do outro: a Cut cheia, as outras pelo contorno
    'r-desgaste'(c, x, y, l, a) {
        c.p.ret(x, y, l, a, '#e4e1da');
        const tam = Math.min(ajustar(c, 'R', { fam: 'cut' }, l * 0.62), (a * 0.72) / MAIUSCULA);
        const w = largura(c, 'R', { tam, fam: 'cut' });
        const x0 = x + (l - w) / 2;
        const base = y + a / 2 + (MAIUSCULA * tam) / 2;
        linha(c, 'R', x0, base, { tam, fam: 'cut', peso: 400, cor: '#cfcac1' });
        c.p.contornoTexto('R', x0, base, { fam: 'polished', tam }, { cor: COR.roxo, esp: 1.6 });
        c.p.contornoTexto('R', x0, base, { fam: 'worn', tam }, { cor: COR.wornEscuro, esp: 1.6 });
        const tl = Math.max(9, a * 0.026);
        const chaves: [string, string][] = [['Cut', '#a39d93'], ['Polished', COR.roxo], ['Worn', COR.wornEscuro]];
        chaves.forEach(([nome, cor], i) => {
            const yy = y + a - 22 - (chaves.length - 1 - i) * tl * 1.6;
            c.p.ret(x + 18, yy - tl * 0.75, tl * 0.8, tl * 0.8, cor);
            rotulo(c, nome, x + 18 + tl * 1.3, yy, { tam: tl, cor: ESCURA });
        });
    },
    // o ditado na Worn, no verde (a prancha do pé)
    tanto(c, x, y, l, a) {
        c.p.ret(x, y, l, a, COR.worn);
        linhasNaCaixa(c, ['Tanto bate até', 'que fura!'], 'worn', tintaSobre(COR.worn), x, y, l, a, { frac: 0.9, entre: 1.08, alinhar: 'left' });
    },
    // as mesmas letras sem e com as trocas: em cima, sempre o mesmo corte; embaixo, quatro cortes
    trocas(c, x, y, l, a) {
        c.p.ret(x, y, l, a, COR.tintaFrio);
        const t = 'ssss eeee';
        const tam = ajustar(c, t, { fam: 'worn' }, l * 0.8);
        const tl = Math.max(9, a * 0.026);
        [true, false].forEach((sem, i) => {
            const base = y + a * (i === 0 ? 0.4 : 0.78);
            rotulo(c, sem ? 'Sem as trocas' : 'Com as trocas', x + l * 0.1, base - ALTURA_X * tam - tl * 1.4, { tam: tl, cor: COR.frioEscuro });
            linha(c, t, x + l * 0.1, base, { tam, fam: 'worn', peso: 400, cor: ESCURA, semCalt: sem });
        });
    },
    // o L do meio e o f do começo
    'l-f'(c, x, y, l, a) {
        c.p.ret(x, y, l, a, '#e4e1da');
        const tl = Math.max(9, a * 0.026);
        const metade = l / 2;
        const casos: [string, string][] = [['AL', 'L do meio'], ['fé', 'f do começo']];
        casos.forEach(([t, nome], i) => {
            const xi = x + i * metade;
            const { base } = centrado(c, t, 'worn', ESCURA, xi, y, metade, a, { frac: 0.7, dy: -a * 0.05 });
            rotulo(c, nome, xi + metade / 2, base + a * 0.13, { alinhar: 'center', tam: tl });
        });
        c.p.fio(x + metade, y + a * 0.12, x + metade, y + a * 0.88, { cor: 'rgba(27,26,24,0.3)', esp: 1 }, 3);
    },
    // a frase das variações, clara no escuro (a prancha do pé)
    correnteza(c, x, y, l, a) {
        c.p.ret(x, y, l, a, ESCURA);
        linhasNaCaixa(c, ['Nossa, essssa', 'correnteeeeza'], 'worn', COR.claroFrio, x, y, l, a, { frac: 0.9, entre: 1.05, alinhar: 'left' });
    },
    acentos(c, x, y, l, a) {
        c.p.ret(x, y, l, a, COR.tintaQuente);
        linhasNaCaixa(c, ['ÁÂÃÀÇÉÊÍ', 'ÓÔÕÚÜÑ', 'áâãçéêíóôõú', '½ ¼ ¾ ¹ ² ³'], 'cut', ESCURA, x, y, l, a, { semCalt: true, entre: 1.16, frac: 0.84, alinhar: 'left' });
    },
    // a mesma palavra em seis corpos, com o corpo de cada linha em mono
    tamanhos(c, x, y, l, a) {
        c.p.ret(x, y, l, a, '#e4e1da');
        const corpos = [1, 0.7, 0.5, 0.36, 0.26, 0.19];
        const maior = Math.min(ajustar(c, 'Pedra', { fam: 'cut' }, l * 0.62), (a * 0.82) / (corpos.reduce((s, k) => s + k, 0) * 1.08));
        const tl = Math.max(9, a * 0.026);
        let yy = y + a * 0.09;
        for (const k of corpos) {
            const tam = maior * k;
            yy += tam * 1.08;
            linha(c, 'Pedra', x + l * 0.24, yy, { tam, fam: 'cut', peso: 400, cor: ESCURA });
            rotulo(c, `${Math.round(tam)}`, x + l * 0.06, yy, { tam: tl, cor: CINZA });
        }
    },
    // as onomatopeias na Polished, no rosa (a prancha do pé)
    ploc(c, x, y, l, a) {
        c.p.ret(x, y, l, a, COR.polished);
        linhasNaCaixa(c, ['Ploc! Tum!', 'Crás, Bum!'], 'polished', tintaSobre(COR.polished), x, y, l, a, { frac: 0.86, entre: 1.05, alinhar: 'left' });
    },
};

// uma prancha numa caixa da página, cortada pela caixa e pela página
function prancha(c: Ctx, k: Prancha, x: number, y: number, l: number, a: number) {
    c.p.recortar(Math.max(0, x), Math.max(0, y), Math.min(1000, x + l) - Math.max(0, x), Math.min(1500, y + a) - Math.max(0, y), () => PRANCHAS[k](c, x, y, l, a));
}

// a prancha com moldura fina e a legenda em mono embaixo (a da matéria)
function moldura(c: Ctx, k: Prancha, x: number, y: number, l: number, a: number, legenda: [string, string]) {
    c.p.ret(x, y, l, a, PAPEL);
    prancha(c, k, x + 3, y + 3, l - 6, a - 56);
    c.p.borda(x, y, l, a, { cor: FIO, esp: 1.3 });
    fio(c, x, y + a - 53, x + l, y + a - 53);
    rotulo(c, legenda[0], x + 14, y + a - 21, { tam: 11.5, cor: CINZA });
    rotulo(c, legenda[1], x + l - 14, y + a - 21, { tam: 11.5, cor: CINZA, alinhar: 'right' });
}

// as pranchas de cada capítulo: a da abertura, as duas molduras da matéria e a do pé
const PRANCHAS_CAP: { abertura: Prancha; esq: Prancha; dir: Prancha; pe: Prancha; legendaEsq: [string, string]; legendaDir: [string, string] }[] = [
    { abertura: 'aa', esq: 'maiusculas', dir: 'minusculas', pe: 'numeros', legendaEsq: ['Maiúsculas', 'Cut, sem as trocas'], legendaDir: ['Minúsculas', 'Cut, sem as trocas'] },
    { abertura: 'seixo', esq: 'tres-pedras', dir: 'r-desgaste', pe: 'tanto', legendaEsq: ['Pedra', 'Três desgastes'], legendaDir: ['R', 'Um por cima do outro'] },
    { abertura: 'ssss', esq: 'trocas', dir: 'l-f', pe: 'correnteza', legendaEsq: ['Worn', 'Sem e com as trocas'], legendaDir: ['L.alt e f.ini', 'Pelo lugar na palavra'] },
    { abertura: 'acai', esq: 'acentos', dir: 'tamanhos', pe: 'ploc', legendaEsq: ['Acentos e frações', 'Cut'], legendaDir: ['Do cartaz ao texto', 'Cut'] },
];

// a tinta da abertura de cada capítulo, pelo fundo da prancha dela
const FUNDO_ABERTURA = [() => COR.cut, () => COR.polished, () => COR.roxo, () => COR.laranja];
const tintaDaAbertura = (cap: number) => tintaSobre(FUNDO_ABERTURA[cap]());

const tituloDe = (cap: number) => CAPITULOS[cap].sumario.join(' ');
const pagina2 = (n?: number) => (n ? String(n).padStart(2, '0') : '');

// ---------- as páginas ----------

// a capa de pano, com tudo em relevo seco, como as capas duras sem sobrecapa: o título grande, o subtítulo, o autor e,
// no pé, o selo da editora
function capa(c: Ctx) {
    c.p.pano(CAPA);
    relevo(c, 'Föeger', 64, 340, { tam: 236, fam: 'cut', peso: 400 });
    relevo(c, 'Rune', 64, 560, { tam: 236, fam: 'cut', peso: 400 });
    relevo(c, 'Espécime tipográfico', 70, 690, { tam: 50, peso: 300 });
    relevo(c, 'LUIZ FELIPE FÖEGER', 72, 1430, { tam: 15, fam: 'mono', peso: 400, espaco: 0.08 });
    relevo(c, 'Föeger.', 930, 1436, { tam: 46, fam: 'cut', peso: 400, alinhar: 'right' });
}

// a contracapa de pano: o nome no meio, a frase do livro e o selo da editora no pé, tudo em relevo
function contracapa(c: Ctx) {
    c.p.pano(CAPA);
    relevo(c, 'Föeger Rune', 500, 770, { tam: 76, fam: 'cut', peso: 400, alinhar: 'center' });
    relevo(c, LIVRO.frase, 500, 860, { tam: 34, fam: 'polished', peso: 400, alinhar: 'center' });
    relevo(c, 'Föeger.', 500, 1436, { tam: 46, fam: 'cut', peso: 400, alinhar: 'center' });
}

// a guarda: o papel colado por dentro da capa e da contracapa, sem texto, como nos livros de verdade. Por enquanto ela
// é lisa; as duas estampas ficam prontas para trocar em GUARDA (a página /versoes/guarda mostra as três lado a lado):
// a de letras, fileiras de minúsculas da Cut tom sobre tom em grupos de quatro, que a própria fonte troca de corte a
// cada vez (a, a.v2, a.v3, a.v4); e a de pedras, as letras soltas e tombadas como as do hero depois de rolar,
// espalhadas numa grade com um sorteio fixo
export type VersaoGuarda = 'lisa' | 'letras' | 'pedras';
const GUARDA: VersaoGuarda = 'lisa';
const PAPEL_GUARDA = '#2c2925';
const ESTAMPA = 'rgba(255, 246, 230, 0.075)';

function guarda(c: Ctx, v: VersaoGuarda = GUARDA) {
    c.p.pano(PAPEL_GUARDA);
    if (v === 'letras') {
        const tam = 84;
        const passo = 118;
        const letras = 'aegorsnumdcpbh';
        // grupos de quatro letras encostadas (com espaço entre as letras, o navegador desliga as trocas da fonte e
        // as quatro saem iguais); as fileiras alternam o recuo, como uma estampa em meia-gota
        for (let i = 0; i * passo < 1500 + passo; i++) {
            const grupo = letras[i % letras.length].repeat(4);
            linha(c, Array(5).fill(grupo).join('   '), i % 2 ? -150 : -20, 70 + i * passo, { tam, fam: 'cut', peso: 400, cor: ESTAMPA });
        }
    } else if (v === 'pedras') {
        const glifos = Object.values(PALAVRAS)
            .flatMap(pl => pl.glifos)
            .filter(g => !g.ch.startsWith('#'));
        let semente = 11;
        const sorteio = () => (semente = (semente * 16807) % 2147483647) / 2147483647;
        const passo = 152;
        for (let j = 0; j * passo < 1500 + passo; j++) {
            for (let i = 0; i * passo < 1000 + passo; i++) {
                const g = glifos[Math.floor(sorteio() * glifos.length)];
                const pontos = g.pedras.flatMap(pd => pd.vertices.flat());
                const xs = pontos.map(([x]) => x);
                const ys = pontos.map(([, y]) => y);
                const mx = (Math.min(...xs) + Math.max(...xs)) / 2;
                const my = (Math.min(...ys) + Math.max(...ys)) / 2;
                const esc = (0.1 + sorteio() * 0.045) * (j % 2 ? 1 : 0.92);
                const cx = -30 + i * passo + (j % 2 ? passo / 2 : 0) + (sorteio() - 0.5) * 50;
                const cy = -20 + j * passo + (sorteio() - 0.5) * 50;
                c.p.girar(sorteio() * 360, cx, cy, () => {
                    for (const pd of g.pedras) c.p.caminho(pd.d, cx - mx * esc, cy - my * esc, esc, ESTAMPA);
                });
            }
        }
    }
}

// uma das versões da guarda, para a página de comparação
export function desenharGuarda(p: Pincel, v: VersaoGuarda) {
    guarda({ p, alvos: [] }, v);
}

// as páginas de abertura, na ordem dos livros de verdade: a falsa folha de rosto (p. 1), só com o título, pequeno; o
// frontispício (p. 2), uma prancha na página inteira de frente para a folha de rosto; e, no verso da folha de rosto,
// os créditos (p. 4), com a ficha de catalogação. Como nos livros, os números dessas páginas não aparecem
function falsaRosto(c: Ctx) {
    fundo(c, PAPEL);
    linha(c, LIVRO.titulo, 500, 470, { tam: 58, fam: 'cut', peso: 400, alinhar: 'center' });
}

// o frontispício: o R da Cut de perto, cortado pelas bordas como uma foto, claro no escuro, com a legenda no pé, como
// as aberturas dos capítulos
function frontispicio(c: Ctx) {
    c.p.ret(0, 0, 1000, 1500, ESCURA);
    linha(c, 'R', -70, 1190, { tam: 1500, fam: 'cut', peso: 400, cor: PAPEL, semCalt: true });
    legendaDe(c, ['Föeger Rune Cut', 'O R de perto'], PAPEL);
}

function creditos(c: Ctx) {
    fundo(c, PAPEL);
    const itens: [string, string][] = [
        ['Edição', LIVRO.edicao],
        ['Desenho da fonte, textos e projeto gráfico', 'Luiz Felipe Föeger'],
        ['Composto em', 'Föeger Rune Cut, Polished e Worn, com Inter Tight e DM Mono nos textos de apoio'],
        ['Versão da fonte', 'Prévia de 5 de novembro de 2026, com 311 glifos em cada estilo'],
    ];
    let y = 720;
    for (const [nome, valor] of itens) {
        rotulo(c, nome, 29, y, { tam: 11.5, cor: CINZA });
        y = paragrafo(c, valor, 29, y + 30, 560, { tam: 18.5, entre: 23.5 }) + 28;
    }
    // a ficha de catalogação, como a que vem no verso da folha de rosto, em mono numa caixa de fio fino
    const fx = 29;
    const fy = 1110;
    const fl = 620;
    const fa = 250;
    c.p.borda(fx, fy, fl, fa, { cor: FIO, esp: 1.3 });
    rotulo(c, 'Dados para catalogação', fx + 22, fy + 38, { tam: 11, cor: CINZA });
    const mono = (t: string, x: number, yy: number) => linha(c, t, x, yy, { tam: 13.5, fam: 'mono', peso: 400 });
    mono('Föeger, Luiz Felipe', fx + 22, fy + 82);
    mono('Föeger Rune: espécime tipográfico /', fx + 52, fy + 104);
    mono('Luiz Felipe Föeger. — Edição 01. — 2026.', fx + 22, fy + 126);
    mono(`${EXTRAS.paginas ?? ''} p. : il. color.`, fx + 52, fy + 148);
    mono('1. Tipografia. 2. Fontes tipográficas.', fx + 52, fy + 192);
    mono('3. Design gráfico. I. Título.', fx + 52, fy + 214);
    linha(c, '© 2026 Luiz Felipe Föeger. Todos os direitos reservados.', 29, 1440, { tam: 16.5, peso: 400 });
}

// a folha de rosto, como a dos livros de verdade: só o título, o subtítulo, o autor e, no pé, o selo da editora com a
// edição e o ano. Sem cabeço nem frase (a frase do livro fica na contracapa). O título grande na Cut; o subtítulo na
// grotesca leve, como os títulos das outras páginas; embaixo dele, os três estilos, cada nome no seu
function rosto(c: Ctx) {
    fundo(c, PAPEL);
    linha(c, 'Föeger', 22, 340, { tam: 250, fam: 'cut', peso: 400 });
    linha(c, 'Rune', 22, 580, { tam: 250, fam: 'cut', peso: 400 });
    linha(c, 'Espécime tipográfico', 24, 730, { tam: 58 });
    const nomes: [Familia, string][] = [['cut', 'Cut'], ['polished', 'Polished'], ['worn', 'Worn']];
    let x = 29;
    nomes.forEach(([fam, nome]) => {
        const r = linha(c, nome, x, 818, { tam: 44, fam, peso: 400 });
        x = r.x1 + 28;
    });
    linha(c, 'Luiz Felipe Föeger', 27, 1180, { tam: 36, peso: 400 });
    fio(c, 29, 1386, 973, 1386);
    linha(c, 'Föeger.', 29, 1462, { tam: 56, fam: 'cut', peso: 400 });
    rotulo(c, LIVRO.edicao, 973, 1460, { alinhar: 'right' });
}

// o sumário em lista, numa página da direita depois dos créditos (p. 5), como o da versão antiga e como nos livros de
// verdade: o título na grotesca leve, como "Letras" e "Sinais", e uma linha por parte, com fio embaixo: o número do
// capítulo em mono, o título como ele aparece na abertura (a primeira parte na grotesca leve, a segunda na Rune do
// capítulo), as seções em corpo pequeno e a página onde a parte começa, à direita. As linhas dos capítulos e a dos
// caracteres levam até eles; a dos três estilos é a dupla seguinte, e o clique nela só vira a página
const SUMARIO_LINHA = 140;

function linhaDoSumario(c: Ctx, y: number, n: string, titulo: [string, string], fam: Familia, secoes: string, pagina: string, extra?: Omit<Alvo, 'x' | 'y' | 'l' | 'a'>) {
    if (n) rotulo(c, n, 29, y + 76, { cor: CINZA });
    const x = 112;
    const fim = titulo[0] ? linha(c, titulo[0], x, y + 80, { tam: 52, peso: 300 }).x1 + 16 : x;
    linha(c, titulo[1], fim, y + 80, { tam: 52, fam, peso: 400 });
    linha(c, secoes, x + 2, y + 114, { tam: 16.5, peso: 400, cor: CINZA });
    linha(c, pagina, 973, y + 80, { tam: 44, peso: 300, alinhar: 'right' });
    fio(c, 29, y + SUMARIO_LINHA, 973, y + SUMARIO_LINHA);
    if (extra) alvo(c, 20, y + 4, 980, y + SUMARIO_LINHA - 4, extra);
}

function sumario(c: Ctx) {
    fundo(c, PAPEL);
    linha(c, 'Sumário', 22, 190, { tam: 92 });
    const y0 = 290;
    fio(c, 29, y0, 973, y0);
    linhaDoSumario(c, y0, '', ['Os três', 'estilos'], 'polished', 'Cut, Polished e Worn lado a lado', EXTRAS.estilos ? pagina2(EXTRAS.estilos) : '');
    CAPITULOS.forEach((ch, i) => {
        const p = ch.paginas;
        linhaDoSumario(c, y0 + (i + 1) * SUMARIO_LINHA, pagina2(ch.n), ch.sumario, ch.estilo, ch.secoes.join(' · '), p ? pagina2(p[0]) : '', { cap: i });
    });
    const car = EXTRAS.caracteres;
    linhaDoSumario(c, y0 + (CAPITULOS.length + 1) * SUMARIO_LINHA, '', ['', 'Caracteres'], 'cut', 'Letras, sinais e variações', car ? pagina2(car[0]) : '', { caracteres: true });
}

// a dupla depois do rosto apresenta os três estilos: à esquerda, o título e a abertura, e o cartão da Cut; à direita, os
// da Polished e da Worn. Os três cartões têm o mesmo tamanho: a cor do estilo, o nome e uma frase no próprio estilo, o
// Aa grande e, no pé, as medidas de verdade do alfabeto inteiro (as de medidas.ts, as mesmas da página)
const ESTILOS: { fam: Familia; nome: string; cor: () => string; apelido: string; frase: string }[] = [
    { fam: 'cut', nome: 'Cut', cor: () => COR.cut, apelido: 'Quinas vivas', frase: 'Toda pedra começa bruta.' },
    { fam: 'polished', nome: 'Polished', cor: () => COR.polished, apelido: 'Rolada no rio', frase: 'Pedra que rola não cria limo!' },
    { fam: 'worn', nome: 'Worn', cor: () => COR.worn, apelido: 'Anos na correnteza', frase: 'Tanto bate até que fura!' },
];
const CARTAO_L = 944;
const CARTAO_A = 600;
const medida = (nome: string, i: number) => {
    const m = ESTILO_MEDIDAS.find(x => x.nome === nome)!;
    const v = m.valores[i];
    if (!m.unidade) return String(v);
    return m.antes ? `${m.unidade} ${v}` : `${v} ${m.unidade}`;
};

function cartaoEstilo(c: Ctx, i: number, x: number, y: number) {
    const e = ESTILOS[i];
    const fundoCor = e.cor();
    const tinta = tintaSobre(fundoCor);
    const l = CARTAO_L;
    const a = CARTAO_A;
    c.p.ret(x, y, l, a, fundoCor);
    rotulo(c, `${pagina2(i + 1)} — ${e.apelido}`, x + 30, y + 48, { cor: tinta });
    // o σ fica minúsculo (o rótulo passa tudo para caixa-alta, e Σ é outro símbolo)
    linha(c, `DESFOQUE ${medida('Desfoque', i)}`, x + l - 30, y + 48, { tam: 12.5, fam: 'mono', peso: 400, cor: tinta, alinhar: 'right', espaco: 0.05 });
    // o nome e a frase na coluna da esquerda, no mesmo corpo nos três cartões (o da Polished, o mais largo, manda)
    const tamNome = ajustar(c, 'Polished', { fam: 'polished' }, 520);
    linha(c, e.nome, x + 26, y + 236, { tam: tamNome, fam: e.fam, peso: 400, cor: tinta });
    const tamFrase = Math.min(...ESTILOS.map(s => ajustar(c, s.frase, { fam: s.fam }, 500)));
    linha(c, e.frase, x + 30, y + 318, { tam: tamFrase, fam: e.fam, peso: 400, cor: tinta });
    // o Aa grande na coluna da direita
    linha(c, 'Aa', x + l - 30, y + 452, { tam: 260, fam: e.fam, peso: 400, cor: tinta, alinhar: 'right' });
    // as medidas no pé, em quatro casas
    const pe = y + a - 96;
    fio(c, x + 30, pe, x + l - 30, pe, tinta, 1.1);
    const casas: [string, string][] = [
        ['Recuo das quinas', medida('Recuo das quinas', i)],
        ['Largura média', medida('Largura média', i)],
        ['Entre letras', medida('Entre letras', i)],
        ['Pontos por letra', medida('Pontos por letra', i)],
    ];
    const casa = (l - 60) / casas.length;
    casas.forEach(([nome, valor], k) => {
        const xc = x + 30 + k * casa;
        rotulo(c, nome, xc, pe + 34, { cor: tinta, tam: 10.5 });
        linha(c, valor, xc, pe + 72, { tam: 26, peso: 400, cor: tinta });
    });
}

function estilosEsq(c: Ctx, num?: number) {
    fundo(c, PAPEL);
    linha(c, 'Uma pedra,', 22, 190, { tam: 92 });
    linha(c, 'três desgastes.', 26, 292, { tam: 88, fam: 'polished', peso: 400 });
    paragrafo(
        c,
        'A Föeger Rune vem em três estilos, que são três momentos da mesma pedra. O desenho e os glifos são os mesmos; o que muda é quanto a água gastou as quinas. Cada estilo é uma fonte inteira, refeita letra por letra.',
        29,
        420,
        620,
        { tam: 24, entre: 30 },
    );
    cartaoEstilo(c, 0, 29, 770);
    rodape(c, num, LIVRO.titulo);
}

function estilosDir(c: Ctx, num?: number) {
    fundo(c, PAPEL);
    cartaoEstilo(c, 1, 29, 110);
    cartaoEstilo(c, 2, 29, 770);
    rodape(c, num, 'Os três estilos');
}
function legendaDe(c: Ctx, l: [string, string], cor: string) {
    rotulo(c, l[0], 29, 1440, { cor });
    rotulo(c, l[1], 29, 1462, { cor });
}

function aberturaImagem(c: Ctx, cap: number) {
    const ch = CAPITULOS[cap];
    const k = PRANCHAS_CAP[cap].abertura;
    if (ch.modo === 'dupla') prancha(c, k, 0, 0, 2000, 1500);
    else prancha(c, k, 0, 0, 1000, 1500);
    legendaDe(c, ch.legenda, tintaDaAbertura(cap));
}

function aberturaTitulo(c: Ctx, cap: number, num?: number) {
    const ch = CAPITULOS[cap];
    if (ch.modo === 'dupla') {
        prancha(c, PRANCHAS_CAP[cap].abertura, -1000, 0, 2000, 1500);
        rotulo(c, `Capítulo ${ch.n}`, 973, 70, { cor: tintaDaAbertura(cap), alinhar: 'right' });
        linha(c, ch.sumario[0], 973, 170, { tam: 76, cor: tintaDaAbertura(cap), alinhar: 'right' });
        linha(c, ch.sumario[1], 973, 250, { tam: 72, fam: ch.estilo, peso: 400, cor: tintaDaAbertura(cap), alinhar: 'right' });
        rodape(c, num, tituloDe(cap), tintaDaAbertura(cap));
        return;
    }
    fundo(c, PAPEL);
    fio(c, 29, 22, 973, 22);
    rotulo(c, `Capítulo ${ch.n}`, 150, 52);
    // o título em escada, na Rune do capítulo
    const tam = 92;
    const y0 = ch.titulo.length === 4 ? 500 : 550;
    ch.titulo.forEach(([t, recuo], i) => {
        const o = { tam, fam: ch.estilo, peso: 400 } as Linha;
        const w = largura(c, t, o);
        const x = Math.min(150 + recuo * 800, 960 - w);
        linha(c, t, x, y0 + i * 100, o);
    });
    // as seções, como uma tabela de uma coluna
    rotulo(c, 'Seções', 150, 964);
    ch.secoes.forEach((t, i) => {
        const y = 964 + i * 40;
        rotulo(c, t, 345, y, { tam: 11.5 });
        rotulo(c, `Página ${pagina2((num ?? 0) + 1 + i)}`, 950, y, { tam: 11.5, alinhar: 'right', cor: CINZA });
        fio(c, 345, y + 14, 950, y + 14);
    });
    rotulo(c, 'Visão geral', 150, 1248);
    paragrafo(c, ch.visaoGeral, 400, 1248, 550, { tam: 21, entre: 25.5 });
    rodape(c, num, tituloDe(cap));
}

// a coluna da direita da página da esquerda da matéria: uma mostra da fonte, diferente em cada capítulo
function mostra(c: Ctx, cap: number) {
    const x = 548;
    const l = 425;
    if (cap === 0) {
        // o a da Cut pelo contorno, com os pontos como estão no arquivo da fonte
        const g = glifoDe('Rolado', 'a');
        const tam = 640;
        const gx = x + (l - g.avanco * (tam / 1000)) / 2;
        const base = 640;
        fio(c, x, base, x + l, base, '#b9b7b0', 1);
        fio(c, x, base - 545 * (tam / 1000), x + l, base - 545 * (tam / 1000), '#b9b7b0', 1);
        contorno(c, g, gx, base, tam, COR.cut, { cor: TINTA, esp: 1.4 });
        vertices(c, g, gx, base, tam, 6, PAPEL, TINTA);
        rotulo(c, 'Linha de base', x + l, base + 30, { tam: 11, cor: CINZA, alinhar: 'right' });
        rotulo(c, 'Altura do x', x + l, base - 545 * (tam / 1000) - 14, { tam: 11, cor: CINZA, alinhar: 'right' });
        paragrafo(c, `O a da Cut com os ${g.pedras.reduce((s, p) => s + p.vertices.reduce((t, v) => t + v.length, 0), 0)} pontos do contorno: só retas, uma por golpe.`, x, 730, l, { tam: 18.5, entre: 23.5 });
    } else if (cap === 2) {
        // o revezamento de algumas minúsculas, cada uma em quatro cortes
        rotulo(c, 'Quatro cortes de cada', x, 140, { cor: CINZA });
        const letras = ['aaaa', 'eeee', 'gggg', 'oooo', 'rrrr', 'ssss'];
        letras.forEach((t, i) => {
            const y = 250 + i * 104;
            linha(c, t, x, y, { tam: 82, fam: 'worn', peso: 400 });
            fio(c, x, y + 26, x + l, y + 26);
        });
        paragrafo(c, 'A primeira de cada linha é o desenho de base; as outras três entram sozinhas, na ordem, quando a letra se repete.', x, 900, l, { tam: 18.5, entre: 23.5 });
    }
}

function artigoEsq(c: Ctx, cap: number, num?: number) {
    const ch = CAPITULOS[cap];
    const pc = PRANCHAS_CAP[cap];
    fundo(c, PAPEL);
    moldura(c, pc.esq, 29, 27, 459, 444, pc.legendaEsq);
    fio(c, 519, 27, 519, 1478);
    rotulo(c, ch.secoes[0], 973, 47, { alinhar: 'right', cor: CINZA });
    linha(c, tituloDe(cap), 973, 84, { tam: 32, peso: 400, alinhar: 'right' });
    const corpo = { tam: 18.5, entre: 23.5, justificar: true, recuo: 84 };
    paragrafo(c, ch.corpo[0], 29, 795, 459, corpo);
    const n = contarLinhas(c, ch.corpo[1], 459, corpo);
    paragrafo(c, ch.corpo[1], 29, Math.max(1140, 1436 - (n - 1) * corpo.entre), 459, corpo);
    if (ch.modo === 'dupla') {
        // a abertura dupla não tem a página do título: as seções e a visão geral vêm para a coluna da direita
        if (cap === 1) {
            // em cima, a palavra nos três estilos, para comparar as larguras
            // em cima, a palavra nos três estilos, com a largura de cada uma em unidades da fonte
            rotulo(c, 'A mesma palavra, mais estreita a cada estilo', 548, 160, { cor: CINZA });
            const fams: [Familia, string][] = [['cut', 'Cut'], ['polished', 'Polished'], ['worn', 'Worn']];
            const tam = ajustar(c, 'Rune', { fam: 'cut' }, 360);
            fams.forEach(([fam, nome], i) => {
                const y = 330 + i * 200;
                linha(c, 'Rune', 548, y, { tam, fam, peso: 400 });
                const unidades = Math.round(largura(c, 'Rune', { tam: 1000, fam }));
                rotulo(c, nome, 548, y + 36, { tam: 11, cor: CINZA });
                rotulo(c, `${unidades} unidades`, 973, y + 36, { tam: 11, alinhar: 'right', cor: CINZA });
                fio(c, 548, y + 50, 973, y + 50);
            });
        } else {
            rotulo(c, 'Pedras à parte', 548, 160, { cor: CINZA });
            const tam = ajustar(c, 'ÔÉÃ', { fam: 'cut', semCalt: true }, 425);
            linha(c, 'ÔÉÃ', 548, 420, { tam, fam: 'cut', peso: 400, semCalt: true });
            linha(c, 'ôéã', 548, 720, { tam, fam: 'cut', peso: 400, semCalt: true, cor: COR.laranja });
        }
        rotulo(c, 'Seções', 548, 964);
        ch.secoes.forEach((t, i) => {
            rotulo(c, t, 548, 1004 + i * 34, { tam: 11.5, cor: CINZA });
            fio(c, 548, 1004 + i * 34 + 12, 973, 1004 + i * 34 + 12);
        });
        rotulo(c, 'Visão geral', 548, 1150);
        paragrafo(c, ch.visaoGeral, 548, 1190, 425, { tam: 18.5, entre: 23.5 });
    } else mostra(c, cap);
    rodape(c, num, LIVRO.titulo);
}

function artigoDir(c: Ctx, cap: number, num?: number) {
    const ch = CAPITULOS[cap];
    const pc = PRANCHAS_CAP[cap];
    fundo(c, PAPEL);
    paragrafo(c, ch.corpo[2], 29, 62, 459, { tam: 18.5, entre: 23.5, justificar: true, recuo: 84 });
    moldura(c, pc.dir, 514, 27, 459, 444, pc.legendaDir);
    // a citação na Rune do capítulo, centrada entre a prancha e a do pé
    const cit: Paragrafo = { tam: 54, entre: 60, fam: ch.estilo, peso: 400, alinhar: 'center' };
    const n = contarLinhas(c, ch.citacao, 700, cit);
    paragrafo(c, ch.citacao, 150, 770 - ((n - 1) * cit.entre) / 2, 700, cit);
    prancha(c, pc.pe, 0, 999, 1000, 501);
    // a legenda do pé: clara nas pranchas escuras (os números, a correnteza) e nas da paleta que forem escuras
    const fundoPe: Record<string, string> = { numeros: ESCURA, correnteza: ESCURA, tanto: COR.worn, ploc: COR.polished };
    const cor = tintaSobre(fundoPe[pc.pe] ?? PAPEL);
    rodape(c, num, tituloDe(cap), cor === ESCURA ? undefined : cor);
}

function vegetal(c: Ctx, cap: number) {
    // a impressão do papel vegetal, sobre fundo transparente (a cor do papel vem do shader)
    c.p.limpar();
    const v = CAPITULOS[cap].vegetal;
    rotulo(c, 'Intercalado', 29, 47);
    rotulo(c, 'Papel vegetal, 90 g/m²', 973, 47, { alinhar: 'right' });
    if (v?.desenho === 'construcao') {
        // o R da Cut desenhado pelo contorno, com as linhas da fonte, como um decalque
        const g = glifoDe('R', 'R');
        const tam = 980;
        const gx = (1000 - g.avanco * (tam / 1000)) / 2;
        const base = 1080;
        const linhas: [number, string][] = [[0, 'Linha de base'], [545, 'Altura do x'], [760, 'Maiúscula']];
        for (const [h, nome] of linhas) {
            const y = base - h * (tam / 1000);
            fio(c, 29, y, 973, y, 'rgba(31,31,29,0.55)', 1.1);
            rotulo(c, `${nome} · ${h}`, 973, y - 10, { tam: 11, alinhar: 'right', cor: 'rgba(31,31,29,0.75)' });
        }
        contorno(c, g, gx, base, tam, null, { cor: TINTA, esp: 2.2 });
        vertices(c, g, gx, base, tam, 7, 'rgba(246,245,241,0.9)', TINTA);
        const pontos = g.pedras.reduce((s, pd) => s + pd.vertices.reduce((t, v) => t + v.length, 0), 0);
        rotulo(c, `R · Cut · ${pontos} pontos`, 29, 1240, { cor: 'rgba(31,31,29,0.8)' });
    } else if (v?.desenho === 'cortes') {
        // os quatro e, um por cima do outro, cada um numa cor
        const tam = 1200;
        const base = 1010;
        const cores = ['#1f1f1d', COR.roxo, COR.laranja, COR.wornEscuro];
        const glifos = [glifoDe('Rune', 'e'), PALAVRAS['#e.v2'].glifos[0], PALAVRAS['#e.v3'].glifos[0], PALAVRAS['#e.v4'].glifos[0]];
        glifos.forEach((g, i) => {
            const gx = (1000 - g.avanco * (tam / 1000)) / 2;
            contorno(c, g, gx, base, tam, null, { cor: cores[i], esp: 2.4 });
        });
        ['e', 'e.v2', 'e.v3', 'e.v4'].forEach((nome, i) => {
            const x = 300 + i * 120;
            c.p.ret(x, 1176, 14, 14, cores[i]);
            rotulo(c, nome, x + 22, 1189, { tam: 12 });
        });
        rotulo(c, 'Os quatro cortes do e', 29, 1240, { cor: 'rgba(31,31,29,0.8)' });
    }
    rotulo(c, tituloDe(cap), 29, 1468, { cor: CINZA });
}

// a tabela dos caracteres: cada um numa casa, com fios finos entre as casas
function tabela(c: Ctx, titulo: string, chars: string, y: number, o: { colunas?: number; tam?: number; alto?: number } = {}) {
    const colunas = o.colunas ?? 14;
    const l = 944 / colunas;
    const a = o.alto ?? 70;
    const tam = o.tam ?? 40;
    rotulo(c, titulo, 29, y);
    const lista = Array.from(chars);
    const linhas = Math.ceil(lista.length / colunas);
    const y0 = y + 18;
    for (let j = 0; j <= linhas; j++) fio(c, 29, y0 + j * a, 973, y0 + j * a);
    lista.forEach((ch, i) => {
        const cx = 29 + (i % colunas) * l + l / 2;
        const yy = y0 + Math.floor(i / colunas) * a;
        linha(c, ch, cx, yy + a / 2 + (MAIUSCULA * tam) / 2, { tam, fam: 'cut', peso: 400, alinhar: 'center', semCalt: true });
    });
    return y0 + linhas * a;
}

function caracteresEsq(c: Ctx, num?: number) {
    fundo(c, PAPEL);
    linha(c, 'Letras', 22, 190, { tam: 92 });
    let y = tabela(c, 'Maiúsculas', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 280);
    y = tabela(c, 'Minúsculas', 'abcdefghijklmnopqrstuvwxyz', y + 50);
    tabela(c, 'Acentuadas e outras', 'ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýÿıŒœŠšŸŽžƒªºµ', y + 50);
    rodape(c, num, LIVRO.titulo);
}

function caracteresDir(c: Ctx, num?: number) {
    fundo(c, PAPEL);
    linha(c, 'Sinais', 22, 190, { tam: 92 });
    let y = tabela(c, 'Números e frações', '0123456789¹²³¼½¾', 280);
    y = tabela(c, 'Pontuação', '.,:;…!¡?¿\'"‘’‚“”„«»‹›()[]{}/\\|¦-–—_•·¶§†‡#&@*%‰', y + 50);
    y = tabela(c, 'Símbolos', '$¢£¤¥€+−±×÷=≠≈<>≤≥∞¬^~˜¨´¸`ˆ©®™№°←↑→↓★♥✓', y + 50);
    // as variações não têm caractere próprio: entram pelas trocas, então aparecem em sequência
    rotulo(c, 'Variações', 29, y + 60);
    const seq = ['aaaa', 'bbbb', 'cccc', 'dddd', 'eeee', 'gggg', 'hhhh', 'iiii', 'kkkk', 'mmmm', 'nnnn', 'oooo', 'pppp', 'rrrr', 'ssss', 'tttt', 'uuuu', 'zzzz'];
    seq.forEach((t, i) => {
        const x = 29 + (i % 6) * 157.3;
        const yy = y + 120 + Math.floor(i / 6) * 58;
        linha(c, t, x, yy, { tam: 34, fam: 'cut', peso: 400 });
    });
    rodape(c, num, 'Caracteres');
}

// o colofão, a última página impressa, como nos livros: o selo da editora e, embaixo, como o livro foi feito, num
// bloco curto centrado, sem número de página
function colofao(c: Ctx) {
    fundo(c, PAPEL);
    linha(c, 'Föeger.', 500, 1010, { tam: 56, fam: 'cut', peso: 400, alinhar: 'center' });
    rotulo(c, 'Colofão', 500, 1080, { alinhar: 'center', cor: CINZA });
    paragrafo(
        c,
        'Este espécime foi composto em Föeger Rune Cut, Polished e Worn, com Inter Tight e DM Mono nos textos de apoio. A fonte é a prévia de 5 de novembro de 2026, com 311 glifos em cada estilo e ainda sem o ajuste fino dos pares de letras.',
        250,
        1130,
        500,
        { tam: 18.5, entre: 25, alinhar: 'center' },
    );
    rotulo(c, `${LIVRO.edicao} · Luiz Felipe Föeger`, 500, 1300, { alinhar: 'center', cor: CINZA });
}

// desenha uma página com o pincel e devolve as áreas clicáveis
export function desenharPagina(p: Pincel, pg: Pagina, num?: number): Alvo[] {
    const c: Ctx = { p, alvos: [] };
    switch (pg.tipo) {
        case 'capa':
            capa(c);
            break;
        case 'contracapa':
            contracapa(c);
            break;
        case 'guarda':
            guarda(c);
            break;
        case 'falsa-rosto':
            falsaRosto(c);
            break;
        case 'frontispicio':
            frontispicio(c);
            break;
        case 'rosto':
            rosto(c);
            break;
        case 'creditos':
            creditos(c);
            break;
        case 'sumario':
            sumario(c);
            break;
        case 'estilos-esq':
            estilosEsq(c, num);
            break;
        case 'estilos-dir':
            estilosDir(c, num);
            break;
        case 'abertura-imagem':
            aberturaImagem(c, pg.cap);
            break;
        case 'abertura-titulo':
            aberturaTitulo(c, pg.cap, num);
            break;
        case 'artigo-esq':
            artigoEsq(c, pg.cap, num);
            break;
        case 'artigo-dir':
            artigoDir(c, pg.cap, num);
            break;
        case 'vegetal':
            vegetal(c, pg.cap);
            break;
        case 'caracteres-esq':
            caracteresEsq(c, num);
            break;
        case 'caracteres-dir':
            caracteresDir(c, num);
            break;
        case 'colofao':
            colofao(c);
            break;
    }
    return c.alvos;
}

// as pranchas soltas, para as cópias espalhadas na mesa
export function desenharPrancha(p: Pincel, k: Prancha, l: number, a: number) {
    prancha({ p, alvos: [] }, k, 0, 0, l, a);
}
export type { Prancha };
