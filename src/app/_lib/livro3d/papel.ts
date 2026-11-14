// a folha de papel simulada, para quando a página é pega pelo meio (perto da borda de fora vale a dobra do motor):
// uma grade de 9 × 13 pontos presa na lombada, que não estica, resiste a curvar como papel, sente a gravidade, o ar e o
// atrito com as pilhas. A mão segura o ponto pego no raio do ponteiro. Assim a folha levanta e gira pela lombada, o
// trecho entre a lombada e a mão sai da encadernação deitado e curva até a mão, o resto pende pela gravidade, atrasado
// pelo ar e pela inércia, e vira quando a mão passa da lombada; nunca dobra chapado à frente da mão.
// A forma que a folha procura no arrasto e na soltura é o arco elástico (montarArco): a curva na encadernação e a
// corcova do puxão curto antes da mão, a viga em balanço sob o próprio peso depois dela. Ele entra no solver como uma
// guia macia: a simulação continua cuidando das colisões, da inércia e do pouso, e a forma só puxa a folha para o arco.
// A simulação roda num referencial que gira com a mão em volta da lombada (o solver, XPBD em passos pequenos, trabalha
// perto da forma), mas com o arco a folha guarda a inércia do mundo: o giro do referencial não a arrasta junto.
// Contas da folha, como no motor: X da lombada para dentro, Y do meio, Z acima da base da folha (a da folha da
// esquerda é o espelho). Sem nada de WebGL: o motor lê as posições (paraTextura) e desenha.
export type Ponto3 = [number, number, number];

const W = 1;
const H = 1.5;
const PI = Math.PI;
export const NX = 9;
export const NY = 13;
const N = NX * NY;
const HX = W / (NX - 1);
const HY = H / (NY - 1);

// o papel
const GRAVIDADE = 40; // larguras/s²
const K_AR = 4; // o ar freia a velocidade na direção da normal (1/s)
const K_AMORT = 1.5; // amortecimento geral (1/s)
const ATRITO = 0.5; // com as pilhas
const PASSO = 1 / 1920; // o sub passo do solver (s)
// o comprimento de flexão do papel e do vegetal (em larguras de página), que o motor passa a criarPapel. É também o da
// viga em balanço do arco: com 0,6 a parte além da mão era uma tábua (não pendia, e com a mão tremendo perto da pilha
// ela subia e descia como alavanca); com 0,25 ela pende como papel (o papel de verdade dá ≈ 0,45, mais duro do que se lê
// bem na tela)
export const FLEXAO = 0.25;
export const FLEXAO_VEGETAL = 0.29;
const PERTO_DO_CHAO = 0.03; // até aqui acima da pilha, o papel fica preso nela pelo vizinho que encosta (ver passoPapel)
// a mão: o arco entre a lombada e a mão (a folga do caminho no meio da virada) e quão rápido ele aparece e some. A
// folga que cresce logo no começo deixa o caminho sair da pilha inclinado para dentro, e não em pé: assim o raio do
// ponteiro (que vem de cima, um pouco inclinado) cruza o caminho sempre de través, e a mão anda por igual com o
// ponteiro até deitar (em pé, perto das pilhas, um pixel de ponteiro levantava ou deitava a folha de uma vez)
const FOLGA = 0.08;
const FOLGA_ANG = 0.17;
// de FOLGA_P0 a FOLGA_P1 (rad) a folga baixa até o quanto a própria curva na encadernação encurta o trecho até a mão
// (ver folga): perto da pilha nada muda
const FOLGA_P0 = 0.3;
const FOLGA_P1 = 1.0;
// a menor distância da lombada em que a mão segura o papel (pegando mais perto, ela segura aqui; ver criarMao)
export const PEGA_MIN = 0.35;
// a mão firme no arrasto; macia na soltura (o papel atrasa um pouco atrás do caminho)
export const MAO_MACIA = 2e-4;
// o giro mais rápido da mão em volta da lombada (rad/s): de perto, com o raio do ponteiro muito inclinado, o ângulo sob
// o ponteiro ainda pode pular; a mão vai até ele girando, sem bater a folha na pilha de uma vez
export const GIRO_MAX = 14;

// o arco elástico (ver montarArco)
const CURVA_LOMBADA = 0.35; // até onde vai a curva na encadernação (fração do trecho lombada → mão)
const MOLA_CAIMENTO = 14; // o caimento segue o da viga parada com esta mola crítica (1/s)
const VENTO = 0.25; // a gravidade da forma inclina contra o movimento da mão (s)
const RAIO_POUSO = 0.06; // o rolo onde a parte além da mão deita na pilha
// a guia do arco: o papel vai para a forma com esta mola crítica (rad/s), contra o movimento da própria forma. Mais
// macia (40), a simulação vencia a forma: a raiz voltava a sair em pé e, com a mão tremendo perto da pilha, a parte de
// fora subia de novo. Mais dura (150), a folha que bate na pilha ao deitar rápido volta a subir atrás da forma (o
// caimento dela ainda vem atrasado pelo vento): um quique
const GUIA_W = 80;
// a raiz: até a mão passar do meio da virada ela sai deitada na pilha de onde a folha veio (a curva na encadernação);
// depois ela passa aos poucos para a outra pilha, de RAIZ_VIRA·π a π, e no fim da virada a curva já não existe. Antes a
// curva ficava sempre deitada na pilha de origem e, no fim da virada, encolhia até a lombada: pegando perto da borda de
// fora, a página virava uma tábua reta com uma dobradiça no primeiro nó da grade (a quina passava de 60°)
const RAIZ_VIRA = 0.55;

const lim = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const suave = (a: number, b: number, v: number) => {
    const t = lim((v - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
};
// o chão nas contas da folha: a pilha dela (Z ≥ 0) e, além da lombada, a outra pilha (e acima da base da folha, com
// rampa junto da lombada)
export const piso = (X: number, e: number) => (X >= 0 ? 0 : e * suave(0, 0.06, -X));
// a direção da raiz com a mão no ângulo phi (ver RAIZ_VIRA)
const raizEm = (phi: number) => PI * suave(RAIZ_VIRA * PI, PI, phi);

export type Papel = {
    // no papel (repouso) e as distâncias até a lombada e até o ponto pego, ao longo do papel
    P: Float64Array;
    Lg: Float64Array;
    // no referencial que gira (y, a anterior yp, a velocidade v) e no mundo da folha (x)
    y: Float64Array;
    yp: Float64Array;
    v: Float64Array;
    x: Float64Array;
    nrm: Float64Array;
    w: Float64Array;
    dist: Int32Array;
    dRest: Float64Array;
    flex: Int32Array;
    // o ângulo do referencial em volta da lombada, o comprimento de flexão do papel e a altura da outra pilha
    teta: number;
    flexao: number;
    e: number;
    // o giro do referencial no quadro anterior (ver passoPapel)
    omAnt: number;
    // a altura do pino da lombada (segue o ângulo da mão: alturaDoPino)
    pino: number;
    // a guia do assento (a pose parada, no mundo da folha) e a complacência dela
    guia: Float64Array | null;
    alfaGuia: number;
    // o ponto pego e os pesos dele na célula (bilineares)
    g: [number, number];
    idx: Int32Array;
    pes: Float64Array;
    // o arco elástico (a guia do arrasto e da soltura, no mundo da folha), se já existe, e ele no referencial no começo
    // e no fim do quadro
    forma: Float64Array;
    formaOk: boolean;
    gf0: Float64Array;
    gf1: Float64Array;
    // o estado do arco: o giro (A), a corcova (B) e a curva na encadernação (xc) antes da mão; o caimento depois dela e
    // a velocidade dele; a velocidade da mão (suavizada); o perfil (X, Z) em amostras
    arA: number;
    arB: number;
    arXc: number;
    caim: number;
    vcaim: number;
    vx: number;
    perfX: Float64Array;
    perfZ: Float64Array;
};

// as amostras do perfil do arco antes e depois da mão
const NP = 48;
const NA = 64;

export function criarPapel(g: [number, number], flexao: number, e: number): Papel {
    const P = new Float64Array(N * 2);
    const y = new Float64Array(N * 3);
    const w = new Float64Array(N);
    for (let j = 0; j < NY; j++)
        for (let i = 0; i < NX; i++) {
            const k = j * NX + i;
            P[2 * k] = i * HX;
            P[2 * k + 1] = -H / 2 + j * HY;
            y[3 * k] = P[2 * k];
            y[3 * k + 1] = P[2 * k + 1];
            w[k] = i === 0 ? 0 : 1;
        }
    const d: number[] = [];
    for (let j = 0; j < NY; j++)
        for (let i = 0; i < NX; i++) {
            const k = j * NX + i;
            if (i < NX - 1) d.push(k, k + 1);
            if (j < NY - 1) d.push(k, k + NX);
            if (i < NX - 1 && j < NY - 1) d.push(k, k + NX + 1, k + 1, k + NX);
        }
    const dist = new Int32Array(d.map(q => 3 * q));
    const dRest = new Float64Array(dist.length / 2);
    for (let c = 0; c < dRest.length; c++) {
        const a = dist[2 * c] / 3;
        const b = dist[2 * c + 1] / 3;
        dRest[c] = Math.hypot(P[2 * a] - P[2 * b], P[2 * a + 1] - P[2 * b + 1]);
    }
    const f: number[] = [];
    for (let j = 0; j < NY; j++)
        for (let i = 1; i < NX - 1; i++) {
            const k = j * NX + i;
            f.push(k - 1, k, k + 1);
        }
    for (let j = 1; j < NY - 1; j++)
        for (let i = 0; i < NX; i++) {
            const k = j * NX + i;
            f.push(k - NX, k, k + NX);
        }
    const nrm = new Float64Array(N * 3);
    for (let k = 0; k < N; k++) nrm[3 * k + 2] = 1;
    const F: Papel = {
        P,
        Lg: new Float64Array(N),
        y,
        yp: new Float64Array(N * 3),
        v: new Float64Array(N * 3),
        x: Float64Array.from(y),
        nrm,
        w,
        dist,
        dRest,
        flex: new Int32Array(f.map(q => 3 * q)),
        teta: 0,
        flexao,
        e,
        omAnt: 0,
        pino: 0,
        guia: null,
        alfaGuia: 0,
        g,
        idx: new Int32Array(4),
        pes: new Float64Array(4),
        forma: new Float64Array(N * 3),
        formaOk: false,
        gf0: new Float64Array(N * 3),
        gf1: new Float64Array(N * 3),
        arA: 0,
        arB: 0,
        arXc: CURVA_LOMBADA,
        caim: 0,
        vcaim: 0,
        vx: 0,
        perfX: new Float64Array(NP + NA + 1),
        perfZ: new Float64Array(NP + NA + 1),
    };
    // a pinça: a célula do ponto pego e os pesos bilineares; as distâncias, ao longo do papel, de cada ponto até ele
    const fi = lim(g[0] / HX, 0, NX - 1 - 1e-9);
    const fj = lim((g[1] + H / 2) / HY, 0, NY - 1 - 1e-9);
    const i = Math.floor(fi);
    const j = Math.floor(fj);
    const a = fi - i;
    const b = fj - j;
    const k = j * NX + i;
    F.idx.set([3 * k, 3 * (k + 1), 3 * (k + NX), 3 * (k + NX + 1)]);
    F.pes.set([(1 - a) * (1 - b), a * (1 - b), (1 - a) * b, a * b]);
    for (let q = 0; q < N; q++) F.Lg[q] = Math.hypot(P[2 * q] - g[0], P[2 * q + 1] - g[1]) + 1e-4;
    return F;
}

// as normais por ponto (no referencial), uma vez por quadro, para o ar
function normais(F: Papel) {
    const { y, nrm } = F;
    for (let j = 0; j < NY; j++)
        for (let i = 0; i < NX; i++) {
            const k = 3 * (j * NX + i);
            const a = 3 * (j * NX + Math.max(0, i - 1));
            const b = 3 * (j * NX + Math.min(NX - 1, i + 1));
            const c = 3 * (Math.max(0, j - 1) * NX + i);
            const d = 3 * (Math.min(NY - 1, j + 1) * NX + i);
            const ux = y[b] - y[a];
            const uy = y[b + 1] - y[a + 1];
            const uz = y[b + 2] - y[a + 2];
            const vx = y[d] - y[c];
            const vy = y[d + 1] - y[c + 1];
            const vz = y[d + 2] - y[c + 2];
            const nx = uy * vz - uz * vy;
            const ny = uz * vx - ux * vz;
            const nz = ux * vy - uy * vx;
            const l = 1 / (Math.sqrt(nx * nx + ny * ny + nz * nz) || 1);
            nrm[k] = nx * l;
            nrm[k + 1] = ny * l;
            nrm[k + 2] = nz * l;
        }
}

// ---------- o arco elástico (a guia da forma no arrasto e na soltura) ----------
// A forma que a folha procura, vista de lado (a mesma em todas as fileiras). Da lombada até a mão, o ângulo do papel é
// θ(x) = θr + (A − θr)·R(x) + B·C(x), com x de 0 (lombada) a 1 (mão). R é a página erguida com a curva na encadernação:
// a raiz sai na direção θr (raizEm: deitada rente à pilha de origem até o meio da virada, depois passando para a outra)
// e curva até a linha da mão em xc (R = 1 − (1 − x/xc)²). C é a corcova do puxão curto: a de uma
// tira presa deitada e segura num ponto (sobe, passa do alto perto da mão e chega a ela descendo, então a parte além da
// mão segue para baixo e deita na pilha), só no trecho reto depois da curva (no trecho inteiro ela desfazia a curva, e a
// passagem da corcova para a página erguida era um salto). A acerta a direção da mão; a corcova (ou, se a curva na
// encadernação já encurta demais, um xc menor) acerta a distância, que a folga do caminho da mão encurta. Depois da mão o
// papel segue na mesma direção e cai pela gravidade como uma viga em balanço sob o próprio peso:
// θ(σ) = θmão + Δ·(1 − (1 − σ/b)³), com b o papel além da mão. O caimento Δ segue o da viga parada (a forma fechada
// abaixo, com o comprimento de flexão da folha) com uma mola crítica, e a gravidade dela inclina contra o movimento da
// mão (o resto da folha arrasta atrás), sem a ponta passar da vertical. Onde a parte de fora chega à pilha, ela rola
// (RAIO_POUSO) até deitar e segue deitada.
const K_CORC = 4.493409457909064; // tan k = k
const modoCorc = (u: number) => (K_CORC * Math.sin(K_CORC * u) - 1 + Math.cos(K_CORC * u)) / 5.603338732570744;
// a corcova nas amostras, para o xc dado (guardada: o xc muda pouco entre as contas)
const CORC = new Float64Array(NP);
let xcCorc = -1;
function corcovaEm(xc: number) {
    if (xc === xcCorc) return;
    xcCorc = xc;
    for (let q = 0; q < NP; q++) {
        const x = (q + 0.5) / NP;
        CORC[q] = x <= xc ? 0 : modoCorc((x - xc) / (1 - xc));
    }
}
const R_LOMBADA = (x: number, xc: number) => {
    const u = Math.min(1, x / xc);
    return 1 - (1 - u) * (1 - u);
};
const PONTA = new Float64Array(4);
// a direção da raiz na conta em curso (montarArco a acerta para a mão; a tabela da folga usa a raiz deitada, 0)
let thR = 0;
// a ponta do perfil antes da mão (relativa ao pino) e a derivada dela em A
function pontaDoPerfil(A: number, B: number, xc: number, sp: number) {
    corcovaEm(xc);
    let X = 0;
    let Z = 0;
    let XA = 0;
    let ZA = 0;
    for (let q = 0; q < NP; q++) {
        const R = R_LOMBADA((q + 0.5) / NP, xc);
        const th = thR + (A - thR) * R + B * CORC[q];
        const c = Math.cos(th);
        const s = Math.sin(th);
        X += c;
        Z += s;
        XA -= s * R;
        ZA += c * R;
    }
    const k = sp / NP;
    PONTA[0] = X * k;
    PONTA[1] = Z * k;
    PONTA[2] = XA * k;
    PONTA[3] = ZA * k;
}
// o A que leva a ponta do perfil para a direção da mão (Newton, a partir do anterior); devolve A e deixa a ponta em PONTA
function giroDoPerfil(A: number, B: number, xc: number, sp: number, phiH: number) {
    for (let it = 0; it < 40; it++) {
        pontaDoPerfil(A, B, xc, sp);
        const X = PONTA[0];
        const Z = PONTA[1];
        let f = Math.atan2(Z, X) - phiH;
        if (f > PI) f -= 2 * PI;
        else if (f < -PI) f += 2 * PI;
        if (Math.abs(f) < 1e-10) break;
        const d = (X * PONTA[3] - Z * PONTA[2]) / (X * X + Z * Z);
        A -= lim(f / Math.max(d, 0.05), -0.5, 0.5);
    }
    return A;
}
// a raiz de f entre a e b (f(a) e f(b) de sinais opostos), pela regra falsa de Illinois
function raiz(f: (x: number) => number, a: number, b: number, fa: number, fb: number) {
    let lado = 0;
    let c = a;
    for (let it = 0; it < 60; it++) {
        c = (a * fb - b * fa) / (fb - fa);
        const fc = f(c);
        if (Math.abs(fc) < 1e-10 || Math.abs(b - a) < 1e-12) break;
        if (fc * fb > 0) {
            b = c;
            fb = fc;
            if (lado === -1) fa /= 2;
            lado = -1;
        } else {
            a = c;
            fa = fc;
            if (lado === 1) fb /= 2;
            lado = 1;
        }
    }
    return c;
}
// o caimento da viga parada: a parte além da mão (b de papel, comprimento de flexão Lg), que sai no ângulo thp, sob a
// gravidade inclinada contra a velocidade vx da mão
function caimentoParado(thp: number, b: number, vx: number, Lg: number) {
    const thG = -PI / 2 + Math.atan(-VENTO * vx);
    let psi = thp - thG;
    while (psi > PI) psi -= 2 * PI;
    while (psi <= -PI) psi += 2 * PI;
    return 2 * Math.atan(Math.tan(psi / 2) * Math.exp(-(b * b * b) / (6 * Lg * Lg * Lg))) - psi;
}
// a vertical para baixo do lado em que a parte além da mão cai: a ponta não passa dela (com o vento da forma, ela
// passava, e ao chegar à pilha deitava virada para trás, por baixo de si mesma)
function verticalDaQueda(thp: number) {
    let psi = thp + PI / 2;
    while (psi > PI) psi -= 2 * PI;
    while (psi <= -PI) psi += 2 * PI;
    return thp - psi;
}

// monta o arco para a mão em T (no mundo da folha, no fim do quadro), com o pino em F.pino; T0 é a mão no começo do
// quadro (a velocidade dela inclina a gravidade da forma). Grava a forma em F.forma
export function montarArco(F: Papel, T0: Ponto3, T: Ponto3, dtq: number) {
    const sp = F.g[0];
    const b = W - sp;
    const pz = F.pino;
    const e = F.e;
    // a mão relativa ao pino, vista de lado
    const dX = T[0];
    const dZ = T[2] - pz;
    const r = Math.min(Math.hypot(dX, dZ), sp * (1 - 1e-6));
    let phiH = Math.atan2(dZ, dX);
    if (phiH < -PI / 2) phiH += 2 * PI;
    // a curva na encadernação some no fim da virada porque a raiz passa para a outra pilha (raizEm), e não porque ela
    // encolhe até a lombada: encolhida, a grade de 9 colunas a desenhava como um toco e uma quina no primeiro nó
    thR = raizEm(phiH);
    const xc0 = CURVA_LOMBADA;
    const novo = !F.formaOk;
    let A = novo ? phiH : F.arA;
    let B = 0;
    let xc = xc0;
    A = giroDoPerfil(A, 0, xc0, sp, phiH);
    const L0 = Math.hypot(PONTA[0], PONTA[1]);
    // a distância da ponta (com A já na direção da mão) com a curva até x e sem corcova
    const comCurva = (x: number) => {
        A = giroDoPerfil(A, 0, x, sp, phiH);
        return Math.hypot(PONTA[0], PONTA[1]) - r;
    };
    if (L0 > r) {
        // a curva na encadernação não encurta o bastante: a corcova acerta a distância
        const f = (bb: number) => {
            A = giroDoPerfil(A, bb, xc0, sp, phiH);
            return Math.hypot(PONTA[0], PONTA[1]) - r;
        };
        const B1 = 1.2;
        B = raiz(f, 0, B1, L0 - r, f(B1));
        A = giroDoPerfil(A, B, xc0, sp, phiH);
    } else if (L0 < r) {
        // encurta demais: menos curva na encadernação
        const x0 = 1e-3;
        const f0 = comCurva(x0);
        if (f0 > 0) xc = raiz(comCurva, x0, xc0, f0, L0 - r);
        else xc = x0;
        A = giroDoPerfil(A, 0, xc, sp, phiH);
    }
    F.arA = A;
    F.arB = B;
    F.arXc = xc;
    // o ângulo do papel na mão (a corcova chega a ela descendo)
    const thp = A - B;
    // a velocidade da mão, suavizada (o vento da forma)
    const vxi = dtq > 0 ? (T[0] - T0[0]) / dtq : 0;
    F.vx = novo ? 0 : F.vx + (vxi - F.vx) * (1 - Math.exp(-dtq / 0.05));
    // o caimento: segue o da viga parada com a mola crítica (a conta exata, que não explode com quadro longo)
    const alvo = b > 1e-6 ? caimentoParado(thp, b, F.vx, F.flexao) : 0;
    if (novo) {
        F.caim = alvo;
        F.vcaim = 0;
    } else {
        const om = MOLA_CAIMENTO;
        const x0 = F.caim - alvo;
        const v0 = F.vcaim;
        const ex = Math.exp(-om * dtq);
        F.caim = alvo + (x0 + (v0 + om * x0) * dtq) * ex;
        F.vcaim = (v0 - om * (v0 + om * x0) * dtq) * ex;
    }
    // o perfil: antes da mão (as mesmas amostras da conta acima, então a ponta cai na mão) e depois dela
    const PX = F.perfX;
    const PZ = F.perfZ;
    let X = 0;
    let Z = pz;
    PX[0] = X;
    PZ[0] = Z;
    const ds = sp / NP;
    corcovaEm(xc);
    for (let q = 0; q < NP; q++) {
        const th = thR + (A - thR) * R_LOMBADA((q + 0.5) / NP, xc) + B * CORC[q];
        X += Math.cos(th) * ds;
        Z += Math.sin(th) * ds;
        PX[q + 1] = X;
        PZ[q + 1] = Z;
    }
    const ds2 = b / NA;
    const thV = verticalDaQueda(thp);
    let pousou = false;
    let thL = 0;
    let sL = 0;
    let alvoL = 0;
    for (let q = 0; q < NA; q++) {
        const sm = (q + 0.5) * ds2;
        // (pegando na borda de fora, com g.x = 1, não há papel além da mão: sem isto a conta dava 0/0 e a folha, NaN)
        const u = b > 1e-9 ? 1 - sm / b : 0;
        let th = thp + F.caim * (1 - u * u * u);
        th = thV < thp ? Math.max(th, thV) : Math.min(th, thV);
        if (!pousou) {
            // deita para o lado em que vai (na vertical, para o da mão)
            const ct = Math.cos(th);
            const al = ct > 1e-6 ? 0 : ct < -1e-6 ? PI : Math.cos(thp) >= 0 ? 0 : PI;
            let d = th - al;
            while (d > PI) d -= 2 * PI;
            while (d <= -PI) d += 2 * PI;
            if (Math.sin(th) < 0 && Z - piso(X, e) <= RAIO_POUSO * (1 - Math.cos(d)) + 1e-9) {
                pousou = true;
                thL = d;
                sL = sm;
                alvoL = al;
            }
        }
        if (pousou) {
            const a = (sm - sL) / RAIO_POUSO;
            th = alvoL + Math.sign(thL) * Math.max(0, Math.abs(thL) - a);
        }
        X += Math.cos(th) * ds2;
        Z += Math.sin(th) * ds2;
        PX[NP + q + 1] = X;
        PZ[NP + q + 1] = Z;
    }
    // a forma nos pontos da grade (a mesma em todas as fileiras), nunca abaixo do chão
    const G = F.forma;
    for (let i = 0; i < NX; i++) {
        const s = i * HX;
        let fi = s <= sp ? s / ds : NP + (b > 1e-9 ? (s - sp) / ds2 : 0);
        fi = lim(fi, 0, NP + NA);
        const i0 = Math.min(Math.floor(fi), NP + NA - 1);
        const t = fi - i0;
        const gx = PX[i0] + (PX[i0 + 1] - PX[i0]) * t;
        const gz = Math.max(PZ[i0] + (PZ[i0 + 1] - PZ[i0]) * t, piso(gx, e));
        for (let j = 0; j < NY; j++) {
            const k = 3 * (j * NX + i);
            G[k] = gx;
            G[k + 1] = F.P[2 * (j * NX + i) + 1];
            G[k + 2] = gz;
        }
    }
    F.formaOk = true;
}
// leva uma forma do mundo da folha para o referencial (giro de −teta)
function paraReferencial(G: Float64Array, teta: number, out: Float64Array) {
    const c = Math.cos(teta);
    const s = Math.sin(teta);
    for (let k = 0; k < 3 * N; k += 3) {
        out[k] = c * G[k] + s * G[k + 2];
        out[k + 1] = G[k + 1];
        out[k + 2] = -s * G[k] + c * G[k + 2];
    }
}

// um quadro: a mão vai de T0 a T1 (no mundo da folha; null = solta) e o referencial de teta até teta1, em sub passos
// de PASSO. A ordem das restrições é fixa: invertê-la a cada sub passo explode com muitos sub passos, e o piso já entra
// na previsão (sem isso a gravidade afunda o papel e as distâncias viram deslizamento)
export function passoPapel(F: Papel, T0: Ponto3 | null, T1: Ponto3 | null, alfaMao: number, dtq: number, teta1: number) {
    const ns = lim(Math.round(dtq / PASSO), 8, 64);
    const dt = dtq / ns;
    const at = Math.pow(HX, 4) / (Math.pow(F.flexao, 3) * GRAVIDADE) / (dt * dt);
    const ar = 1 - Math.exp(-K_AR * dt);
    const amort = Math.exp(-K_AMORT * dt);
    const { y, yp, v, w, nrm, dist, dRest, flex, Lg, P, idx, pes, e } = F;
    const teta0 = F.teta;
    const om = dtq > 0 ? (teta1 - teta0) / dtq : 0;
    // o arco elástico, com a mão e fora do assento: a forma no começo do quadro (a do quadro anterior ou, no primeiro,
    // a própria folha) e no fim, as duas no referencial
    const comArco = !!(T0 && T1) && !F.guia && dtq > 0;
    if (comArco) {
        paraReferencial(F.formaOk ? F.forma : F.x, teta0, F.gf0);
        montarArco(F, T0!, T1!, dtq);
        paraReferencial(F.forma, teta1, F.gf1);
    } else F.formaOk = false;
    if (om !== F.omAnt) {
        if (comArco) {
            // com o arco, quem leva o papel é a forma (e a mão): o giro do referencial não o arrasta. Cada ponto guarda a
            // velocidade no mundo quando o giro muda (no referencial, ela muda de −Δω×y). Arrastado, o papel além da mão
            // girava junto com a mão, como uma tábua: a cada pixel de tremor, a borda de fora subia e caía
            const dw = om - F.omAnt;
            for (let k = 0, i = 0; k < N; k++, i += 3) {
                if (!w[k]) continue;
                v[i] += dw * y[i + 2];
                v[i + 2] -= dw * y[i];
            }
        } else {
            // sem o arco (o assento), as velocidades ficam no referencial, e o papel solto gira junto com ele. O papel
            // encostado na pilha (ou quase: o vizinho do que encosta fica preso pelo papel), com o giro de antes
            // empurrando contra ela (ω·X < 0), está parado no mundo: no referencial ele andava a −ω×y. Com o giro novo,
            // ele guarda a velocidade no mundo se o giro ainda empurra contra a pilha, ou passa a girar junto se o giro
            // agora o levanta (ou parou). Sem isso, a pilha virava mola (a folha deitada era jogada para cima)
            const c0 = Math.cos(teta0);
            const s0 = Math.sin(teta0);
            for (let k = 0, i = 0; k < N; k++, i += 3) {
                if (!w[k]) continue;
                const X = c0 * y[i] - s0 * y[i + 2];
                if (F.omAnt * X >= 0 || s0 * y[i] + c0 * y[i + 2] - piso(X, e) >= PERTO_DO_CHAO) continue;
                const dw = F.omAnt - (om * X < 0 ? om : 0);
                v[i] -= dw * y[i + 2];
                v[i + 2] += dw * y[i];
            }
        }
    }
    F.omAnt = om;
    normais(F);
    // a guia do arco: a mola (GUIA_W) e o amortecimento crítico dela contra o movimento da própria forma, implícitos
    const kk = comArco ? dt * dt * GUIA_W * GUIA_W : 0;
    const cc = comArco ? dt * 2 * GUIA_W : 0;
    const denArco = 1 / (1 + kk + cc);
    // com o arco, as forças do referencial que gira (Coriolis e centrífuga): o papel solto não sente o giro
    const om2 = comArco ? 2 * om * dt : 0;
    const omq = comArco ? om * om * dt : 0;
    for (let s = 1; s <= ns; s++) {
        const a = s / ns;
        const tetaAnt = F.teta;
        const teta = teta0 + (teta1 - teta0) * a;
        F.teta = teta;
        const c = Math.cos(teta);
        const sn = Math.sin(teta);
        // a gravidade no referencial
        const gx = -GRAVIDADE * sn * dt;
        const gz = -GRAVIDADE * c * dt;
        // o pino da lombada (no mundo, em Z = pino): no referencial
        const pinoX = sn * F.pino;
        const pinoZ = c * F.pino;
        // prever
        for (let k = 0, i = 0; k < N; k++, i += 3) {
            yp[i] = y[i];
            yp[i + 1] = y[i + 1];
            yp[i + 2] = y[i + 2];
            if (!w[k]) {
                y[i] = pinoX;
                y[i + 2] = pinoZ;
                continue;
            }
            v[i] += gx;
            v[i + 2] += gz;
            const vx0 = v[i];
            v[i] += om2 * v[i + 2] + omq * y[i];
            v[i + 2] += omq * y[i + 2] - om2 * vx0;
            y[i] += v[i] * dt;
            y[i + 1] += v[i + 1] * dt;
            y[i + 2] += v[i + 2] * dt;
            const X = c * y[i] - sn * y[i + 2];
            const Z = sn * y[i] + c * y[i + 2];
            const f = piso(X, e);
            if (Z < f) {
                y[i] = c * X + sn * f;
                y[i + 2] = -sn * X + c * f;
            }
        }
        // distâncias (duras)
        for (let q = 0, m = dRest.length; q < m; q++) {
            const ia = dist[2 * q];
            const ib = dist[2 * q + 1];
            const wa = w[ia / 3];
            const wb = w[ib / 3];
            const ws = wa + wb;
            if (!ws) continue;
            const dx = y[ib] - y[ia];
            const dy = y[ib + 1] - y[ia + 1];
            const dz = y[ib + 2] - y[ia + 2];
            const L = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (L < 1e-12) continue;
            const k = (L - dRest[q]) / (ws * L);
            y[ia] += wa * k * dx;
            y[ia + 1] += wa * k * dy;
            y[ia + 2] += wa * k * dz;
            y[ib] -= wb * k * dx;
            y[ib + 1] -= wb * k * dy;
            y[ib + 2] -= wb * k * dz;
        }
        // flexão (a segunda diferença, XPBD)
        for (let q = 0, m = flex.length; q < m; q += 3) {
            const ia = flex[q];
            const ib = flex[q + 1];
            const ic = flex[q + 2];
            const wa = w[ia / 3];
            const wb = w[ib / 3];
            const wc = w[ic / 3];
            const den = 1 / (wa + 4 * wb + wc + at);
            for (let d = 0; d < 3; d++) {
                const l = -(y[ia + d] - 2 * y[ib + d] + y[ic + d]) * den;
                y[ia + d] += wa * l;
                y[ib + d] -= 2 * wb * l;
                y[ic + d] += wc * l;
            }
        }
        // a guia do assento (no mundo da folha): levada para o referencial
        if (F.guia) {
            const G = F.guia;
            const sg = 1 / (1 + F.alfaGuia / (dt * dt));
            for (let k = 0, i = 0; k < N; k++, i += 3) {
                if (!w[k]) continue;
                const gxr = c * G[i] + sn * G[i + 2];
                const gzr = -sn * G[i] + c * G[i + 2];
                y[i] += (gxr - y[i]) * sg;
                y[i + 1] += (G[i + 1] - y[i + 1]) * sg;
                y[i + 2] += (gzr - y[i + 2]) * sg;
            }
        }
        // o arco (no referencial, entre a forma do começo e a do fim do quadro): cada ponto vai para o dele com a mola, e
        // o amortecimento freia só o que ele anda fora do passo da forma (o papel acompanha a forma sem tremer em volta)
        if (comArco) {
            const G0 = F.gf0;
            const G1 = F.gf1;
            for (let k = 0, i = 0; k < N; k++, i += 3) {
                if (!w[k]) continue;
                for (let d = i; d < i + 3; d++) {
                    const p = G1[d] - G0[d];
                    y[d] = (y[d] + kk * (G0[d] + p * a) + cc * (yp[d] + p / ns)) * denArco;
                }
            }
        }
        // a mão (no referencial)
        let trx = 0;
        let try_ = 0;
        let trz = 0;
        const comMao = !!(T0 && T1);
        if (comMao) {
            const tx = T0![0] + (T1![0] - T0![0]) * a;
            const ty = T0![1] + (T1![1] - T0![1]) * a;
            const tz = T0![2] + (T1![2] - T0![2]) * a;
            trx = c * tx + sn * tz;
            try_ = ty;
            trz = -sn * tx + c * tz;
        }
        // amarras longas (só limitam o estiramento): à lombada (o eixo, que não gira) e à mão
        for (let k = 0, i = 0; k < N; k++, i += 3) {
            if (!w[k]) continue;
            const L = P[2 * k];
            const ex0 = y[i] - pinoX;
            const ey0 = y[i + 1] - P[2 * k + 1];
            const ez0 = y[i + 2] - pinoZ;
            const d2 = ex0 * ex0 + ey0 * ey0 + ez0 * ez0;
            if (d2 > L * L) {
                const sc = L / Math.sqrt(d2);
                y[i] = pinoX + ex0 * sc;
                y[i + 1] = P[2 * k + 1] + ey0 * sc;
                y[i + 2] = pinoZ + ez0 * sc;
            }
            if (comMao) {
                const ex = y[i] - trx;
                const ey = y[i + 1] - try_;
                const ez = y[i + 2] - trz;
                const e2 = ex * ex + ey * ey + ez * ez;
                const Lq = Lg[k];
                if (e2 > Lq * Lq) {
                    const sc = Lq / Math.sqrt(e2);
                    y[i] = trx + ex * sc;
                    y[i + 1] = try_ + ey * sc;
                    y[i + 2] = trz + ez * sc;
                }
            }
        }
        if (comMao) {
            let den = alfaMao / (dt * dt);
            for (let q = 0; q < 4; q++) den += w[idx[q] / 3] * pes[q] * pes[q];
            if (den > 0) {
                const tr = [trx, try_, trz];
                for (let d = 0; d < 3; d++) {
                    let C = -tr[d];
                    for (let q = 0; q < 4; q++) C += pes[q] * y[idx[q] + d];
                    const l = -C / den;
                    for (let q = 0; q < 4; q++) y[idx[q] + d] += w[idx[q] / 3] * pes[q] * l;
                }
            }
        }
        // o piso (no mundo) com atrito; com a guia do pouso, sem atrito (a guia leva o papel deitado até a pose exata
        // deslizando sobre a pilha; com atrito, ele ficava preso torto até a guia endurecer e dava um pulo)
        const mu = F.guia ? 0 : ATRITO;
        const cA = Math.cos(tetaAnt);
        const sA = Math.sin(tetaAnt);
        for (let k = 0, i = 0; k < N; k++, i += 3) {
            if (!w[k]) continue;
            let X = c * y[i] - sn * y[i + 2];
            let Z = sn * y[i] + c * y[i + 2];
            const f = piso(X, e);
            if (Z < f) {
                const pen = f - Z;
                Z = f;
                const Xp = cA * yp[i] - sA * yp[i + 2];
                const tx = X - Xp;
                const ty = y[i + 1] - yp[i + 1];
                const tl = Math.sqrt(tx * tx + ty * ty);
                if (tl < mu * pen) {
                    X = Xp;
                    y[i + 1] = yp[i + 1];
                } else if (tl > 0) {
                    const r = (mu * pen) / tl;
                    X -= tx * r;
                    y[i + 1] -= ty * r;
                }
                y[i] = c * X + sn * Z;
                y[i + 2] = -sn * X + c * Z;
            }
        }
        // as velocidades no referencial; o ar freia a velocidade no mundo, na direção da normal. Com o arco, o
        // amortecimento também freia a do mundo (no referencial, ele puxava o papel a girar junto)
        for (let k = 0, i = 0; k < N; k++, i += 3) {
            if (!w[k]) {
                v[i] = v[i + 1] = v[i + 2] = 0;
                continue;
            }
            let vx = (y[i] - yp[i]) / dt;
            let vy = (y[i + 1] - yp[i + 1]) / dt;
            let vz = (y[i + 2] - yp[i + 2]) / dt;
            const ux = vx - om * y[i + 2];
            const uz = vz + om * y[i];
            const un = ux * nrm[i] + vy * nrm[i + 1] + uz * nrm[i + 2];
            vx -= ar * un * nrm[i];
            vy -= ar * un * nrm[i + 1];
            vz -= ar * un * nrm[i + 2];
            if (comArco) {
                v[i] = (vx - om * y[i + 2]) * amort + om * y[i + 2];
                v[i + 1] = vy * amort;
                v[i + 2] = (vz + om * y[i]) * amort - om * y[i];
            } else {
                v[i] = vx * amort;
                v[i + 1] = vy * amort;
                v[i + 2] = vz * amort;
            }
        }
    }
    F.teta = teta1;
    paraMundo(F);
}

// o mundo da folha a partir do referencial (giro de teta em volta do eixo da lombada)
function paraMundo(F: Papel) {
    const c = Math.cos(F.teta);
    const s = Math.sin(F.teta);
    const { y, x } = F;
    for (let k = 0; k < 3 * N; k += 3) {
        x[k] = c * y[k] - s * y[k + 2];
        x[k + 1] = y[k + 1];
        x[k + 2] = s * y[k] + c * y[k + 2];
    }
}

// ---------- a superfície (a mesma conta do shader) ----------
const cr = (t: number) => [(-t * t * t + 2 * t * t - t) / 2, (3 * t * t * t - 5 * t * t + 2) / 2, (-3 * t * t * t + 4 * t * t + t) / 2, (t * t * t - t * t) / 2];
// o ponto da grade (i, j) no mundo da folha; fora dela, os fantasmas extrapolados em linha (nos cantos, nas duas
// direções)
function noGrade(F: Papel, i: number, j: number, d: number): number {
    if (i < 0) return 2 * noGrade(F, 0, j, d) - noGrade(F, 1, j, d);
    if (i > NX - 1) return 2 * noGrade(F, NX - 1, j, d) - noGrade(F, NX - 2, j, d);
    if (j < 0) return 2 * noGrade(F, i, 0, d) - noGrade(F, i, 1, d);
    if (j > NY - 1) return 2 * noGrade(F, i, NY - 1, d) - noGrade(F, i, NY - 2, d);
    return F.x[3 * (j * NX + i) + d];
}
// o ponto da folha (X, Y) na superfície bicúbica (Catmull-Rom) da grade
export function naSuperficie(F: Papel, X: number, Y: number): Ponto3 {
    const fi = lim(X / HX, 0, NX - 1);
    const fj = lim((Y + H / 2) / HY, 0, NY - 1);
    const i = Math.min(Math.floor(fi), NX - 2);
    const j = Math.min(Math.floor(fj), NY - 2);
    const wu = cr(fi - i);
    const wv = cr(fj - j);
    const p: Ponto3 = [0, 0, 0];
    for (let b = 0; b < 4; b++)
        for (let a = 0; a < 4; a++) {
            const w = wu[a] * wv[b];
            for (let d = 0; d < 3; d++) p[d] += w * noGrade(F, i - 1 + a, j - 1 + b, d);
        }
    return p;
}
// as posições para a textura do shader: (NX + 2) × (NY + 2) pontos, com a borda de fantasmas (RGBA, A sem uso)
export function paraTextura(F: Papel, buf: Float32Array) {
    for (let j = -1; j <= NY; j++)
        for (let i = -1; i <= NX; i++) {
            const o = 4 * ((j + 1) * (NX + 2) + (i + 1));
            buf[o] = noGrade(F, i, j, 0);
            buf[o + 1] = noGrade(F, i, j, 1);
            buf[o + 2] = noGrade(F, i, j, 2);
            buf[o + 3] = 1;
        }
}

// o maior estiramento ou encurtamento das distâncias (para conferir) e a maior altura acima do chão
export function medidas(F: Papel) {
    let est = 0;
    for (let q = 0; q < F.dRest.length; q++) {
        const a = F.dist[2 * q];
        const b = F.dist[2 * q + 1];
        const L = Math.hypot(F.x[b] - F.x[a], F.x[b + 1] - F.x[a + 1], F.x[b + 2] - F.x[a + 2]);
        est = Math.max(est, Math.abs(L / F.dRest[q] - 1));
    }
    // (sem a lombada: o pino fica na altura da pilha de destino, acima do chão da pilha dela)
    let alto = 0;
    for (let k = 0; k < N; k++) if (F.w[k]) alto = Math.max(alto, F.x[3 * k + 2] - piso(F.x[3 * k], F.e));
    return { est, alto };
}

// ---------- a mão ----------
// a folga do caminho da mão em volta da lombada: zero com a folha deitada (0 e π), cresce logo no começo e fica em
// FOLGA no meio; é ela que faz o arco entre a lombada e a mão (no puxão curto, o papel entre as duas sobe em corcova, sem
// o pulo de raiz quadrada de erguer rígido). Com a mão perto da lombada, o trecho até ela é curto demais para fazer
// arco (a grade não curva nele e o papel encolheria): a folga some
const folgaPuxao = (phi: number, gx: number) =>
    FOLGA * suave(0.1, 0.45, gx) * (1 - Math.exp(-Math.max(phi, 0) / FOLGA_ANG)) * (1 - Math.exp(-Math.max(PI - phi, 0) / FOLGA_ANG));
// o quanto a página erguida (a curva na encadernação, sem corcova) encurta o trecho lombada → mão, com a mão no ângulo
// phi (tabela de 0 a π, feita na primeira vez)
let TAB_ENCURTA: Float64Array | null = null;
function encurtaErguida(phi: number) {
    if (!TAB_ENCURTA) {
        TAB_ENCURTA = new Float64Array(129);
        let A = 0;
        // com a raiz deitada na pilha de origem em toda a virada: a folga (o caminho da mão) fica a de antes e o
        // mapeamento do ponteiro não muda. No fim da virada a raiz passa para a outra pilha e encurta menos o trecho; o
        // que sobra da folga ali vira a corcova (com a folga baixada junto, o raio do ponteiro cruzava o caminho de
        // raspão perto da pilha de destino e a mão pulava: saltos do ângulo de 122 para 180 gestos no fuzz)
        thR = 0;
        for (let k = 0; k <= 128; k++) {
            A = giroDoPerfil(A, 0, CURVA_LOMBADA, 1, (PI * k) / 128);
            TAB_ENCURTA[k] = 1 - Math.hypot(PONTA[0], PONTA[1]);
        }
    }
    const f = lim(phi / PI, 0, 1) * 128;
    const k = Math.min(127, Math.floor(f));
    return TAB_ENCURTA[k] + (TAB_ENCURTA[k + 1] - TAB_ENCURTA[k]) * (f - k);
}
// a folga: a do puxão perto da pilha; com a página já erguida (de FOLGA_P0 a FOLGA_P1), ela baixa até o encurtamento da
// própria curva na encadernação. A folga inteira no meio da virada comprimia o trecho até a mão, que virava um arco com a
// raiz em pé (o S); a baixa é lenta, para o caminho continuar de través ao raio do ponteiro
export const folga = (phi: number, gx: number) => {
    const f = folgaPuxao(phi, gx);
    return f - suave(FOLGA_P0, FOLGA_P1, phi) * Math.max(0, f - encurtaErguida(phi));
};
// a altura da lombada com a mão no ângulo phi: na pilha da folha, 0; passando do meio da virada, sobe (ou desce) até a
// altura da outra pilha. Sem isso, no fim do livro (pilhas de alturas diferentes) a folha deitada do outro lado ficava,
// junto da lombada, abaixo da página de cima daquela pilha, e as letras dela apareciam por cima até o assento
export const alturaDoPino = (phi: number, e: number) => e * suave(0.3 * PI, 0.7 * PI, phi);

// a mão segura o papel no ponto g e anda num caminho em volta da lombada, no plano do próprio g. De lado ela não anda: o
// papel preso na lombada inteira não desliza para cima nem para baixo, e seguir o ponteiro de lado torcia a folha (que
// parecia girar no plano, solta). Pegando rente à lombada, o caminho da mão seria minúsculo (um pixel de ponteiro
// virava a folha inteira, de um golpe, e ela chicoteava, esticava e trocava de lado): a mão passa a segurar o papel em
// PEGA_MIN, e o raio do ponteiro anda junto com ela (deslocado pela mesma distância), então a folha gira por igual. O
// ponto fica dentro do papel (na borda de fora, com a outra pilha mais alta, o ponteiro caía um pouco além dela)
export type Mao = { g: [number, number]; desloc: number };
export function criarMao(pego: [number, number]): Mao {
    const gx = lim(pego[0], PEGA_MIN, W);
    return { g: [gx, lim(pego[1], -H / 2, H / 2)], desloc: gx - pego[0] };
}

// a mão no caminho, no ângulo phi em volta do pino da lombada: a g.x·(1 − folga) dele. Tudo da mão (o arrasto, a
// soltura e o ângulo do referencial) usa este mesmo ângulo, sem degrau ao passar de uma fase para outra
export function maoEm(g: [number, number], phi: number, e: number): Ponto3 {
    const r = g[0] * (1 - folga(phi, g[0]));
    const X = r * Math.cos(phi);
    return [X, g[1], Math.max(alturaDoPino(phi, e) + r * Math.sin(phi), piso(X, e))];
}

// o ângulo da mão sob o ponteiro: onde o raio dele (do olho E, na direção D, nas contas da folha, deslocado com a mão)
// cruza o caminho da mão, visto de lado (no plano XZ). Com dois encontros (de perto, com o raio muito inclinado, perto
// das pilhas), fica o mais perto do ângulo de antes: a mão não pula de um para o outro, e o tremor de um pixel não a faz
// ir e voltar. Sem encontro (o ponteiro além do caminho), a mão deita do lado em que o ponteiro está
const AMOSTRAS = 96;
export function anguloDaMao(m: Mao, E: Ponto3, D: Ponto3, e: number, phiAnt: number): number {
    const ex = E[0] + m.desloc;
    const k = D[0] / D[2];
    // o quanto o raio passa além do ponto phi do caminho (para fora, longe da lombada), na altura dele
    const alem = (phi: number) => {
        const T = maoEm(m.g, phi, e);
        return ex + (T[2] - E[2]) * k - T[0];
    };
    let melhor = -1;
    let pa = 0;
    let sa = alem(0);
    for (let i = 1; i <= AMOSTRAS; i++) {
        const pb = (PI * i) / AMOSTRAS;
        const sb = alem(pb);
        if (sa > 0 !== sb > 0) {
            let a = pa;
            let b = pb;
            for (let q = 0; q < 30; q++) {
                const mm = (a + b) / 2;
                if (alem(mm) > 0 === sa > 0) a = mm;
                else b = mm;
            }
            const r = (a + b) / 2;
            if (melhor < 0 || Math.abs(r - phiAnt) < Math.abs(melhor - phiAnt)) melhor = r;
        }
        pa = pb;
        sa = sb;
    }
    if (melhor >= 0) return melhor;
    return sa > 0 ? 0 : PI;
}

// a mão na soltura: o ângulo vai do de agora até deitar (π, virando, ou 0), com a velocidade angular de agora no começo
// e parada no fim (Hermite). O resto (o desvio da pinça que a mão levava no arrasto) some pelo caminho: a soltura parte
// exatamente de onde a mão estava
export function maoNaSoltura(
    g: [number, number],
    phi0: number,
    om0: number,
    phiFim: number,
    dur: number,
    s: number,
    e: number,
    resto: Ponto3,
): { T: Ponto3; phi: number } {
    const d = phiFim - phi0;
    const sg = Math.sign(d) || 1;
    const m0 = sg * Math.min(Math.max(0, sg * om0) * dur, 3 * Math.abs(d));
    const h00 = 2 * s ** 3 - 3 * s ** 2 + 1;
    const h10 = s ** 3 - 2 * s ** 2 + s;
    const h01 = -2 * s ** 3 + 3 * s ** 2;
    const phi = h00 * phi0 + h10 * m0 + h01 * phiFim;
    const T = maoEm(g, phi, e);
    for (let q = 0; q < 3; q++) T[q] += resto[q] * h00;
    T[2] = Math.max(T[2], piso(T[0], e));
    return { T, phi };
}

// o desvio da pinça: a mão prende a média bilinear dos 4 pontos da célula do ponto pego, e o desenho é a bicúbica. A
// diferença entre as duas, somada ao alvo da mão no quadro seguinte, põe o ponto pego desenhado sob o ponteiro. É uma
// conta direta da pose (sem acumular: a soma de antes, quando o papel não alcançava o alvo, crescia até o limite,
// empurrava a mão para dentro da pilha ou para o outro lado da lombada e a folha amassava e trocava de lado)
export function desvioDaPinca(F: Papel): Ponto3 {
    const b: Ponto3 = [0, 0, 0];
    for (let q = 0; q < 4; q++) for (let d = 0; d < 3; d++) b[d] += F.pes[q] * F.x[F.idx[q] + d];
    const s = naSuperficie(F, F.g[0], F.g[1]);
    return [lim(b[0] - s[0], -0.02, 0.02), lim(b[1] - s[1], -0.02, 0.02), lim(b[2] - s[2], -0.02, 0.02)];
}

// a pose parada (a guia do assento): deitada na pilha de destino (do outro lado, na altura dela, ao virar)
export function poseParada(F: Papel, vira: boolean): Float64Array {
    const G = new Float64Array(N * 3);
    for (let k = 0; k < N; k++) {
        G[3 * k] = (vira ? -1 : 1) * F.P[2 * k];
        G[3 * k + 1] = F.P[2 * k + 1];
        G[3 * k + 2] = vira ? F.e : 0;
    }
    return G;
}
export const QTD = N;
