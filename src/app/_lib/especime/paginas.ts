// as páginas do espécime, na grade do livro do clone-tantan (unidades de 1/1000 da largura da página, que tem
// 1000 × 1500): margem de 29, rótulos em mono de 12,5, texto corrido de 18,5 com entrelinha de 23,5, título da matéria
// de 32, prancha com moldura e legenda de 459 × 444 e a prancha inteira do pé com 500 de altura. No lugar das fotos
// do tantan entram pranchas de letras da Föeger Rune nas cores dos estilos. Tudo passa pelo pincel (canvas para as
// texturas, SVG para o PDF), e cada página devolve as áreas clicáveis (o sumário) em fração da página.
import { CAPITULOS, COR, EXTRAS, LIVRO, VEGETAIS, type IdCapitulo, type Pagina } from './conteudo';
import { medir, pincelCanvas, TINTA, type Estilo, type Familia, type Familias, type Pincel } from './pincel';
import { PALAVRAS, type Glifo } from '../glifos';
import { PALAVRAS_EXTRA } from '../glifos-extra';
import { ESTILO_MEDIDAS } from '../medidas';
import { PECAS } from '../../_comp/LogoFoeger';

// o que o clique faz: ir ao capítulo (cap), às tabelas dos caracteres, a uma página qualquer (pagina) ou aproximar um
// texto para ler (ler: o corpo do texto, que diz o quanto aproximar)
export type Alvo = { x: number; y: number; l: number; a: number; cap?: number; caracteres?: boolean; pagina?: number; ler?: number };
// destaque: a área clicável sob o mouse, pela ordem em que as áreas entram em alvos (−1 sem nenhuma)
type Ctx = { p: Pincel; alvos: Alvo[]; destaque?: number };

export const PAPEL = '#efeeea';
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

type Paragrafo = { tam: number; entre: number; fam?: Familia; peso?: number; cor?: string; justificar?: boolean; recuo?: number; alinhar?: 'left' | 'right' | 'center'; semCalt?: boolean };
const estiloP = (o: Paragrafo): Estilo => ({ fam: o.fam ?? 'ui', tam: o.tam, peso: o.peso ?? 400, cor: o.cor ?? TINTA, semCalt: o.semCalt });

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

// um texto que o clique aproxima para ler (o motor leva a câmera até ele): a área, com uma folga em volta, e o corpo
function paraLer(c: Ctx, x0: number, y0: number, x1: number, y1: number, tam: number) {
    alvo(c, x0 - 12, y0 - 12, x1 + 12, y1 + 12, { ler: tam });
}
// um parágrafo que dá para aproximar, do alto da primeira linha ao pé da última; devolve a linha de base seguinte
function paragrafoLido(c: Ctx, texto: string, x: number, y: number, larg: number, o: Paragrafo) {
    const fim = paragrafo(c, texto, x, y, larg, o);
    paraLer(c, x, y - o.tam * 0.75, x + larg, fim - o.entre + o.tam * 0.25, o.tam);
    return fim;
}

// o relevo seco da contracapa: a letra mais escura que o pano, com a luz batendo na borda de baixo (as três passadas:
// a luz, a sombra da borda de cima e o miolo afundado)
const RELEVO: [number, number, string][] = [
    [1.4, 1.6, 'rgba(255,250,240,0.07)'],
    [-0.8, -0.9, 'rgba(0,0,0,0.32)'],
    [0, 0, 'rgba(0,0,0,0.16)'],
];
function relevo(c: Ctx, t: string, x: number, y: number, o: Linha) {
    for (const [dx, dy, cor] of RELEVO) linha(c, t, x + dx, y + dy, { ...o, cor });
}

// ---------- a logo da Föeger ----------

// a logo de verdade (a escrita, a do cabeçalho do site: as peças em linha, cada uma no lugar e no giro dela), no lugar
// do nome escrito na fonte. A caixa das peças já postas sai das próprias peças (os caminhos só têm M, L, H, V e Z); a
// linha de base é o pé das letras sem descendente (o g desce dela e o F, um pouco)
// os pontos de um caminho da logo, como estão nele (os caminhos só têm M, L, H, V e Z, absolutos)
function pontosDaPeca(d: string) {
    const pontos: [number, number][] = [];
    let [px, py] = [0, 0];
    for (const [, cmd, args] of d.matchAll(/([MLHVZ])([^MLHVZ]*)/g)) {
        const n = args.trim().split(/[\s,]+/).filter(Boolean).map(Number);
        if (cmd === 'H') n.forEach(v => pontos.push([(px = v), py]));
        else if (cmd === 'V') n.forEach(v => pontos.push([px, (py = v)]));
        else for (let i = 0; i + 1 < n.length; i += 2) pontos.push([(px = n[i]), (py = n[i + 1])]);
    }
    return pontos;
}
// um ponto de uma peça, já no lugar e no giro dela na logo escrita
const pontoNaLogo = (q: [number, number], tx: number, ty: number, r: number, cx: number, cy: number) => {
    const a = (r * Math.PI) / 180;
    return [tx + cx + (q[0] - cx) * Math.cos(a) - (q[1] - cy) * Math.sin(a), ty + cy + (q[0] - cx) * Math.sin(a) + (q[1] - cy) * Math.cos(a)] as const;
};
// a caixa de cada peça já posta, nas contas da logo (pela ordem das peças: o F, o o do ö, os dois pingos, o e, o g, o
// outro e, o r e o ponto), e a da logo inteira
const CAIXAS_DAS_PECAS = PECAS.map(([d, tx, ty, r, cx, cy]) => {
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const q of pontosDaPeca(d)) {
        const [x, y] = pontoNaLogo(q, tx, ty, r, cx, cy);
        [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
    }
    return { x0, y0, x1, y1 };
});
const LOGO = {
    x0: Math.min(...CAIXAS_DAS_PECAS.map(b => b.x0)),
    y0: Math.min(...CAIXAS_DAS_PECAS.map(b => b.y0)),
    x1: Math.max(...CAIXAS_DAS_PECAS.map(b => b.x1)),
    y1: Math.max(...CAIXAS_DAS_PECAS.map(b => b.y1)),
    base: 945,
};

// a logo com a altura de maiúscula de um texto de corpo tam (do topo do F à linha de base), com a linha de base em y e
// alinhada em x como as linhas de texto
function logo(c: Ctx, x: number, y: number, tam: number, cor: string, alinhar: 'left' | 'center' | 'right' = 'left') {
    const k = (tam * MAIUSCULA) / (LOGO.base - LOGO.y0);
    const l = k * (LOGO.x1 - LOGO.x0);
    const ox = alinhar === 'right' ? x - l : alinhar === 'center' ? x - l / 2 : x;
    const oy = y - k * (LOGO.base - LOGO.y0);
    for (const [d, tx, ty, r, cx, cy] of PECAS) {
        const px = ox + k * (tx - LOGO.x0);
        const py = oy + k * (ty - LOGO.y0);
        c.p.girar(r, px + k * cx, py + k * cy, () => c.p.caminho(d, px, py, k, cor));
    }
}

// a logo construída, como o a da Cut com os pontos: cada peça cheia no ocre, com o contorno e os pontos dela,
// centrada em x e com a linha de base em y. Devolve a caixa de cada peça na página, para as chamadas
function logoConstruida(c: Ctx, x: number, y: number, tam: number) {
    const k = (tam * MAIUSCULA) / (LOGO.base - LOGO.y0);
    const ox = x - (k * (LOGO.x1 - LOGO.x0)) / 2;
    const oy = y - k * (LOGO.base - LOGO.y0);
    const naPagina = (lx: number, ly: number) => [ox + k * (lx - LOGO.x0), oy + k * (ly - LOGO.y0)] as const;
    const caixa = (i: number) => {
        const b = CAIXAS_DAS_PECAS[i];
        const [x0, y0] = naPagina(b.x0, b.y0);
        const [x1, y1] = naPagina(b.x1, b.y1);
        return { x0, y0, x1, y1 };
    };
    for (const [d, tx, ty, r, cx, cy] of PECAS) {
        const [px, py] = naPagina(tx, ty);
        c.p.girar(r, px + k * cx, py + k * cy, () => c.p.caminho(d, px, py, k, COR.cut, { cor: TINTA, esp: 1.6 }));
    }
    for (const [d, tx, ty, r, cx, cy] of PECAS)
        for (const q of pontosDaPeca(d)) {
            const [lx, ly] = pontoNaLogo(q, tx, ty, r, cx, cy);
            const [vx, vy] = naPagina(lx, ly);
            c.p.quadrado(vx, vy, 5, PAPEL, { cor: TINTA, esp: 1.2 });
        }
    return caixa;
}

// a logo em relevo seco, como o texto do relevo
function logoEmRelevo(c: Ctx, x: number, y: number, tam: number, alinhar: 'left' | 'center' | 'right' = 'left') {
    for (const [dx, dy, cor] of RELEVO) logo(c, x + dx, y + dy, tam, cor, alinhar);
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
    return (PALAVRAS[palavra] ?? PALAVRAS_EXTRA[palavra]).glifos.find(g => g.ch === ch)!;
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

type Prancha = 'ssss' | 'ploc';

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
    // os quatro cortes do s, um depois do outro, com o nome de cada glifo embaixo (na página ou na dupla)
    ssss(c, x, y, l, a) {
        c.p.ret(x, y, l, a, COR.roxo);
        const claro = COR.claroFrio;
        const pagina = a > l * 0.7;
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
            valor(c, nome, meio, yr, { alinhar: 'center', cor: claro, tam: pagina ? 15 : Math.max(9, a * 0.032) });
        });
    },
    // as onomatopeias na Polished, de borda a borda das duas páginas
    ploc(c, x, y, l, a) {
        c.p.ret(x, y, l, a, COR.polished);
        linhasNaCaixa(c, ['Ploc! Tum!', 'Crás, Bum!'], 'polished', tintaSobre(COR.polished), x, y, l, a, { frac: 0.9, entre: 1.05, alinhar: 'left' });
    },
};

// uma prancha numa caixa da página, cortada pela caixa e pela página
function prancha(c: Ctx, k: Prancha, x: number, y: number, l: number, a: number) {
    c.p.recortar(Math.max(0, x), Math.max(0, y), Math.min(1000, x + l) - Math.max(0, x), Math.min(1500, y + a) - Math.max(0, y), () => PRANCHAS[k](c, x, y, l, a));
}

const pagina2 = (n?: number) => (n ? String(n).padStart(2, '0') : '');

// ---------- a tinta da risografia ----------

// a tinta granulada da risografia, como a das capas impressas assim (a do "Piquenique na estrada"): cada tinta é
// desenhada à parte, com a borda suavizada, e, pixel a pixel, um ruído decide se ela pega. Na borda ela se desfaz em
// pontinhos; no miolo, falha de vez em quando; e a cor ganha manchas largas, mais claras e mais escuras, como a tinta
// que não assenta igual. No papel claro, as tintas são transparentes e multiplicam as de baixo: onde duas se cruzam,
// nasce uma terceira cor, mais escura. No papel escuro, a tinta cobre, como a tinta opaca, e deixa passar só um pouco
// da de baixo (multiplicada, ela sumiria no preto). Sai a página inteira, com o papel, sempre igual (sorteio com semente) e guardada, porque a página é
// redesenhada várias vezes no livro; numa resolução menor que a da página, para o grão ficar grosso
type Rgb = [number, number, number];
type Tinta = { cor: Rgb; desenho: (p: Pincel) => void };
const RISO_L = 820;
const RISO_A = 1230;
const RISOGRAFIAS = new Map<string, HTMLCanvasElement>();
const rgbDe = (hex: string) => [0, 2, 4].map(i => parseInt(hex.replace('#', '').slice(i, i + 2), 16)) as Rgb;

// quanto uma tinta pega em cada pixel (0 é o papel aparecendo) e o tom da mancha ali. A tinta opaca, a que cobre o
// papel escuro, assenta quase por igual, como na impressão de verdade: as manchas largas ficam bem leves (fortes, no
// preto, elas viravam borrões escuros, porque onde a tinta pega menos o papel preto aparece) e ficam o grão fino e a
// borda pontilhada
function tintaGranulada(fam: Familias, semente0: number, desenho: (p: Pincel) => void, opaca = false) {
    const mascara = document.createElement('canvas');
    mascara.width = RISO_L;
    mascara.height = RISO_A;
    desenho(pincelCanvas(mascara.getContext('2d')!, RISO_L / 1000, fam));
    const borrada = document.createElement('canvas');
    borrada.width = RISO_L;
    borrada.height = RISO_A;
    const g = borrada.getContext('2d', { willReadFrequently: true })!;
    g.filter = 'blur(4px)';
    g.drawImage(mascara, 0, 0);
    const d = g.getImageData(0, 0, RISO_L, RISO_A).data;
    const pega = new Float32Array(RISO_L * RISO_A);
    const tom = new Float32Array(RISO_L * RISO_A);
    let semente = semente0;
    const sorteio = () => (semente = (semente * 16807) % 2147483647) / 2147483647;
    // as manchas: uma grade bem pequena de ruído, lida com a interpolação suave (smoothstep), para áreas largas e
    // macias (a grade fina e a interpolação reta deixavam as manchas com cara de quadradinhos)
    const GX = 12;
    const GY = 18;
    const suave = (u: number) => u * u * (3 - 2 * u);
    const grade = Array.from({ length: (GX + 1) * (GY + 1) }, sorteio);
    const ponto = (i: number, j: number) => grade[j * (GX + 1) + i];
    for (let y = 0; y < RISO_A; y++) {
        const fy = (y / RISO_A) * GY;
        const iy = Math.floor(fy);
        const ty = suave(fy - iy);
        for (let x = 0; x < RISO_L; x++) {
            const i = y * RISO_L + x;
            const cob = d[i * 4 + 3] / 255;
            if (cob <= 0) continue;
            const n = sorteio();
            // a falha da tinta no miolo, o papel aparecendo entre os grãos (no papel escuro, a metade: lá ela contrasta mais)
            if (cob <= 0.04 + 0.92 * n || (cob > 0.97 && n > (opaca ? 0.988 : 0.975))) continue;
            const fx = (x / RISO_L) * GX;
            const ix = Math.floor(fx);
            const tx = suave(fx - ix);
            const m = (ponto(ix, iy) * (1 - tx) + ponto(ix + 1, iy) * tx) * (1 - ty) + (ponto(ix, iy + 1) * (1 - tx) + ponto(ix + 1, iy + 1) * tx) * ty;
            // a mancha larga e o grão de cada pixel
            tom[i] = opaca ? 0.96 + 0.07 * m + (sorteio() - 0.5) * 0.06 : 0.86 + 0.24 * m + (sorteio() - 0.5) * 0.14;
            pega[i] = opaca ? 0.95 + 0.05 * m : 0.78 + 0.22 * m;
        }
    }
    return { pega, tom };
}

// as tintas no papel, cada uma multiplicando as de baixo ou cobrindo-as
function risografia(chave: string, fam: Familias, papel: Rgb, tintas: Tinta[], modo: 'multiplica' | 'cobre' = 'multiplica') {
    const pronta = RISOGRAFIAS.get(chave);
    if (pronta) return pronta;
    const n = RISO_L * RISO_A;
    const cor = new Float32Array(n * 3);
    const cobre = modo === 'cobre';
    // o papel escuro com um grão bem fraco, como o das fibras do papel de verdade (sorteio com semente, sempre igual)
    let semente = 5;
    const sorteio = () => (semente = (semente * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < n; i++) {
        const fibra = cobre ? (sorteio() - 0.5) * 5 : 0;
        cor[i * 3] = papel[0] + fibra;
        cor[i * 3 + 1] = papel[1] + fibra;
        cor[i * 3 + 2] = papel[2] + fibra;
    }
    tintas.forEach((t, k) => {
        const { pega, tom } = tintaGranulada(fam, 11 + 12 * k, t.desenho, cobre);
        for (let i = 0; i < n; i++) {
            const a = (cobre ? 0.86 : 1) * pega[i];
            if (!a) continue;
            for (let ch = 0; ch < 3; ch++) {
                const tinta = Math.min(255, t.cor[ch] * tom[i]);
                const j = i * 3 + ch;
                cor[j] = cobre ? cor[j] * (1 - a) + tinta * a : cor[j] * (1 - a + (a * tinta) / 255);
            }
        }
    });
    const tela = document.createElement('canvas');
    tela.width = RISO_L;
    tela.height = RISO_A;
    const g = tela.getContext('2d')!;
    const img = g.createImageData(RISO_L, RISO_A);
    for (let i = 0; i < n; i++) {
        img.data[i * 4] = cor[i * 3];
        img.data[i * 4 + 1] = cor[i * 3 + 1];
        img.data[i * 4 + 2] = cor[i * 3 + 2];
        img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    RISOGRAFIAS.set(chave, tela);
    return tela;
}

// ---------- as páginas ----------

// a capa da frente, como as capas de livros de tipografia de verdade: uma ideia grande e o texto miúdo. As três
// passadas do R, uma por estilo (Cut, Polished e Worn), descendo em diagonal no meio da capa, cada uma na cor do estilo
// no site (o ocre, o azul e o verde), em tinta granulada de risografia que cobre (um pouco transparente, para o
// cruzamento delas aparecer), sobre o pano preto; o autor e o título no alto, os quadradinhos de marca no canto, como
// nos espécimes das fundições, e a marca no pé. O relevo seco fica só na contracapa: na frente ele sumia no pano. As
// outras propostas (em outros papéis, num rótulo colado, com a cinta ou chapadas no azul fundo) estão no histórico
const CREME = '#f1ece1';
// o pano preto da capa dura, um pouco quente
const PRETO = '#151413';

// os quadradinhos e o fio de marca, no canto (x, y é o canto de cima à esquerda do grupo)
function marcas(c: Ctx, x: number, y: number, cor: string) {
    c.p.ret(x, y, 14, 14, cor);
    c.p.ret(x + 20, y, 14, 14, cor);
    c.p.borda(x + 40, y, 14, 14, { cor, esp: 1.6 });
    fio(c, x, y + 26, x + 110, y + 26, cor, 1.6);
}

function capa(c: Ctx) {
    // o grupo das três centrado na largura e na altura entre o título e a marca do pé
    const tam = 760;
    const [dx, dy] = [168, 150];
    const estilos: Familia[] = ['cut', 'polished', 'worn'];
    const cores = [COR.cut, COR.polished, COR.worn];
    const largo = Math.max(...estilos.map((fam, i) => i * dx + largura(c, 'R', { tam, fam, peso: 400, semCalt: true })));
    const alto = MAIUSCULA * tam + 2 * dy;
    const x0 = 500 - largo / 2;
    const base0 = 822 - alto / 2 + MAIUSCULA * tam;
    const tintas = estilos.map((fam, i): Tinta => ({ cor: rgbDe(cores[i]), desenho: q => q.texto('R', x0 + i * dx, base0 + i * dy, { tam, fam, peso: 400, cor: '#000', semCalt: true }) }));
    // a chave leva as cores, que mudam com a paleta da página
    c.p.imagem(risografia(`capa-${PRETO}-${cores.join('-')}`, c.p.fam, rgbDe(PRETO), tintas, 'cobre'), 0, 0, 1000, 1500, true);
    linha(c, 'Luiz Föeger', 64, 110, { tam: 26, peso: 600, cor: CREME });
    linha(c, 'Föeger Rune: espécime tipográfico', 64, 230, { tam: 36, peso: 700, cor: CREME });
    marcas(c, 826, 90, CREME);
    logo(c, 936, 1440, 36, CREME, 'right');
}

// a contracapa, do mesmo pano preto da capa: o nome no meio, a frase do livro e o selo da editora no pé, tudo em relevo
// seco, bem discreto no preto
function contracapa(c: Ctx) {
    c.p.ret(0, 0, 1000, 1500, PRETO);
    relevo(c, 'Föeger Rune', 500, 770, { tam: 76, fam: 'cut', peso: 400, alinhar: 'center' });
    relevo(c, LIVRO.frase, 500, 860, { tam: 34, fam: 'polished', peso: 400, alinhar: 'center' });
    logoEmRelevo(c, 500, 1436, 46, 'center');
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

// o frontispício, a ilustração de frente para a folha de rosto, como nos livros: o R nos três estilos quase um em cima
// do outro, fora de registro, cada um na tinta do seu estilo no site (o ocre da Cut, o azul da Polished e o verde da
// Worn), em tinta granulada de risografia. Onde os três se cruzam, a tinta escurece; o que sobra de cada um nas bordas
// é o desgaste de um estilo para o outro. A legenda no pé, como nas aberturas dos capítulos
function frontispicio(c: Ctx) {
    const tam = 860;
    const estilos: Familia[] = ['cut', 'polished', 'worn'];
    const cores = [COR.cut, COR.polished, COR.worn];
    // o quanto cada passada sai do lugar (a do meio fica nele); o grupo centrado na largura e um pouco acima do meio
    const desvios: [number, number][] = [
        [-36, -21],
        [0, 0],
        [36, 21],
    ];
    const tintas = estilos.map((fam, i): Tinta => {
        const x = 500 - largura(c, 'R', { tam, fam, peso: 400, semCalt: true }) / 2 + desvios[i][0];
        const y = 720 + (MAIUSCULA * tam) / 2 + desvios[i][1];
        return { cor: rgbDe(cores[i]), desenho: q => q.texto('R', x, y, { tam, fam, peso: 400, cor: '#000', semCalt: true }) };
    });
    // a chave leva as cores, que mudam com a paleta da página
    c.p.imagem(risografia(`frontispicio-${PAPEL}-${cores.join('-')}`, c.p.fam, rgbDe(PAPEL), tintas), 0, 0, 1000, 1500, true);
    legendaDe(c, ['Föeger Rune Cut, Polished e Worn', 'O R fora de registro'], CINZA);
}

function creditos(c: Ctx) {
    fundo(c, PAPEL);
    const itens: [string, string][] = [
        ['Edição', LIVRO.edicao],
        ['Desenho da fonte, textos e projeto gráfico', 'Luiz Föeger'],
        ['Composto em', 'Föeger Rune Cut, Polished e Worn, com Inter Tight e DM Mono nos textos de apoio'],
        ['Versão da fonte', 'Prévia de 5 de novembro de 2026, com 311 glifos em cada estilo'],
    ];
    let y = 720;
    for (const [nome, valor] of itens) {
        rotulo(c, nome, 29, y, { tam: 11.5, cor: CINZA });
        y = paragrafo(c, valor, 29, y + 30, 560, { tam: 18.5, entre: 23.5 }) + 28;
    }
    paraLer(c, 29, 705, 589, y - 46, 18.5);
    // a ficha de catalogação, como a que vem no verso da folha de rosto, em mono numa caixa de fio fino
    const fx = 29;
    const fy = 1110;
    const fl = 620;
    const fa = 250;
    c.p.borda(fx, fy, fl, fa, { cor: FIO, esp: 1.3 });
    paraLer(c, fx, fy, fx + fl, fy + fa, 13.5);
    rotulo(c, 'Dados para catalogação', fx + 22, fy + 38, { tam: 11, cor: CINZA });
    const mono = (t: string, x: number, yy: number) => linha(c, t, x, yy, { tam: 13.5, fam: 'mono', peso: 400 });
    mono('Föeger, Luiz Felipe', fx + 22, fy + 82);
    mono('Föeger Rune: espécime tipográfico /', fx + 52, fy + 104);
    mono('Luiz Föeger. — Edição 01. — 2026.', fx + 22, fy + 126);
    mono(`${EXTRAS.paginas ?? ''} p. : il. color.`, fx + 52, fy + 148);
    mono('1. Tipografia. 2. Fontes tipográficas.', fx + 52, fy + 192);
    mono('3. Design gráfico. I. Título.', fx + 52, fy + 214);
    linha(c, '© 2026 Luiz Felipe Föeger. Todos os direitos reservados.', 29, 1440, { tam: 16.5, peso: 400 });
}

// a folha de rosto, de frente para o frontispício e no mesmo eixo dele, como as folhas de rosto clássicas: o título na
// Cut e o subtítulo; embaixo, a chave das tintas do frontispício, como nas provas de impressão (um quadrado de cada
// tinta, com o nome do estilo na grotesca, em negrito); o autor mais abaixo e, no pé, o selo da editora com a edição e
// o ano. Sem cabeço nem frase (a frase do livro fica na contracapa)
function rosto(c: Ctx) {
    fundo(c, PAPEL);
    const tam = ajustar(c, 'Föeger Rune', { fam: 'cut', peso: 400 }, 640);
    linha(c, 'Föeger Rune', 500, 440, { tam, fam: 'cut', peso: 400, alinhar: 'center' });
    linha(c, 'Espécime tipográfico', 500, 528, { tam: 42, alinhar: 'center' });
    // a chave das tintas: o quadrado da altura da maiúscula da grotesca (a da Inter Tight, 0,727 do corpo) e o nome, os
    // três numa linha centrada
    const nome = { tam: 28, peso: 700 };
    const lado = 0.727 * nome.tam;
    const vao = 12;
    const entre = 44;
    const chaves: [string, string][] = [
        ['Cut', COR.cut],
        ['Polished', COR.polished],
        ['Worn', COR.worn],
    ];
    const largos = chaves.map(([t]) => lado + vao + largura(c, t, nome));
    let x = 500 - (largos.reduce((s, l) => s + l, 0) + entre * (chaves.length - 1)) / 2;
    const base = 650;
    chaves.forEach(([t, cor], i) => {
        c.p.ret(x, base - lado, lado, lado, cor);
        linha(c, t, x + lado + vao, base, nome);
        x += largos[i] + entre;
    });
    linha(c, 'Luiz Föeger', 500, 1060, { tam: 36, peso: 400, alinhar: 'center' });
    logo(c, 500, 1392, 40, TINTA, 'center');
    rotulo(c, LIVRO.edicao, 500, 1450, { alinhar: 'center', cor: CINZA });
}

// o sumário em lista, numa página da direita depois dos créditos (p. 5), como nos livros de verdade: o título na
// grotesca leve, como "Letras" e "Sinais", e uma linha por parte principal, em texto simples, com fio embaixo: o número
// do capítulo em mono, o título e a página onde a parte começa, à direita. Embaixo de cada capítulo, as seções mais
// importantes, recuadas, em cinza e um pouco menores. Toda linha é clicável e acende em laranja com o mouse em cima (o
// motor redesenha a página): a de um capítulo leva à abertura dele, a dos caracteres às tabelas e as outras (a
// apresentação, as seções e o colofão) direto à página delas
const SUMARIO_PARTE = 84;
const SUMARIO_SECAO = 56;
type Destino = Omit<Alvo, 'x' | 'y' | 'l' | 'a'>;

// uma linha do sumário; devolve onde começa a seguinte
function linhaDoSumario(c: Ctx, y: number, o: { n?: string; titulo: string; pagina?: number; destino: Destino; secao?: boolean }) {
    const aceso = c.destaque === c.alvos.length;
    const alto = o.secao ? SUMARIO_SECAO : SUMARIO_PARTE;
    const cor = aceso ? COR.laranja : o.secao ? CINZA : TINTA;
    const pg = o.pagina ? pagina2(o.pagina) : '';
    if (o.secao) {
        linha(c, o.titulo, 142, y + 40, { tam: 36, peso: 300, cor });
        linha(c, pg, 973, y + 40, { tam: 34, peso: 300, alinhar: 'right', cor });
        fio(c, 142, y + alto, 973, y + alto);
    } else {
        if (o.n) rotulo(c, o.n, 29, y + 54, { cor: aceso ? COR.laranja : CINZA });
        linha(c, o.titulo, 112, y + 58, { tam: 46, peso: 300, cor });
        linha(c, pg, 973, y + 58, { tam: 34, peso: 300, alinhar: 'right', cor });
        fio(c, 29, y + alto, 973, y + alto);
    }
    alvo(c, 20, y + 3, 980, y + alto - 3, o.destino);
    return y + alto;
}

function sumario(c: Ctx) {
    fundo(c, PAPEL);
    linha(c, 'Sumário', 22, 190, { tam: 92 });
    let y = 262;
    fio(c, 29, y, 973, y);
    y = linhaDoSumario(c, y, { titulo: 'Apresentação', pagina: EXTRAS.apresentacao, destino: { pagina: EXTRAS.apresentacao } });
    CAPITULOS.forEach((ch, i) => {
        const p0 = ch.paginas?.[0];
        y = linhaDoSumario(c, y, { n: pagina2(ch.n), titulo: ch.titulo, pagina: p0, destino: { cap: i } });
        for (const { nome, k } of ch.secoes.filter(x => x.sumario)) {
            const pagina = p0 !== undefined ? p0 + 1 + k : undefined;
            y = linhaDoSumario(c, y, { titulo: nome, pagina, destino: { pagina }, secao: true });
        }
    });
    y = linhaDoSumario(c, y, { titulo: 'Os caracteres', pagina: EXTRAS.letras, destino: { caracteres: true } });
    const partes: [string, number | undefined][] = [
        ['Letras', EXTRAS.letras],
        ['Acentos', EXTRAS.acentos],
        ['Sinais', EXTRAS.sinais],
    ];
    for (const [t, pagina] of partes) y = linhaDoSumario(c, y, { titulo: t, pagina, destino: { pagina }, secao: true });
    linhaDoSumario(c, y, { titulo: 'Colofão', pagina: EXTRAS.colofao, destino: { pagina: EXTRAS.colofao } });
}

// os três estilos na cor de cada um, com o nome e o Aa no próprio estilo (a apresentação)
const ESTILOS: [Familia, string, () => string][] = [
    ['cut', 'Cut', () => COR.cut],
    ['polished', 'Polished', () => COR.polished],
    ['worn', 'Worn', () => COR.worn],
];

// o corpo do texto das páginas de abertura (a apresentação, a história da logo e as introduções dos capítulos)
const TEXTO: Paragrafo = { tam: 26, entre: 34 };

// a história da logo, na página da direita, de frente para a apresentação: no alto, a logo da Föeger construída peça por
// peça, com os pontos e as chamadas numeradas; o texto da origem, na altura do texto da apresentação; e a lista do que
// passou da logo para a fonte, como as tabelas das introduções, com o número de cada chamada, na altura dos quadros dos
// estilos da página ao lado. As chamadas: em que peças (pela ordem de PECAS: o F, o o do ö, os dois pingos, o e, o g, o
// outro e, o r e o ponto) e de que lado delas
const DA_LOGO: { texto: string; chamadas: { pecas: number[]; lado: 'cima' | 'baixo' | 'esq' }[] }[] = [
    { texto: 'Cada letra é uma peça só de retas, sem nenhuma curva: é de onde vem a Cut.', chamadas: [{ pecas: [0], lado: 'esq' }] },
    {
        texto: 'Os pingos do ö e o ponto são pedras soltas, como os acentos da fonte.',
        chamadas: [
            { pecas: [2, 3], lado: 'cima' },
            { pecas: [8], lado: 'baixo' },
        ],
    },
    {
        texto: 'Os dois e têm cortes diferentes: o segundo virou a primeira variação do e.',
        chamadas: [
            { pecas: [4], lado: 'cima' },
            { pecas: [6], lado: 'cima' },
        ],
    },
];

// o número de uma chamada, num círculo cheio
function chamada(c: Ctx, n: number, x: number, y: number) {
    c.p.circulo(x, y, 16, TINTA);
    linha(c, String(n), x, y + 5.5, { tam: 16, fam: 'mono', peso: 400, cor: PAPEL, alinhar: 'center' });
}

function paginaDaLogo(c: Ctx, num?: number) {
    fundo(c, PAPEL);
    rotulo(c, 'A origem', 29, 70, { cor: CINZA });
    const caixa = logoConstruida(c, 500, 332, 260);
    DA_LOGO.forEach(({ chamadas }, i) => {
        for (const { pecas, lado } of chamadas) {
            const bs = pecas.map(caixa);
            const x0 = Math.min(...bs.map(b => b.x0));
            const x1 = Math.max(...bs.map(b => b.x1));
            const y0 = Math.min(...bs.map(b => b.y0));
            const y1 = Math.max(...bs.map(b => b.y1));
            if (lado === 'esq') chamada(c, i + 1, x0 - 36, (y0 + y1) / 2);
            else chamada(c, i + 1, (x0 + x1) / 2, lado === 'cima' ? y0 - 32 : y1 + 32);
        }
    });
    paragrafoLido(
        c,
        'Antes da fonte, veio a logo da Föeger: seis letras e um ponto, feitos de peças só de retas, como pedras encaixadas. A ideia foi não parar nela. Das letras da logo saiu um alfabeto inteiro no mesmo traço, com os números, os acentos e os sinais, e depois as variações, para a mesma letra não sair sempre igual.',
        29,
        460,
        760,
        TEXTO,
    );
    // o que passou da logo para a fonte, uma linha por chamada
    const y0 = 914;
    rotulo(c, 'Da logo para a fonte', 29, y0);
    let y = y0;
    DA_LOGO.forEach(({ texto }, i) => {
        chamada(c, i + 1, 345 + 16, y - 9);
        const fim = paragrafo(c, texto, 393, y, 580, TEXTO);
        fio(c, 345, fim - TEXTO.entre + 20, 973, fim - TEXTO.entre + 20);
        y = fim - TEXTO.entre + 72;
    });
    paraLer(c, 345, y0 - 30, 973, y - 52, TEXTO.tam);
    rodape(c, num, 'Apresentação');
}

// a apresentação, no verso do sumário: o livro em poucas linhas e os três estilos, cada um num quadro da cor dele
function apresentacao(c: Ctx, num?: number) {
    fundo(c, PAPEL);
    rotulo(c, 'Apresentação', 29, 70, { cor: CINZA });
    linha(c, 'Uma pedra,', 22, 230, { tam: 92 });
    linha(c, 'três desgastes.', 22, 332, { tam: 92 });
    paragrafoLido(c, LIVRO.apresentacao, 29, 460, 760, TEXTO);
    ESTILOS.forEach(([fam, nome, cor], i) => {
        const x = 29 + i * 322;
        const fundoCor = cor();
        const tinta = tintaSobre(fundoCor);
        c.p.ret(x, 860, 300, 500, fundoCor);
        linha(c, nome, x + 24, 914, { tam: 26, peso: 700, cor: tinta });
        linha(c, 'Aa', x + 150, 1260, { tam: 210, fam, peso: 400, cor: tinta, alinhar: 'center' });
    });
    rodape(c, num, LIVRO.titulo);
}

function legendaDe(c: Ctx, l: [string, string], cor: string) {
    rotulo(c, l[0], 29, 1440, { cor });
    rotulo(c, l[1], 29, 1462, { cor });
}

// ---------- os capítulos ----------

// a página de cor que abre cada assunto, à esquerda da introdução (com o vegetal entre as duas): só a cor chapada, que
// vira o fundo do vegetal quando ele é virado por cima dela. Uma cor por assunto: o ocre da Cut, o azul da Polished, o
// verde da Worn, a terracota e, nos caracteres, o azul fundo
const CORES_DOS_ASSUNTOS: Record<IdCapitulo, () => string> = {
    construcao: () => COR.cut,
    estilos: () => COR.polished,
    variacoes: () => COR.worn,
    tamanhos: () => COR.laranja,
};
function paginaDeCor(c: Ctx, cap: number) {
    fundo(c, cap < CAPITULOS.length ? CORES_DOS_ASSUNTOS[CAPITULOS[cap].id]() : COR.roxo);
}

// a introdução do capítulo, na página da direita, embaixo do vegetal, como as dos livros de verdade. No alto, o número
// do capítulo em mono; o número de novo, enorme, na Polished e na cor do assunto (a da página de cor ao lado), e o
// título numa linha, na grotesca leve; a epígrafe em letra normal, como um subtítulo; e, no corpo do texto da
// apresentação, as seções, como uma tabela de uma coluna com a página de cada uma, e a visão geral do capítulo
function abertura(c: Ctx, cap: number, num?: number) {
    const ch = CAPITULOS[cap];
    const intro = (ch.paginas?.[0] ?? 0) + 1;
    fundo(c, PAPEL);
    fio(c, 29, 22, 973, 22);
    rotulo(c, `Capítulo ${ch.n}`, 29, 70, { cor: CINZA });
    linha(c, String(ch.n), 14, 500, { tam: 500, fam: 'polished', peso: 400, cor: CORES_DOS_ASSUNTOS[ch.id](), semCalt: true });
    linha(c, ch.titulo, 24, 620, { tam: Math.min(76, ajustar(c, ch.titulo, {}, 944)) });
    paragrafo(c, ch.epigrafe, 29, 700, 760, { tam: 40, entre: 50, peso: 300 });
    // as seções e a visão geral no corpo do texto da apresentação
    const ySecoes = 880;
    const passo = 56;
    rotulo(c, 'Seções', 29, ySecoes);
    ch.secoes.forEach(({ nome, k }, i) => {
        const y = ySecoes + i * passo;
        linha(c, nome, 345, y, { tam: TEXTO.tam, peso: 400 });
        linha(c, `Página ${pagina2(intro + k)}`, 973, y, { tam: TEXTO.tam, peso: 400, alinhar: 'right', cor: CINZA });
        fio(c, 345, y + 20, 973, y + 20);
    });
    paraLer(c, 345, ySecoes - TEXTO.tam, 973, ySecoes + (ch.secoes.length - 1) * passo + 20, TEXTO.tam);
    const yVisao = Math.max(1130, ySecoes + ch.secoes.length * passo + 90);
    rotulo(c, 'Visão geral', 29, yVisao);
    paragrafoLido(c, ch.visaoGeral, 345, yVisao, 628, TEXTO);
    rodape(c, num, ch.titulo);
}

// ---------- as matérias dos capítulos ----------

// as matérias seguem as páginas dos espécimes de fundição (a referência é o livro da Studio Feixen): cada dupla trata
// de um assunto só, com o cabeçalho em duas colunas na cor de destaque (a fonte e o estilo à esquerda, o assunto à
// direita), a letra grande, caixas com o nome do que mostram e os números de verdade da fonte

// os pontos de tipografia de um corpo da página no PDF (a folha tem 396 pt de largura para 1000 unidades)
const pt = (tam: number) => `${Math.round(tam * 0.396)} pt`;
const GRADE = '#e3e1db';
const FAIXA = '#dcdad3';
// os tons claros dos realces, um por estilo (o ocre da Cut, o azul da Polished, o verde da Worn) e o cinza
const REALCES = ['#f2dfb4', '#d9e1f4', '#d3eadf', '#e2e0da'];

// o cabeçalho da matéria: duas colunas, cada uma com uma ou duas linhas (x0 desloca o que é desenhado de uma vez nas
// duas páginas da dupla)
function cabeca(c: Ctx, esq: string[], dir: string[], x0 = 0) {
    const o: Linha = { tam: 44, peso: 400, cor: COR.laranja };
    esq.forEach((t, i) => linha(c, t, x0 + 27, 112 + i * 47, o));
    dir.forEach((t, i) => linha(c, t, x0 + 500, 112 + i * 47, o));
}

// o rodapé das matérias: o nome do livro à esquerda e o do capítulo à direita
const rodapeDaMateria = (c: Ctx, cap: number, num?: number) => rodape(c, num, num !== undefined && num % 2 === 1 ? CAPITULOS[cap].titulo : LIVRO.titulo);

// um valor junto dos rótulos (o mono deles, mas sem a caixa alta, que trocava o σ por Σ)
const valor = (c: Ctx, t: string, x: number, y: number, o: { alinhar?: 'left' | 'right' | 'center'; cor?: string; tam?: number } = {}) =>
    linha(c, t, x, y, { tam: o.tam ?? 12.5, fam: 'mono', peso: 400, espaco: 0.05, cor: o.cor, alinhar: o.alinhar });

// os nomes de uma amostra, em cima dela: o do que ela mostra à esquerda e o outro na coluna do meio (nas caixas da
// largura da página, como o cabeçalho) ou no fim da linha
function nomesDaAmostra(c: Ctx, esq: string, dir: string, x: number, y: number, l: number, meio = l > 700) {
    linha(c, esq, x, y, { tam: 20, peso: 500 });
    if (dir) linha(c, dir, meio ? x + 471 : x + l, y, { tam: 20, peso: 500, alinhar: meio ? 'left' : 'right' });
}

// uma caixa de amostra, como as dos espécimes: os nomes em cima e a moldura fina
function caixaDeAmostra(c: Ctx, x: number, y: number, l: number, a: number, esq: string, dir = '') {
    nomesDaAmostra(c, esq, dir, x, y - 14, l);
    c.p.borda(x, y, l, a, { cor: TINTA, esp: 1.3 });
}

// a linha-guia de uma caixa (a base, a altura do x), com os traços que saem dos lados, como nos espécimes
function guia(c: Ctx, x: number, l: number, y: number) {
    fio(c, x, y, x + l, y, GRADE, 1.2);
    fio(c, x - 14, y, x, y, TINTA, 1.2);
    fio(c, x + l, y, x + l + 14, y, TINTA, 1.2);
}

// um retângulo de cantos redondos, em unidades da página (a pílula das etiquetas e a marca da Polished)
const retRedondo = (x: number, y: number, l: number, a: number, r: number) =>
    `M${x + r} ${y}H${x + l - r}A${r} ${r} 0 0 1 ${x + l} ${y + r}V${y + a - r}A${r} ${r} 0 0 1 ${x + l - r} ${y + a}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + a - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;

// a etiqueta de borda redonda (o corpo de uma linha, o nome de um corte), com o meio da altura em y; devolve a largura
function etiqueta(c: Ctx, t: string, x: number, y: number, o: { alinhar?: 'left' | 'center' | 'right'; cor?: string; fundo?: string } = {}) {
    const e: Linha = { tam: 17, peso: 500, cor: o.cor ?? TINTA };
    const l = largura(c, t, e) + 24;
    const x0 = o.alinhar === 'right' ? x - l : o.alinhar === 'center' ? x - l / 2 : x;
    c.p.caminho(retRedondo(x0, y - 15, l, 30, 15), 0, 0, 1, o.fundo ?? PAPEL, { cor: o.cor ?? TINTA, esp: 1.3 });
    linha(c, t, x0 + 12, y + 6, e);
    return l;
}

// a marca de cada estilo, como a quina dele: o quadrado da Cut, o quadrado de cantos redondos da Polished e o círculo
// da Worn
function marcaDoEstilo(c: Ctx, fam: Familia, x: number, y: number, lado: number, cor: string) {
    if (fam === 'worn') c.p.circulo(x + lado / 2, y + lado / 2, lado / 2, cor);
    else if (fam === 'polished') c.p.caminho(retRedondo(x, y, lado, lado, lado * 0.3), 0, 0, 1, cor);
    else c.p.ret(x, y, lado, lado, cor);
}

// a cota: a medida entre dois pontos, com os traços nas pontas e o número embaixo
function cota(c: Ctx, x0: number, x1: number, y: number, t: string, cor = TINTA) {
    fio(c, x0, y, x1, y, cor, 1.2);
    fio(c, x0, y - 10, x0, y + 10, cor, 1.2);
    fio(c, x1, y - 10, x1, y + 10, cor, 1.2);
    linha(c, t, (x0 + x1) / 2, y + 34, { tam: 20, peso: 500, cor, alinhar: 'center' });
}

// onde cada letra de uma linha começa e acaba, já com as trocas da fonte (a largura do pedaço que vem antes dela)
function posicoes(c: Ctx, t: string, o: Linha) {
    const letras = Array.from(t);
    const xs = letras.map((_, i) => (i ? largura(c, letras.slice(0, i).join(''), o) : 0));
    xs.push(largura(c, t, o));
    return letras.map((ch, i) => ({ ch, x0: xs[i], x1: xs[i + 1] }));
}

// a caixa dos pontos de uma letra, em unidades da fonte, com x a partir da origem dela e y para baixo
function caixaDaLetra(g: Glifo) {
    const pontos = g.pedras.flatMap(pd => pd.vertices.flat());
    const xs = pontos.map(([x]) => x - g.x);
    const ys = pontos.map(([, y]) => y);
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys), pontos: pontos.length };
}

// a lupa, a mesma do ponteiro do livro: o vidro e o aro lascados (faces de tamanhos diferentes, como as letras da Cut)
// e o cabo à parte, a 45°, separado do aro por uma fresta; dentro, o desenho aumentado
const QUINAS_DA_LUPA: [number, number][] = [
    [0, 1.011],
    [33, 0.978],
    [64, 1.022],
    [98, 0.989],
    [131, 1.016],
    [163, 0.973],
    [196, 1.011],
    [229, 0.984],
    [262, 1.022],
    [295, 0.989],
    [328, 1],
];
const lascado = (cx: number, cy: number, r: number) =>
    QUINAS_DA_LUPA.map(([g, k]) => [cx + r * k * Math.cos((g * Math.PI) / 180), cy + r * k * Math.sin((g * Math.PI) / 180)] as [number, number]);
const poligono = (pontos: [number, number][]) => `M${pontos.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}Z`;
function lupa(c: Ctx, cx: number, cy: number, r: number, dentro: () => void) {
    const vidro = lascado(cx, cy, r);
    c.p.recortarCaminho(poligono(vidro), () => {
        c.p.ret(cx - r * 1.1, cy - r * 1.1, r * 2.2, r * 2.2, PAPEL);
        dentro();
    });
    const aro = r * 0.075;
    c.p.caminho(poligono(lascado(cx, cy, r + aro)) + poligono([...vidro].reverse()), 0, 0, 1, TINTA);
    const meia = (r * 0.085) / Math.SQRT2;
    const ponto = (d: number) => [cx + d / Math.SQRT2, cy + d / Math.SQRT2];
    const [ax, ay] = ponto(r + aro + r * 0.06);
    const [bx, by] = ponto(r + aro + r * 0.68);
    c.p.caminho(
        poligono([
            [ax - meia, ay + meia],
            [ax + meia, ay - meia],
            [bx + meia, by - meia],
            [bx - meia, by + meia],
        ]),
        0,
        0,
        1,
        TINTA,
    );
}

// ---- capítulo 1: a construção das letras ----

// os pontos de construção de uma letra da Cut, na página inteira: a letra na grade, com as faixas da base e da altura
// do x, os pontos do arquivo da fonte e, junto de cada um, as coordenadas dele (em unidades do eme, com y para cima,
// como no arquivo), sempre para fora do anel do ponto: nos furos, elas ficam na tinta, onde há espaço
function pontosDeConstrucao(c: Ctx, cap: number, num: number | undefined, g: Glifo, nome: string, texto: string) {
    fundo(c, PAPEL);
    cabeca(c, ['Föeger Rune', 'Cut'], ['Pontos de', `construção – ${nome}`]);
    const [x, y, l, a] = [29, 236, 944, 1090];
    for (let gx = x + 59; gx < x + l - 1; gx += 59) fio(c, gx, y, gx, y + a, GRADE, 1);
    for (let gy = y + 59; gy < y + a - 1; gy += 59) fio(c, x, gy, x + l, gy, GRADE, 1);
    const k = 1.3;
    const base = y + a - 130;
    const caixa = caixaDaLetra(g);
    const ox = 500 - (k * (caixa.x0 + caixa.x1)) / 2;
    const linhas: [number, string][] = [
        [0, 'Linha de base 0'],
        [545, 'Altura do x 545'],
    ];
    for (const [v, nomeLinha] of linhas) {
        const yy = base - v * k;
        c.p.ret(x, yy - 11, l, 22, FAIXA);
        guia(c, x, l, yy);
        rotulo(c, nomeLinha, x + 14, yy - 22, { cor: CINZA });
    }
    c.p.borda(x, y, l, a, { cor: TINTA, esp: 1.3 });
    contorno(c, g, ox, base, k * 1000, COR.cut, { cor: TINTA, esp: 2.2 });
    for (const pd of g.pedras)
        pd.vertices.forEach(anel => {
            const mx = anel.reduce((s, [vx]) => s + vx, 0) / anel.length;
            const my = anel.reduce((s, [, vy]) => s + vy, 0) / anel.length;
            for (const [vx, vy] of anel) {
                let [dx, dy] = [vx - mx, vy - my];
                const d = Math.hypot(dx, dy) || 1;
                [dx, dy] = [dx / d, dy / d];
                const px = ox + (vx - g.x) * k + dx * 26;
                const py = base + vy * k + dy * 26 + 5;
                linha(c, `${vx - g.x},${-vy}`, px, py, { tam: 15, fam: 'mono', peso: 400, alinhar: dx > 0.35 ? 'left' : dx < -0.35 ? 'right' : 'center' });
            }
        });
    vertices(c, g, ox, base, k * 1000, 8, PAPEL, TINTA);
    paragrafoLido(c, texto, x, y + a + 48, l, { tam: 22, entre: 28 });
    rodapeDaMateria(c, cap, num);
}

// as linhas da fonte, numa palavra com acento e descendente, e os números da construção
function linhasDaFonte(c: Ctx, cap: number, num?: number) {
    fundo(c, PAPEL);
    cabeca(c, ['Föeger Rune', 'Cut'], ['As linhas', 'da fonte']);
    const palavra = PALAVRAS['Água'];
    const k = 760 / palavra.largura;
    const ox = 213;
    const base = 660;
    const acento = -Math.min(...glifoDe('Água', 'Á').pedras.flatMap(pd => pd.vertices.flat()).map(([, vy]) => vy));
    const linhas: [string, number][] = [
        ['Topo do acento', acento],
        ['Maiúscula', 760],
        ['Altura do x', 545],
        ['Linha de base', 0],
        ['Descendente', -210],
    ];
    for (const [nome, v] of linhas) {
        const yy = base - v * k;
        fio(c, 29, yy, 973, yy, v === 0 ? TINTA : '#bdbab2', v === 0 ? 1.5 : 1.1);
        rotulo(c, nome, 29, yy - 9, { cor: CINZA });
        rotulo(c, String(v).replace('-', '−'), 190, yy - 9, { alinhar: 'right' });
    }
    for (const g of palavra.glifos) contorno(c, g, ox + g.x * k, base, k * 1000, TINTA);
    // os números da construção, grandes, na Cut, cada um com o nome na coluna do meio
    const numeros: [string, string][] = [
        ['1000', 'unidades por eme'],
        ['311', 'glifos em cada estilo'],
        ['1.262', 'pontos no alfabeto da Cut'],
    ];
    numeros.forEach(([n, nome], i) => {
        const base = 900 + i * 140;
        linha(c, n, 22, base, { tam: 130, fam: 'cut', peso: 400 });
        linha(c, nome, 500, base, { ...TEXTO, peso: 400 });
        fio(c, 29, base + 30, 973, base + 30);
    });
    paragrafoLido(c, CAPITULOS[cap].corpo[1], 29, 1290, 944, TEXTO);
    rodapeDaMateria(c, cap, num);
}

// os pontos de cada letra, numa grade de cartões, todas no mesmo corpo
function pontosPorLetra(c: Ctx, cap: number, num?: number) {
    fundo(c, PAPEL);
    cabeca(c, ['Föeger Rune', 'Cut'], ['Pontos', 'por letra']);
    const letras: [string, string][] = [
        ['A', 'A'],
        ['Ei!', 'E'],
        ['H', 'H'],
        ['R', 'R'],
        ['S', 'S'],
        ['Y', 'Y'],
        ['Rolado', 'a'],
        ['b', 'b'],
        ['Rune', 'e'],
        ['g', 'g'],
        ['n', 'n'],
        ['Seixo', 'o'],
    ];
    const vao = 22;
    const lc = (944 - 2 * vao) / 3;
    const ac = (1100 - 3 * vao) / 4;
    const tam = 190;
    letras.forEach(([palavra, ch], i) => {
        const g = glifoDe(palavra, ch);
        const b = caixaDaLetra(g);
        const cx = 29 + (i % 3) * (lc + vao);
        const cy = 236 + Math.floor(i / 3) * (ac + vao);
        c.p.borda(cx, cy, lc, ac, { cor: TINTA, esp: 1.2 });
        linha(c, ch, cx + 16, cy + 34, { tam: 20, peso: 500 });
        linha(c, `${b.pontos} pontos`, cx + lc - 16, cy + 34, { tam: 20, peso: 500, alinhar: 'right', cor: CINZA });
        const k = tam / 1000;
        const base = cy + ac - 54;
        const ox = cx + lc / 2 - (k * (b.x0 + b.x1)) / 2;
        contorno(c, g, ox, base, tam, TINTA);
        vertices(c, g, ox, base, tam, 4.5, PAPEL, TINTA);
    });
    const pontos = ESTILO_MEDIDAS.find(m => m.nome === 'Pontos por letra')!.valores;
    paragrafoLido(
        c,
        `Na Cut, uma letra tem em média ${pontos[0]} pontos; na Polished, ${pontos[1]}; na Worn, ${pontos[2]}. As retas da Cut viram curvas nas outras duas, e cada curva pede mais pontos.`,
        29,
        1384,
        944,
        { tam: 22, entre: 28 },
    );
    rodapeDaMateria(c, cap, num);
}

// ---- capítulo 2: os três estilos ----

// a colagem dos três estilos, de borda a borda da dupla: cartões sobrepostos com letras grandes nos três estilos e nas
// cores do livro, os pontos da Cut, a quina de cada estilo, a lupa e as etiquetas
function colagem(c: Ctx, cap: number, lado: 0 | 1, num?: number) {
    const x0 = lado === 0 ? 0 : -1000;
    fundo(c, PAPEL);
    cabeca(c, ['Os três estilos'], [], x0);
    cabeca(c, ['Uma pedra, três desgastes'], [], x0 + 1000);
    const cartao = (x: number, y: number, l: number, a: number, cor = PAPEL) => {
        c.p.ret(x0 + x, y, l, a, cor);
        c.p.borda(x0 + x, y, l, a, { cor: TINTA, esp: 1.5 });
    };
    const palavra = (t: string, fam: Familia, cor: string, x: number, base: number, l: number) => {
        const tam = ajustar(c, t, { fam }, l);
        linha(c, t, x0 + x, base, { tam, fam, peso: 400, cor });
        return tam;
    };
    // o S da Cut, com os pontos
    cartao(30, 200, 520, 600);
    const s = glifoDe('S', 'S');
    contorno(c, s, x0 + 110, 720, 600, COR.worn, { cor: TINTA, esp: 2 });
    vertices(c, s, x0 + 110, 720, 600, 7, PAPEL, TINTA);
    etiqueta(c, 'Cut', x0 + 52, 236);
    // Ag na Polished
    cartao(560, 170, 520, 380);
    palavra('Ag', 'polished', COR.laranja, 600, 470, 440);
    etiqueta(c, 'Polished', x0 + 1050, 200, { alinhar: 'right' });
    // Seixo na Worn
    cartao(1110, 190, 560, 300);
    palavra('Seixo', 'worn', COR.polished, 1150, 400, 480);
    // a quina de cada estilo
    cartao(1700, 160, 270, 520);
    ESTILOS.forEach(([fam, nome, cor], i) => {
        marcaDoEstilo(c, fam, x0 + 1760, 210 + i * 150, 110, cor());
        rotulo(c, nome, x0 + 1890, 260 + i * 150, { alinhar: 'center' });
        valor(c, `σ ${ESTILO_MEDIDAS[0].valores[i]}`, x0 + 1890, 284 + i * 150, { alinhar: 'center', cor: CINZA });
    });
    // Rolado! na Polished, passando da borda do cartão
    cartao(150, 700, 960, 330);
    palavra('Rolado!', 'polished', COR.cut, 190, 960, 880);
    // o R nos três estilos, um por cima do outro
    cartao(1150, 540, 520, 560);
    const tamR = 600;
    const xr = x0 + 1410 - largura(c, 'R', { tam: tamR, fam: 'cut' }) / 2;
    linha(c, 'R', xr, 1010, { tam: tamR, fam: 'cut', peso: 400, cor: REALCES[0] });
    c.p.contornoTexto('R', xr, 1010, { fam: 'polished', tam: tamR }, { cor: COR.roxo, esp: 2.4 });
    c.p.contornoTexto('R', xr, 1010, { fam: 'worn', tam: tamR }, { cor: COR.wornEscuro, esp: 2.4 });
    etiqueta(c, 'Um por cima do outro', x0 + 1170, 570);
    // ssss na Worn, claro no azul fundo
    cartao(1700, 720, 270, 380, COR.roxo);
    palavra('ss', 'worn', COR.claroFrio, 1725, 990, 220);
    etiqueta(c, 's e s.v2', x0 + 1835, 1060, { alinhar: 'center', cor: COR.claroFrio, fundo: COR.roxo });
    // o g e o a, de perto, na lupa
    cartao(40, 1080, 520, 370);
    palavra('ga', 'worn', COR.roxo, 80, 1370, 440);
    cartao(600, 1090, 520, 360);
    const a = glifoDe('Rolado', 'a');
    const [ax, ay, at] = [650, 1410, 500];
    contorno(c, a, x0 + ax, ay, at, COR.polished, { cor: TINTA, esp: 2 });
    vertices(c, a, x0 + ax, ay, at, 6, PAPEL, TINTA);
    const [lx, ly, lm] = [900, 1190, 2.4];
    lupa(c, x0 + lx, ly, 105, () => {
        contorno(c, a, x0 + lx + lm * (ax - lx), ly + lm * (ay - ly), at * lm, COR.polished, { cor: TINTA, esp: 3 });
        vertices(c, a, x0 + lx + lm * (ax - lx), ly + lm * (ay - ly), at * lm, 12, PAPEL, TINTA);
    });
    // Ploc! na Worn, no fim
    cartao(1160, 1160, 810, 290);
    palavra('Ploc! Tum!', 'worn', COR.laranja, 1195, 1370, 740);
    etiqueta(c, '311 glifos', x0 + 1950, 1190, { alinhar: 'right' });
    rodapeDaMateria(c, cap, num);
}

// a visão geral dos três estilos, como a lista das famílias nos espécimes: o nome de cada um, enorme, no próprio estilo
// e na cor dele, com a marca da quina e os números do desgaste; embaixo, o A dos três com a largura de cada um e o texto
function visaoGeral(c: Ctx, cap: number, lado: 0 | 1, num?: number) {
    const x0 = lado === 0 ? 0 : -1000;
    const ch = CAPITULOS[cap];
    fundo(c, PAPEL);
    cabeca(c, ['Visão geral'], [], x0);
    cabeca(c, ['3 estilos × 311 glifos'], [], x0 + 1000);
    const tam = Math.min(...ESTILOS.map(([fam, nome]) => ajustar(c, `Rune ${nome}`, { fam }, 1560)));
    const lado0 = ALTURA_X * tam * 0.8;
    const medidas = ['Desfoque', 'Recuo das quinas', 'Pontos por letra'].map(n => ESTILO_MEDIDAS.find(m => m.nome === n)!);
    ESTILOS.forEach(([fam, nome, cor], i) => {
        const base = 420 + i * 280;
        marcaDoEstilo(c, fam, x0 + 29, base - ALTURA_X * tam * 0.5 - lado0 / 2, lado0, cor());
        const r = linha(c, `Rune ${nome}`, x0 + 29 + lado0 + 22, base, { tam, fam, peso: 400, cor: cor() });
        medidas.forEach((m, j) => {
            const yy = base - MAIUSCULA * tam + 14 + j * 24;
            rotulo(c, m.nome, r.x1 + 20, yy);
            valor(c, `${m.antes ? m.unidade + ' ' : ''}${m.valores[i]}${!m.antes && m.unidade ? ' ' + m.unidade : ''}`, r.x1 + 230, yy, { alinhar: 'right' });
        });
    });
    // o A nos três estilos, cada um com a largura dele
    nomesDaAmostra(c, 'O A nos três estilos', 'largura em unidades do eme', x0 + 29, 1110, 944);
    let xa = x0 + 40;
    ESTILOS.forEach(([fam, , cor]) => {
        const w = largura(c, 'A', { tam: 260, fam });
        linha(c, 'A', xa, 1340, { tam: 260, fam, peso: 400, cor: cor() });
        cota(c, xa, xa + w, 1372, `${Math.round((w / 260) * 1000)} u`);
        xa += w + 70;
    });
    paragrafoLido(c, ch.corpo[0], x0 + 1029, 1160, 944, TEXTO);
    rodapeDaMateria(c, cap, num);
}

// o desgaste de perto: o R dos três estilos, um por cima do outro, e a lupa numa quina, onde a Polished e a Worn recuam
function desgasteDePerto(c: Ctx, cap: number, num?: number) {
    fundo(c, PAPEL);
    cabeca(c, ['Föeger Rune', 'Cut, Polished e Worn'], ['O desgaste', 'de perto']);
    const tam = 1000;
    const ox = 96;
    const base = 1300;
    const camadas = (x: number, y: number, t: number, esp: number) => {
        linha(c, 'R', x, y, { tam: t, fam: 'cut', peso: 400, cor: REALCES[3] });
        c.p.contornoTexto('R', x, y, { fam: 'cut', tam: t }, { cor: '#9d988e', esp });
        c.p.contornoTexto('R', x, y, { fam: 'polished', tam: t }, { cor: COR.roxo, esp });
        c.p.contornoTexto('R', x, y, { fam: 'worn', tam: t }, { cor: COR.wornEscuro, esp });
    };
    camadas(ox, base, tam, 2.4);
    // a quina de cima do bojo, aumentada três vezes na lupa, logo acima dela
    const [px, py] = [ox + 692, base - 633];
    const [cx, cy, r, m] = [770, 420, 165, 3];
    c.p.circulo(px, py, r / m, null, { cor: TINTA, esp: 1.4 });
    fio(c, px, py - r / m, cx, cy + r * 1.08, TINTA, 1.4);
    lupa(c, cx, cy, r, () => {
        camadas(cx + m * (ox - px), cy + m * (base - py), tam * m, 3.2);
        c.p.quadrado(cx, cy, 7, PAPEL, { cor: TINTA, esp: 1.4 });
    });
    const recuo = ESTILO_MEDIDAS.find(mm => mm.nome === 'Recuo das quinas')!.valores;
    const chaves: [string, string, string][] = [
        ['Cut', '#9d988e', 'a quina viva'],
        ['Polished', COR.roxo, `recua ${recuo[1]} u`],
        ['Worn', COR.wornEscuro, `recua ${recuo[2]} u`],
    ];
    chaves.forEach(([nome, cor, nota], i) => {
        const yy = 290 + i * 40;
        c.p.ret(29, yy - 15, 18, 18, cor);
        linha(c, nome, 60, yy, { tam: 22, peso: 500 });
        linha(c, nota, 190, yy, { tam: 22, cor: CINZA });
    });
    rodapeDaMateria(c, cap, num);
}

// as seis medidas do desgaste no alfabeto inteiro, com os números grandes, cada um no próprio estilo e na cor dele
function noAlfabetoInteiro(c: Ctx, cap: number, num?: number) {
    fundo(c, PAPEL);
    cabeca(c, ['Föeger Rune', 'Cut, Polished e Worn'], ['No alfabeto', 'inteiro']);
    const colunas = [480, 727, 973];
    ESTILOS.forEach(([, nome], j) => linha(c, nome, colunas[j], 262, { tam: 20, peso: 500, alinhar: 'right' }));
    fio(c, 29, 282, 973, 282, TINTA, 1.3);
    const nomesDasUnidades: Record<string, string> = { σ: 'em unidades do eme', u: 'em unidades do eme' };
    ESTILO_MEDIDAS.forEach((m, i) => {
        const base = 420 + i * 175;
        linha(c, m.nome, 29, base - 52, { tam: 24, peso: 500 });
        if (nomesDasUnidades[m.unidade]) linha(c, `${m.unidade}, ${nomesDasUnidades[m.unidade]}`, 29, base - 22, { tam: 20, cor: CINZA });
        m.valores.forEach((v, j) => linha(c, String(v), colunas[j], base, { tam: 110, fam: ESTILOS[j][0], peso: 400, cor: ESTILOS[j][2](), alinhar: 'right' }));
        fio(c, 29, base + 34, 973, base + 34);
    });
    paragrafoLido(c, CAPITULOS[cap].corpo[1], 29, 1430 - 2 * TEXTO.entre, 944, TEXTO);
    rodapeDaMateria(c, cap, num);
}

// ---- capítulo 3: as variações ----

// a dupla dos quatro cortes do s, claros no azul fundo, cruzando as duas páginas
function quatroS(c: Ctx, cap: number, lado: 0 | 1, num?: number) {
    prancha(c, 'ssss', lado === 0 ? 0 : -1000, 0, 2000, 1500);
    if (lado === 0) legendaDe(c, ['Föeger Rune Worn', 'Os quatro cortes do s'], COR.claroFrio);
    else rodape(c, num, CAPITULOS[cap].titulo, COR.claroFrio);
}

// as trocas, como os recursos dos espécimes: sem e com as trocas, o L do meio e o f do começo, com cada corte trocado
// em destaque
function asTrocas(c: Ctx, cap: number, num?: number) {
    fundo(c, PAPEL);
    cabeca(c, ['Föeger Rune', 'Worn'], ['Recursos', 'As trocas']);
    const [x, l] = [29, 944];
    const t = 'aaaa eeee ssss';
    const o: Linha = { tam: ajustar(c, t, { fam: 'worn' }, l - 90), fam: 'worn', peso: 400 };
    const altura = ALTURA_X * o.tam;
    // sem as trocas, o mesmo corte sempre
    caixaDeAmostra(c, x, 250, l, 230, 'Sem as trocas', 'o mesmo corte sempre');
    const b1 = 250 + 115 + altura / 2;
    guia(c, x, l, b1);
    linha(c, t, x + 45, b1, { ...o, semCalt: true });
    // com as trocas: a segunda, a terceira e a quarta letra de cada grupo trocam de corte
    caixaDeAmostra(c, x, 550, l, 230, 'Com as trocas', 'base, v2, v3 e v4');
    const b2 = 550 + 115 + altura / 2;
    guia(c, x, l, b2);
    let anterior = '';
    let vez = 0;
    for (const p of posicoes(c, t, o)) {
        vez = p.ch === anterior ? vez + 1 : 0;
        anterior = p.ch;
        if (p.ch !== ' ' && vez > 0) c.p.ret(x + 45 + p.x0, b2 - altura - 26, p.x1 - p.x0, altura + 52, REALCES[vez - 1]);
    }
    linha(c, t, x + 45, b2, o);
    // o L do meio e o f do começo
    const casos: [string, string, string, number, string, number, string][] = [
        ['LULA', 'O L do meio', 'depois de outra letra', 2, 'L do meio', -1, ''],
        ['festa café', 'O f do começo', 'quando a palavra não tem outro f', 0, 'f do começo', 8, 'f de sempre'],
    ];
    casos.forEach(([palavra, esq, dir, i1, e1, i2, e2], j) => {
        const y = 850 + j * 300;
        caixaDeAmostra(c, x, y, l, 260, esq, dir);
        const ow: Linha = { tam: Math.min(170, ajustar(c, palavra, { fam: 'worn' }, l * 0.7)), fam: 'worn', peso: 400 };
        const base = y + 212;
        const ps = posicoes(c, palavra, ow);
        const xp = x + 45;
        const realce = (i: number, nome: string, tom: string) => {
            const p = ps[i];
            c.p.ret(xp + p.x0, base - MAIUSCULA * ow.tam - 18, p.x1 - p.x0, MAIUSCULA * ow.tam + 36, tom);
            etiqueta(c, nome, xp + (p.x0 + p.x1) / 2, base - MAIUSCULA * ow.tam - 36, { alinhar: 'center' });
        };
        realce(i1, e1, REALCES[0]);
        if (i2 >= 0) realce(i2, e2, REALCES[3]);
        linha(c, palavra, xp, base, ow);
    });
    rodapeDaMateria(c, cap, num);
}

// as trocas num texto: o mesmo parágrafo sem e com elas
function trocasEmTexto(c: Ctx, cap: number, num?: number) {
    fundo(c, PAPEL);
    cabeca(c, ['Föeger Rune', 'Worn'], ['Recursos', 'Em texto']);
    const texto =
        'Assim que a correnteza passa, a pedra perde a pressa: rola, arrasta, assenta. Nesse vaivém, cada letra repetida ganha outro corte, e a palavra não fica com cara de carimbo.';
    const o: Paragrafo = { tam: 46, entre: 58, fam: 'worn', peso: 400 };
    const linhas = contarLinhas(c, texto, 944 - 80, o);
    const a = linhas * o.entre + 70;
    caixaDeAmostra(c, 29, 250, 944, a, 'Sem as trocas', `Worn ${pt(o.tam)}`);
    paragrafo(c, texto, 69, 250 + 40 + o.tam * 0.8, 864, { ...o, semCalt: true });
    const y2 = 250 + a + 90;
    caixaDeAmostra(c, 29, y2, 944, a, 'Com as trocas', `Worn ${pt(o.tam)}`);
    paragrafoLido(c, texto, 69, y2 + 40 + o.tam * 0.8, 864, o);
    paragrafoLido(c, `${CAPITULOS[cap].corpo[1]} ${CAPITULOS[cap].corpo[2]}`, 29, y2 + a + 80, 944, { tam: 22, entre: 28 });
    rodapeDaMateria(c, cap, num);
}

// os quatro cortes do e, cada um numa caixa, com os pontos e quantos são
function quatroCortesDoE(c: Ctx, cap: number, num?: number) {
    fundo(c, PAPEL);
    cabeca(c, ['Föeger Rune', 'Cut'], ['Os quatro', 'cortes do e']);
    const es: [string, string, string][] = [
        ['Rune', 'e', 'e, o desenho de base'],
        ['#e.v2', '#e.v2', 'e.v2'],
        ['#e.v3', '#e.v3', 'e.v3'],
        ['#e.v4', '#e.v4', 'e.v4'],
    ];
    const tam = 640;
    es.forEach(([palavra, ch, nome], i) => {
        const g = glifoDe(palavra, ch);
        const b = caixaDaLetra(g);
        const bx = 29 + (i % 2) * 485;
        const by = 250 + Math.floor(i / 2) * 545;
        caixaDeAmostra(c, bx, by, 459, 470, nome, `${b.pontos} pontos`);
        const base = by + 470 - 70;
        guia(c, bx, 459, base);
        guia(c, bx, 459, base - ALTURA_X * tam);
        const k = tam / 1000;
        const ox = bx + 459 / 2 - (k * (b.x0 + b.x1)) / 2;
        contorno(c, g, ox, base, tam, COR.worn, { cor: TINTA, esp: 2 });
        vertices(c, g, ox, base, tam, 6, PAPEL, TINTA);
    });
    paragrafoLido(c, CAPITULOS[cap].corpo[0], 29, 1350, 944, { tam: 22, entre: 28 });
    rodapeDaMateria(c, cap, num);
}

// a troca nos três estilos: eeee em cada um, com o nome de cada corte embaixo
function trocaNosTresEstilos(c: Ctx, cap: number, num?: number) {
    fundo(c, PAPEL);
    cabeca(c, ['Föeger Rune', 'Cut, Polished e Worn'], ['A troca nos', 'três estilos']);
    const tam = Math.min(...ESTILOS.map(([fam]) => ajustar(c, 'eeee', { fam }, 900)));
    const cortes = ['e', 'e.v2', 'e.v3', 'e.v4'];
    ESTILOS.forEach(([fam, nome, cor], i) => {
        const base = 590 + i * 380;
        linha(c, nome, 29, base - ALTURA_X * tam - 60, { tam: 20, peso: 500 });
        linha(c, 'eeee', 29, base, { tam, fam, peso: 400, cor: cor() });
        posicoes(c, 'eeee', { tam, fam }).forEach((p, j) => valor(c, cortes[j], 29 + (p.x0 + p.x1) / 2, base + 50, { alinhar: 'center', cor: CINZA, tam: 15 }));
    });
    rodapeDaMateria(c, cap, num);
}

// ---- capítulo 4: do título ao texto ----

// a dupla do Ploc!: as onomatopeias de borda a borda nas duas páginas
function ploc(c: Ctx, cap: number, lado: 0 | 1, num?: number) {
    prancha(c, 'ploc', lado === 0 ? 0 : -1000, 0, 2000, 1500);
    const tinta = tintaSobre(COR.polished);
    if (lado === 0) legendaDe(c, ['Föeger Rune Polished', 'Em corpo de cartaz'], tinta);
    else rodape(c, num, CAPITULOS[cap].titulo, tinta);
}

// palavras e números, como nos espécimes: nomes de pedras e números de dois algarismos, no mesmo corpo, num estilo
const PEDRAS: [string, string][] = [
    ['Basalto', '34'],
    ['Granito', '56'],
    ['Ardósia', '15'],
    ['Quartzo', '87'],
    ['Mármore', '29'],
    ['Arenito', '31'],
    ['Calcário', '40'],
    ['Gnaisse', '62'],
];
function palavrasENumeros(c: Ctx, cap: number, num: number | undefined, fam: Familia, nome: string) {
    fundo(c, PAPEL);
    const passo = 150;
    const tam = 132;
    cabeca(c, ['Föeger Rune', nome], ['Palavras e números', `${Math.round(tam * 0.396)}/${pt(passo)}`]);
    PEDRAS.forEach(([p, n], i) => {
        const base = 330 + i * passo;
        linha(c, p, 26, base, { tam, fam, peso: 400 });
        linha(c, n, 973, base, { tam, fam, peso: 400, alinhar: 'right' });
    });
    rodapeDaMateria(c, cap, num);
}

// os acentos, pedras à parte: a frase com eles em destaque e as letras acentuadas
const ACENTUADAS = 'ÁÀÂÃÄÅÇÉÈÊËÍÌÎÏÑÓÒÔÕÖÚÙÛÜÝáàâãäåçéèêëíìîïñóòôõöúùûüýÿ';
function acentosEmDestaque(c: Ctx, cap: number, num?: number) {
    fundo(c, PAPEL);
    cabeca(c, ['Föeger Rune', 'Cut'], ['Recursos', 'Acentos']);
    const frase = 'Ôh, é só açaí!';
    const o: Linha = { tam: ajustar(c, frase, { fam: 'cut' }, 850), fam: 'cut', peso: 400 };
    caixaDeAmostra(c, 29, 250, 944, 290, 'Pedras à parte', 'o acento pousa por cima da letra');
    const base = 250 + 290 - 56;
    guia(c, 29, 944, base);
    guia(c, 29, 944, base - MAIUSCULA * o.tam);
    let primeira = true;
    for (const p of posicoes(c, frase, o)) {
        if (!ACENTUADAS.includes(p.ch)) continue;
        c.p.ret(70 + p.x0, base - 1.02 * o.tam, p.x1 - p.x0, 1.02 * o.tam + 26, REALCES[0]);
        if (primeira) etiqueta(c, 'pedra à parte', 70 + p.x0, base - 1.02 * o.tam - 22);
        primeira = false;
    }
    linha(c, frase, 70, base, o);
    const grupos: [string, string[]][] = [
        ['Maiúsculas', ['ÁÀÂÃÄÅ ÇÉÈÊË', 'ÍÌÎÏ ÑÓÒÔÕÖ', 'ÚÙÛÜ ÝŸ']],
        ['Minúsculas', ['áàâãäå çéèêë', 'íìîï ñóòôõö', 'úùûü ýÿ']],
    ];
    grupos.forEach(([nome, linhas], j) => {
        const y = 620 + j * 410;
        const letras = linhas.join('').replace(/ /g, '').length;
        caixaDeAmostra(c, 29, y, 944, 360, nome, `${letras} letras`);
        const tam = Math.min(...linhas.map(t => ajustar(c, t, { fam: 'cut', semCalt: true }, 850)));
        linhas.forEach((t, i) => linha(c, t, 70, y + 118 + i * 108, { tam: Math.min(tam, 104), fam: 'cut', peso: 400, semCalt: true }));
    });
    rodapeDaMateria(c, cap, num);
}

// as frações, os números elevados e os sinais
function fracoesESinais(c: Ctx, cap: number, num?: number) {
    fundo(c, PAPEL);
    cabeca(c, ['Föeger Rune', 'Cut'], ['Recursos', 'Frações e sinais']);
    const caixas: [string, string, string[], number][] = [
        ['Frações prontas', 'um glifo só para cada uma', ['1/2 → ½  1/4 → ¼  3/4 → ¾'], 250],
        ['Números elevados', 'no alto da linha', ['m²  x³  1º  2ª  nº'], 590],
        ['Sinais', 'no mesmo traço das letras', ['★ ♥ ✓ → ← ↑ ↓', '@ & % € $ £ ¥ §', '© ® ™ ≠ ≤ ≥ ∞ ±'], 930],
    ];
    for (const [esq, dir, linhas, y] of caixas) {
        const a = linhas.length > 1 ? 400 : 250;
        caixaDeAmostra(c, 29, y, 944, a, esq, dir);
        const tam = Math.min(140, ...linhas.map(t => ajustar(c, t, { fam: 'cut', semCalt: true }, 850)));
        const entre = linhas.length > 1 ? (a - 60) / linhas.length : 0;
        linhas.forEach((t, i) => linha(c, t, 70, linhas.length > 1 ? y + 40 + MAIUSCULA * tam + i * entre : y + a / 2 + (MAIUSCULA * tam) / 2, { tam, fam: 'cut', peso: 400, semCalt: true }));
    }
    paragrafoLido(c, CAPITULOS[cap].corpo[2], 29, 1384, 944, { tam: 22, entre: 28 });
    rodapeDaMateria(c, cap, num);
}

// os exemplos de texto: blocos em corpos cada vez menores, nos três estilos, com o estilo e o corpo em cima de cada um
const AMOSTRAS = {
    palavra: 'Rochedo',
    titulo: 'Cada pedra guarda o caminho que fez até aqui.',
    caixaAlta: 'O rio não tem pressa: gasta a pedra um grão de cada vez, até a quina virar curva.',
    abertura:
        'Quem anda à beira do rio reconhece as pedras pelo toque: as novas arranham, as antigas escorregam na mão. Entre uma e outra, passaram anos de água e areia.',
    polished:
        'Toda pedra de rio já foi lasca. Caiu de um barranco com as quinas vivas e foi levada pela água, batendo nas outras, até perder as pontas. A Polished é esse meio do caminho: ainda dá para ver o corte, mas a mão já não se machuca.',
    worn: 'A Worn é a pedra que passou tempo demais na correnteza. Ficou redonda, lisa e um pouco menor do que era: o desgaste come a borda primeiro e só depois chega ao miolo. Por isso as letras dela parecem macias, e algumas aberturas quase se fecham quando o corpo é grande.',
    cut: 'A Cut é a pedra recém-talhada. Cada letra foi desenhada à mão num gabarito e refeita só com retas, com um corte reto do cinzel em cada quina. Nenhuma reta é perfeita e nenhuma letra é igual à outra, e é isso que faz uma palavra inteira parecer um muro de pedras encaixadas, e não um carimbo.',
    colunas: [
        'Em corpo pequeno, a pedra vira textura. As quinas somem no tamanho de um parágrafo e o que fica é o ritmo: letras um pouco tortas, de alturas que não batem, encostadas umas nas outras. Para ler bem assim, ajuda deixar mais espaço entre as linhas e preferir frases curtas.',
        'Cada estilo é uma fonte inteira, com os 311 glifos refeitos, e não um efeito por cima da letra. O desgaste também mexe na largura: quanto mais gasta, mais estreita fica a letra, e a mesma frase ocupa menos linha na Worn do que na Cut.',
        'Quando a mesma minúscula aparece duas vezes seguidas, a fonte troca o corte da segunda sozinha. São até quatro desenhos para cada letra, que se revezam na ordem, como golpes diferentes do mesmo cinzel.',
    ],
};
// um bloco de amostra: o estilo e o corpo em cima e o texto embaixo; devolve onde ele acaba
function blocoDeTexto(c: Ctx, x: number, y: number, l: number, fam: Familia, texto: string, o: { tam: number; entre: number }) {
    const nome = ESTILOS.find(([f]) => f === fam)![1];
    nomesDaAmostra(c, nome, pt(o.tam), x, y, l, false);
    const fim = paragrafoLido(c, texto, x, y + 16 + MAIUSCULA * o.tam, l, { tam: o.tam, entre: o.entre, fam, peso: 400 });
    return fim - o.entre + 0.25 * o.tam;
}
function exemplosEsq(c: Ctx, cap: number, num?: number) {
    fundo(c, PAPEL);
    cabeca(c, ['Föeger Rune', 'Cut, Polished e Worn'], ['Exemplos', 'de texto']);
    const tamP = ajustar(c, AMOSTRAS.palavra, { fam: 'cut' }, 944);
    nomesDaAmostra(c, 'Cut', pt(tamP), 29, 236, 944, false);
    linha(c, AMOSTRAS.palavra, 24, 252 + MAIUSCULA * tamP, { tam: tamP, fam: 'cut', peso: 400 });
    let y = 252 + MAIUSCULA * tamP + 90;
    y = blocoDeTexto(c, 29, y, 944, 'polished', AMOSTRAS.titulo, { tam: 96, entre: 100 }) + 74;
    y = blocoDeTexto(c, 29, y, 944, 'worn', AMOSTRAS.caixaAlta.toUpperCase(), { tam: 58, entre: 64 }) + 70;
    blocoDeTexto(c, 29, y, 944, 'cut', AMOSTRAS.abertura, { tam: 37, entre: 46 });
    rodapeDaMateria(c, cap, num);
}
function exemplosDir(c: Ctx, cap: number, num?: number) {
    fundo(c, PAPEL);
    cabeca(c, ['Föeger Rune', 'Cut, Polished e Worn'], ['Exemplos', 'de texto']);
    let y = blocoDeTexto(c, 29, 236, 944, 'polished', AMOSTRAS.polished, { tam: 40, entre: 51 }) + 70;
    y = blocoDeTexto(c, 29, y, 944, 'worn', AMOSTRAS.worn, { tam: 33, entre: 43 }) + 70;
    y = blocoDeTexto(c, 29, y, 944, 'cut', AMOSTRAS.cut, { tam: 26, entre: 34 }) + 70;
    const colunas: [Familia, number, number][] = [
        ['cut', 20, 26.5],
        ['polished', 18, 24],
        ['worn', 17, 22.5],
    ];
    colunas.forEach(([fam, tam, entre], i) => blocoDeTexto(c, 29 + i * 326, y, 292, fam, AMOSTRAS.colunas[i], { tam, entre }));
    rodapeDaMateria(c, cap, num);
}

// as páginas de cada capítulo depois da introdução, alternando esquerda e direita (a última, sempre a da direita)
const MATERIAS: Record<IdCapitulo, ((c: Ctx, cap: number, num?: number) => void)[]> = {
    construcao: [
        linhasDaFonte,
        pontosPorLetra,
        (c, cap, num) => {
            const g = glifoDe('Rolado', 'a');
            pontosDeConstrucao(c, cap, num, g, 'a', `O a da Cut tem ${caixaDaLetra(g).pontos} pontos, e todos se ligam por retas: na Cut não há curva nenhuma. As coordenadas são as do arquivo da fonte, em unidades do eme de 1000, com a linha de base no zero.`);
        },
        (c, cap, num) => {
            const g = glifoDe('n', 'n');
            pontosDeConstrucao(c, cap, num, g, 'n', `O n tem ${caixaDaLetra(g).pontos} pontos. ${CAPITULOS[cap].corpo[2]}`);
        },
    ],
    estilos: [(c, cap, num) => colagem(c, cap, 0, num), (c, cap, num) => colagem(c, cap, 1, num), (c, cap, num) => visaoGeral(c, cap, 0, num), (c, cap, num) => visaoGeral(c, cap, 1, num), desgasteDePerto, noAlfabetoInteiro],
    variacoes: [(c, cap, num) => quatroS(c, cap, 0, num), (c, cap, num) => quatroS(c, cap, 1, num), asTrocas, trocasEmTexto, quatroCortesDoE, trocaNosTresEstilos],
    tamanhos: [
        (c, cap, num) => ploc(c, cap, 0, num),
        (c, cap, num) => ploc(c, cap, 1, num),
        (c, cap, num) => palavrasENumeros(c, cap, num, 'cut', 'Cut'),
        (c, cap, num) => palavrasENumeros(c, cap, num, 'worn', 'Worn'),
        acentosEmDestaque,
        fracoesESinais,
        exemplosEsq,
        exemplosDir,
    ],
};

// ---------- os papéis vegetais ----------

// a impressão do papel vegetal, sobre fundo transparente (a cor do papel vem do shader): o desenho de construção do
// assunto que ele abre, com o nome dele no pé
function vegetal(c: Ctx, v: number) {
    c.p.limpar();
    const desenho = VEGETAIS[v].desenho;
    const traco = 'rgba(31,31,29,0.8)';
    rotulo(c, 'Intercalado', 29, 47);
    rotulo(c, 'Papel vegetal, 90 g/m²', 973, 47, { alinhar: 'right' });
    if (desenho === 'construcao') {
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
        const pontos = g.pedras.reduce((s, pd) => s + pd.vertices.reduce((t, vv) => t + vv.length, 0), 0);
        rotulo(c, `R · Cut · ${pontos} pontos`, 29, 1240, { cor: traco });
    } else if (desenho === 'contornos') {
        // o R nos três estilos, um por cima do outro, só o contorno de cada um, na cor dele
        const tam = 900;
        const x0 = 500 - largura(c, 'R', { tam, fam: 'cut' }) / 2;
        const base = 1040;
        const cores = [TINTA, COR.roxo, COR.wornEscuro];
        ESTILOS.forEach(([fam], i) => c.p.contornoTexto('R', x0, base, { fam, tam }, { cor: cores[i], esp: 2.4 }));
        ESTILOS.forEach(([, nome], i) => {
            const x = 330 + i * 130;
            c.p.ret(x, 1176, 14, 14, cores[i]);
            rotulo(c, nome, x + 22, 1189, { tam: 12 });
        });
        rotulo(c, 'R · Cut, Polished e Worn, um por cima do outro', 29, 1240, { cor: traco });
    } else if (desenho === 'cortes') {
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
        rotulo(c, 'Os quatro cortes do e', 29, 1240, { cor: traco });
    } else if (desenho === 'texto') {
        // a grade do texto, como num diagrama de composição: um parágrafo da Cut pelo contorno, no meio da página, com a
        // linha de base de cada linha, a altura do x, a medida no alto e a entrelinha ao lado
        const e = { fam: 'cut' as Familia, tam: 56, peso: 400 };
        const entre = 80;
        const [x0, medida] = [160, 700];
        const linhas = quebrar(c, CAPITULOS[3].corpo[1].split(/\s+/), medida, 0, e);
        const b0 = Math.round(760 - ((linhas.length - 1) * entre) / 2);
        const escura = 'rgba(31,31,29,0.5)';
        const clara = 'rgba(31,31,29,0.22)';
        const topo = b0 - MAIUSCULA * e.tam - 70;
        fio(c, x0, topo, x0, b0 + (linhas.length - 1) * entre + 40, clara, 1);
        fio(c, x0 + medida, topo, x0 + medida, b0 + (linhas.length - 1) * entre + 40, clara, 1);
        cota(c, x0, x0 + medida, topo, `Medida · ${medida}`, TINTA);
        linhas.forEach((ln, i) => {
            const y = b0 + i * entre;
            fio(c, 29, y, 973, y, escura, 1);
            fio(c, x0, y - ALTURA_X * e.tam, x0 + medida, y - ALTURA_X * e.tam, clara, 1);
            c.p.contornoTexto(ln.join(' '), x0, y, e, { cor: TINTA, esp: 1.4 });
        });
        // a entrelinha, entre as duas primeiras linhas de base, e a altura do x da primeira linha
        const xe = x0 + medida + 50;
        fio(c, xe, b0, xe, b0 + entre, TINTA, 1.2);
        fio(c, xe - 8, b0, xe + 8, b0, TINTA, 1.2);
        fio(c, xe - 8, b0 + entre, xe + 8, b0 + entre, TINTA, 1.2);
        rotulo(c, `Entrelinha · ${entre}`, 973, b0 + entre + 30, { tam: 11, alinhar: 'right' });
        rotulo(c, 'Linha de base', 29, b0 - 10, { tam: 11, cor: 'rgba(31,31,29,0.75)' });
        rotulo(c, 'Altura do x', 29, b0 - ALTURA_X * e.tam - 10, { tam: 11, cor: 'rgba(31,31,29,0.75)' });
        rotulo(c, `Um parágrafo · Cut · corpo ${e.tam}`, 29, 1240, { cor: traco });
    } else {
        // o gabarito em que a fonte nasceu, casado com as tabelas da página das letras: um quadrado em cada casa, com a
        // linha de base da letra e o caractere pequeno no canto, como nos gabaritos de desenhar fonte
        for (const t of tabelasDasLetras()) {
            const lista = Array.from(t.chars);
            const y0 = t.y + 18;
            const casas = Math.ceil(lista.length / LETRAS.colunas) * LETRAS.colunas;
            for (let i = 0; i < casas; i++) {
                const cx = 29 + (i % LETRAS.colunas) * LADO_LETRA;
                const cy = y0 + Math.floor(i / LETRAS.colunas) * LADO_LETRA;
                c.p.borda(cx + 4, cy + 4, LADO_LETRA - 8, LADO_LETRA - 8, { cor: 'rgba(31,31,29,0.55)', esp: 1.2 });
                const base = cy + LADO_LETRA / 2 + (MAIUSCULA * LETRAS.tam) / 2;
                fio(c, cx + 12, base, cx + LADO_LETRA - 12, base, 'rgba(31,31,29,0.3)', 1);
                if (lista[i]) valor(c, lista[i], cx + 12, cy + 24, { tam: 11, cor: traco });
            }
        }
        linha(c, 'Toda letra começou num quadrado.', 500, 1412, { tam: 40, fam: 'cut', peso: 400, cor: TINTA, alinhar: 'center' });
    }
    const nome = v < CAPITULOS.length ? `Capítulo ${CAPITULOS[v].n} · ${CAPITULOS[v].titulo}` : 'Os caracteres';
    rotulo(c, nome, 29, 1468, { cor: CINZA });
}

// ---------- os caracteres ----------

// a tabela dos caracteres: cada um numa casa, com fios finos entre as casas, quantos são no título e, nas casas
// grandes, o código de cada um no canto, como numa ficha
function tabela(c: Ctx, titulo: string, chars: string, y: number, o: { colunas?: number; tam?: number; alto?: number } = {}) {
    const colunas = o.colunas ?? 14;
    const l = 944 / colunas;
    const a = o.alto ?? 70;
    const tam = o.tam ?? 40;
    const lista = Array.from(chars);
    rotulo(c, `${titulo} · ${lista.length}`, 29, y);
    const linhas = Math.ceil(lista.length / colunas);
    const y0 = y + 18;
    for (let j = 0; j <= linhas; j++) fio(c, 29, y0 + j * a, 973, y0 + j * a);
    lista.forEach((ch, i) => {
        const cx = 29 + (i % colunas) * l + l / 2;
        const yy = y0 + Math.floor(i / colunas) * a;
        linha(c, ch, cx, yy + a / 2 + (MAIUSCULA * tam) / 2, { tam, fam: 'cut', peso: 400, alinhar: 'center', semCalt: true });
        if (l >= 90) valor(c, `U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`, cx - l / 2 + 9, yy + a - 10, { tam: 9.5, cor: CINZA });
    });
    return y0 + linhas * a;
}

// as duas tabelas das letras, em casas quadradas de oito colunas (o vegetal do gabarito, por cima, desenha as mesmas
// casas): o título, os caracteres e onde cada tabela começa
const LETRAS = { colunas: 8, tam: 72 };
const LADO_LETRA = 944 / LETRAS.colunas;
function tabelasDasLetras() {
    const maiusculas = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const y = 262;
    const fim = y + 18 + Math.ceil(maiusculas.length / LETRAS.colunas) * LADO_LETRA;
    return [
        { titulo: 'Maiúsculas', chars: maiusculas, y },
        { titulo: 'Minúsculas', chars: 'abcdefghijklmnopqrstuvwxyz', y: fim + 60 },
    ];
}

// as letras, embaixo do vegetal do gabarito
function letras(c: Ctx, num?: number) {
    fundo(c, PAPEL);
    cabeca(c, ['Föeger Rune', 'Cut'], ['Os caracteres', 'Letras']);
    for (const t of tabelasDasLetras()) tabela(c, t.titulo, t.chars, t.y, { colunas: LETRAS.colunas, tam: LETRAS.tam, alto: LADO_LETRA });
    rodape(c, num, 'Os caracteres');
}

function acentos(c: Ctx, num?: number) {
    fundo(c, PAPEL);
    cabeca(c, ['Föeger Rune', 'Cut'], ['Os caracteres', 'Acentos']);
    const y = tabela(c, 'Maiúsculas', 'ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞŒŠŸŽ', 262, { colunas: 10, tam: 58, alto: 106 });
    tabela(c, 'Minúsculas e outras', 'àáâãäåæçèéêëìíîïðñòóôõöøùúûüýÿıœšžßƒªºµ', y + 60, { colunas: 10, tam: 58, alto: 106 });
    rodape(c, num, LIVRO.titulo);
}

function sinais(c: Ctx, num?: number) {
    fundo(c, PAPEL);
    cabeca(c, ['Föeger Rune', 'Cut'], ['Os caracteres', 'Sinais']);
    let y = tabela(c, 'Números e frações', '0123456789¹²³¼½¾', 262, { colunas: 8, tam: 60, alto: 110 });
    y = tabela(c, 'Pontuação', '.,:;…!¡?¿\'"‘’‚“”„«»‹›()[]{}/\\|¦-–—_•·¶§†‡#&@*%‰', y + 60, { alto: 78, tam: 44 });
    tabela(c, 'Símbolos', '$¢£¤¥€+−±×÷=≠≈<>≤≥∞¬^~˜¨´¸`ˆ©®™№°←↑→↓★♥✓', y + 60, { alto: 78, tam: 44 });
    rodape(c, num, 'Os caracteres');
}

// o colofão, a última página impressa, como nos livros: o selo da editora e, embaixo, como o livro foi feito, num
// bloco curto centrado, sem número de página
function colofao(c: Ctx) {
    fundo(c, PAPEL);
    logo(c, 500, 1010, 56, TINTA, 'center');
    rotulo(c, 'Colofão', 500, 1080, { alinhar: 'center', cor: CINZA });
    paragrafoLido(
        c,
        'Este espécime foi composto em Föeger Rune Cut, Polished e Worn, com Inter Tight e DM Mono nos textos de apoio. A fonte é a prévia de 5 de novembro de 2026, com 311 glifos em cada estilo e ainda sem o ajuste fino dos pares de letras.',
        250,
        1130,
        500,
        { tam: 18.5, entre: 25, alinhar: 'center' },
    );
    rotulo(c, `${LIVRO.edicao} · Luiz Föeger`, 500, 1300, { alinhar: 'center', cor: CINZA });
}

// desenha uma página com o pincel e devolve as áreas clicáveis
export function desenharPagina(p: Pincel, pg: Pagina, num?: number, destaque = -1): Alvo[] {
    const c: Ctx = { p, alvos: [], destaque };
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
        case 'logo':
            paginaDaLogo(c, num);
            break;
        case 'apresentacao':
            apresentacao(c, num);
            break;
        case 'cor':
            paginaDeCor(c, pg.cap);
            break;
        case 'abertura':
            abertura(c, pg.cap, num);
            break;
        case 'materia':
            MATERIAS[CAPITULOS[pg.cap].id][pg.k](c, pg.cap, num);
            break;
        case 'vegetal':
            vegetal(c, pg.v);
            break;
        case 'letras':
            letras(c, num);
            break;
        case 'acentos':
            acentos(c, num);
            break;
        case 'sinais':
            sinais(c, num);
            break;
        case 'colofao':
            colofao(c);
            break;
    }
    return c.alvos;
}
