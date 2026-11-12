// os ponteiros do livro, desenhados no traço da Föeger Rune: peças só de retas, com as quinas cortadas e uma fresta
// entre elas, como as pedras da logo, na tinta escura com o contorno claro (para aparecerem nas páginas claras e no
// fundo escuro). Cada um vira um valor de cursor do CSS, com o ponto que clica e o ponteiro do sistema de reserva
import type { CSSProperties } from 'react';

export type Ponteiro = 'default' | 'pointer' | 'grab' | 'grabbing' | 'zoom-in' | 'zoom-out';

const TINTA = '#1f1f1d';
const CLARO = '#f7f3ec';

type Pontos = [number, number][];
const caminho = (pontos: Pontos) => `M${pontos.map(([x, y]) => `${+x.toFixed(2)} ${+y.toFixed(2)}`).join('L')}Z`;
// uma ou mais peças cheias de tinta, com o contorno claro por baixo (só a metade de fora dele aparece; entre duas
// peças, ele vira a fresta)
const peca = (...formas: Pontos[]) =>
    `<path d="${formas.map(caminho).join('')}" fill="${TINTA}" fill-rule="evenodd" stroke="${CLARO}" stroke-width="2.4" stroke-linejoin="bevel" paint-order="stroke"/>`;
const svg = (corpo: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">${corpo}</svg>`;

// a seta, com a ponta no ponto que clica
const SETA = peca([
    [3, 2],
    [3, 21.6],
    [7.7, 17.4],
    [11.1, 25.4],
    [14.6, 23.9],
    [11.3, 16.2],
    [17.8, 16.2],
]);

// as mãos: os dedos de pé, com as quinas de cima cortadas, a palma com os cantos de baixo cortados e o pulso mais
// estreito, e o polegar a 45°, aberto para a esquerda
const dedo = (x0: number, x1: number, topo: number, base: number, k = 0.9): Pontos => [
    [x0, base],
    [x0, topo + k],
    [x0 + k, topo],
    [x1 - k, topo],
    [x1, topo + k],
    [x1, base],
];
const PALMA: Pontos = [
    [9.6, 16],
    [24.8, 16],
    [24.8, 21.6],
    [22.4, 27.8],
    [12.2, 27.8],
    [9.6, 23.4],
];

// a mão de clique: o indicador de pé (a ponta dele clica) e os outros dedos dobrados
const MAO = peca(
    dedo(10.3, 13.7, 2.2, 15.2),
    dedo(14.9, 17.9, 10.4, 15.2),
    dedo(19.1, 22, 11.2, 15.6),
    dedo(23.2, 25.8, 12.6, 16.2),
    [
        [10.3, 16.4],
        [25.8, 17.4],
        [25.8, 22.2],
        [23.4, 28.2],
        [12.8, 28.2],
        [10.3, 24.2],
    ],
    [
        [9.1, 25.6],
        [3.9, 20.4],
        [3.9, 17],
        [5.3, 15.6],
        [9.1, 19.4],
    ],
);

// a mão aberta, de segurar a folha, e a fechada, segurando (os dedos dobrados e o polegar recolhido)
const ABERTA = peca(dedo(9.6, 12.6, 6, 14.8), dedo(13.8, 16.8, 4.4, 14.8), dedo(18, 21, 5.6, 14.8), dedo(22.2, 24.8, 8.6, 14.8), PALMA, [
    [8.4, 25],
    [3.2, 19.8],
    [3.2, 16.4],
    [4.6, 15],
    [8.4, 18.8],
]);
const FECHADA = peca(dedo(9.6, 12.6, 11, 14.8), dedo(13.8, 16.8, 10.2, 14.8), dedo(18, 21, 10.8, 14.8), dedo(22.2, 24.8, 12, 14.8), PALMA, [
    [8.4, 24.8],
    [4.6, 21],
    [4.6, 17.8],
    [6, 16.4],
    [8.4, 18.8],
]);

// a lupa: o aro lascado (faces de tamanhos diferentes, como as letras da Cut), o vidro claro, o cabo à parte e o sinal
// no meio (o + aproxima, o − volta). O ponto que clica é o meio do vidro
const CENTRO = 12;
// os pontos de um anel lascado: o ângulo (em graus) e o raio de cada quina
const lascado = (quinas: [number, number][]): Pontos => quinas.map(([g, r]) => [CENTRO + r * Math.cos((g * Math.PI) / 180), CENTRO + r * Math.sin((g * Math.PI) / 180)]);
const ARO = lascado([
    [0, 9.3],
    [33, 9],
    [64, 9.4],
    [98, 9.1],
    [131, 9.35],
    [163, 8.95],
    [196, 9.3],
    [229, 9.05],
    [262, 9.4],
    [295, 9.1],
    [328, 9.2],
]);
const VIDRO = lascado([
    [10, 6.2],
    [50, 6.4],
    [90, 6.1],
    [130, 6.35],
    [170, 6.2],
    [210, 6.4],
    [250, 6.15],
    [290, 6.3],
    [330, 6.25],
]);
// o cabo, a 45°, separado do aro pela fresta: começa onde a diagonal que sai do centro cruza a face do aro entre 33° e
// 64°
const CABO: Pontos = (() => {
    const [a, b] = [ARO[1], ARO[2]];
    const t = (a[1] - a[0]) / (b[0] - a[0] - (b[1] - a[1]));
    const borda = (a[0] + t * (b[0] - a[0]) - CENTRO) * Math.SQRT2;
    const meia = 2.3;
    const ini = borda + 1.3;
    const fim = ini + 9.4;
    const eixo = (d: number) => CENTRO + d / Math.SQRT2;
    const lado = meia / Math.SQRT2;
    return [
        [eixo(ini) - lado, eixo(ini) + lado],
        [eixo(ini) + lado, eixo(ini) - lado],
        [eixo(fim) + lado, eixo(fim) - lado],
        [eixo(fim) - lado, eixo(fim) + lado],
    ];
})();
const lupa = (mais: boolean) =>
    `<path d="${caminho(VIDRO)}" fill="${CLARO}" fill-opacity="0.9"/>` +
    peca(ARO, [...VIDRO].reverse(), CABO) +
    `<path d="M${CENTRO - 3.8} ${CENTRO - 1.2}h7.6v2.4h-7.6z${mais ? `M${CENTRO - 1.2} ${CENTRO - 3.8}h2.4v7.6h-2.4z` : ''}" fill="${TINTA}"/>`;

// os desenhos (para a página de comparação) e os valores do cursor do CSS
export const DESENHOS: Record<Ponteiro, string> = {
    default: svg(SETA),
    pointer: svg(MAO),
    grab: svg(ABERTA),
    grabbing: svg(FECHADA),
    'zoom-in': svg(lupa(true)),
    'zoom-out': svg(lupa(false)),
};
const PONTO: Record<Ponteiro, [number, number]> = {
    default: [3, 2],
    pointer: [12, 2],
    grab: [16, 16],
    grabbing: [16, 16],
    'zoom-in': [CENTRO, CENTRO],
    'zoom-out': [CENTRO, CENTRO],
};
const cursor = (p: Ponteiro) => `url("data:image/svg+xml,${encodeURIComponent(DESENHOS[p])}") ${PONTO[p][0]} ${PONTO[p][1]}, ${p}`;
export const PONTEIROS = Object.fromEntries((Object.keys(DESENHOS) as Ponteiro[]).map(p => [p, cursor(p)])) as Record<Ponteiro, string>;

// os mesmos ponteiros como variáveis do CSS, para os botões e o link em volta do livro
export const VARIAVEIS_DOS_PONTEIROS = {
    '--ponteiro-seta': PONTEIROS.default,
    '--ponteiro-mao': PONTEIROS.pointer,
} as CSSProperties;
