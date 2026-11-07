'use client';

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import Matter from 'matter-js';
import { FiltroDesgaste, ajustarDesgaste } from './Desgaste';
import { HERO } from '../_lib/conteudo';
import { LINHAS, PALAVRAS, type Glifo } from '../_lib/glifos';

// ——— o hero com as pedras que rolam ———
// "Rune" grande na Cut; o cursor gasta a letra inteira que ele toca, em casa ou solta. O hero ocupa a tela inteira e
// fica preso no alto (sticky); a página sobe por cima dele. A borda de cima da página é um chão que sobe com a
// rolagem: quando passa pelo ponto mais baixo de uma letra, ela se solta e vira pedra (pesada, quase sem quique):
// tomba contra a vizinha, rola e é levada pela página. Cada choque e cada arrasto gastam a letra um pouco (da Cut para
// a Worn, a mesma conta da fonte). Passada a Worn, os choques racham a pedra a partir do ponto da batida, e as
// rachaduras crescem até ela se partir nos cacos que elas desenham (lascas pequenas perto da batida, blocos maiores
// longe dela, as bordas da quebra vivas).
// Quando o meio do painel do alfabeto chega ao topo da tela, as letras (já fora dela) voltam para casa inteiras e
// novas, e o hero passa a rolar com a página, como uma seção comum: ao subir, a palavra desce junto. O meio, e não o
// topo, dá margem: quem passa um pouco do alfabeto e volta encontra as letras ainda soltas. No topo, o hero
// se prende de novo e a próxima rolagem empurra outra vez. Até lá, as letras ficam soltas, onde a física deixar. O
// clique no logo do cabeçalho leva as letras (ou os cacos, que se juntam) de volta para o lugar.
// As letras são desenhadas numa camada dentro do hero, por baixo da página. As contas são a partir do canto do hero
// (preso no alto, é o canto da tela). O SVG da cena só mede onde cada letra mora. A física é a matter-js, com o
// contorno convexo de cada letra e de cada caco (o furo do R e os vãos não contam no choque).
const ESCALA = 400 / LINHAS.maiuscula; // a maiúscula com 400 u
const MARGEM = 260;
const TOPO = -1150;
const ALTURA = 1500;
const BASE = 560; // a linha de base na cena do hero (849 u de altura, centrada na tela), em u
const WORN = 50;
const SOBE = WORN / 0.3; // σ por segundo, gastando com o cursor
const DESCE = WORN / 1.2; // σ por segundo, voltando
const ESPERA = 0.4; // segundos parada na Worn depois que o cursor sai
const VEZ = 1; // sem ninguém mexendo, uma letra nova a cada segundo
// a pedra: pesada (a gravidade é de ~4500 px/s²), quase sem quique e com atrito alto, para tombar em vez de deslizar
const GRAVIDADE = 4.5;
const PEDRA = { restitution: 0.06, friction: 0.8, frictionStatic: 1, frictionAir: 0.012, density: 0.004 };
const POR_CHOQUE = 0.2; // σ por px de velocidade (a cada 1/60 s) num choque
const MAX_CHOQUE = 3.5; // o máximo de σ num choque só (a pedra se gasta aos poucos, ao longo de várias rolagens)
const ARRASTO = 0.1; // σ por segundo, por px de velocidade, enquanto a pedra rola ou arrasta encostada em outra
// abaixo destas velocidades (px a cada 1/60 s), o toque não gasta: é a pedra assentando, não batendo nem rolando
const MIN_CHOQUE = 3;
const MIN_ARRASTO = 2;
const PASSOS = 4; // subpassos da física por quadro (o chão anda aos poucos, sem atravessar as letras)
const ALCANCE = 60; // px: se o chão passou do alto da letra mais que isso de uma vez (um salto de rolagem), ela não se solta
const VOLTA = 0.9; // segundos da volta para o lugar (pelo logo)
// a quebra: o dano é o desgaste que passa da Worn; com ele, as rachaduras crescem, e a pedra se parte em QUEBRA
const QUEBRA = 14;
const PERTO = 8; // sementes dos cacos em volta do ponto da batida (lascas pequenas)
const LONGE = 11; // e espalhadas pela letra (blocos maiores)
const RAIO_PERTO = 140; // unidades da fonte
const CACO_MIN = 1200; // unidades²: um pedaço menor que isso vira pó (não entra)
const EMPURRAO = 2.2; // px a cada 1/60 s: os cacos se afastam do ponto da batida ao se partir
// ao se soltar, cada letra leva um tranco: um pulo curto, um giro e um empurrão contra a vizinha (o R contra o u, o n
// contra o e); pesada, ela cai logo, tombada, por cima das outras (velocidades em px e radianos a cada 1/60 s)
const LANCE = [
    { vx: 4.5, vy: -11, giro: 0.06 },
    { vx: -3.5, vy: -14, giro: -0.075 },
    { vx: 3.5, vy: -12, giro: 0.07 },
    { vx: -4.5, vy: -10, giro: -0.055 },
];
// o desenho da Worn de cada letra do Rune, alinhado ao Cut (as fontes gastas têm espaçamento próprio: cada letra anda
// até o centro da tinta coincidir com o do polígono do Cut; desvios lidos das caixas exatas dos .otf)
const DESVIO_WORN: Record<string, number> = { R: 42.1, u: 32.7, n: 26, e: 26 };
const SEM_TROCAS = { fontFeatureSettings: '"calt" 0, "kern" 0' } as CSSProperties;
const u = (n: number) => `calc(${n} * var(--u))`;

type Ponto = { x: number; y: number };
type Estado = 'casa' | 'solta' | 'quebrada' | 'volta';
type Aresta = { d: string; d0: number; comp: number }; // uma rachadura: o caminho, a distância do começo à batida e o comprimento
type Caco = { id: string; d: string; centro: Ponto; casco: Ponto[] }; // em unidades da fonte, nas contas da palavra
type Racha = { geracao: number; origem: Ponto; arestas: Aresta[]; alcance: number; cacos: Caco[] };
type Pose = { x: number; y: number; a: number };
type Pedra = {
    centro: Ponto; // o centro do contorno convexo, em unidades da fonte
    casco: Ponto[]; // o contorno convexo, em unidades da fonte, em volta do centro
    cima: number; // o ponto mais alto e o mais baixo do casco, em unidades da fonte, a partir do centro
    baixo: number;
    corpo: Matter.Body | null;
    estado: Estado;
    choque: number; // o σ dos choques e arrastos (em casa, ele volta aos poucos para a Cut)
    dano: number; // o que passou da Worn
    racha: Racha | null;
    cursor: number; // o σ do cursor (vai e volta)
    tocada: number;
    aplicado: number; // o último σ posto no filtro
    danoAplicado: number;
    de: Pose; // de onde a letra sai na volta
    desde: number;
};

const palavra = PALAVRAS.Rune;
const suave = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const caminho = (pts: Ponto[], fechado = true) =>
    pts.map((p, k) => `${k ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('') + (fechado ? 'Z' : '');
// o menor giro até o ângulo 0
const semVoltas = (a: number) => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));

// ——— geometria da quebra ———
const area = (pts: Ponto[]) => {
    let s = 0;
    for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        s += a.x * b.y - b.x * a.y;
    }
    return s / 2;
};
const dentro = (p: Ponto, poly: Ponto[]) => {
    let r = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const a = poly[i];
        const b = poly[j];
        if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) r = !r;
    }
    return r;
};
const mistura = (a: Ponto, b: Ponto, t: number) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
// recorta um polígono qualquer por um convexo (Sutherland–Hodgman)
function recortar(sujeito: Ponto[], convexo: Ponto[]) {
    const sentido = Math.sign(area(convexo)) || 1;
    let saida = sujeito;
    for (let i = 0; i < convexo.length && saida.length; i++) {
        const a = convexo[i];
        const b = convexo[(i + 1) % convexo.length];
        const lado = (p: Ponto) => sentido * ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x));
        const entrada = saida;
        saida = [];
        for (let k = 0; k < entrada.length; k++) {
            const p = entrada[k];
            const q = entrada[(k + 1) % entrada.length];
            const lp = lado(p);
            const lq = lado(q);
            if (lp >= 0) saida.push(p);
            if (lp >= 0 !== lq >= 0) saida.push(mistura(p, q, lp / (lp - lq)));
        }
    }
    return saida;
}
// a célula de Voronoi de uma semente dentro da caixa, com o vizinho de cada aresta (-1 = a borda da caixa)
type Vertice = { p: Ponto; viz: number };
function celula(i: number, sementes: Ponto[], caixa: Ponto[]) {
    let poly: Vertice[] = caixa.map(p => ({ p, viz: -1 }));
    const si = sementes[i];
    for (let j = 0; j < sementes.length && poly.length; j++) {
        if (j === i) continue;
        const sj = sementes[j];
        const m = mistura(si, sj, 0.5);
        const f = (p: Ponto) => (p.x - m.x) * (sj.x - si.x) + (p.y - m.y) * (sj.y - si.y); // ≤ 0: mais perto de si
        const novo: Vertice[] = [];
        for (let k = 0; k < poly.length; k++) {
            const P = poly[k];
            const Q = poly[(k + 1) % poly.length];
            const fp = f(P.p);
            const fq = f(Q.p);
            if (fp <= 0) novo.push(P);
            if (fp <= 0 && fq > 0) novo.push({ p: mistura(P.p, Q.p, fp / (fp - fq)), viz: j });
            if (fp > 0 && fq <= 0) novo.push({ p: mistura(P.p, Q.p, fp / (fp - fq)), viz: P.viz });
        }
        poly = novo;
    }
    return poly;
}
// a linha da rachadura entre dois pontos: quebrada, com desvios que somem nas pontas
function serrilhar(a: Ponto, b: Ponto) {
    const L = Math.hypot(b.x - a.x, b.y - a.y);
    if (L < 1) return [a, b];
    const n = Math.max(2, Math.round(L / 20));
    const amp = Math.min(11, L * 0.07);
    const nx = -(b.y - a.y) / L;
    const ny = (b.x - a.x) / L;
    const pts = [a];
    let desvio = 0;
    for (let k = 1; k < n; k++) {
        const t = k / n;
        desvio = desvio * 0.45 + (Math.random() * 2 - 1) * amp;
        const env = Math.sin(Math.PI * t);
        pts.push({ x: a.x + (b.x - a.x) * t + nx * desvio * env, y: a.y + (b.y - a.y) * t + ny * desvio * env });
    }
    pts.push(b);
    return pts;
}
// tira os pontos quase repetidos de um contorno (os do recorte): com eles, o teste de convexo da matter-js erra por
// ruído e ela reclama no console (e cai no casco convexo de qualquer jeito)
function semRepetidos(pts: Ponto[]) {
    const out: Ponto[] = [];
    for (const p of pts) if (!out.length || Math.hypot(p.x - out[out.length - 1].x, p.y - out[out.length - 1].y) > 1) out.push(p);
    while (out.length > 3 && Math.hypot(out[0].x - out[out.length - 1].x, out[0].y - out[out.length - 1].y) <= 1) out.pop();
    return out;
}
const comprimento = (pts: Ponto[]) => pts.slice(1).reduce((s, p, k) => s + Math.hypot(p.x - pts[k].x, p.y - pts[k].y), 0);

// racha a letra a partir do ponto da batida: as sementes dos cacos (muitas perto da batida, poucas longe), as células,
// as rachaduras (as arestas das células, quebradas, que crescem a partir da batida) e os cacos (as células recortadas
// pela letra; o pedaço pequeno demais vira pó)
let geracoes = 0;
function rachar(gl: Glifo, origem: Ponto): Racha {
    const fora = gl.pedras.map(pd => pd.vertices[0].map(([x, y]) => ({ x, y })));
    const furos = gl.pedras.flatMap(pd => pd.vertices.slice(1).map(c => c.map(([x, y]) => ({ x, y }))));
    const todos = fora.flat();
    const x0 = Math.min(...todos.map(p => p.x)) - 30;
    const x1 = Math.max(...todos.map(p => p.x)) + 30;
    const y0 = Math.min(...todos.map(p => p.y)) - 30;
    const y1 = Math.max(...todos.map(p => p.y)) + 30;
    const caixa = [
        { x: x0, y: y0 },
        { x: x1, y: y0 },
        { x: x1, y: y1 },
        { x: x0, y: y1 },
    ];
    const naLetra = (p: Ponto) => fora.some(c => dentro(p, c)) && !furos.some(c => dentro(p, c));
    const sementes: Ponto[] = [];
    for (let t = 0; sementes.length < PERTO && t < 200; t++) {
        const a = Math.random() * 2 * Math.PI;
        const r = RAIO_PERTO * Math.sqrt(Math.random());
        const p = { x: origem.x + Math.cos(a) * r, y: origem.y + Math.sin(a) * r };
        if (p.x > x0 && p.x < x1 && p.y > y0 && p.y < y1) sementes.push(p);
    }
    for (let t = 0; sementes.length < PERTO + LONGE && t < 400; t++) {
        const p = { x: x0 + Math.random() * (x1 - x0), y: y0 + Math.random() * (y1 - y0) };
        if (naLetra(p) && sementes.every(s => Math.hypot(s.x - p.x, s.y - p.y) > 70)) sementes.push(p);
    }
    const celulas = sementes.map((_, i) => celula(i, sementes, caixa));
    const serras = new Map<string, Ponto[]>();
    celulas.forEach((cel, i) =>
        cel.forEach((v, k) => {
            if (v.viz > i) serras.set(`${i}-${v.viz}`, serrilhar(v.p, cel[(k + 1) % cel.length].p));
        }),
    );
    // as rachaduras: só as que passam pela letra, começando pela ponta mais perto da batida
    const arestas: Aresta[] = [];
    for (const pts of serras.values()) {
        if (!pts.some(naLetra)) continue;
        const ini = Math.hypot(pts[0].x - origem.x, pts[0].y - origem.y);
        const fim = Math.hypot(pts[pts.length - 1].x - origem.x, pts[pts.length - 1].y - origem.y);
        const ord = ini <= fim ? pts : pts.slice().reverse();
        arestas.push({ d: caminho(ord, false), d0: Math.min(ini, fim), comp: comprimento(ord) });
    }
    const alcance = Math.max(1, ...arestas.map(a => a.d0 + a.comp));
    // os cacos
    const geracao = ++geracoes;
    const cacos: Caco[] = [];
    celulas.forEach((cel, i) => {
        const convexo = cel.map(v => v.p);
        if (convexo.length < 3) return;
        const pedacos = fora.map(c => recortar(c, convexo));
        const liquida =
            pedacos.reduce((s, p) => s + Math.abs(area(p)), 0) - furos.reduce((s, c) => s + Math.abs(area(recortar(c, convexo))), 0);
        if (liquida < CACO_MIN) return;
        const pontos = pedacos.flat();
        if (pontos.length < 3) return;
        const casco = semRepetidos(Matter.Vertices.hull(pontos as unknown as Matter.Vertex[]).map(p => ({ x: p.x, y: p.y })));
        if (casco.length < 3) return;
        const centro = Matter.Vertices.centre(casco as unknown as Matter.Vertex[]);
        // o contorno do caco é a célula com as arestas quebradas (as mesmas das rachaduras)
        const serrado = cel.flatMap(v => {
            if (v.viz < 0) return [v.p];
            const s = i < v.viz ? serras.get(`${i}-${v.viz}`) : serras.get(`${v.viz}-${i}`)?.slice().reverse();
            return s ? s.slice(0, -1) : [v.p];
        });
        cacos.push({
            id: `${geracao}-${i}`,
            d: caminho(serrado),
            centro: { x: centro.x, y: centro.y },
            // o casco um pouco para dentro: a pedra gasta é menor que o polígono do Cut
            casco: casco.map(p => ({ x: centro.x + (p.x - centro.x) * 0.94, y: centro.y + (p.y - centro.y) * 0.94 })),
        });
    });
    return { geracao, origem, arestas, alcance, cacos };
}

// um corpo da física com um contorno já convexo, centrado na posição (o fromVertices testa a convexidade de novo e, com
// pontos quase alinhados, erra por ruído e reclama no console; o resultado seria o mesmo)
function corpoConvexo(pos: Ponto, contorno: Ponto[], opcoes: Matter.IBodyDefinition) {
    return Matter.Body.create({ ...opcoes, position: { x: pos.x, y: pos.y }, vertices: Matter.Vertices.clockwiseSort(contorno.map(p => ({ ...p })) as unknown as Matter.Vertex[]) });
}

function cascos(): Pedra[] {
    return palavra.glifos.map(g => {
        const pts = g.pedras.flatMap(p => p.vertices.flat()).map(([x, y]) => ({ x, y }));
        const casco = Matter.Vertices.hull(pts as unknown as Matter.Vertex[]);
        const centro = Matter.Vertices.centre(casco);
        const rel = casco.map(p => ({ x: p.x - centro.x, y: p.y - centro.y }));
        return {
            centro,
            casco: rel,
            cima: Math.min(...rel.map(p => p.y)),
            baixo: Math.max(...rel.map(p => p.y)),
            corpo: null,
            estado: 'casa',
            choque: 0,
            dano: 0,
            racha: null,
            cursor: 0,
            tocada: -Infinity,
            aplicado: -1,
            danoAplicado: -1,
            de: { x: 0, y: 0, a: 0 },
            desde: 0,
        };
    });
}

// a letra na Worn, desenhada pela fonte (a letra rachada e os cacos)
function Gasta({ gl, cor }: { gl: Glifo; cor: string }) {
    return (
        <text x={gl.x + (DESVIO_WORN[gl.ch] ?? 0)} y={0} fontSize={1000} fill={cor} style={{ fontFamily: 'var(--ff-worn)', ...SEM_TROCAS }}>
            {gl.ch}
        </text>
    );
}

export function HeroPedras() {
    const id = useId().replace(/:/g, '');
    const ref = useRef<HTMLElement>(null);
    const svg = useRef<SVGSVGElement>(null);
    const elementos = useRef<(SVGSVGElement | null)[]>([]);
    const filtros = useRef<(SVGGElement | null)[]>([]);
    const rachaduras = useRef<(SVGPathElement | null)[][]>(palavra.glifos.map(() => []));
    const cacosEl = useRef(new Map<string, SVGSVGElement>());
    const pedras = useRef<Pedra[]>(cascos());
    const [escala, setEscala] = useState(0); // px da tela por unidade da fonte
    const [rachas, setRachas] = useState<(Racha | null)[]>(() => palavra.glifos.map(() => null));

    useEffect(() => {
        const sec = ref.current;
        if (!sec) return;
        const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const motor = Matter.Engine.create({ gravity: { x: 0, y: GRAVIDADE }, positionIterations: 10, velocityIterations: 8 });
        const mundo = motor.world;
        // o chão (a borda de cima da página, com 4000 px de espessura para nada atravessar) e as paredes dos lados; são
        // refeitos inteiros quando a janela muda (trocar a forma de um corpo fixo devolve a ele uma massa finita)
        let chao = Matter.Bodies.rectangle(0, 0, 10, 10, { isStatic: true });
        let paredes: Matter.Body[] = [];
        const ps = pedras.current;
        const pagina = document.querySelector('.fx-corpo');
        const alfabeto = document.getElementById('alfabeto');
        // os cacos na física: o corpo, a letra, o caco e de onde ele sai na volta
        const cacos = new Map<string, { corpo: Matter.Body; letra: number; caco: Caco; de: Pose }>();
        let sPx = 0;
        let largura = 0;
        let alturaTela = 0;
        let chaoAntes = NaN;
        let h = 1000 / 60 / PASSOS; // o subpasso atual, em ms
        let puAplicado = NaN;
        let mexeu = -Infinity;
        let ponteiro: Ponto | null = null;
        let preso = true; // o hero preso no alto (a página empurra as letras) ou rolando com a página
        let antes = performance.now() / 1000;
        let quadro = 0;

        const casas = (o: DOMRect) => {
            const m = svg.current?.getScreenCTM();
            if (!m) return null;
            return ps.map(p => {
                const q = new DOMPoint(p.centro.x, p.centro.y).matrixTransform(m);
                return { x: q.x - o.left, y: q.y - o.top };
            });
        };
        const topoDaPagina = (o: DOMRect) => (pagina ? pagina.getBoundingClientRect().top - o.top : window.innerHeight);
        const colide = (c: Matter.Body, sim: boolean) => {
            c.collisionFilter.mask = sim ? 0xffffffff : 0;
        };
        // a posição com velocidade (o terceiro argumento existe na 0.20, falta nos tipos): o chão que sobe lança as letras
        const moverComVelocidade = Matter.Body.setPosition as (b: Matter.Body, p: Matter.Vector, v: boolean) => void;
        const atualizarRachas = () => setRachas(ps.map(p => p.racha));
        const temCacos = (i: number) => [...cacos.values()].some(k => k.letra === i);

        // a letra de volta em casa, inteira (os cacos dela saem da física)
        const paraCasa = (p: Pedra, i: number, choque: number, casa?: Ponto) => {
            for (const [k, c] of cacos) {
                if (c.letra !== i) continue;
                Matter.Composite.remove(mundo, c.corpo);
                cacos.delete(k);
            }
            const c = p.corpo;
            if (c) {
                if (!Matter.Composite.get(mundo, c.id, 'body')) Matter.Composite.add(mundo, c);
                Matter.Body.setStatic(c, true);
                Matter.Body.setAngle(c, 0);
                if (casa) Matter.Body.setPosition(c, casa);
                colide(c, true);
            }
            p.estado = 'casa';
            p.choque = choque;
            p.dano = 0;
            p.racha = null;
        };

        // refaz os corpos na escala atual (no começo e quando a janela muda de tamanho com as letras em casa)
        const refazer = () => {
            const o = sec.getBoundingClientRect();
            const m = svg.current?.getScreenCTM();
            const lista = casas(o);
            if (!m || !lista) return;
            sPx = m.a;
            setEscala(sPx);
            largura = o.width;
            alturaTela = window.innerHeight;
            ps.forEach((p, i) => {
                if (p.corpo) Matter.Composite.remove(mundo, p.corpo);
                const corpo = corpoConvexo(lista[i], p.casco.map(q => ({ x: q.x * sPx, y: q.y * sPx })), { ...PEDRA, label: `letra${i}` });
                Matter.Body.setPosition(corpo, lista[i]);
                // presa só depois de criada: criada já fixa, a matter-js guarda a massa vazia e, ao soltar, a conta estoura
                Matter.Body.setStatic(corpo, true);
                p.corpo = corpo;
                Matter.Composite.add(mundo, corpo);
            });
            Matter.Composite.remove(mundo, [chao, ...paredes]);
            chao = Matter.Bodies.rectangle(largura / 2, topoDaPagina(o) + 2000, largura * 3, 4000, { isStatic: true, friction: 0.9 });
            paredes = [-200, largura + 200].map(x => Matter.Bodies.rectangle(x, 0, 400, alturaTela * 20, { isStatic: true }));
            Matter.Composite.add(mundo, [chao, ...paredes]);
        };
        refazer();

        // um ponto da tela nas contas da letra (unidades da fonte, como o desenho dela)
        const naLetra = (p: Pedra, ponto: Matter.Vector) => {
            const c = p.corpo!;
            const dx = ponto.x - c.position.x;
            const dy = ponto.y - c.position.y;
            const cos = Math.cos(-c.angle);
            const sin = Math.sin(-c.angle);
            return { x: (dx * cos - dy * sin) / sPx + p.centro.x, y: (dx * sin + dy * cos) / sPx + p.centro.y };
        };
        // o desgaste das pedras: cada choque gasta de uma vez; rolar ou arrastar encostada gasta aos poucos. O que passa
        // da Worn é dano: a pedra racha a partir do ponto da batida e, com dano bastante, se parte
        const velocidade = (a: Matter.Body, b: Matter.Body) =>
            // em px a cada 1/60 s (a velocidade dos corpos é por subpasso)
            (Matter.Vector.magnitude(Matter.Vector.sub(a.velocity, b.velocity)) * (1000 / 60)) / h;
        const gastar = (b: Matter.Body, ds: number, ponto?: Matter.Vector) => {
            const i = ps.findIndex(q => q.corpo === b);
            const p = ps[i];
            if (!p || p.estado !== 'solta') return;
            const novo = p.choque + ds;
            p.choque = Math.min(WORN, novo);
            if (novo <= WORN || reduzido) return;
            p.dano += novo - WORN;
            if (!p.racha) {
                p.racha = rachar(palavra.glifos[i], naLetra(p, ponto ?? p.corpo!.position));
                atualizarRachas();
            }
        };
        Matter.Events.on(motor, 'collisionStart', ev => {
            for (const par of ev.pairs) {
                const v = velocidade(par.bodyA, par.bodyB);
                if (v < MIN_CHOQUE) continue;
                const ds = Math.min(MAX_CHOQUE, v * POR_CHOQUE);
                const ponto = par.collision.supports?.[0];
                gastar(par.bodyA, ds, ponto);
                gastar(par.bodyB, ds, ponto);
            }
        });
        Matter.Events.on(motor, 'collisionActive', ev => {
            for (const par of ev.pairs) {
                const v = velocidade(par.bodyA, par.bodyB);
                if (v < MIN_ARRASTO) continue;
                const ds = (v * ARRASTO * h) / 1000;
                gastar(par.bodyA, ds);
                gastar(par.bodyB, ds);
            }
        });

        // a pedra se parte: os cacos entram na física onde estavam na letra, com a velocidade dela (e o giro), e se
        // afastam um pouco do ponto da batida
        const partir = (p: Pedra, i: number) => {
            const c = p.corpo;
            const r = p.racha;
            if (!c || !r) return;
            const v = Matter.Body.getVelocity(c);
            const w = Matter.Body.getAngularVelocity(c);
            const cos = Math.cos(c.angle);
            const sin = Math.sin(c.angle);
            for (const caco of r.cacos) {
                const lx = (caco.centro.x - p.centro.x) * sPx;
                const ly = (caco.centro.y - p.centro.y) * sPx;
                const pos = { x: c.position.x + lx * cos - ly * sin, y: c.position.y + lx * sin + ly * cos };
                const corpo = corpoConvexo(
                    pos,
                    caco.casco.map(q => ({ x: (q.x - caco.centro.x) * sPx, y: (q.y - caco.centro.y) * sPx })),
                    { ...PEDRA, label: `caco${caco.id}` },
                );
                Matter.Body.setPosition(corpo, pos);
                Matter.Body.setAngle(corpo, c.angle);
                const rx = pos.x - c.position.x;
                const ry = pos.y - c.position.y;
                const dx = caco.centro.x - r.origem.x;
                const dy = caco.centro.y - r.origem.y;
                const dn = Math.hypot(dx, dy) || 1;
                const forca = EMPURRAO * (0.6 + Math.random() * 0.8);
                Matter.Body.setVelocity(corpo, {
                    x: v.x - w * ry + ((dx * cos - dy * sin) / dn) * forca,
                    y: v.y + w * rx + ((dx * sin + dy * cos) / dn) * forca,
                });
                Matter.Body.setAngularVelocity(corpo, w + (Math.random() * 2 - 1) * 0.06);
                Matter.Composite.add(mundo, corpo);
                cacos.set(caco.id, { corpo, letra: i, caco, de: { x: 0, y: 0, a: 0 } });
            }
            Matter.Composite.remove(mundo, c);
            p.estado = 'quebrada';
        };

        // o logo do cabeçalho: as letras soltas (e os cacos) voltam para o lugar
        const recolher = () => {
            const s = performance.now() / 1000;
            ps.forEach((p, i) => {
                const c = p.corpo;
                if (!c || p.estado === 'casa' || p.estado === 'volta') return;
                if (p.estado === 'quebrada')
                    for (const k of cacos.values()) {
                        if (k.letra !== i) continue;
                        k.de = { x: k.corpo.position.x, y: k.corpo.position.y, a: semVoltas(k.corpo.angle) };
                        Matter.Body.setStatic(k.corpo, true);
                        colide(k.corpo, false);
                    }
                else {
                    p.de = { x: c.position.x, y: c.position.y, a: semVoltas(c.angle) };
                    Matter.Body.setStatic(c, true);
                    colide(c, false);
                }
                p.desde = s;
                p.estado = 'volta';
            });
        };

        const passo = () => {
            quadro = requestAnimationFrame(passo);
            const s = performance.now() / 1000;
            const dt = Math.min(0.05, Math.max(0, s - antes));
            antes = s;
            if (document.documentElement.hasAttribute('data-menu-aberto')) return;
            // o meio do painel do alfabeto chegou ao topo da tela: as letras (já fora dela) voltam para casa inteiras e
            // novas, e o hero passa a rolar com a página; de volta ao topo, ele se prende de novo
            const caixaAlfabeto = (alfabeto ?? pagina)?.getBoundingClientRect();
            const meioAlfabeto = caixaAlfabeto ? caixaAlfabeto.top + caixaAlfabeto.height / 2 : Infinity;
            if (preso && meioAlfabeto <= 0) {
                preso = false;
                sec.dataset.preso = 'nao';
                ps.forEach((p, i) => paraCasa(p, i, 0));
                atualizarRachas();
                chaoAntes = NaN;
            } else if (!preso && window.scrollY < 1) {
                preso = true;
                delete sec.dataset.preso;
                chaoAntes = NaN;
            }
            let o = sec.getBoundingClientRect();
            // a janela mudou de tamanho com todas em casa: os corpos vão para a escala nova
            if (ps.every(p => p.estado === 'casa') && (Math.abs(o.width - largura) > 1 || Math.abs((svg.current?.getScreenCTM()?.a ?? sPx) - sPx) > 0.001)) {
                refazer();
                o = sec.getBoundingClientRect();
            }
            const lista = casas(o);
            if (!lista) return;
            const chaoAgora = topoDaPagina(o);
            if (Number.isNaN(chaoAntes)) chaoAntes = chaoAgora;

            ps.forEach((p, i) => {
                const c = p.corpo;
                if (!c) return;
                const casa = lista[i];
                if (p.estado === 'casa') {
                    Matter.Body.setPosition(c, casa);
                    // o chão passou subindo pelo ponto mais baixo da letra: ela se solta (se ele pulou por cima dela de uma
                    // vez, ela fica, escondida atrás da página)
                    const baixo = casa.y + p.baixo * sPx;
                    if (!reduzido && chaoAntes > baixo + 1 && chaoAgora <= baixo + 1 && chaoAgora >= casa.y + p.cima * sPx - ALCANCE) {
                        const l = LANCE[i % LANCE.length];
                        Matter.Body.setStatic(c, false);
                        Matter.Body.setVelocity(c, { x: l.vx, y: l.vy });
                        Matter.Body.setAngularVelocity(c, l.giro);
                        p.estado = 'solta';
                    }
                } else if (p.estado === 'volta') {
                    const t = suave(Math.min(1, (s - p.desde) / VOLTA));
                    if (!temCacos(i)) {
                        Matter.Body.setPosition(c, mistura(p.de, casa, t));
                        Matter.Body.setAngle(c, p.de.a * (1 - t));
                    } else
                        for (const k of cacos.values()) {
                            if (k.letra !== i) continue;
                            const alvo = { x: casa.x + (k.caco.centro.x - p.centro.x) * sPx, y: casa.y + (k.caco.centro.y - p.centro.y) * sPx };
                            Matter.Body.setPosition(k.corpo, mistura(k.de, alvo, t));
                            Matter.Body.setAngle(k.corpo, k.de.a * (1 - t));
                        }
                    // no lugar: inteira de novo, ainda gasta, voltando aos poucos para a Cut
                    if (t >= 1) {
                        paraCasa(p, i, WORN, casa);
                        atualizarRachas();
                    }
                }
            });

            // a física roda com alguma letra solta ou algum caco; o chão anda aos poucos, com a velocidade dele
            if (ps.some(p => p.estado === 'solta' || p.estado === 'quebrada')) {
                h = Math.max(1, (dt * 1000) / PASSOS);
                for (let k = 1; k <= PASSOS; k++) {
                    moverComVelocidade(chao, { x: largura / 2, y: chaoAntes + ((chaoAgora - chaoAntes) * k) / PASSOS + 2000 }, true);
                    Matter.Engine.update(motor, h);
                }
            } else Matter.Body.setPosition(chao, { x: largura / 2, y: chaoAgora + 2000 });
            chaoAntes = chaoAgora;

            // a pedra rachada se parte quando o dano chega na quebra (e os cacos dela já estão na página)
            ps.forEach((p, i) => {
                if (p.estado === 'solta' && p.racha && p.dano >= QUEBRA && p.racha.cacos.every(k => cacosEl.current.has(k.id))) partir(p, i);
            });

            // o cursor: a letra sob ele (em casa ou solta) se gasta; sem ninguém mexendo há 3 s, uma letra por vez
            let sob = -1;
            if (ponteiro) {
                const vivas = ps.filter(p => (p.estado === 'casa' || p.estado === 'solta') && p.corpo).map(p => p.corpo!);
                const achada = Matter.Query.point(vivas, ponteiro)[0];
                if (achada) sob = ps.findIndex(p => p.corpo === achada);
            }
            const sozinha = s - mexeu > 3 ? Math.floor(s / VEZ) % ps.length : -1;
            const naVez = sozinha >= 0 && s % VEZ < 0.35 ? sozinha : -1;
            const pu = sPx * (window.devicePixelRatio || 1);
            ps.forEach((p, i) => {
                if ((p.estado === 'casa' || p.estado === 'solta') && (i === sob || i === naVez)) p.tocada = s;
                p.cursor = s - p.tocada < ESPERA ? Math.min(WORN, p.cursor + SOBE * dt) : Math.max(0, p.cursor - DESCE * dt);
                if (p.estado === 'casa') p.choque = Math.max(0, p.choque - DESCE * dt);
                const sigma = Math.max(p.choque, p.cursor);
                if (Math.abs(sigma - p.aplicado) > 0.01 || pu !== puAplicado) ajustarDesgaste(filtros.current[i], sigma, sigma, pu);
                p.aplicado = sigma;
                // as rachaduras crescem com o dano, a partir da batida
                if (p.racha && p.dano !== p.danoAplicado) {
                    const alcance = (Math.min(p.dano, QUEBRA) / QUEBRA) * p.racha.alcance * 1.1;
                    p.racha.arestas.forEach((a, k) => {
                        const el = rachaduras.current[i][k];
                        if (!el) return;
                        const parte = Math.min(1, Math.max(0, (alcance - a.d0) / a.comp));
                        el.style.strokeDashoffset = String(a.comp * (1 - parte));
                        // a rachadura que ainda não começou fica escondida (a ponta redonda de um traço vazio vira um ponto)
                        el.style.visibility = parte > 0 ? 'visible' : 'hidden';
                    });
                    p.danoAplicado = p.dano;
                } else if (!p.racha) p.danoAplicado = -1;
                const el = elementos.current[i];
                if (!el || !p.corpo) return;
                const { x, y } = p.corpo.position;
                el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${p.corpo.angle.toFixed(4)}rad)`;
                el.style.visibility = p.estado === 'quebrada' || (p.estado === 'volta' && temCacos(i)) ? 'hidden' : 'visible';
            });
            for (const [k, c] of cacos) {
                const el = cacosEl.current.get(k);
                if (!el) continue;
                el.style.transform = `translate(${c.corpo.position.x.toFixed(1)}px, ${c.corpo.position.y.toFixed(1)}px) rotate(${c.corpo.angle.toFixed(4)}rad)`;
                el.style.visibility = 'visible';
            }
            puAplicado = pu;
        };
        quadro = requestAnimationFrame(passo);

        // o cursor, nas contas do hero (as letras soltas ficam sempre por cima da página, onde o hero aparece)
        const mover = (e: PointerEvent) => {
            const o = sec.getBoundingClientRect();
            ponteiro = { x: e.clientX - o.left, y: e.clientY - o.top };
            mexeu = performance.now() / 1000;
        };
        const sair = () => {
            ponteiro = null;
            mexeu = performance.now() / 1000;
        };
        sec.addEventListener('pointermove', mover);
        sec.addEventListener('pointerdown', mover);
        sec.addEventListener('pointerleave', sair);
        window.addEventListener('fx-logo', recolher);
        return () => {
            cancelAnimationFrame(quadro);
            sec.removeEventListener('pointermove', mover);
            sec.removeEventListener('pointerdown', mover);
            sec.removeEventListener('pointerleave', sair);
            window.removeEventListener('fx-logo', recolher);
            Matter.Events.off(motor, 'collisionStart');
            Matter.Events.off(motor, 'collisionActive');
            Matter.Engine.clear(motor);
            cacos.clear();
            ps.forEach(p => {
                p.corpo = null;
                p.estado = 'casa';
                p.choque = 0;
                p.dano = 0;
                p.racha = null;
                p.aplicado = -1;
            });
            setRachas(ps.map(() => null));
        };
    }, []);

    const largura = palavra.largura + 2 * MARGEM;
    const esq = (-palavra.largura / 2 - MARGEM) * ESCALA;
    const fino = 1.2 / (escala || 1); // a rachadura com ~1,2 px na tela
    return (
        <section ref={ref} className="fx-hero fx-hero-pedras" aria-label={HERO.legenda.join('. ')}>
            {/* a cena (849 u de altura) fica no meio da tela e encolhe no celular, onde a palavra passaria da largura; o
                SVG só mede onde as letras moram, e a legenda vai junto */}
            <div className="fx-hero-cena">
                <svg
                    ref={svg}
                    className="fx-hero-palavra fx-hero-medida"
                    viewBox={`${-MARGEM} ${TOPO} ${largura} ${ALTURA}`}
                    style={{ left: `calc(50% + ${esq.toFixed(1)} * var(--u))`, top: u(BASE + TOPO * ESCALA), width: u(largura * ESCALA), height: u(ALTURA * ESCALA) }}
                    role="img"
                    aria-label="Rune"
                />
                <p className="fx-hero-legenda">
                    {HERO.legenda[0]}
                    <br />
                    {HERO.legenda[1]}
                </p>
            </div>
            {/* as letras e os cacos, por baixo da página e por cima da cena */}
            <div className="fx-pedras" aria-hidden>
                {palavra.glifos.map((g, i) => {
                    const p = pedras.current[i];
                    const r = rachas[i];
                    return (
                        <svg
                            key={i}
                            ref={el => {
                                elementos.current[i] = el;
                            }}
                            className="fx-pedra"
                            width="1"
                            height="1"
                        >
                            <g transform={`scale(${escala || 0.0001}) translate(${-p.centro.x} ${-p.centro.y})`}>
                                {/* a letra inteira, gasta pelo filtro (até rachar) */}
                                <g
                                    ref={el => {
                                        filtros.current[i] = el;
                                    }}
                                    style={r ? { display: 'none' } : undefined}
                                >
                                    <FiltroDesgaste id={`${id}-${i}`} modo="ambos" />
                                    {g.pedras.map((pd, k) => (
                                        <path key={k} d={pd.d} fill="#111" fillRule="evenodd" filter={`url(#${id}-${i})`} />
                                    ))}
                                </g>
                                {/* rachada: a Worn desenhada pela fonte, com as rachaduras (da cor da página) só por dentro dela */}
                                {r && (
                                    <g key={r.geracao}>
                                        <Gasta gl={g} cor="#111" />
                                        <mask id={`${id}-m${i}`} maskUnits="userSpaceOnUse" x={g.x - 200} y={-1100} width={g.avanco + 400} height={1500}>
                                            <Gasta gl={g} cor="#fff" />
                                        </mask>
                                        <g mask={`url(#${id}-m${i})`} fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'var(--fundo)' }}>
                                            {r.arestas.map((a, k) => (
                                                <path
                                                    key={k}
                                                    ref={el => {
                                                        rachaduras.current[i][k] = el;
                                                    }}
                                                    d={a.d}
                                                    strokeWidth={fino}
                                                    style={{ strokeDasharray: `${a.comp} ${a.comp}`, strokeDashoffset: a.comp, visibility: 'hidden' }}
                                                />
                                            ))}
                                        </g>
                                    </g>
                                )}
                            </g>
                        </svg>
                    );
                })}
                {rachas.flatMap((r, i) =>
                    r
                        ? r.cacos.map(c => (
                              <svg
                                  key={c.id}
                                  ref={el => {
                                      if (el) cacosEl.current.set(c.id, el);
                                      else cacosEl.current.delete(c.id);
                                  }}
                                  className="fx-pedra"
                                  width="1"
                                  height="1"
                                  style={{ visibility: 'hidden' }}
                              >
                                  <g transform={`scale(${escala || 0.0001}) translate(${-c.centro.x} ${-c.centro.y})`}>
                                      <clipPath id={`${id}-k${c.id}`}>
                                          <path d={c.d} />
                                      </clipPath>
                                      <g clipPath={`url(#${id}-k${c.id})`}>
                                          <Gasta gl={palavra.glifos[i]} cor="#111" />
                                      </g>
                                  </g>
                              </svg>
                          ))
                        : [],
                )}
            </div>
        </section>
    );
}
