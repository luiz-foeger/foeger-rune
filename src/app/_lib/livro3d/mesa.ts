// a mesa debaixo do livro, como a do clone-tantan: o tampo escuro com cópias espalhadas por baixo e em volta do livro.
// No lugar das fotos dos cases, as pranchas do espécime nas cores dos estilos, páginas soltas em cinza, um papel
// vegetal e recortes de papel preto. Sai em duas versões: nítida, para a câmera de longe, e borrada, para quando a
// câmera chega perto da página (a profundidade de campo). A mesa mede 6,4 × 4 páginas de largura, com o livro aberto
// no centro (de −1 a 1 em x, de −0,75 a 0,75 em y); no painel da página, só a faixa de −1,8 a 1,8 aparece em volta.
import { desenharPagina, desenharPrancha, type Prancha } from '../especime/paginas';
import { pincelCanvas, type Familias } from '../especime/pincel';
import type { Pagina } from '../especime/conteudo';

export const MESA = { l: 6.4, a: 4 };

type Copia =
    | { tipo: 'prancha'; prancha: Prancha; x: number; y: number; l: number; a: number; giro: number }
    | { tipo: 'pagina'; pagina: Pagina; x: number; y: number; l: number; giro: number }
    | { tipo: 'vegetal'; x: number; y: number; l: number; a: number; giro: number }
    | { tipo: 'preto'; pontos: [number, number][] };

// posições em unidades de página, com o centro da mesa em (0, 0) e y para cima; de baixo para cima
const COPIAS: Copia[] = [
    // debaixo das páginas: só aparecem com o livro fechado
    { tipo: 'pagina', pagina: { tipo: 'rosto' }, x: -0.55, y: 0.25, l: 0.9, giro: -7 },
    { tipo: 'prancha', prancha: 'aa', x: 0.5, y: 0.55, l: 0.8, a: 0.8, giro: 10 },
    { tipo: 'pagina', pagina: { tipo: 'caracteres-dir' }, x: 0.45, y: -0.3, l: 0.82, giro: 6 },
    // em volta do livro aberto
    { tipo: 'pagina', pagina: { tipo: 'caracteres-esq' }, x: -1.62, y: -0.42, l: 0.84, giro: -6 },
    { tipo: 'prancha', prancha: 'tres-pedras', x: -1.5, y: 0.62, l: 0.95, a: 0.8, giro: 8 },
    { tipo: 'vegetal', x: -1.28, y: 0.02, l: 0.9, a: 1.3, giro: -12 },
    { tipo: 'preto', pontos: [[1.02, 0.42], [1.78, 0.12], [1.12, -0.22]] },
    { tipo: 'pagina', pagina: { tipo: 'sumario-dir' }, x: 1.58, y: -0.38, l: 0.84, giro: 12 },
    { tipo: 'prancha', prancha: 'ploc', x: 1.62, y: 0.68, l: 1.0, a: 0.5, giro: -9 },
    { tipo: 'prancha', prancha: 'tanto', x: -1.15, y: -0.98, l: 1.0, a: 0.5, giro: 4 },
    { tipo: 'preto', pontos: [[-0.35, -0.7], [0.05, -0.76], [-0.2, -1.22]] },
    { tipo: 'prancha', prancha: 'ssss', x: 1.0, y: -1.0, l: 0.8, a: 0.7, giro: -5 },
];

export function desenharMesa(fam: Familias) {
    const L = 4096;
    const A = Math.round((L * MESA.a) / MESA.l);
    const ppu = L / MESA.l;
    const cv = document.createElement('canvas');
    cv.width = L;
    cv.height = A;
    const g = cv.getContext('2d')!;
    // o tampo: escuro, com uma luz larga no meio e um grão bem fraco
    const fundo = g.createRadialGradient(L / 2, A / 2, 0, L / 2, A / 2, L * 0.6);
    fundo.addColorStop(0, '#2a2725');
    fundo.addColorStop(1, '#141312');
    g.fillStyle = fundo;
    g.fillRect(0, 0, L, A);
    const ruido = document.createElement('canvas');
    ruido.width = 512;
    ruido.height = 512;
    const rg = ruido.getContext('2d')!;
    const dados = rg.createImageData(512, 512);
    for (let i = 0; i < dados.data.length; i += 4) {
        const v = Math.random() * 255;
        dados.data[i] = dados.data[i + 1] = dados.data[i + 2] = v;
        dados.data[i + 3] = 12;
    }
    rg.putImageData(dados, 0, 0);
    g.fillStyle = g.createPattern(ruido, 'repeat')!;
    g.fillRect(0, 0, L, A);

    const px = (x: number) => L / 2 + x * ppu;
    const py = (y: number) => A / 2 - y * ppu;
    const sombra = (forca = 0.55) => {
        g.shadowColor = `rgba(0,0,0,${forca})`;
        g.shadowBlur = 50;
        g.shadowOffsetX = 12;
        g.shadowOffsetY = 22;
    };
    const semSombra = () => {
        g.shadowColor = 'transparent';
        g.shadowBlur = 0;
        g.shadowOffsetX = 0;
        g.shadowOffsetY = 0;
    };
    const folha = document.createElement('canvas');
    const fg = folha.getContext('2d')!;

    for (const c of COPIAS) {
        g.save();
        if (c.tipo === 'preto') {
            sombra();
            g.fillStyle = '#0b0b0b';
            g.beginPath();
            c.pontos.forEach(([x, y], i) => (i ? g.lineTo(px(x), py(y)) : g.moveTo(px(x), py(y))));
            g.closePath();
            g.fill();
            g.restore();
            continue;
        }
        g.translate(px(c.x), py(c.y));
        g.rotate((-c.giro * Math.PI) / 180);
        if (c.tipo === 'prancha') {
            // a prancha impressa num cartão, com uma borda branca fina
            const l = c.l * ppu;
            const a = c.a * ppu;
            const b = 0.03 * ppu;
            sombra();
            g.fillStyle = '#efeee9';
            g.fillRect(-l / 2, -a / 2, l, a);
            semSombra();
            g.save();
            g.translate(-l / 2 + b, -a / 2 + b);
            desenharPrancha(pincelCanvas(g, ppu / 1000, fam), c.prancha, (c.l - 0.06) * 1000, (c.a - 0.06) * 1000);
            g.restore();
        } else if (c.tipo === 'pagina') {
            const l = c.l * ppu;
            const a = l * 1.5;
            folha.width = Math.round(l);
            folha.height = Math.round(a);
            desenharPagina(pincelCanvas(fg, l / 1000, fam), c.pagina);
            sombra();
            g.filter = 'grayscale(1)';
            g.drawImage(folha, -l / 2, -a / 2);
        } else {
            const l = c.l * ppu;
            const a = c.a * ppu;
            sombra(0.22);
            g.fillStyle = 'rgba(214,213,208,0.5)';
            g.fillRect(-l / 2, -a / 2, l, a);
            semSombra();
            g.fillStyle = 'rgba(30,30,28,0.85)';
            g.font = `${0.026 * ppu}px ${fam.mono}`;
            g.textAlign = 'right';
            g.fillText('PAPEL VEGETAL, 90 G/M²', l / 2 - 0.05 * ppu, -a / 2 + 0.08 * ppu);
        }
        g.restore();
    }

    // a versão borrada, menor (a câmera perto só vê a mesa fora de foco)
    const borrada = document.createElement('canvas');
    borrada.width = 1024;
    borrada.height = Math.round((1024 * MESA.a) / MESA.l);
    const bg = borrada.getContext('2d')!;
    bg.filter = 'blur(6px)';
    bg.drawImage(cv, -20, -14, 1064, borrada.height + 28);
    return { nitida: cv, borrada };
}
