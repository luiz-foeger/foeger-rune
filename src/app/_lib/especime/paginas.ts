// as páginas do espécime, na grade do livro do clone-tantan (unidades de 1/1000 da largura da página, que tem
// 1000 × 1500): margem de 29, rótulos em mono de 12,5, texto corrido de 18,5 com entrelinha de 23,5, título da matéria
// de 32, prancha com moldura e legenda de 459 × 444 e a prancha inteira do pé com 500 de altura. No lugar das fotos
// do tantan entram pranchas de letras da Föeger Rune nas cores dos estilos. Tudo passa pelo pincel (canvas para as
// texturas, SVG para o PDF), e cada página devolve as áreas clicáveis (o sumário) em fração da página.
import { CAPITULOS, COR, EXTRAS, LIVRO, VEGETAIS, type IdCapitulo, type Pagina } from './conteudo';
import { medir, pincelCanvas, TINTA, type Estilo, type Familia, type Familias, type Pincel } from './pincel';
import { PALAVRAS, type Glifo } from '../glifos';
import { PECAS } from '../../_comp/LogoFoeger';

// o que o clique faz: ir ao capítulo (cap), às tabelas dos caracteres ou a uma página qualquer (pagina)
export type Alvo = { x: number; y: number; l: number; a: number; cap?: number; caracteres?: boolean; pagina?: number };
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

// o relevo seco da capa: a letra mais escura que o pano, com a luz batendo na borda de baixo (as três passadas: a luz,
// a sombra da borda de cima e o miolo afundado)
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
const LOGO = (() => {
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const [d, tx, ty, r, cx, cy] of PECAS) {
        const a = (r * Math.PI) / 180;
        let [px, py] = [0, 0];
        for (const [, cmd, args] of d.matchAll(/([MLHVZ])([^MLHVZ]*)/g)) {
            const n = args.trim().split(/[\s,]+/).filter(Boolean).map(Number);
            const pontos: [number, number][] = [];
            if (cmd === 'H') n.forEach(v => pontos.push([(px = v), py]));
            else if (cmd === 'V') n.forEach(v => pontos.push([px, (py = v)]));
            else for (let i = 0; i + 1 < n.length; i += 2) pontos.push([(px = n[i]), (py = n[i + 1])]);
            for (const [qx, qy] of pontos) {
                const x = tx + cx + (qx - cx) * Math.cos(a) - (qy - cy) * Math.sin(a);
                const y = ty + cy + (qx - cx) * Math.sin(a) + (qy - cy) * Math.cos(a);
                [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
            }
        }
    }
    return { x0, y0, x1, y1, base: 945 };
})();

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

type Prancha = 'ssss' | 'seixo' | 'ploc' | 'cascata' | 'l-f';

// a cascata: o corpo e a linha de base de cada "Pedra", da maior para a menor (a prancha da abertura do capítulo 4 e o
// vegetal da régua, que fica por cima dela, usam as mesmas)
function linhasDaCascata(c: Ctx, y: number, l: number, a: number) {
    const corpos = [1, 0.7, 0.5, 0.36, 0.26, 0.19];
    const maior = Math.min(ajustar(c, 'Pedra', { fam: 'cut' }, l * 0.7), (a * 0.9) / (corpos.reduce((s, k) => s + k, 0) * 1.08));
    let base = y;
    return corpos.map(k => {
        const tam = maior * k;
        base += tam * 1.08;
        return { tam, base };
    });
}
// a caixa da cascata na abertura do capítulo 4
const CASCATA = { x: 29, y: 300, l: 944, a: 1060 };

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
    // a palavra enorme nas duas páginas, no azul da Polished
    seixo(c, x, y, l, a) {
        c.p.ret(x, y, l, a, COR.polished);
        const tam = ajustar(c, 'Seixo', { fam: 'polished' }, l * 0.9);
        linha(c, 'Seixo', x + l / 2, y + a * 0.68, { tam, fam: 'polished', peso: 400, cor: tintaSobre(COR.polished), alinhar: 'center' });
    },
    // as onomatopeias na Polished, de borda a borda das duas páginas
    ploc(c, x, y, l, a) {
        c.p.ret(x, y, l, a, COR.polished);
        linhasNaCaixa(c, ['Ploc! Tum!', 'Crás, Bum!'], 'polished', tintaSobre(COR.polished), x, y, l, a, { frac: 0.9, entre: 1.05, alinhar: 'left' });
    },
    // a mesma palavra em seis corpos, cada um com o corpo em mono ao lado
    cascata(c, x, y, l, a) {
        for (const { tam, base } of linhasDaCascata(c, y, l, a)) {
            linha(c, 'Pedra', x + l * 0.2, base, { tam, fam: 'cut', peso: 400, cor: ESCURA });
            rotulo(c, `${Math.round(tam)}`, x, base, { cor: CINZA });
        }
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
};

// uma prancha numa caixa da página, cortada pela caixa e pela página
function prancha(c: Ctx, k: Prancha, x: number, y: number, l: number, a: number) {
    c.p.recortar(Math.max(0, x), Math.max(0, y), Math.min(1000, x + l) - Math.max(0, x), Math.min(1500, y + a) - Math.max(0, y), () => PRANCHAS[k](c, x, y, l, a));
}

// a prancha com moldura fina e a legenda em mono embaixo
function moldura(c: Ctx, k: Prancha, x: number, y: number, l: number, a: number, legenda: [string, string]) {
    c.p.ret(x, y, l, a, PAPEL);
    prancha(c, k, x + 3, y + 3, l - 6, a - 56);
    c.p.borda(x, y, l, a, { cor: FIO, esp: 1.3 });
    fio(c, x, y + a - 53, x + l, y + a - 53);
    rotulo(c, legenda[0], x + 14, y + a - 21, { tam: 11.5, cor: CINZA });
    rotulo(c, legenda[1], x + l - 14, y + a - 21, { tam: 11.5, cor: CINZA, alinhar: 'right' });
}

const pagina2 = (n?: number) => (n ? String(n).padStart(2, '0') : '');

// ---------- a tinta da risografia ----------

// a tinta granulada da risografia, como a das capas impressas assim (a do "Piquenique na estrada"): cada tinta é
// desenhada à parte, com a borda suavizada, e, pixel a pixel, um ruído decide se ela pega. Na borda ela se desfaz em
// pontinhos; no miolo, falha de vez em quando; e a cor ganha manchas largas, mais claras e mais escuras, como a tinta
// que não assenta igual. As tintas são transparentes e multiplicam as de baixo: onde duas se cruzam, nasce uma terceira
// cor, mais escura. Sai a página inteira, com o papel, sempre igual (sorteio com semente) e guardada, porque a página é
// redesenhada várias vezes no livro; numa resolução menor que a da página, para o grão ficar grosso
type Rgb = [number, number, number];
type Tinta = { cor: Rgb; desenho: (p: Pincel) => void };
const RISO_L = 820;
const RISO_A = 1230;
const RISOGRAFIAS = new Map<string, HTMLCanvasElement>();
const rgbDe = (hex: string) => [0, 2, 4].map(i => parseInt(hex.replace('#', '').slice(i, i + 2), 16)) as Rgb;

// quanto uma tinta pega em cada pixel (0 é o papel aparecendo) e o tom da mancha ali
function tintaGranulada(fam: Familias, semente0: number, desenho: (p: Pincel) => void) {
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
            if (cob <= 0.04 + 0.92 * n || (cob > 0.97 && n > 0.975)) continue;
            const fx = (x / RISO_L) * GX;
            const ix = Math.floor(fx);
            const tx = suave(fx - ix);
            const m = (ponto(ix, iy) * (1 - tx) + ponto(ix + 1, iy) * tx) * (1 - ty) + (ponto(ix, iy + 1) * (1 - tx) + ponto(ix + 1, iy + 1) * tx) * ty;
            // a mancha larga e o grão de cada pixel
            tom[i] = 0.86 + 0.24 * m + (sorteio() - 0.5) * 0.14;
            pega[i] = 0.78 + 0.22 * m;
        }
    }
    return { pega, tom };
}

// as tintas no papel, cada uma multiplicando as de baixo
function risografia(chave: string, fam: Familias, papel: Rgb, tintas: Tinta[]) {
    const pronta = RISOGRAFIAS.get(chave);
    if (pronta) return pronta;
    const n = RISO_L * RISO_A;
    const cor = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) cor.set(papel, i * 3);
    tintas.forEach((t, k) => {
        const { pega, tom } = tintaGranulada(fam, 11 + 12 * k, t.desenho);
        for (let i = 0; i < n; i++) {
            const a = pega[i];
            if (!a) continue;
            for (let ch = 0; ch < 3; ch++) cor[i * 3 + ch] *= 1 - a + (a * Math.min(255, t.cor[ch] * tom[i])) / 255;
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
// no site (o ocre, o azul e o verde), chapadas e um pouco transparentes, para o cruzamento delas aparecer, sobre o azul
// fundo do site; o autor e o título no alto, os quadradinhos de marca no canto, como nos espécimes das fundições, e a
// marca no pé. O relevo seco fica só na contracapa: na frente ele sumia no pano. As outras propostas (com a tinta
// granulada da risografia, em outros papéis, num rótulo colado ou com a cinta) estão no histórico
const CREME = '#f1ece1';
const comAlfa = (hex: string, a: number) => `rgba(${rgbDe(hex).join(',')},${a})`;

// os quadradinhos e o fio de marca, no canto (x, y é o canto de cima à esquerda do grupo)
function marcas(c: Ctx, x: number, y: number, cor: string) {
    c.p.ret(x, y, 14, 14, cor);
    c.p.ret(x + 20, y, 14, 14, cor);
    c.p.borda(x + 40, y, 14, 14, { cor, esp: 1.6 });
    fio(c, x, y + 26, x + 110, y + 26, cor, 1.6);
}

function capa(c: Ctx) {
    c.p.ret(0, 0, 1000, 1500, COR.frioEscuro);
    // o grupo das três centrado na largura e na altura entre o título e a marca do pé
    const tam = 760;
    const [dx, dy] = [168, 150];
    const estilos: Familia[] = ['cut', 'polished', 'worn'];
    const cores = [COR.cut, COR.polished, COR.worn];
    const largo = Math.max(...estilos.map((fam, i) => i * dx + largura(c, 'R', { tam, fam, peso: 400, semCalt: true })));
    const alto = MAIUSCULA * tam + 2 * dy;
    const x0 = 500 - largo / 2;
    const base0 = 822 - alto / 2 + MAIUSCULA * tam;
    estilos.forEach((fam, i) => linha(c, 'R', x0 + i * dx, base0 + i * dy, { tam, fam, peso: 400, cor: comAlfa(cores[i], 0.86), semCalt: true }));
    linha(c, 'Luiz Föeger', 64, 110, { tam: 26, peso: 600, cor: CREME });
    linha(c, 'Föeger Rune: espécime tipográfico', 64, 230, { tam: 36, peso: 700, cor: CREME });
    marcas(c, 826, 90, CREME);
    logo(c, 936, 1440, 36, CREME, 'right');
}

// a contracapa, do mesmo azul da capa: o nome no meio, a frase do livro e o selo da editora no pé, tudo em relevo
function contracapa(c: Ctx) {
    c.p.ret(0, 0, 1000, 1500, COR.frioEscuro);
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
        for (const [t, k] of ch.secoes) {
            const pagina = p0 !== undefined ? p0 + k : undefined;
            y = linhaDoSumario(c, y, { titulo: t, pagina, destino: { pagina }, secao: true });
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

// a apresentação, no verso do sumário e de frente para a abertura do primeiro capítulo: o livro em poucas linhas e os
// três estilos, cada um num quadro da cor dele
function apresentacao(c: Ctx, num?: number) {
    fundo(c, PAPEL);
    rotulo(c, 'Apresentação', 29, 70, { cor: CINZA });
    linha(c, 'Uma pedra,', 22, 230, { tam: 92 });
    linha(c, 'três desgastes.', 26, 332, { tam: 88, fam: 'polished', peso: 400 });
    paragrafo(c, LIVRO.apresentacao, 29, 460, 760, { tam: 26, entre: 34 });
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

// a cor de cada capítulo, para o número grande da página de texto
const COR_DO_CAPITULO: Record<IdCapitulo, () => string> = {
    construcao: () => COR.cut,
    estilos: () => COR.polished,
    variacoes: () => COR.worn,
    tamanhos: () => COR.laranja,
};

// uma frase na Rune, centrada no meio da página
function fraseNoMeio(c: Ctx, frase: string, fam: Familia) {
    const o: Paragrafo = { tam: 64, entre: 70, fam, peso: 400, alinhar: 'center' };
    const n = contarLinhas(c, frase, 760, o);
    paragrafo(c, frase, 120, 800 - ((n - 1) * o.entre) / 2, 760, o);
}

// a abertura do capítulo, na página da direita, embaixo do vegetal: o número em mono e o título na Rune do capítulo, no
// alto, e a peça do capítulo no meio, que aparece borrada pelo vegetal até ele ser virado
function abertura(c: Ctx, cap: number, num?: number) {
    const ch = CAPITULOS[cap];
    fundo(c, PAPEL);
    rotulo(c, `Capítulo ${ch.n}`, 29, 70, { cor: CINZA });
    const tam = Math.min(84, ajustar(c, ch.titulo, { fam: ch.estilo, peso: 400 }, 944));
    linha(c, ch.titulo, 22, 190, { tam, fam: ch.estilo, peso: 400 });
    if (ch.id === 'construcao') fraseNoMeio(c, 'Toda pedra começa bruta.', 'cut');
    else if (ch.id === 'variacoes') fraseNoMeio(c, 'Sonhei ontem que uma pedra rolava, rolava e não paraaava!', 'worn');
    else if (ch.id === 'estilos') {
        // a mesma palavra nos três estilos, cada um mais estreito que o anterior
        const tamP = ajustar(c, 'Pedra', { fam: 'cut', peso: 400 }, 700);
        const entre = tamP * 1.05;
        const y0 = 440 + MAIUSCULA * tamP;
        ESTILOS.forEach(([fam, nome], i) => {
            const y = y0 + i * entre;
            linha(c, 'Pedra', 250, y, { tam: tamP, fam, peso: 400 });
            rotulo(c, nome, 29, y - MAIUSCULA * tamP * 0.5 + 5, { cor: CINZA });
        });
    } else prancha(c, 'cascata', CASCATA.x, CASCATA.y, CASCATA.l, CASCATA.a);
    rodape(c, num, ch.titulo);
}

// o texto do capítulo a partir de y: a abertura em corpo grande e os três parágrafos em duas colunas
function textoDoCapitulo(c: Ctx, cap: number, y: number) {
    const ch = CAPITULOS[cap];
    y = paragrafo(c, ch.abertura, 29, y, 900, { tam: 30, entre: 38, peso: 300 }) + 40;
    const corpo: Paragrafo = { tam: 18.5, entre: 23.5, justificar: true };
    const y1 = paragrafo(c, ch.corpo[0], 29, y, 459, corpo) + corpo.entre;
    paragrafo(c, ch.corpo[1], 29, y1, 459, corpo);
    paragrafo(c, ch.corpo[2], 514, y, 459, corpo);
}

// a página só de texto, que fecha o capítulo: o número grande na Rune e na cor do capítulo, e o texto embaixo
function paginaDeTexto(c: Ctx, cap: number, num?: number) {
    const ch = CAPITULOS[cap];
    fundo(c, PAPEL);
    rotulo(c, `Capítulo ${ch.n}`, 29, 70, { cor: CINZA });
    linha(c, pagina2(ch.n), 14, 560, { tam: 420, fam: ch.estilo, peso: 400, cor: COR_DO_CAPITULO[ch.id]() });
    textoDoCapitulo(c, cap, 720);
    rodape(c, num, LIVRO.titulo);
}

// o a da Cut na página inteira, com os pontos do contorno como estão no arquivo da fonte e as linhas de base e do x
function pontosDoA(c: Ctx, cap: number, num?: number) {
    fundo(c, PAPEL);
    const g = glifoDe('Rolado', 'a');
    const tam = 1150;
    const esc = tam / 1000;
    const gx = (1000 - g.avanco * esc) / 2;
    const base = 1130;
    const alturaX = base - 545 * esc;
    fio(c, 29, base, 973, base, '#b9b7b0', 1.2);
    fio(c, 29, alturaX, 973, alturaX, '#b9b7b0', 1.2);
    rotulo(c, 'Linha de base', 973, base + 32, { tam: 11.5, cor: CINZA, alinhar: 'right' });
    rotulo(c, 'Altura do x', 973, alturaX - 14, { tam: 11.5, cor: CINZA, alinhar: 'right' });
    contorno(c, g, gx, base, tam, COR.cut, { cor: TINTA, esp: 2 });
    vertices(c, g, gx, base, tam, 9, PAPEL, TINTA);
    const pontos = g.pedras.reduce((s, p) => s + p.vertices.reduce((t, v) => t + v.length, 0), 0);
    rotulo(c, 'O a da Cut', 29, 70, { cor: CINZA });
    rotulo(c, `${pontos} pontos, só retas: uma por golpe`, 29, 92, { cor: CINZA });
    rodape(c, num, LIVRO.titulo);
}

// um bloco de linhas da Rune, alinhado à esquerda, no maior corpo que cabe na largura (até o máximo); devolve a linha
// de base da última
function bloco(c: Ctx, linhas: string[], fam: Familia, y: number, maximo: number, entre: number) {
    const tam = Math.min(maximo, ...linhas.map(t => ajustar(c, t, { fam, semCalt: true }, 930)));
    let base = y + MAIUSCULA * tam;
    linhas.forEach((t, i) => {
        if (i) base += tam * entre;
        linha(c, t, 29, base, { tam, fam, peso: 400, cor: ESCURA, semCalt: true });
    });
    return base;
}

// o alfabeto da Cut: as maiúsculas, as minúsculas e os números, grandes
function alfabetoDaCut(c: Ctx, cap: number, num?: number) {
    fundo(c, PAPEL);
    rotulo(c, 'O alfabeto da Cut', 29, 70, { cor: CINZA });
    let y = bloco(c, ['ABCDEFGHI', 'JKLMNOPQR', 'STUVWXYZ'], 'cut', 130, 150, 1.12);
    y = bloco(c, ['abcdefghi', 'jklmnopqr', 'stuvwxyz'], 'cut', y + 80, 150, 1.24);
    bloco(c, ['0123456789'], 'cut', y + 110, 150, 1);
    rodape(c, num, CAPITULOS[cap].titulo);
}

// a dupla do Seixo: a palavra enorme cruzando as duas páginas, com a legenda na da esquerda e o número na da direita
function seixo(c: Ctx, lado: 0 | 1, num?: number) {
    prancha(c, 'seixo', lado === 0 ? 0 : -1000, 0, 2000, 1500);
    const tinta = tintaSobre(COR.polished);
    if (lado === 0) legendaDe(c, ['Föeger Rune Polished', 'Rolada no rio'], tinta);
    else rodape(c, num, CAPITULOS[1].titulo, tinta);
}

// a mesma palavra nos três estilos, com a largura de cada uma em unidades da fonte, e o texto do capítulo
function larguras(c: Ctx, cap: number, num?: number) {
    fundo(c, PAPEL);
    rotulo(c, 'A mesma palavra, mais estreita a cada estilo', 29, 70, { cor: CINZA });
    const tam = ajustar(c, 'Rune', { fam: 'cut' }, 470);
    ESTILOS.forEach(([fam, nome], i) => {
        const y = 130 + MAIUSCULA * tam + i * (MAIUSCULA * tam + 60);
        linha(c, 'Rune', 29, y, { tam, fam, peso: 400 });
        const unidades = Math.round(largura(c, 'Rune', { tam: 1000, fam }));
        rotulo(c, nome, 29, y + 36, { tam: 11.5, cor: CINZA });
        rotulo(c, `${unidades} unidades`, 973, y + 36, { tam: 11.5, alinhar: 'right', cor: CINZA });
        fio(c, 29, y + 50, 973, y + 50);
    });
    textoDoCapitulo(c, cap, 880);
    rodape(c, num, LIVRO.titulo);
}

// os quatro cortes do s na página inteira, claros no azul
function quatroS(c: Ctx) {
    prancha(c, 'ssss', 0, 0, 1000, 1500);
    legendaDe(c, ['Föeger Rune Worn', 'Os quatro cortes do s'], COR.claroFrio);
}

// as letras repetidas, cada uma nos quatro cortes, e o L do meio e o f do começo
function repetidas(c: Ctx, cap: number, num?: number) {
    fundo(c, PAPEL);
    rotulo(c, 'Quatro cortes de cada', 29, 70, { cor: CINZA });
    ['aaaa', 'eeee', 'gggg', 'oooo', 'rrrr', 'ssss'].forEach((t, i) => {
        const x = i < 3 ? 29 : 514;
        const y = 230 + (i % 3) * 160;
        linha(c, t, x, y, { tam: 120, fam: 'worn', peso: 400 });
        fio(c, x, y + 40, x + 459, y + 40);
    });
    paragrafo(c, 'A primeira de cada linha é o desenho de base; as outras três entram sozinhas, na ordem, quando a letra se repete.', 29, 760, 700, { tam: 18.5, entre: 23.5 });
    moldura(c, 'l-f', 29, 860, 944, 540, ['L e f', 'Pelo lugar na palavra']);
    rodape(c, num, CAPITULOS[cap].titulo);
}

// a dupla do Ploc!: as onomatopeias de borda a borda nas duas páginas
function ploc(c: Ctx, lado: 0 | 1, num?: number) {
    prancha(c, 'ploc', lado === 0 ? 0 : -1000, 0, 2000, 1500);
    const tinta = tintaSobre(COR.polished);
    if (lado === 0) legendaDe(c, ['Föeger Rune Polished', 'Em corpo de cartaz'], tinta);
    else rodape(c, num, CAPITULOS[3].titulo, tinta);
}

// a Rune em parágrafo, em dois corpos, e o texto do capítulo
const AMOSTRA =
    'Toda pedra começa bruta. Quem talha à mão não repete o golpe, e a palavra nunca fica com cara de carimbo. Pedra que rola não cria limo, e água mole em pedra dura tanto bate até que fura.';
function paragrafoNaRune(c: Ctx, cap: number, num?: number) {
    fundo(c, PAPEL);
    rotulo(c, 'A Rune em parágrafo', 29, 70, { cor: CINZA });
    let y = paragrafo(c, AMOSTRA, 29, 160, 944, { tam: 36, entre: 48, fam: 'cut', peso: 400 });
    rotulo(c, 'Corpo 36', 973, 130, { cor: CINZA, alinhar: 'right', tam: 11.5 });
    rotulo(c, 'Corpo 22', 973, y + 34, { cor: CINZA, alinhar: 'right', tam: 11.5 });
    y = paragrafo(c, AMOSTRA, 29, y + 64, 700, { tam: 22, entre: 31, fam: 'cut', peso: 400 });
    textoDoCapitulo(c, cap, Math.max(880, y + 90));
    rodape(c, num, LIVRO.titulo);
}

// as páginas de cada capítulo depois da abertura: a da esquerda, a da direita e a da esquerda que fecha o capítulo
const MATERIAS: Record<IdCapitulo, ((c: Ctx, cap: number, num?: number) => void)[]> = {
    construcao: [pontosDoA, alfabetoDaCut, paginaDeTexto],
    estilos: [(c, _, num) => seixo(c, 0, num), (c, _, num) => seixo(c, 1, num), larguras],
    variacoes: [quatroS, repetidas, paginaDeTexto],
    tamanhos: [(c, _, num) => ploc(c, 0, num), (c, _, num) => ploc(c, 1, num), paragrafoNaRune],
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
    } else if (desenho === 'regua') {
        // a régua dos corpos, casada com a cascata da página de baixo: para cada "Pedra", a linha de base, a da
        // maiúscula, o contorno da palavra e o corpo
        const x = CASCATA.x + CASCATA.l * 0.2;
        for (const { tam, base } of linhasDaCascata(c, CASCATA.y, CASCATA.l, CASCATA.a)) {
            fio(c, x - 24, base, 973, base, 'rgba(31,31,29,0.5)', 1);
            fio(c, x - 24, base - MAIUSCULA * tam, 973, base - MAIUSCULA * tam, 'rgba(31,31,29,0.25)', 1);
            c.p.contornoTexto('Pedra', x, base, { fam: 'cut', tam }, { cor: TINTA, esp: 1.6 });
            rotulo(c, `Corpo ${Math.round(tam)}`, 973, base - 8, { tam: 11, alinhar: 'right', cor: traco });
        }
        rotulo(c, 'Pedra · Cut · seis corpos', 29, 1440, { cor: traco });
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
                if (lista[i]) rotulo(c, lista[i], cx + 12, cy + 24, { tam: 10, cor: traco });
            }
        }
        linha(c, 'Toda letra começou num quadrado.', 500, 1300, { tam: 40, fam: 'cut', peso: 400, cor: TINTA, alinhar: 'center' });
    }
    const nome = v < CAPITULOS.length ? `Capítulo ${CAPITULOS[v].n} · ${CAPITULOS[v].titulo}` : 'Os caracteres';
    rotulo(c, nome, 29, 1468, { cor: CINZA });
}

// ---------- os caracteres ----------

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

// as duas tabelas das letras, em casas quadradas de nove colunas (o vegetal do gabarito, por cima, desenha as mesmas
// casas): o título, os caracteres e onde cada tabela começa
const LETRAS = { colunas: 9, tam: 58 };
const LADO_LETRA = 944 / LETRAS.colunas;
function tabelasDasLetras() {
    const maiusculas = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const y = 300;
    const fim = y + 18 + Math.ceil(maiusculas.length / LETRAS.colunas) * LADO_LETRA;
    return [
        { titulo: 'Maiúsculas', chars: maiusculas, y },
        { titulo: 'Minúsculas', chars: 'abcdefghijklmnopqrstuvwxyz', y: fim + 60 },
    ];
}

// as letras, embaixo do vegetal do gabarito
function letras(c: Ctx, num?: number) {
    fundo(c, PAPEL);
    linha(c, 'Letras', 22, 190, { tam: 92 });
    for (const t of tabelasDasLetras()) tabela(c, t.titulo, t.chars, t.y, { colunas: LETRAS.colunas, tam: LETRAS.tam, alto: LADO_LETRA });
    rodape(c, num, 'Os caracteres');
}

function acentos(c: Ctx, num?: number) {
    fundo(c, PAPEL);
    linha(c, 'Acentos', 22, 190, { tam: 92 });
    const y = tabela(c, 'Maiúsculas', 'ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞŒŠŸŽ', 300, { colunas: 10, tam: 50, alto: 92 });
    tabela(c, 'Minúsculas e outras', 'àáâãäåæçèéêëìíîïðñòóôõöøùúûüýÿıœšžßƒªºµ', y + 60, { colunas: 10, tam: 50, alto: 92 });
    rodape(c, num, LIVRO.titulo);
}

function sinais(c: Ctx, num?: number) {
    fundo(c, PAPEL);
    linha(c, 'Sinais', 22, 190, { tam: 92 });
    let y = tabela(c, 'Números e frações', '0123456789¹²³¼½¾', 300, { colunas: 8, tam: 50, alto: 92 });
    y = tabela(c, 'Pontuação', '.,:;…!¡?¿\'"‘’‚“”„«»‹›()[]{}/\\|¦-–—_•·¶§†‡#&@*%‰', y + 60);
    tabela(c, 'Símbolos', '$¢£¤¥€+−±×÷=≠≈<>≤≥∞¬^~˜¨´¸`ˆ©®™№°←↑→↓★♥✓', y + 60);
    rodape(c, num, 'Os caracteres');
}

// o colofão, a última página impressa, como nos livros: o selo da editora e, embaixo, como o livro foi feito, num
// bloco curto centrado, sem número de página
function colofao(c: Ctx) {
    fundo(c, PAPEL);
    logo(c, 500, 1010, 56, TINTA, 'center');
    rotulo(c, 'Colofão', 500, 1080, { alinhar: 'center', cor: CINZA });
    paragrafo(
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
        case 'apresentacao':
            apresentacao(c, num);
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
