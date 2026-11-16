'use client';

import { Fragment, useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import Matter from 'matter-js';
import { useLenis } from 'lenis/react';
import { FiltroDesgaste, ajustarDesgaste, corte } from './Desgaste';
import { HERO } from '../_lib/conteudo';
import { LINHAS, PALAVRAS, type Glifo } from '../_lib/glifos';
import { pausado } from '../_lib/movimento';

// ——— o hero com as pedras que rolam ———
// "Rune" grande na Cut; o cursor gasta a letra inteira que ele toca, em casa ou solta, e raspa a letra por onde passa,
// descobrindo a pedra por baixo (a foto do "Rune" esculpido), como numa escavação. O hero ocupa a tela inteira e
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
// clique na própria fonte, com alguma letra fora do lugar, leva as letras (ou os cacos, que se juntam) de volta para o
// lugar, com a página no topo; sobre elas, o cursor vira a mão.
// As letras são desenhadas numa camada dentro do hero, por baixo da página. As contas são a partir do canto do hero
// (preso no alto, é o canto da tela). O SVG da cena só mede onde cada letra mora. A física é a matter-js, com o
// contorno convexo de cada letra e de cada caco (o furo do R e os vãos não contam no choque).
const ESCALA = 400 / LINHAS.maiuscula; // a maiúscula com 400 u
const MARGEM = 260;
const TOPO = -1150;
const ALTURA = 1500;
// a linha de base na cena do hero (849 u de altura, centrada na tela), em u, vem do CSS (--base, seção 14 do clone.css):
// a palavra fica no meio da tela
const WORN = 50;
const SOBE = WORN / 0.3; // σ por segundo, gastando com o cursor
const DESCE = WORN / 1.2; // σ por segundo, voltando
const ESPERA = 0.4; // segundos parada na Worn depois que o cursor sai
const VEZ = 1; // sem ninguém mexendo, uma letra nova a cada segundo
// a escavação: o cursor raspa a letra preta e descobre a pedra por baixo, só por onde passa. Cada passada tira um pouco
// (as marcas se somam), e a terra volta sozinha, aos poucos (as marcas se apagam com a constante de tempo VOLTA_TERRA):
// a pedra aparece em volta do cursor e num rastro curto atrás dele. As marcas são feitas nas contas da letra, então
// seguem a pedra quando ela rola. A pedra fica num canvas por letra, entre o corpo e as rachaduras: com máscaras SVG em
// cima da foto, cada marca nova travava a página. Como o cursor gasta a letra, a pedra é a gasta: a foto feita em cima
// do rune-worn.svg (/pedra-gasta-R.webp etc.). Cada letra dela foi encaixada no contorno de verdade da letra gasta do
// hero (a Cut com σ 50, um pouco mais larga que a Worn da fonte): a escala e a posição que deixam o mínimo da letra sem
// pedra (pedra-encaixe-fino.js). Aqui, nas unidades da fonte
const FOTO_PEDRA: Record<string, { x: number; y: number; largura: number; altura: number }> = {
    R: { x: 9.71, y: -787.64, largura: 752.53, altura: 798.72 },
    u: { x: 818.86, y: -557.74, largura: 567.37, altura: 570.48 },
    n: { x: 1451.86, y: -557.21, largura: 588.28, altura: 573.42 },
    e: { x: 2062.43, y: -566.77, largura: 529.15, altura: 594.54 },
};
// quando a letra afia (o σ cai da Worn), a pedra recua das bordas para o miolo: as bordas são o que muda de forma, e a
// pedra gasta não pode ficar visível ali dentro de uma letra que volta a ser quadrada. O miolo some no tempo das marcas.
// Na entrada, ao contrário, a pedra cresce do miolo para as bordas. O recuo é o contorno desfocado (RECUO_BLUR) com um
// corte que sobe (RECUO_CORTE), os dois proporcionais a quanto a letra já afiou
const RECUO_BLUR = [20, 80]; // σ do desfoque, em unidades: com a letra gasta e com ela afiada
const RECUO_CORTE = 1.2; // o corte sobe até 0,9 (só o miolo mais grosso fica) quando a letra afia de vez
// o sombreamento: a borda da letra escurece a pedra por dentro (ela parece redonda, e o que sobrar de desencaixe some na
// sombra), mais embaixo e à direita, com a luz de cima e da esquerda, como na foto
const SOMBRA = 26; // σ do desfoque da borda, em unidades da fonte
const LUZ = 12; // o deslocamento da sombra para baixo e para a direita, em unidades
const FORCA_SOMBRA = 0.6;
const COVA = 130; // o raio do pincel, em unidades da fonte
const PASSO_COVA = 0.3 * COVA; // uma marca a cada tanto de caminho (o rastro sai contínuo)
const FORCA_COVA = 0.38; // o quanto cada marca descobre (as que se sobrepõem se somam)
const VOLTA_TERRA = 1.8; // segundos: a constante de tempo com que as marcas se apagam
const LIMPA = 7; // segundos sem marca nova numa letra: o resto (já invisível) sai e o canvas some
// as formas das marcas: manchas irregulares no círculo de raio 1 (o gradiente do pincel dá a borda macia)
const FORMAS_COVA = Array.from({ length: 6 }, (_, k) => {
    const n = 11;
    const pts = Array.from({ length: n }, (_, j) => {
        const a = (j / n) * Math.PI * 2;
        const r = 0.72 + 0.28 * Math.abs((Math.sin(k * 12.9898 + j * 78.233) * 43758.5453) % 1);
        return { x: Math.cos(a) * r, y: Math.sin(a) * r };
    });
    const f = (p: { x: number; y: number }) => `${p.x.toFixed(3)} ${p.y.toFixed(3)}`;
    const meio = (a: { x: number; y: number }, b: { x: number; y: number }) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    // a curva passa pelos meios dos lados, com os pontos de controle (contorno liso)
    return `M${f(meio(pts[n - 1], pts[0]))}${pts.map((p, j) => `Q${f(p)} ${f(meio(p, pts[(j + 1) % n]))}`).join('')}Z`;
});
const PINCEL_PX = 128; // o lado de cada carimbo pronto (é desenhado na escala da marca)
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
const VOLTA = 0.9; // segundos do voo de volta para o lugar (pelo logo)
// a volta da pedra partida ou rachada é a quebra ao contrário: os cacos voam de volta em arco, cada um no seu tempo
// (até ESCALONA de atraso), se encaixam com as emendas, que viram as rachaduras, e elas se fecham de volta até o ponto
// da batida (em FECHA); só então a pedra volta a ficar lisa e, aos poucos, afiada (da Worn para a Cut)
const ESCALONA = 0.22; // segundos
const FECHA = 0.7; // segundos
// a quebra: o dano é o desgaste que passa da Worn; com ele, as rachaduras crescem, e a pedra se parte em QUEBRA
const QUEBRA = 14;
const PERTO = 8; // sementes dos cacos em volta do ponto da batida (lascas pequenas)
const LONGE = 11; // e espalhadas pela letra (blocos maiores)
const RAIO_PERTO = 140; // unidades da fonte
const CACO_MIN = 1200; // unidades²: um pedaço menor que isso gruda no caco vizinho
const EMPURRAO = 2.2; // px a cada 1/60 s: os cacos se afastam do ponto da batida ao se partir
// a espessura da rachadura, em px do aparelho (em qualquer tela): a do fio que aparece entre dois cacos encaixados. Mais
// grossa que isso, ela engrossaria de repente quando os cacos remontados viram a letra rachada
const RACHA_PX = 0.35;
// ao se soltar, cada letra leva um tranco: um pulo curto, um giro e um empurrão contra a vizinha (o R contra o u, o n
// contra o e); pesada, ela cai logo, tombada, por cima das outras (velocidades em px e radianos a cada 1/60 s). O tranco
// segue a velocidade da página no toque: nenhum com ela quase parada (até TRANCO_MIN; a letra só tomba com o próprio
// peso, em vez de saltar como se levasse uma pancada) e inteiro numa rolagem normal (a partir de TRANCO_CHEIO)
const TRANCO_MIN = 150; // px/s
const TRANCO_CHEIO = 900; // px/s
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
type Estado = 'casa' | 'solta' | 'quebrada' | 'volta' | 'fecha';
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
    raio: number; // a maior distância do centro ao casco, em unidades da fonte
    ultimaCova: Ponto | null; // onde o pincel deixou a última marca (nas contas da letra)
    danoAplicado: number;
    de: Pose; // de onde a letra sai na volta
    desde: number;
    danoFecha: number; // o dano quando as rachaduras começam a se fechar
};

const palavra = PALAVRAS.Rune;
const suave = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// a entrada do nome, a do topo do clone da Studio Namma (portfolio-simulacao, nova/clone-namma/_comp/Topo.tsx, com a
// Mascara de desde 0,9, segurar 0,3 e duração 1,2): cada letra começa abaixo da linha mais baixa da palavra, com só uma
// fatia do topo à mostra (o "— — — —" que faz de carregamento), fica assim um pouco e sobe para casa (power3.out).
// A camada das letras é cortada nessa linha enquanto isso. Na troca de página, espera a cortina subir (data-trocando);
// com movimento reduzido, não há. Se alguém rolar e soltar uma letra no meio, a entrada acaba na hora. Com a abertura
// na página (Abertura.tsx), também não há: o nome dela é este, no mesmo lugar, e ela esmaece por cima dele
const ENTRADA_FORA = 0.94; // quanto da altura da letra começa escondido
const comAbertura = () => !document.documentElement.hasAttribute('data-sem-abertura') && !!document.querySelector('.fx-abertura');
const ENTRADA_SEGURA = 0.3;
const ENTRADA_SOBE = 1.2;
const power3Out = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 4);
const caminho = (pts: Ponto[], fechado = true) =>
    pts.map((p, k) => `${k ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('') + (fechado ? 'Z' : '');
// o voo de volta: um arco (curva de Bézier com o ponto de controle acima das duas pontas), não uma reta
const voo = (de: Ponto, para: Ponto, e: number) => {
    const d = Math.hypot(para.x - de.x, para.y - de.y);
    const cx = (de.x + para.x) / 2;
    const cy = Math.min(de.y, para.y) - Math.max(40, d * 0.28);
    const r = 1 - e;
    return { x: r * r * de.x + 2 * r * e * cx + e * e * para.x, y: r * r * de.y + 2 * r * e * cy + e * e * para.y };
};
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
    // os cacos: cada célula recortada pela letra. O pedaço pequeno demais (menos de CACO_MIN) gruda no caco vizinho com
    // quem divide a aresta mais longa, em vez de sumir: assim nenhum pedaço da letra some na quebra nem aparece de
    // repente na volta (só sobra como pó o que não tem vizinho grande, raro)
    const geracao = ++geracoes;
    type Pedaco = { i: number; liquida: number; pontos: Ponto[]; serrado: Ponto[]; dono: number };
    const pedacos: (Pedaco | null)[] = celulas.map((cel, i) => {
        const convexo = cel.map(v => v.p);
        if (convexo.length < 3) return null;
        const recortes = fora.map(c => recortar(c, convexo));
        const liquida =
            recortes.reduce((s, p) => s + Math.abs(area(p)), 0) - furos.reduce((s, c) => s + Math.abs(area(recortar(c, convexo))), 0);
        if (liquida <= 1) return null; // a célula não pega a letra
        // o contorno do pedaço é a célula com as arestas quebradas (as mesmas das rachaduras)
        const serrado = cel.flatMap(v => {
            if (v.viz < 0) return [v.p];
            const s = i < v.viz ? serras.get(`${i}-${v.viz}`) : serras.get(`${v.viz}-${i}`)?.slice().reverse();
            return s ? s.slice(0, -1) : [v.p];
        });
        return { i, liquida, pontos: recortes.flat(), serrado, dono: i };
    });
    for (const pd of pedacos) {
        if (!pd || pd.liquida >= CACO_MIN) continue;
        const cel = celulas[pd.i];
        let maior = 0;
        pd.dono = -1;
        cel.forEach((v, k) => {
            const viz = v.viz >= 0 ? pedacos[v.viz] : null;
            if (!viz || viz.liquida < CACO_MIN) return;
            const q = cel[(k + 1) % cel.length].p;
            const L = Math.hypot(q.x - v.p.x, q.y - v.p.y);
            if (L > maior) {
                maior = L;
                pd.dono = v.viz;
            }
        });
    }
    const cacos: Caco[] = [];
    for (const pd of pedacos) {
        if (!pd || pd.liquida < CACO_MIN) continue;
        const juntos = pedacos.filter((q): q is Pedaco => !!q && (q === pd || (q.liquida < CACO_MIN && q.dono === pd.i)));
        const pontos = juntos.flatMap(q => q.pontos);
        if (pontos.length < 3) continue;
        const casco = semRepetidos(Matter.Vertices.hull(pontos as unknown as Matter.Vertex[]).map(p => ({ x: p.x, y: p.y })));
        if (casco.length < 3) continue;
        const centro = Matter.Vertices.centre(casco as unknown as Matter.Vertex[]);
        cacos.push({
            id: `${geracao}-${pd.i}`,
            // o recorte do caco: a célula dele e as dos pedaços pequenos que grudaram nele
            d: juntos.map(q => caminho(q.serrado)).join(''),
            centro: { x: centro.x, y: centro.y },
            // o casco um pouco para dentro: a pedra gasta é menor que o polígono do Cut
            casco: casco.map(p => ({ x: centro.x + (p.x - centro.x) * 0.94, y: centro.y + (p.y - centro.y) * 0.94 })),
        });
    }
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
            raio: Math.max(...rel.map(p => Math.hypot(p.x, p.y))),
            ultimaCova: null,
            danoAplicado: -1,
            de: { x: 0, y: 0, a: 0 },
            desde: 0,
            danoFecha: 0,
        };
    });
}

// a Worn da fonte, só como máscara das rachaduras: elas são da cor da página, então onde a máscara passa um pouco da
// pedra gasta pelo filtro, não aparecem
function Gasta({ gl, cor }: { gl: Glifo; cor: string }) {
    return (
        <text x={gl.x + (DESVIO_WORN[gl.ch] ?? 0)} y={0} fontSize={1000} fill={cor} style={{ fontFamily: 'var(--ff-worn)', ...SEM_TROCAS }}>
            {gl.ch}
        </text>
    );
}

export function HeroPedras() {
    const id = useId().replace(/:/g, '');
    // a rolagem suave, para o clique na fonte voltar ao topo (num ref: o laço do hero nasce antes dela)
    const lenis = useLenis();
    const lenisRef = useRef(lenis);
    useEffect(() => {
        lenisRef.current = lenis;
    }, [lenis]);
    const ref = useRef<HTMLElement>(null);
    const svg = useRef<SVGSVGElement>(null);
    const camada = useRef<HTMLDivElement>(null); // a camada das letras (cortada durante a entrada do nome)
    const elementos = useRef<(SVGSVGElement | null)[]>([]);
    const peles = useRef<(SVGSVGElement | null)[]>([]);
    const filtros = useRef<(SVGGElement | null)[]>([]);
    const telas = useRef<(HTMLCanvasElement | null)[]>([]);
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
        const alfabeto = document.getElementById('alphabet');
        // os cacos na física: o corpo, a letra, o caco e de onde ele sai na volta
        const cacos = new Map<string, { corpo: Matter.Body; letra: number; caco: Caco; de: Pose; atraso: number }>();
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

        // a escavação, num canvas por letra (em px do aparelho, na caixa da Cut da letra, com folga):
        //   cova: onde o pincel passou (só o alfa: as marcas se somam e se apagam aos poucos)
        //   forma: a letra no desgaste atual (refeita quando ele muda)
        //   a tela (o canvas da página): a pedra, só onde a cova e a forma deixam
        //   sombra: o escuro da borda por dentro da forma (refeita com ela)
        type Tela = { cova: HTMLCanvasElement; forma: HTMLCanvasElement; sombra: HTMLCanvasElement; s: number; w: number; h: number; ox: number; oy: number; ativa: boolean; ultima: number; mudou: boolean; acumulado: number; formaSigma: number };
        const caixas = palavra.glifos.map(g => {
            const vs = g.pedras.flatMap(pd => pd.vertices.flat());
            const xs = vs.map(v => v[0]);
            const ys = vs.map(v => v[1]);
            const x0 = Math.min(...xs) - 30;
            const y0 = Math.min(...ys) - 30;
            return { x: x0, y: y0, largura: Math.max(...xs) + 30 - x0, altura: Math.max(...ys) + 30 - y0 };
        });
        const pedrasImg = palavra.glifos.map(g => {
            const im = new Image();
            im.decoding = 'async';
            im.src = `/pedra-gasta-${g.ch}.webp`;
            return im;
        });
        const quadrosTela: (Tela | null)[] = ps.map(() => null);
        let pinceis: HTMLCanvasElement[] | null = null;
        // os carimbos do pincel, prontos: manchas irregulares com a borda macia (branco, só o alfa conta)
        const carimbos = () => {
            if (!pinceis)
                pinceis = FORMAS_COVA.map(d => {
                    const k = document.createElement('canvas');
                    k.width = k.height = PINCEL_PX;
                    const x = k.getContext('2d')!;
                    x.translate(PINCEL_PX / 2, PINCEL_PX / 2);
                    x.scale(PINCEL_PX / 2, PINCEL_PX / 2);
                    const gr = x.createRadialGradient(0, 0, 0, 0, 0, 1);
                    gr.addColorStop(0, 'rgba(255,255,255,1)');
                    gr.addColorStop(0.5, 'rgba(255,255,255,0.9)');
                    gr.addColorStop(1, 'rgba(255,255,255,0)');
                    x.fillStyle = gr;
                    x.fill(new Path2D(d));
                    return k;
                });
            return pinceis;
        };
        // a forma da letra no desgaste atual: a Cut pelo mesmo desfoque com corte do corpo (um filtro SVG no canvas, em px
        // do canvas), refeita quando o σ muda. É o contorno exato da letra: gasta, a pedra ocupa a letra gasta inteira (os
        // cantos de dentro que a Worn enche também), e nunca passa dela. Sem filtro no canvas, fica a Cut
        const cortes = palavra.glifos.map(g => new Path2D(g.pedras.map(pd => pd.d).join('')));
        let alterna = 0;
        let alternaBorda = 0;
        const fazerForma = (i: number, t: Tela, sigma: number) => {
            const box = caixas[i];
            const x = t.forma.getContext('2d')!;
            x.setTransform(1, 0, 0, 1, 0, 0);
            x.clearRect(0, 0, t.w, t.h);
            const sg = Math.max(0, sigma);
            if (sg > 0.5 && 'filter' in x) {
                // dois filtros que se revezam: com o mesmo nome, o canvas poderia guardar o filtro anterior
                alterna ^= 1;
                const nome = `${id}-tela-${alterna}`;
                const f = document.getElementById(nome);
                f?.querySelector('feGaussianBlur')?.setAttribute('stdDeviation', (sg * t.s).toFixed(2));
                f?.querySelector('feColorMatrix')?.setAttribute('values', corte(sg, t.s));
                x.filter = `url(#${nome})`;
            }
            x.setTransform(t.s, 0, 0, t.s, -box.x * t.s, -box.y * t.s);
            x.fillStyle = '#fff';
            x.fill(cortes[i], 'evenodd');
            x.filter = 'none';
            x.setTransform(1, 0, 0, 1, 0, 0);
            t.formaSigma = sg;
            // a sombra: tudo escuro, menos a forma desfocada e puxada para cima e para a esquerda; o que sobra é o escuro
            // junto da borda, mais embaixo e à direita
            const sx = t.sombra.getContext('2d')!;
            sx.globalCompositeOperation = 'copy';
            sx.fillStyle = '#000';
            sx.fillRect(0, 0, t.w, t.h);
            sx.globalCompositeOperation = 'destination-out';
            if ('filter' in sx) sx.filter = `blur(${(SOMBRA * t.s).toFixed(1)}px)`;
            sx.drawImage(t.forma, -LUZ * t.s, -LUZ * t.s);
            sx.filter = 'none';
            sx.globalCompositeOperation = 'source-over';
        };
        // o canvas da letra na escala atual (refeito, e limpo, quando a escala muda)
        const prepararTela = (i: number): Tela | null => {
            const el = telas.current[i];
            const box = caixas[i];
            const im = pedrasImg[i];
            if (!el || !FOTO_PEDRA[palavra.glifos[i].ch] || !im.complete || !im.naturalWidth || !sPx) return null;
            const dpr = window.devicePixelRatio || 1;
            const s = sPx * dpr;
            const atual = quadrosTela[i];
            if (atual && Math.abs(atual.s - s) < 1e-6) return atual;
            const w = Math.max(1, Math.ceil(box.largura * s));
            const h = Math.max(1, Math.ceil(box.altura * s));
            const cova = atual?.cova ?? document.createElement('canvas');
            const forma = atual?.forma ?? document.createElement('canvas');
            const sombra = atual?.sombra ?? document.createElement('canvas');
            cova.width = forma.width = sombra.width = el.width = w;
            cova.height = forma.height = sombra.height = el.height = h;
            el.style.width = `${w / dpr}px`;
            el.style.height = `${h / dpr}px`;
            const p = ps[i];
            const t: Tela = { cova, forma, sombra, s, w, h, ox: (box.x - p.centro.x) * sPx, oy: (box.y - p.centro.y) * sPx, ativa: false, ultima: -Infinity, mudou: false, acumulado: 0, formaSigma: 0 };
            fazerForma(i, t, p.aplicado);
            quadrosTela[i] = t;
            return t;
        };
        // uma marca do pincel (nas contas da letra)
        const cavar = (i: number, q: Ponto, s: number) => {
            const t = prepararTela(i);
            if (!t) return;
            const box = caixas[i];
            const x = t.cova.getContext('2d')!;
            const r = COVA * (0.8 + Math.random() * 0.4) * t.s;
            x.setTransform(1, 0, 0, 1, (q.x - box.x) * t.s, (q.y - box.y) * t.s);
            x.rotate(Math.random() * Math.PI * 2);
            x.globalAlpha = FORCA_COVA;
            x.drawImage(carimbos()[Math.floor(Math.random() * FORMAS_COVA.length)], -r, -r, 2 * r, 2 * r);
            x.setTransform(1, 0, 0, 1, 0, 0);
            x.globalAlpha = 1;
            t.ultima = s;
            t.mudou = true;
            if (!t.ativa) {
                t.ativa = true;
                const el = telas.current[i];
                if (el) el.style.display = '';
            }
        };
        const limparTela = (i: number) => {
            ps[i].ultimaCova = null;
            const t = quadrosTela[i];
            if (!t) return;
            t.cova.getContext('2d')!.clearRect(0, 0, t.w, t.h);
            const el = telas.current[i];
            if (el) {
                el.getContext('2d')!.clearRect(0, 0, t.w, t.h);
                el.style.display = 'none';
            }
            t.ativa = false;
        };
        // a terra volta: as marcas se apagam aos poucos (de 1/15 em 1/15 s: em passos menores, o alfa de 8 bits
        // empacaria); sem marca nova há LIMPA segundos, o resto sai e o canvas some
        const assentar = (i: number, s: number, dt: number) => {
            const t = quadrosTela[i];
            if (!t || !t.ativa) return;
            if (s - t.ultima > LIMPA || Math.abs(t.s - sPx * (window.devicePixelRatio || 1)) > 1e-6) {
                limparTela(i);
                return;
            }
            t.acumulado += dt;
            if (t.acumulado < 1 / 15) return;
            const x = t.cova.getContext('2d')!;
            x.globalCompositeOperation = 'destination-out';
            x.globalAlpha = 1 - Math.exp(-t.acumulado / VOLTA_TERRA);
            x.fillRect(0, 0, t.w, t.h);
            x.globalCompositeOperation = 'source-over';
            x.globalAlpha = 1;
            t.acumulado = 0;
            t.mudou = true;
        };
        // a tela: a cova, com a pedra por dentro, recortada pela forma
        const compor = (i: number, sigma: number) => {
            const t = quadrosTela[i];
            const el = telas.current[i];
            if (!t || !el) return;
            // a forma acompanha o desgaste do corpo
            if (Math.abs(Math.max(0, sigma) - t.formaSigma) > 0.5) {
                fazerForma(i, t, sigma);
                t.mudou = true;
            }
            if (!t.mudou) return;
            const box = caixas[i];
            const pedra = FOTO_PEDRA[palavra.glifos[i].ch];
            const x = el.getContext('2d')!;
            x.globalCompositeOperation = 'copy';
            x.drawImage(t.cova, 0, 0);
            x.globalCompositeOperation = 'source-in';
            x.drawImage(pedrasImg[i], (pedra.x - box.x) * t.s, (pedra.y - box.y) * t.s, pedra.largura * t.s, pedra.altura * t.s);
            x.globalCompositeOperation = 'destination-in';
            x.drawImage(t.forma, 0, 0);
            // o recuo das bordas, com a letra afiando: a forma desfocada, com o corte subindo, como máscara
            const afiou = Math.min(1, Math.max(0, (WORN - sigma) / WORN));
            if (afiou > 0.01 && 'filter' in x) {
                const corteBorda = Math.min(0.9, RECUO_CORTE * afiou);
                alternaBorda ^= 1;
                const nome = `${id}-borda-${alternaBorda}`;
                const f = document.getElementById(nome);
                f?.querySelector('feGaussianBlur')?.setAttribute('stdDeviation', ((RECUO_BLUR[0] + (RECUO_BLUR[1] - RECUO_BLUR[0]) * afiou) * t.s).toFixed(1));
                const fa = f?.querySelector('feFuncA');
                fa?.setAttribute('slope', (1 / (1 - corteBorda)).toFixed(3));
                fa?.setAttribute('intercept', (-corteBorda / (1 - corteBorda)).toFixed(3));
                x.filter = `url(#${nome})`;
                x.drawImage(t.forma, 0, 0);
                x.filter = 'none';
            }
            // o sombreamento, só por cima da pedra que já está ali
            x.globalCompositeOperation = 'source-atop';
            x.globalAlpha = FORCA_SOMBRA;
            x.drawImage(t.sombra, 0, 0);
            x.globalAlpha = 1;
            x.globalCompositeOperation = 'source-over';
            t.mudou = false;
        };
        // o ponto do hero nas contas da letra (unidades da fonte), com a pose atual dela
        const paraLetra = (p: Pedra, c: Matter.Body, q: Ponto) => {
            const dx = q.x - c.position.x;
            const dy = q.y - c.position.y;
            const cos = Math.cos(c.angle);
            const sin = Math.sin(c.angle);
            return { x: (dx * cos + dy * sin) / sPx + p.centro.x, y: (-dx * sin + dy * cos) / sPx + p.centro.y };
        };

        // os cacos de uma letra saem da física (e os desenhos deles se escondem até a rachadura sumir da página)
        const tirarCacos = (i: number) => {
            for (const [k, c] of cacos) {
                if (c.letra !== i) continue;
                Matter.Composite.remove(mundo, c.corpo);
                cacos.delete(k);
                const el = cacosEl.current.get(k);
                if (el) el.style.visibility = 'hidden';
            }
        };
        // a letra de volta em casa, inteira
        const paraCasa = (p: Pedra, i: number, choque: number, casa?: Ponto) => {
            tirarCacos(i);
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
                cacos.set(caco.id, { corpo, letra: i, caco, de: { x: 0, y: 0, a: 0 }, atraso: 0 });
            }
            Matter.Composite.remove(mundo, c);
            p.estado = 'quebrada';
            // os cacos não têm a pedra descoberta: a letra que volta é outra pedra
            limparTela(i);
        };

        // o logo do cabeçalho: as letras soltas (e os cacos) voltam para o lugar
        const recolher = () => {
            const s = performance.now() / 1000;
            ps.forEach((p, i) => {
                const c = p.corpo;
                if (!c || p.estado === 'casa' || p.estado === 'volta' || p.estado === 'fecha') return;
                if (p.estado === 'quebrada')
                    for (const k of cacos.values()) {
                        if (k.letra !== i) continue;
                        k.de = { x: k.corpo.position.x, y: k.corpo.position.y, a: semVoltas(k.corpo.angle) };
                        k.atraso = Math.random() * ESCALONA;
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

        // a entrada do nome: o instante em que começou (-1, ainda não; -2, acabou)
        let entradaDesde = reduzido || comAbertura() ? -2 : -1;
        const passo = () => {
            quadro = requestAnimationFrame(passo);
            const s = performance.now() / 1000;
            const dt = Math.min(0.05, Math.max(0, s - antes));
            antes = s;
            if (pausado()) return;
            // o meio do painel do alfabeto chegou ao topo da tela: as letras (já fora dela) voltam para casa inteiras e
            // novas, e o hero passa a rolar com a página; de volta ao topo, ele se prende de novo
            const caixaAlfabeto = (alfabeto ?? pagina)?.getBoundingClientRect();
            const meioAlfabeto = caixaAlfabeto ? caixaAlfabeto.top + caixaAlfabeto.height / 2 : Infinity;
            if (preso && meioAlfabeto <= 0) {
                preso = false;
                sec.dataset.preso = 'nao';
                ps.forEach((p, i) => {
                    paraCasa(p, i, 0);
                    limparTela(i);
                });
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
                        const vel = (chaoAntes - chaoAgora) / Math.max(dt, 1 / 240);
                        const forca = Math.min(1, Math.max(0, (vel - TRANCO_MIN) / (TRANCO_CHEIO - TRANCO_MIN)));
                        Matter.Body.setStatic(c, false);
                        Matter.Body.setVelocity(c, { x: l.vx * forca, y: l.vy * forca });
                        Matter.Body.setAngularVelocity(c, l.giro * forca);
                        p.estado = 'solta';
                    }
                } else if (p.estado === 'volta') {
                    // o voo de volta, em arco (os cacos, cada um com o seu atraso)
                    const emCacos = temCacos(i);
                    let chegou = true;
                    if (!emCacos) {
                        const t = Math.min(1, (s - p.desde) / VOLTA);
                        Matter.Body.setPosition(c, voo(p.de, casa, suave(t)));
                        Matter.Body.setAngle(c, p.de.a * (1 - suave(t)));
                        chegou = t >= 1;
                    } else
                        for (const k of cacos.values()) {
                            if (k.letra !== i) continue;
                            const t = Math.min(1, Math.max(0, (s - p.desde - k.atraso) / VOLTA));
                            const alvo = { x: casa.x + (k.caco.centro.x - p.centro.x) * sPx, y: casa.y + (k.caco.centro.y - p.centro.y) * sPx };
                            Matter.Body.setPosition(k.corpo, voo(k.de, alvo, suave(t)));
                            Matter.Body.setAngle(k.corpo, k.de.a * (1 - suave(t)));
                            if (t < 1) chegou = false;
                        }
                    if (chegou) {
                        if (p.racha) {
                            // encaixou: a letra rachada no lugar dos cacos (as emendas viram as rachaduras, todas abertas
                            // na que se partiu), e elas começam a se fechar
                            if (emCacos) {
                                tirarCacos(i);
                                p.dano = QUEBRA;
                            }
                            Matter.Body.setPosition(c, casa);
                            Matter.Body.setAngle(c, 0);
                            p.choque = WORN;
                            p.danoFecha = p.dano;
                            p.desde = s;
                            p.estado = 'fecha';
                        } else {
                            // inteira: fica com o desgaste que tinha e daí volta aos poucos para a Cut
                            paraCasa(p, i, p.choque, casa);
                            atualizarRachas();
                        }
                    }
                } else if (p.estado === 'fecha') {
                    // as rachaduras se fecham de volta até o ponto da batida; fechadas, a pedra volta a ser lisa (da Worn
                    // para a Cut, aos poucos)
                    Matter.Body.setPosition(c, casa);
                    const t = Math.min(1, (s - p.desde) / FECHA);
                    p.dano = p.danoFecha * (1 - suave(t));
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
            // a entrada do nome: começa quando não há troca de página em andamento; enquanto dura, a camada é cortada na
            // linha mais baixa da palavra em casa
            let subida = 1;
            const cam = camada.current;
            if (entradaDesde !== -2 && cam) {
                if (entradaDesde === -1 && !document.documentElement.hasAttribute('data-trocando')) entradaDesde = s;
                subida = entradaDesde < 0 ? 0 : power3Out((s - entradaDesde - ENTRADA_SEGURA) / ENTRADA_SOBE);
                if (subida >= 1 || ps.some(p => p.estado !== 'casa')) {
                    subida = 1;
                    entradaDesde = -2;
                    cam.style.clipPath = '';
                } else {
                    const linha = Math.max(...ps.map((p, i) => lista[i].y + p.baixo * sPx)) + 1;
                    cam.style.clipPath = `inset(0 0 ${Math.max(0, o.height - linha).toFixed(1)}px 0)`;
                }
            }
            // com a abertura na tela, as letras ficam paradas e novas, iguais às dela (a vez de cada uma começa 3 s depois)
            if (comAbertura()) mexeu = s;
            const sozinha = s - mexeu > 3 ? Math.floor(s / VEZ) % ps.length : -1;
            const naVez = sozinha >= 0 && s % VEZ < 0.35 ? sozinha : -1;
            const pu = sPx * (window.devicePixelRatio || 1);
            ps.forEach((p, i) => {
                if ((p.estado === 'casa' || p.estado === 'solta') && (i === sob || i === naVez)) p.tocada = s;
                p.cursor = s - p.tocada < ESPERA ? Math.min(WORN, p.cursor + SOBE * dt) : Math.max(0, p.cursor - DESCE * dt);
                // a escavação: com o cursor em cima ou perto da letra (em casa ou solta), o pincel deixa marcas pelo
                // caminho, nas contas da letra (uma a cada PASSO_COVA; num movimento rápido, as do meio também)
                const c = p.corpo;
                if (ponteiro && c && (p.estado === 'casa' || p.estado === 'solta')) {
                    const q = paraLetra(p, c, ponteiro);
                    if (Math.hypot(q.x - p.centro.x, q.y - p.centro.y) < p.raio + COVA) {
                        const u = p.ultimaCova;
                        const d = u ? Math.hypot(q.x - u.x, q.y - u.y) : Infinity;
                        if (!u || d > 8 * COVA) {
                            cavar(i, q, s);
                            p.ultimaCova = q;
                        } else if (d >= PASSO_COVA) {
                            const n = Math.min(12, Math.floor(d / PASSO_COVA));
                            for (let k = 1; k <= n; k++) cavar(i, { x: u.x + ((q.x - u.x) * k) / n, y: u.y + ((q.y - u.y) * k) / n }, s);
                            p.ultimaCova = q;
                        }
                    } else p.ultimaCova = null;
                } else p.ultimaCova = null;
                assentar(i, s, dt);
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
                const { x } = p.corpo.position;
                const y = p.corpo.position.y + (1 - subida) * ENTRADA_FORA * (p.baixo - p.cima) * sPx;
                const pose = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${p.corpo.angle.toFixed(4)}rad)`;
                const vis = p.estado === 'quebrada' || (p.estado === 'volta' && temCacos(i)) ? 'hidden' : 'visible';
                el.style.transform = pose;
                el.style.visibility = vis;
                const pele = peles.current[i];
                if (pele) {
                    pele.style.transform = pose;
                    pele.style.visibility = vis;
                }
                // a pedra descoberta: o canvas vai com a letra, deslocado até o canto da caixa da foto
                const tela = telas.current[i];
                const t = quadrosTela[i];
                if (tela && t?.ativa) {
                    tela.style.transform = `${pose} translate(${t.ox.toFixed(1)}px, ${t.oy.toFixed(1)}px)`;
                    tela.style.visibility = vis;
                    compor(i, p.aplicado);
                }
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

        // as telas da escavação ficam prontas antes do primeiro toque (cada forma custa uns 50 ms): uma letra por vez,
        // com a página ociosa, depois que as fotos chegam
        let vivo = true;
        const ocioso = (f: () => void) => ('requestIdleCallback' in window ? window.requestIdleCallback(() => f(), { timeout: 2000 }) : setTimeout(f, 300));
        Promise.all(pedrasImg.map(im => im.decode().catch(() => undefined))).then(() => {
            let k = 0;
            const proxima = () => {
                if (!vivo || k >= ps.length) return;
                prepararTela(k++);
                ocioso(proxima);
            };
            ocioso(proxima);
        });

        // o clique na própria fonte (uma letra, em casa ou solta, ou um caco), com alguma letra fora do lugar, leva todas
        // de volta para o lugar, com a página no topo (era o clique na logo do cabeçalho, que saiu dele)
        const naFonte = (pt: { x: number; y: number }) => {
            if (!ps.some(p => p.estado === 'solta' || p.estado === 'quebrada')) return false;
            const corpos = [...ps.filter(p => p.corpo && (p.estado === 'casa' || p.estado === 'solta')).map(p => p.corpo!), ...[...cacos.values()].map(k => k.corpo)];
            return Matter.Query.point(corpos, pt).length > 0;
        };
        const clicar = (e: MouseEvent) => {
            const o = sec.getBoundingClientRect();
            if (!naFonte({ x: e.clientX - o.left, y: e.clientY - o.top })) return;
            const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const rolagem = lenisRef.current;
            if (rolagem) rolagem.scrollTo(0, { immediate: reduzido });
            else window.scrollTo({ top: 0, behavior: reduzido ? 'auto' : 'smooth' });
            recolher();
            sec.style.cursor = '';
        };
        // o cursor, nas contas do hero (as letras soltas ficam sempre por cima da página, onde o hero aparece); sobre a
        // fonte que o clique remonta, a mão
        const mover = (e: PointerEvent) => {
            const o = sec.getBoundingClientRect();
            ponteiro = { x: e.clientX - o.left, y: e.clientY - o.top };
            mexeu = performance.now() / 1000;
            const mao = naFonte(ponteiro) ? 'pointer' : '';
            if (sec.style.cursor !== mao) sec.style.cursor = mao;
        };
        const sair = () => {
            ponteiro = null;
            mexeu = performance.now() / 1000;
        };
        sec.addEventListener('pointermove', mover);
        sec.addEventListener('pointerdown', mover);
        sec.addEventListener('pointerleave', sair);
        sec.addEventListener('click', clicar);
        return () => {
            vivo = false;
            cancelAnimationFrame(quadro);
            sec.removeEventListener('pointermove', mover);
            sec.removeEventListener('pointerdown', mover);
            sec.removeEventListener('pointerleave', sair);
            sec.removeEventListener('click', clicar);
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
            ps.forEach((_, i) => limparTela(i));
            setRachas(ps.map(() => null));
        };
    }, []);

    const largura = palavra.largura + 2 * MARGEM;
    const esq = (-palavra.largura / 2 - MARGEM) * ESCALA;
    // as rachaduras só existem no navegador (nascem depois da hidratação), então a densidade da tela já está aqui
    const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
    const fino = RACHA_PX / ((escala || 1) * dpr);
    return (
        <section ref={ref} className="fx-hero fx-hero-pedras" aria-label={`${HERO.nome}. ${HERO.assinatura}`}>
            {/* a cena (849 u de altura) fica no meio da tela e encolhe no celular, onde a palavra passaria da largura; o
                SVG só mede onde as letras moram. Sem legenda embaixo da palavra (a da Feixen): o nome da fonte e os
                estilos ficam nos cantos de baixo, como numa folha de espécime */}
            <div className="fx-hero-cena">
                <svg
                    ref={svg}
                    className="fx-hero-palavra fx-hero-medida"
                    viewBox={`${-MARGEM} ${TOPO} ${largura} ${ALTURA}`}
                    style={{ left: `calc(50% + ${esq.toFixed(1)} * var(--u))`, top: `calc((var(--base) + ${(TOPO * ESCALA).toFixed(2)}) * var(--u))`, width: u(largura * ESCALA), height: u(ALTURA * ESCALA) }}
                    role="img"
                    aria-label="Rune"
                />
            </div>
            <p className="fx-hero-canto" data-lado="esq">
                {HERO.nome}
            </p>
            <p className="fx-hero-canto" data-lado="dir">
                {HERO.estilos}
            </p>
            {/* o desgaste para os canvas da escavação (em px do canvas; os dois se revezam a cada uso) */}
            <svg width="0" height="0" aria-hidden style={{ position: 'absolute', pointerEvents: 'none' }}>
                {[0, 1].map(k => (
                    <filter key={k} id={`${id}-tela-${k}`} filterUnits="userSpaceOnUse" x="-200" y="-200" width="6000" height="6000" colorInterpolationFilters="sRGB">
                        <feGaussianBlur stdDeviation="0.01" />
                        <feColorMatrix type="matrix" values={corte(0)} />
                    </filter>
                ))}
                {/* o recuo da pedra a partir das bordas: o contorno desfocado, com um corte no alfa */}
                {[0, 1].map(k => (
                    <filter key={`b${k}`} id={`${id}-borda-${k}`} filterUnits="userSpaceOnUse" x="-200" y="-200" width="6000" height="6000" colorInterpolationFilters="sRGB">
                        <feGaussianBlur stdDeviation="1" />
                        <feComponentTransfer>
                            <feFuncA type="linear" slope="1" intercept="0" />
                        </feComponentTransfer>
                    </filter>
                ))}
            </svg>
            {/* as letras e os cacos, por baixo da página e por cima da cena */}
            <div ref={camada} className="fx-pedras" aria-hidden>
                {palavra.glifos.map((g, i) => {
                    const p = pedras.current[i];
                    const r = rachas[i];
                    const local = `scale(${escala || 0.0001}) translate(${-p.centro.x} ${-p.centro.y})`;
                    return (
                        <Fragment key={i}>
                        {/* duas camadas por letra, com a mesma pose: o corpo (a letra gasta pelo filtro, cara de desenhar)
                            e a pele por cima (a pedra descoberta e as rachaduras), que muda sem redesenhar o corpo */}
                        <svg
                            ref={el => {
                                elementos.current[i] = el;
                            }}
                            className="fx-pedra"
                            width="1"
                            height="1"
                        >
                            <g transform={local}>
                                {/* a letra, gasta pelo filtro: é o único desenho dela (rachada, ela continua assim, e os cacos são
                                    recortes dele), para nenhuma troca mudar a forma */}
                                <g
                                    ref={el => {
                                        filtros.current[i] = el;
                                    }}
                                >
                                    <FiltroDesgaste id={`${id}-${i}`} modo="ambos" />
                                    {g.pedras.map((pd, k) => (
                                        <path key={k} d={pd.d} fill="#111" fillRule="evenodd" filter={`url(#${id}-${i})`} />
                                    ))}
                                </g>
                            </g>
                        </svg>
                        {/* a pedra descoberta pela escavação (desenhada por fora do React; sem marcas, nem aparece) */}
                        <canvas
                            ref={el => {
                                telas.current[i] = el;
                            }}
                            className="fx-pedra"
                            style={{ display: 'none' }}
                        />
                        <svg
                            ref={el => {
                                peles.current[i] = el;
                            }}
                            className="fx-pedra"
                            width="1"
                            height="1"
                        >
                            <g transform={local}>
                                {/* rachada: as rachaduras (da cor da página) por cima da letra, só por dentro dela */}
                                {r && (
                                    <g key={r.geracao}>
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
                        </Fragment>
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
                                      {/* o caco é um recorte da própria letra, com o filtro dela (a mesma forma, sem troca) */}
                                      <g clipPath={`url(#${id}-k${c.id})`}>
                                          {palavra.glifos[i].pedras.map((pd, k) => (
                                              <path key={k} d={pd.d} fill="#111" fillRule="evenodd" filter={`url(#${id}-${i})`} />
                                          ))}
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
