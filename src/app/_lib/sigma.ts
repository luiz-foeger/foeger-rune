import { suave } from './movimento';

// o desgaste da seção do desgaste: um σ só (em unidades da fonte) para os cartões, como na fonte, onde a Polished e a
// Worn saem da Cut pelo mesmo desfoque (σ 26 e σ 50). Sozinho, ele para em cada estilo e anda até o seguinte; na
// régua, ele segue o mouse (ou o dedo, arrastando) e os cartões vão junto. O par do meio fica de fora: o Y tem a divisa
// dele e o A anda com ela (divisa.ts). O valor anda como uma mola sem balanço (amortecimento crítico) atrás do alvo:
// rápida atrás do ponteiro, mais mole de volta ao passeio, como a divisa do Y.
const PASSEIO: { sigma: number; fica: number; anda: number }[] = [
    { sigma: 0, fica: 1.6, anda: 1.5 },
    { sigma: 26, fica: 1.6, anda: 1.5 },
    { sigma: 50, fica: 1.9, anda: 2.2 },
];
const PERIODO = PASSEIO.reduce((s, p) => s + p.fica + p.anda, 0);

function passeio(t: number) {
    let f = t % PERIODO;
    for (let i = 0; i < PASSEIO.length; i++) {
        const p = PASSEIO[i];
        const seguinte = PASSEIO[(i + 1) % PASSEIO.length];
        if (f < p.fica) return p.sigma;
        f -= p.fica;
        if (f < p.anda) return p.sigma + (seguinte.sigma - p.sigma) * suave(f / p.anda);
        f -= p.anda;
    }
    return 0;
}

let alvo: number | null = null; // onde o ponteiro está na régua
let atual = 0; // o σ que os cartões mostram
let velocidade = 0;
let ultimoT = 0;

// o σ agora (t em segundos, o do quadro: todos os cartões chamam com o mesmo t no mesmo quadro, e só a primeira
// chamada anda)
export function sigmaAgora(t: number) {
    const dt = Math.max(0, Math.min(0.05, t - ultimoT));
    ultimoT = t;
    const w = alvo !== null ? 12 : 4.5;
    velocidade += (w * w * ((alvo ?? passeio(t)) - atual) - 2 * w * velocidade) * dt;
    atual += velocidade * dt;
    return Math.max(0, Math.min(50, atual));
}

// se o ponteiro está segurando o σ (a régua esconde a seta desenhada)
export const sigmaNaMao = () => alvo !== null;

// a régua manda o σ do ponteiro (null: o mouse saiu ou o dedo soltou)
export function segurarSigma(valor: number | null) {
    if (valor === null) {
        alvo = null;
        return;
    }
    alvo = Math.max(0, Math.min(50, valor));
}
