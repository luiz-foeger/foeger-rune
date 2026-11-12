// os ponteiros do livro: a lupa desenhada no traço da Föeger Rune e, para o resto (a seta e as mãos), os do sistema.
// A lupa tem o aro lascado (faces de tamanhos diferentes, como as letras da Cut), o vidro claro, o cabo à parte, com uma
// fresta entre ele e o aro, como as pedras da logo, e o sinal no meio (o + aproxima o texto, o − volta ao livro), na
// tinta escura com o contorno claro (para aparecer nas páginas claras e no fundo escuro)
export type Ponteiro = 'default' | 'pointer' | 'grab' | 'grabbing' | 'zoom-in' | 'zoom-out';

const TINTA = '#1f1f1d';
const CLARO = '#f7f3ec';

type Pontos = [number, number][];
const caminho = (pontos: Pontos) => `M${pontos.map(([x, y]) => `${+x.toFixed(2)} ${+y.toFixed(2)}`).join('L')}Z`;
// as peças cheias de tinta, com o contorno claro por baixo (só a metade de fora dele aparece; entre o aro e o cabo, ele
// vira a fresta)
const peca = (...formas: Pontos[]) =>
    `<path d="${formas.map(caminho).join('')}" fill="${TINTA}" fill-rule="evenodd" stroke="${CLARO}" stroke-width="2.4" stroke-linejoin="bevel" paint-order="stroke"/>`;
const svg = (corpo: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">${corpo}</svg>`;

// o meio do vidro, que é o ponto que clica
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
    svg(
        `<path d="${caminho(VIDRO)}" fill="${CLARO}" fill-opacity="0.9"/>` +
            peca(ARO, [...VIDRO].reverse(), CABO) +
            `<path d="M${CENTRO - 3.8} ${CENTRO - 1.2}h7.6v2.4h-7.6z${mais ? `M${CENTRO - 1.2} ${CENTRO - 3.8}h2.4v7.6h-2.4z` : ''}" fill="${TINTA}"/>`,
    );

// as duas lupas desenhadas (para a página de comparação) e o valor do cursor do CSS de cada ponteiro
export const LUPAS = { 'zoom-in': lupa(true), 'zoom-out': lupa(false) };
const cursor = (p: keyof typeof LUPAS) => `url("data:image/svg+xml,${encodeURIComponent(LUPAS[p])}") ${CENTRO} ${CENTRO}, ${p}`;
export const PONTEIROS: Record<Ponteiro, string> = {
    default: 'default',
    pointer: 'pointer',
    grab: 'grab',
    grabbing: 'grabbing',
    'zoom-in': cursor('zoom-in'),
    'zoom-out': cursor('zoom-out'),
};
