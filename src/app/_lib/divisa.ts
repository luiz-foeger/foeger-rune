// a divisa do Y (Blocos.tsx) como o desgaste do A ao lado (CartaoInspetor.tsx): os dois cartões da mesma fileira andam
// juntos, como as lupas do R e do H com a régua do σ (sigma.ts). À esquerda da divisa fica o Cut e à direita a Worn, e
// o A mostra o que o Y mais mostra: com a divisa à direita (o Y quase todo Cut), o A fica no Cut; à esquerda (quase
// todo Worn), na Worn; no meio, perto da Polished (σ 25). O vaivém sozinho da divisa (o meio, mais ou menos a
// AMPLITUDE) passa pelos três estilos; com o mouse além dele, o A para no Cut ou na Worn.
export const AMPLITUDE = 0.28; // o vaivém sozinho da divisa, em fração da largura, para cada lado do meio

let fracao = 0.5; // onde a divisa está: 0 na borda esquerda do Y, 1 na direita

// o Y manda a posição da divisa a cada quadro
export function moverDivisa(f: number) {
    fracao = f;
}

// o σ do A agora (de 0, o Cut, a 50, a Worn)
export function sigmaDaDivisa() {
    return 50 * Math.min(1, Math.max(0, (0.5 + AMPLITUDE - fracao) / (2 * AMPLITUDE)));
}
