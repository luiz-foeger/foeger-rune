import type { Inspetor } from '../_comp/CartaoInspetor';
import type { Detalhe } from '../_comp/CartaoDetalhe';
import type { Frase } from '../_comp/CartaoFrase';
import type { PalavraCfg } from '../_comp/CartaoPalavra';

// a montagem dos cartões da grade: qual letra, onde a lente olha, quanto ampliar e quanto gastar. Os pontos são em
// unidades da fonte (y para baixo, linha de base em 0); as posições no cartão, em unidades do vídeo (u).
const u = (n: number) => `calc(${n} * var(--u))`;
const LARANJA = 'var(--laranja)';
const ROXO = 'var(--roxo)';

// o primeiro grupo é o das quinas de fora (laranja); o segundo, o das de dentro (roxo)
export const EI: PalavraCfg = {
    chave: 'Ei!',
    destaque: 0,
    cor: LARANJA,
    escala: 0.463, // a maiúscula (760) fica com 352 u, como o E da gravação
    esq: 110, // o E logo depois da barra de ferramentas
    base: 382,
    modo: 'ambos',
    max: 50,
    soDestaque: false,
    contorno: true,
    controle: { nome: 'DESGASTE', cor: LARANJA, estilo: { left: u(248), top: u(269) } },
    lupa: { x: 576, y: -275, r: 199 }, // na ponta dos braços do E, com o vazio à direita aparecendo
    atraso: 0,
    rotulo: 'Ei!',
};

export const S: Inspetor = {
    letra: 'S',
    cor: LARANJA,
    corPontos: '#b81c00',
    escala: 0.95,
    capTopo: 60,
    foco: [190, -250], // a espinha do S, com as duas facetas do cinzel e a ponta de baixo
    zoom: 1.55,
    raioLente: 266,
    marcar: [
        [348, -260],
        [37, -215],
    ],
    roteiro: 'sequencia',
    maxFora: 50,
    maxDentro: 50,
    janela: { left: u(14), top: 'auto', bottom: u(15) },
    ficha: {
        codigo: 'U+0053',
        focoMiniatura: [560, -655],
        marcarMiniatura: [
            [571, -528],
            [546, -783],
        ],
    },
};

export const R: Detalhe = {
    letra: 'R',
    cor: LARANJA,
    foco: [640, -20], // o pé da perna (as duas quinas acima da etiqueta)
    zoom: 0.85,
    marcar: [
        [786, -156],
        [610, 25],
    ],
    modo: 'fora',
    max: 50,
    atraso: 0,
};

export const H: Detalhe = {
    letra: 'H',
    cor: LARANJA,
    foco: [213, -40], // o pé da haste da esquerda
    zoom: 0.9,
    marcar: [
        [108, -3],
        [318, -20],
    ],
    modo: 'fora',
    max: 50,
    atraso: 0.9,
};

export const SEIXO: Frase = {
    linhas: ['Seixo', 'Rolado'],
    escala: 0.18, // a maiúscula com 137 u, como o Squarly Rounded da gravação
    bases: [189, 354],
    esquerdas: [104, 54],
    modo: 'fora',
    max: 50,
    animarTexto: true,
    // o pingo do i, de perto (o retângulo laranja com os nós da gravação)
    lente: { cx: 771, cy: 87, r: 78, linha: 0, glifo: 2, pedra: 0, foco: [1327, -670], zoom: 0.55, cor: LARANJA },
    janela: { nome: 'QUINAS DE FORA', cor: LARANJA, estilo: { left: u(297), top: u(342) } },
    rotulo: 'Seixo rolado',
};

export const AHA: PalavraCfg = {
    chave: 'Ahá',
    destaque: 1,
    cor: ROXO,
    escala: 0.42,
    esq: 0, // o A passa por baixo da barra de ferramentas, como na gravação
    base: 384,
    modo: 'dentro',
    max: 50,
    soDestaque: true,
    contorno: false,
    controle: { nome: 'QUINAS DE DENTRO', cor: ROXO, estilo: { left: u(379), top: u(214) } },
    lupa: { x: 1002, y: -405, r: 181 }, // os dois vãos do h, embaixo do arco e no ombro
    atraso: 0.8,
    rotulo: 'Ahá',
};

export const B: Detalhe = {
    letra: 'b',
    cor: ROXO,
    foco: [334, -400], // o alto do miolo, com a altura do x passando
    zoom: 1.0,
    marcar: [
        [284, -368],
        [398, -340],
    ],
    modo: 'dentro',
    max: 38, // o miolo do b tem raio inscrito de ~65: mais que isso, ele fecha
    atraso: 0.4,
    guia: { y: -545, rotulo: 'Altura do x' },
};

export const A: Inspetor = {
    letra: 'A',
    cor: ROXO,
    corPontos: '#4b1fa0',
    escala: 0.9,
    capTopo: 55,
    foco: [400, -420], // o miolo do A
    zoom: 1.35,
    raioLente: 266,
    marcar: [[346, -345]], // um círculo só: com o miolo pequeno, os três arcos viram o mesmo círculo
    roteiro: 'dentro',
    maxFora: 0,
    maxDentro: 24, // o miolo do A é pequeno (raio inscrito ~39): mais que isso, ele fecha
    janela: { left: u(389), top: 'auto', bottom: u(13) },
};

export const AGUA: Frase = {
    linhas: ['Água', 'mole'],
    escala: 0.18, // a maiúscula com 137 u, como o Squarly Rounded da gravação
    bases: [189, 354],
    esquerdas: [60, 40],
    modo: 'dentro',
    max: 50,
    animarTexto: false,
    // a lente cobre o m de "mole" (como o S de "Subway") e mostra o primeiro vão dele
    lente: { cx: 127, cy: 282, r: 120, linha: 1, glifo: 0, foco: [320, -380], zoom: 0.5, cor: ROXO },
    rotulo: 'Água mole',
};
