// o pincel do espécime: as páginas do livro são desenhadas só por estas operações, em unidades da página (1000 × 1500,
// y para baixo, linha de base no y do texto). Há dois pincéis: o de canvas, que faz as texturas do livro em qualquer
// escala, e o de SVG, que faz o PDF com o texto de verdade. As medidas do texto saem sempre do mesmo medidor, numa
// escala fixa, para as linhas quebrarem igual nas texturas de todos os tamanhos e no PDF.

export type Familia = 'cut' | 'polished' | 'worn' | 'ui' | 'mono';
export type Familias = Record<Familia, string>;
// espaco: o espaço entre as letras, em fração do corpo; semCalt: letra por letra, sem as trocas por contexto
export type Estilo = { fam: Familia; tam: number; peso?: number; cor?: string; espaco?: number; semCalt?: boolean };
export type Traco = { cor: string; esp: number };
export type Parada = [number, string];

export const TINTA = '#1f1f1d';

export interface Pincel {
    readonly fam: Familias;
    ret(x: number, y: number, l: number, a: number, cor: string): void;
    borda(x: number, y: number, l: number, a: number, traco: Traco): void;
    fio(x1: number, y1: number, x2: number, y2: number, traco: Traco, tracejado?: number): void;
    texto(t: string, x: number, y: number, e: Estilo): void;
    contornoTexto(t: string, x: number, y: number, e: Estilo, traco: Traco): void;
    // um caminho em unidades da fonte (o contorno de uma letra), posto em (x, y) com a escala esc
    caminho(d: string, x: number, y: number, esc: number, cor: string | null, traco?: Traco): void;
    circulo(x: number, y: number, r: number, cor: string | null, traco?: Traco): void;
    quadrado(x: number, y: number, r: number, cor: string | null, traco?: Traco): void;
    degrade(x: number, y: number, l: number, a: number, paradas: Parada[], vertical: boolean): void;
    // o pano da capa: a cor e uma trama de listras bem fraca
    pano(cor: string): void;
    recortar(x: number, y: number, l: number, a: number, desenho: () => void): void;
    girar(graus: number, cx: number, cy: number, desenho: () => void): void;
    limpar(): void;
    // uma imagem pronta (um canvas desenhado à parte, como a tinta granulada da capa), esticada na caixa
    imagem(fonte: HTMLCanvasElement, x: number, y: number, l: number, a: number): void;
}

// ---------- o medidor ----------

const K = 8;
let medidor: CanvasRenderingContext2D | null = null;
const memoria = new Map<string, number>();

function fonteCss(fam: Familias, e: Estilo, s: number) {
    return `${e.peso ?? 400} ${e.tam * s}px ${fam[e.fam]}`;
}

export function medir(fam: Familias, t: string, e: Estilo): number {
    const chave = `${e.fam}|${e.peso ?? 400}|${e.tam}|${e.espaco ?? 0}|${e.semCalt ? 1 : 0}|${t}`;
    const guardado = memoria.get(chave);
    if (guardado !== undefined) return guardado;
    let w = 0;
    if (e.semCalt) {
        for (const ch of Array.from(t)) w += medir(fam, ch, { ...e, semCalt: false });
    } else {
        if (!medidor) medidor = document.createElement('canvas').getContext('2d')!;
        medidor.font = fonteCss(fam, e, K);
        medidor.letterSpacing = `${(e.espaco ?? 0) * e.tam * K}px`;
        w = medidor.measureText(t).width / K;
        medidor.letterSpacing = '0px';
    }
    memoria.set(chave, w);
    return w;
}

// as medidas dependem das fontes carregadas: depois de carregar, a memória começa de novo
export function esquecerMedidas() {
    memoria.clear();
}

// as famílias das fontes, lidas das variáveis do layout (next/font), e o carregamento delas antes de desenhar
export function familiasDe(el: Element): Familias {
    const cs = getComputedStyle(el);
    const v = (n: string, reserva: string) => cs.getPropertyValue(n).trim() || reserva;
    return {
        cut: v('--ff-cut', 'sans-serif'),
        polished: v('--ff-polished', 'sans-serif'),
        worn: v('--ff-worn', 'sans-serif'),
        ui: v('--ff-ui', 'sans-serif'),
        mono: v('--ff-mono', 'monospace'),
    };
}

export async function carregarFontes(fam: Familias) {
    await Promise.all([
        document.fonts.load(`400 40px ${fam.cut}`),
        document.fonts.load(`400 40px ${fam.polished}`),
        document.fonts.load(`400 40px ${fam.worn}`),
        document.fonts.load(`300 40px ${fam.ui}`),
        document.fonts.load(`400 40px ${fam.ui}`),
        document.fonts.load(`400 40px ${fam.mono}`),
    ]);
    esquecerMedidas();
}

// ---------- o pincel de canvas ----------

export function pincelCanvas(g: CanvasRenderingContext2D, s: number, fam: Familias): Pincel {
    const tracar = (t: Traco) => {
        g.strokeStyle = t.cor;
        g.lineWidth = t.esp * s;
    };
    const texto = (t: string, x: number, y: number, e: Estilo, traco?: Traco) => {
        g.font = fonteCss(fam, e, s);
        g.textAlign = 'left';
        g.textBaseline = 'alphabetic';
        g.letterSpacing = `${(e.espaco ?? 0) * e.tam * s}px`;
        const um = (ch: string, xx: number) => {
            if (traco) {
                tracar(traco);
                g.lineJoin = 'round';
                g.strokeText(ch, xx * s, y * s);
            } else {
                g.fillStyle = e.cor ?? TINTA;
                g.fillText(ch, xx * s, y * s);
            }
        };
        if (e.semCalt) {
            let xx = x;
            for (const ch of Array.from(t)) {
                um(ch, xx);
                xx += medir(fam, ch, { ...e, semCalt: false });
            }
        } else um(t, x);
        g.letterSpacing = '0px';
    };
    const forma = (desenhar: () => void, cor: string | null, traco?: Traco, regra: CanvasFillRule = 'nonzero') => {
        g.beginPath();
        desenhar();
        if (cor) {
            g.fillStyle = cor;
            g.fill(regra);
        }
        if (traco) {
            tracar(traco);
            g.stroke();
        }
    };
    return {
        fam,
        ret(x, y, l, a, cor) {
            g.fillStyle = cor;
            g.fillRect(x * s, y * s, l * s, a * s);
        },
        borda(x, y, l, a, traco) {
            tracar(traco);
            g.strokeRect(x * s, y * s, l * s, a * s);
        },
        fio(x1, y1, x2, y2, traco, tracejado) {
            g.save();
            tracar(traco);
            if (tracejado) g.setLineDash([tracejado * s, tracejado * s]);
            g.beginPath();
            g.moveTo(x1 * s, y1 * s);
            g.lineTo(x2 * s, y2 * s);
            g.stroke();
            g.restore();
        },
        texto: (t, x, y, e) => texto(t, x, y, e),
        contornoTexto: (t, x, y, e, traco) => texto(t, x, y, e, traco),
        caminho(d, x, y, esc, cor, traco) {
            g.save();
            g.translate(x * s, y * s);
            g.scale(esc * s, esc * s);
            const p = new Path2D(d);
            if (cor) {
                g.fillStyle = cor;
                g.fill(p, 'evenodd');
            }
            if (traco) {
                g.strokeStyle = traco.cor;
                g.lineWidth = traco.esp / esc;
                g.lineJoin = 'round';
                g.stroke(p);
            }
            g.restore();
        },
        circulo(x, y, r, cor, traco) {
            forma(() => g.arc(x * s, y * s, r * s, 0, Math.PI * 2), cor, traco);
        },
        quadrado(x, y, r, cor, traco) {
            forma(() => g.rect((x - r) * s, (y - r) * s, 2 * r * s, 2 * r * s), cor, traco);
        },
        degrade(x, y, l, a, paradas, vertical) {
            const gr = vertical ? g.createLinearGradient(0, y * s, 0, (y + a) * s) : g.createLinearGradient(x * s, 0, (x + l) * s, 0);
            for (const [p, c] of paradas) gr.addColorStop(p, c);
            g.fillStyle = gr;
            g.fillRect(x * s, y * s, l * s, a * s);
        },
        pano(cor) {
            g.fillStyle = cor;
            g.fillRect(0, 0, 1000 * s, 1500 * s);
            g.save();
            g.globalAlpha = 0.05;
            for (let i = 0; i < 1500; i += 3) {
                g.fillStyle = i % 6 ? '#000' : '#fff';
                g.fillRect(0, i * s, 1000 * s, 0.8 * s);
            }
            g.restore();
        },
        recortar(x, y, l, a, desenho) {
            g.save();
            g.beginPath();
            g.rect(x * s, y * s, l * s, a * s);
            g.clip();
            desenho();
            g.restore();
        },
        girar(graus, cx, cy, desenho) {
            g.save();
            g.translate(cx * s, cy * s);
            g.rotate((graus * Math.PI) / 180);
            g.translate(-cx * s, -cy * s);
            desenho();
            g.restore();
        },
        limpar() {
            g.clearRect(0, 0, 1000 * s, 1500 * s);
        },
        imagem(fonte, x, y, l, a) {
            g.drawImage(fonte, x * s, y * s, l * s, a * s);
        },
    };
}

// ---------- o pincel de SVG ----------

const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n = (v: number) => String(Math.round(v * 100) / 100);

export function pincelSvg(fam: Familias, id: string): Pincel & { svg: (fundo?: string) => string } {
    const partes: string[] = [];
    const defs: string[] = [];
    let conta = 0;
    const novoId = (tipo: string) => `${id}-${tipo}-${conta++}`;
    const tracoAttr = (t?: Traco, esc = 1) => (t ? ` stroke="${t.cor}" stroke-width="${n(t.esp / esc)}" stroke-linejoin="round"` : '');
    const texto = (t: string, x: number, y: number, e: Estilo, traco?: Traco) => {
        const pinta = traco ? `fill="none"${tracoAttr(traco)}` : `fill="${e.cor ?? TINTA}"`;
        const attrs = `font-family="${esc(fam[e.fam])}" font-size="${n(e.tam)}" font-weight="${e.peso ?? 400}" ${pinta}${e.espaco ? ` letter-spacing="${n(e.espaco * e.tam)}"` : ''}`;
        if (e.semCalt) {
            let xx = x;
            for (const ch of Array.from(t)) {
                if (ch !== ' ') partes.push(`<text x="${n(xx)}" y="${n(y)}" ${attrs}>${esc(ch)}</text>`);
                xx += medir(fam, ch, { ...e, semCalt: false });
            }
        } else partes.push(`<text x="${n(x)}" y="${n(y)}" ${attrs} xml:space="preserve">${esc(t)}</text>`);
    };
    return {
        fam,
        ret(x, y, l, a, cor) {
            partes.push(`<rect x="${n(x)}" y="${n(y)}" width="${n(l)}" height="${n(a)}" fill="${cor}"/>`);
        },
        borda(x, y, l, a, traco) {
            partes.push(`<rect x="${n(x)}" y="${n(y)}" width="${n(l)}" height="${n(a)}" fill="none"${tracoAttr(traco)}/>`);
        },
        fio(x1, y1, x2, y2, traco, tracejado) {
            partes.push(`<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}"${tracoAttr(traco)}${tracejado ? ` stroke-dasharray="${n(tracejado)} ${n(tracejado)}"` : ''}/>`);
        },
        texto: (t, x, y, e) => texto(t, x, y, e),
        contornoTexto: (t, x, y, e, traco) => texto(t, x, y, e, traco),
        caminho(d, x, y, e, cor, traco) {
            partes.push(`<path d="${d}" transform="translate(${n(x)} ${n(y)}) scale(${e})" fill="${cor ?? 'none'}" fill-rule="evenodd"${tracoAttr(traco, e)}/>`);
        },
        circulo(x, y, r, cor, traco) {
            partes.push(`<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${cor ?? 'none'}"${tracoAttr(traco)}/>`);
        },
        quadrado(x, y, r, cor, traco) {
            partes.push(`<rect x="${n(x - r)}" y="${n(y - r)}" width="${n(2 * r)}" height="${n(2 * r)}" fill="${cor ?? 'none'}"${tracoAttr(traco)}/>`);
        },
        degrade(x, y, l, a, paradas, vertical) {
            const g = novoId('degrade');
            const [x2, y2] = vertical ? [0, 1] : [1, 0];
            defs.push(`<linearGradient id="${g}" x1="0" y1="0" x2="${x2}" y2="${y2}">${paradas.map(([p, c]) => `<stop offset="${p}" stop-color="${c}"/>`).join('')}</linearGradient>`);
            partes.push(`<rect x="${n(x)}" y="${n(y)}" width="${n(l)}" height="${n(a)}" fill="url(#${g})"/>`);
        },
        pano(cor) {
            const p = novoId('pano');
            defs.push(`<pattern id="${p}" width="1000" height="6" patternUnits="userSpaceOnUse"><rect y="0" width="1000" height="0.8" fill="#fff"/><rect y="3" width="1000" height="0.8" fill="#000"/></pattern>`);
            partes.push(`<rect width="1000" height="1500" fill="${cor}"/><rect width="1000" height="1500" fill="url(#${p})" opacity="0.05"/>`);
        },
        recortar(x, y, l, a, desenho) {
            const c = novoId('corte');
            defs.push(`<clipPath id="${c}"><rect x="${n(x)}" y="${n(y)}" width="${n(l)}" height="${n(a)}"/></clipPath>`);
            partes.push(`<g clip-path="url(#${c})">`);
            desenho();
            partes.push('</g>');
        },
        girar(graus, cx, cy, desenho) {
            partes.push(`<g transform="rotate(${n(graus)} ${n(cx)} ${n(cy)})">`);
            desenho();
            partes.push('</g>');
        },
        limpar() {
            partes.length = 0;
        },
        // no SVG do PDF, a imagem vai embutida em PNG
        imagem(fonte, x, y, l, a) {
            partes.push(`<image href="${fonte.toDataURL('image/png')}" x="${n(x)}" y="${n(y)}" width="${n(l)}" height="${n(a)}" preserveAspectRatio="none"/>`);
        },
        svg: fundo =>
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1500" width="100%" height="100%" preserveAspectRatio="none" overflow="hidden">${defs.length ? `<defs>${defs.join('')}</defs>` : ''}${fundo ? `<rect width="1000" height="1500" fill="${fundo}"/>` : ''}${partes.join('')}</svg>`,
    };
}
