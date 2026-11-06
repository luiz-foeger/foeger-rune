import type { Ponto } from './glifos';

// as quinas de uma pedra (o primeiro contorno é o de fora, os outros são furos), do ponto de vista da tinta:
// "convexa" é a quina de fora (a ponta), a outra é a de dentro (o vão, que o desgaste de dentro preenche)
export type Quina = {
    v: Ponto;
    ua: Ponto; // direção até o vértice anterior
    ub: Ponto; // direção até o seguinte
    la: number;
    lb: number;
    ang: number; // abertura entre as duas arestas, em radianos
    convexa: boolean;
};

const areaDe = (c: Ponto[]) => c.reduce((s, p, i) => {
    const q = c[(i + 1) % c.length];
    return s + p[0] * q[1] - q[0] * p[1];
}, 0);

export function quinasDe(contornos: Ponto[][]): Quina[] {
    const out: Quina[] = [];
    contornos.forEach((c, ci) => {
        const sinal = Math.sign(areaDe(c));
        c.forEach((v, i) => {
            const a = c[(i - 1 + c.length) % c.length];
            const b = c[(i + 1) % c.length];
            const la = Math.hypot(a[0] - v[0], a[1] - v[1]);
            const lb = Math.hypot(b[0] - v[0], b[1] - v[1]);
            const ua: Ponto = [(a[0] - v[0]) / la, (a[1] - v[1]) / la];
            const ub: Ponto = [(b[0] - v[0]) / lb, (b[1] - v[1]) / lb];
            const cruz = (v[0] - a[0]) * (b[1] - v[1]) - (v[1] - a[1]) * (b[0] - v[0]);
            const convexaNoContorno = Math.sign(cruz) === sinal;
            const ang = Math.acos(Math.max(-1, Math.min(1, ua[0] * ub[0] + ua[1] * ub[1])));
            out.push({ v, ua, ub, la, lb, ang, convexa: ci > 0 ? !convexaNoContorno : convexaNoContorno });
        });
    });
    return out;
}

// o raio que o desgaste (desfoque σ + corte no meio) deixa numa quina reta: ~1,86 σ (a curva passa a 0,55 σ do
// vértice em cada aresta). Usado só para os marcadores e os rótulos.
export const raioDe = (sigma: number) => 1.86 * sigma;

// o arco de raio r na quina: os pontos de tangência e o centro (o recuo não passa de 45% das arestas)
export function arco(q: Quina, r: number) {
    const meio = Math.max(0.05, q.ang / 2);
    let d = r / Math.tan(meio);
    const teto = 0.45 * Math.min(q.la, q.lb);
    if (d > teto) {
        d = teto;
        r = d * Math.tan(meio);
    }
    const p: Ponto = [q.v[0] + q.ua[0] * d, q.v[1] + q.ua[1] * d];
    const t: Ponto = [q.v[0] + q.ub[0] * d, q.v[1] + q.ub[1] * d];
    const bx = q.ua[0] + q.ub[0];
    const by = q.ua[1] + q.ub[1];
    const lbis = Math.hypot(bx, by) || 1;
    const dc = r / Math.sin(meio);
    const centro: Ponto = [q.v[0] + (bx / lbis) * dc, q.v[1] + (by / lbis) * dc];
    return { p, t, centro, r, d };
}

// o ponto mais perto de um alvo, entre as quinas (para escolher a quina que a lupa mostra)
export function quinaPerto(qs: Quina[], alvo: Ponto, filtro: (q: Quina) => boolean = () => true) {
    let melhor = qs[0];
    let dm = Infinity;
    for (const q of qs) {
        if (!filtro(q)) continue;
        const d = Math.hypot(q.v[0] - alvo[0], q.v[1] - alvo[1]);
        if (d < dm) {
            dm = d;
            melhor = q;
        }
    }
    return melhor;
}
