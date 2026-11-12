// o motor do livro em WebGL2, trazido do clone-tantan (os shaders e a física das folhas são os mesmos): cada folha é
// uma malha que se curva em arco a partir da lombada, as folhas paradas formam as duas pilhas, as que estão virando
// projetam sombra nelas e o papel vegetal é desenhado por último, lendo a cena já pronta.
// O que muda para morar dentro da página: o canvas é o da seção do livro (as coordenadas do ponteiro são as dele), a roda
// do mouse rola a página (folheia só a roda de lado, a do trackpad; Ctrl + roda aproxima; de perto, a roda passeia
// pela página até a borda e depois devolve a rolagem), as setas do teclado só valem com o livro à vista, o laço para
// quando a seção sai da tela, o toque deixa a página rolar na vertical (pan-y) e dois dedos aproximam. As páginas
// são as do espécime da Föeger Rune, desenhadas pelo pincel de canvas.
import { malha, olhar, perspectiva, programa, quadroDeDesenho, liberarQuadro, mult, norm, cruz, type Quadro, type Prog } from './gl';
import { montarFolhas, folhaDoCapitulo, folhaDosCaracteres, contagemDaPagina, lerCores, tintaDoVegetal, type Pagina } from '../especime/conteudo';
import { desenharPagina, type Alvo } from '../especime/paginas';
import { PONTEIROS, type Ponteiro } from './ponteiros';
import { carregarFontes, familiasDe, pincelCanvas, type Familias } from '../especime/pincel';

const W = 1;
const H = 1.5;
const ESP = 0.0016;
// a capa dura: a grossura da tábua (umas nove folhas) e quanto ela sobra em volta das folhas, na largura (só do lado de
// fora; na lombada ela começa junto) e na altura (metade em cima, metade embaixo). A sobra é pouca, como a de antes da
// capa grossa: somada à borda arredondada da tábua, que sai mais um pouco (BOJO), fica perto de 1,2% da largura e de
// 0,9% da altura em cada lado
const GROSSO = 0.014;
const SOBRA_L = 1.01;
const SOBRA_A = 1.015;
// o raio dos cantos de fora da capa dura e quanto a borda da tábua sai para fora (em frações da meia grossura: a
// borda é quase reta, com as quinas arredondadas)
const RAIO_CAPA = 0.012;
const BOJO = 0.35;
const PI = Math.PI;
const FOV = (28 * PI) / 180;
// o chão da cena: o plano da sombra do livro e da trama
const CHAO = -0.004;
const LUZ = norm([-0.3, 0.45, 1]);
const LUZ_SOMBRA = norm([-0.38, 0.5, 1]);
const NIVEIS = [0, 512, 1024, 2560];

// ---------- shaders ----------

// as três partes da folha dobrada pelo ponteiro, nas contas da folha (X da lombada para dentro, Y do meio): 0, a parte
// deitada (antes da linha da dobra, uEixo); 1, o cone; 2, a parte virada (depois da segunda linha, onde o cone acaba,
// a linha da dobra girada no vértice pelo ângulo que o cone ocupa na folha)
const PARTE = `
float parteDe(vec2 P) {
    vec2 d = P - uEixo.xy;
    float dN = dot(d, uCone.xy);
    if (dN <= 0.0) return 0.0;
    float al = 3.14159265 * uCone.z;
    return dN * cos(al) - dot(d, uEixo.zw) * sin(al) >= 0.0 ? 2.0 : 1.0;
}`;

// a folha dobrada é desenhada em três partes (uParte): a deitada e a virada na malha comum, cada uma com a conta dela em
// todos os vértices (as duas contas são rígidas, qualquer malha serve), e o cone numa malha própria, ao longo das
// geratrizes; cada parte só fica com o pedaço da folha que é dela, cortado no fragmento. Numa malha só, os triângulos
// que atravessavam a dobra ligavam um vértice deitado a um virado e, com o cone mais fino que os quadrados da malha, a
// borda da dobra saía em serra
const N_CONE = 160;
const RECORTE = `
uniform vec2 uTam;
uniform vec4 uEixo, uCone;
uniform float uParte;
${PARTE}
bool fora(vec2 uv) {
    return uParte > -0.5 && abs(parteDe(vec2(uv.x * uTam.x, (uv.y - 0.5) * uTam.y)) - uParte) > 0.5;
}
// quanto do pixel é desta parte (0: nada). As bordas entre as partes ficam por dentro da folha, contínuas e da mesma
// cor, e o corte seco não aparece; só onde o cone é mais fino que um pixel (perto do vértice) a dobra vira a borda
// da folha contra o que está embaixo, e ali a parte deitada e a virada cobrem o pixel pela metade da conta (com o
// alpha-to-coverage, o degrau some como numa borda de triângulo)
float cobertura(vec2 uv) {
    if (uParte < -0.5) return 1.0;
    vec2 d = vec2(uv.x * uTam.x, (uv.y - 0.5) * uTam.y) - uEixo.xy;
    float dN = dot(d, uCone.xy);
    float al = 3.14159265 * uCone.z;
    float rs = dN * cos(al) - dot(d, uEixo.zw) * sin(al);
    float w1 = max(fwidth(dN), 1e-7);
    float w2 = max(fwidth(rs), 1e-7);
    // meio pixel de sobra para cada lado das linhas: os desenhos das partes interpolam a folha em malhas diferentes e,
    // com o centro do pixel em cima da linha, os dois descartavam (furinhos ao longo do vinco e da crista do rolo). Na
    // sobra, as duas partes têm o mesmo ponto e a mesma cor (as contas encostam nas linhas)
    float seca = uParte < 0.5 ? step(dN, 0.5 * w1) : uParte > 1.5 ? step(-0.5 * w2, rs) : step(-0.5 * w1, dN) * step(rs, 0.5 * w2);
    float fino = 1.0 - smoothstep(0.75, 1.5, length(d) * al / w2);
    float suave = uParte < 0.5 ? clamp(0.5 - dN / w1, 0.0, 1.0) : uParte > 1.5 ? clamp(0.5 + rs / w2, 0.0, 1.0) : seca;
    return mix(seca, suave, fino);
}`;

const DEFORMA = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aUv;
uniform mat4 uVP;
uniform float uPhi, uCurl, uTwist, uGrabV, uZ, uDobra, uLarg, uInclina;
uniform vec2 uTam;
// a dobra livre (a folha puxada pelo ponteiro), nas contas da folha: o vértice do cone e a direção da linha da dobra,
// do vértice para dentro da folha (uEixo); a normal da linha, para o lado que vira, o seno do meio-ângulo do cone e a
// altura extra da parte virada (uCone); o lado em que a folha está deitada (+1 direita, −1 esquerda)
uniform float uDobrar, uLado;
uniform vec4 uEixo, uCone;
// a parte da folha dobrada que este desenho leva (−1: a folha inteira, sem a dobra livre)
uniform float uParte;
const float PI = 3.14159265;
${PARTE}
// a malha do cone (a parte 1): uma coluna por geratriz, de ψ = 0 a π, de borda a borda da folha, e mais uma faixa
// estreita de cada lado, na conta da parte deitada e da virada (o pixel da borda do cone sai inteiro). Com as colunas
// nas geratrizes, a silhueta do rolo é reta mesmo com o cone mais fino que um quadrado da malha comum
const float N_CONE = ${N_CONE}.0;
const float FAIXA = 0.004;
vec2 faixa(float o, float d, float lo, float hi) {
    if (abs(d) < 1e-7) return o >= lo && o <= hi ? vec2(-1e6, 1e6) : vec2(1e6, -1e6);
    float a = (lo - o) / d;
    float b = (hi - o) / d;
    return vec2(min(a, b), max(a, b));
}
// o ψ da coluna do cone deste vértice (−1 nas faixas e fora do cone): no vértice do cone todas as geratrizes se
// encontram e o ponto da folha não diz de qual delas ele é (a normal ali é a da geratriz)
float psiColuna = -1.0;
vec2 uvDaMalha() {
    if (uDobrar < 0.5 || abs(uParte - 1.0) > 0.5) return aUv;
    vec2 A = uEixo.xy;
    vec2 T = uEixo.zw;
    vec2 N = uCone.xy;
    float al = PI * uCone.z;
    float k = floor(aUv.x * N_CONE + 0.5);
    vec2 O = A;
    vec2 D;
    if (k < 0.5) {
        D = T;
        O = A - N * FAIXA;
    } else if (k > N_CONE - 0.5) {
        D = cos(al) * T + sin(al) * N;
        O = A + (cos(al) * N - sin(al) * T) * FAIXA;
    } else {
        float fi = al * (k - 1.0) / (N_CONE - 2.0);
        // um canto de fora da folha dentro do cone: a coluna mais perto dele passa exatamente por ele (as colunas
        // ligam as pontas em linha reta, e o canto entre duas que saíam por bordas diferentes ficava de fora)
        if (k > 1.5 && k < N_CONE - 1.5) {
            for (int i = 0; i < 2; i++) {
                vec2 dc = vec2(uTam.x, (float(i) - 0.5) * uTam.y) - A;
                float fc = atan(dot(dc, N), dot(dc, T));
                if (fc > 0.0 && fc < al && abs(floor(fc / al * (N_CONE - 2.0) + 0.5) + 1.0 - k) < 0.5) fi = fc;
            }
        }
        D = cos(fi) * T + sin(fi) * N;
        psiColuna = PI * fi / al;
    }
    vec2 fx = faixa(O.x, D.x, 0.0, uTam.x);
    vec2 fy = faixa(O.y, D.y, -0.5 * uTam.y, 0.5 * uTam.y);
    float r0 = max(fx.x, fy.x);
    float r1 = min(fx.y, fy.y);
    // as geratrizes saem do vértice (atrás dele não há cone)
    if (k > 0.5 && k < N_CONE - 0.5) r0 = max(r0, 0.0);
    vec2 P;
    if (r1 > r0) {
        // a ordem dos vértices na coluna deixa a frente da folha do mesmo lado que na malha comum
        float t = T.x * N.y - T.y * N.x > 0.0 ? 1.0 - aUv.y : aUv.y;
        P = O + D * mix(r0, r1, t);
    } else {
        // a coluna não passa pela folha: fica no canto mais perto dela (o pedaço do cone que chega ao canto)
        vec2 nD = vec2(-D.y, D.x);
        float h = 0.5 * uTam.y;
        P = vec2(0.0, -h);
        float m = abs(dot(P - O, nD));
        vec2 c = vec2(uTam.x, -h);
        float x = abs(dot(c - O, nD));
        if (x < m) { m = x; P = c; }
        c = vec2(0.0, h);
        x = abs(dot(c - O, nD));
        if (x < m) { m = x; P = c; }
        c = vec2(uTam.x, h);
        x = abs(dot(c - O, nD));
        if (x < m) { m = x; P = c; }
    }
    return vec2(P.x / uTam.x, P.y / uTam.y + 0.5);
}
// a folha deitada se dobra como o papel preso na lombada: o que fica antes da linha da dobra não se mexe; depois dela,
// o papel enrola num cone (o vértice onde o espelho da dobra cruza a linha da lombada: o rolo afina rumo à lombada e
// some na ponta dela quando a folha é puxada até o limite) e o que passa do cone deita por cima, virado e rígido. Nada
// estica, então o ponto pego vai exatamente para onde a conta mandar. A folha da esquerda é o espelho (uLado −1, que
// também inverte a normal)
vec3 dobrar(vec2 q, out vec3 n) {
    int parte = int(uParte + 0.5);
    vec2 P = vec2(q.x * uTam.x, (q.y - 0.5) * uTam.y);
    vec2 A = uEixo.xy;
    vec2 T = uEixo.zw;
    vec2 N = uCone.xy;
    float sb = uCone.z;
    float e = uCone.w;
    float cb = sqrt(max(1.0 - sb * sb, 0.0));
    vec2 d = P - A;
    float dT = dot(d, T);
    float dN = dot(d, N);
    // a malha do cone usa a conta de cada vértice (as faixas dos lados são da parte deitada e da virada); as outras duas
    // partes, a conta delas em todos os vértices (a borda da dobra sai reta, cortada no fragmento)
    float esta = parte == 1 ? (psiColuna >= 0.0 ? 1.0 : parteDe(P)) : float(parte);
    vec3 X;
    vec3 m;
    if (esta < 0.5) {
        X = vec3(P, 0.0);
        m = vec3(0.0, 0.0, 1.0);
    } else if (esta > 1.5) {
        // a parte virada: girada no vértice, deitada no plano que encosta no alto do cone (inclinado 2β), mais a altura
        // extra para passar por cima da outra pilha
        float al = PI * sb;
        float rc = dT * cos(al) + dN * sin(al);
        float rs = dN * cos(al) - dT * sin(al);
        float c2 = 1.0 - 2.0 * sb * sb;
        float s2 = 2.0 * sb * cb;
        X = vec3(A + T * (rc * c2) - N * rs, rc * s2 + e);
        m = vec3(T * s2, -c2);
    } else {
        // o cone: a geratriz em volta do eixo (inclinado β sobre a linha da dobra), ψ de 0 (deitado) a π (no alto). A
        // altura extra sobe na metade de baixo (ψ até π/2), a que olha para a mesa e fica escondida sob o rolo: perto
        // do vértice o cone é estreito e a subida vira parede, e na metade de cima ela aparecia como uma faixa cinza
        float rho = length(d);
        float psi = psiColuna >= 0.0 ? psiColuna : atan(dN, dT) / sb;
        float cp = cos(psi);
        float sp = sin(psi);
        float baixo = step(psi, 0.5 * PI);
        float sobe = mix(1.0, 0.5 - 0.5 * cos(2.0 * psi), baixo);
        vec3 g = vec3(T * (cb * cb + sb * sb * cp) + N * (sb * sp), sb * cb * (1.0 - cp));
        X = vec3(A, 0.0) + rho * g + vec3(0.0, 0.0, e * sobe);
        vec3 dg = vec3(T * (-sb * sb * sp) + N * (sb * cp), sb * cb * sp);
        vec3 cr = cross(g, rho * dg + vec3(0.0, 0.0, e * baixo * sin(2.0 * psi)));
        float mao = T.x * N.y - T.y * N.x;
        m = dot(cr, cr) > 1e-16 ? mao * normalize(cr) : vec3(T * (sb * cb * (1.0 - cp)) - N * (cb * sp), sb * sb + cb * cb * cp);
    }
    n = uLado > 0.0 ? m : vec3(m.x, -m.y, -m.z);
    return vec3(X.x * uLado, X.y, X.z + uZ);
}
// o ângulo da folha ao longo de u: a curva começa na dobra (na lombada, sem arrasto) e vai até uLarg depois dela;
// a dobra pode ser inclinada (o canto puxado) e a torção adianta um canto
float ang(float t, float v) {
    float d = max(uDobra + uInclina * (v - 0.5), 0.0);
    return uPhi + uCurl * smoothstep(d, d + uLarg, t) + uTwist * (v - uGrabV) * t;
}
// a folha em arco: a cada passo ao longo de u o ângulo muda; fora de [0, π] a folha deita na pilha
vec3 deforma(vec2 q, out vec3 n) {
    if (uDobrar > 0.5) return dobrar(q, n);
    float x = 0.0, z = 0.0, xv = 0.0, zv = 0.0;
    float dt = q.x / 32.0;
    for (int i = 0; i < 32; i++) {
        float t = (float(i) + 0.5) * dt;
        float a = ang(t, q.y);
        float av = (ang(t, q.y + 0.002) - ang(t, q.y - 0.002)) * 250.0;
        float m = step(0.0, a) * step(a, PI);
        a = clamp(a, 0.0, PI);
        float c = cos(a), s = sin(a);
        x += c * dt;
        z += s * dt;
        xv -= s * m * av * dt;
        zv += c * m * av * dt;
    }
    float a = clamp(ang(q.x, q.y), 0.0, PI);
    vec3 tu = vec3(cos(a), 0.0, sin(a)) * uTam.x;
    vec3 tv = vec3(xv * uTam.x, uTam.y, zv * uTam.x);
    n = normalize(cross(tu, tv));
    return vec3(x * uTam.x, (q.y - 0.5) * uTam.y, z * uTam.x + uZ);
}
`;

// uDesloca: a folha empurrada pela normal (a face de fora da capa dura, GROSSO acima ou abaixo da de dentro)
const VERT_FOLHA = `${DEFORMA}
uniform float uDesloca;
out vec2 vUv;
out vec3 vN;
out vec3 vPos;
void main() {
    vec3 n;
    vec2 q = uvDaMalha();
    vec3 p = deforma(q, n);
    p += n * uDesloca;
    vUv = q;
    vN = n;
    vPos = p;
    gl_Position = uVP * vec4(p, 1.0);
}`;

// os shaders das folhas existem em dois: sem a dobra livre (opacos, sem descarte, como as GPUs de celular gostam: a
// folha escondida na pilha não chega a ser pintada) e com ela (o recorte das três partes e a cobertura parcial)
const DESCARTE = `
    float cob = cobertura(vUv);
    if (cob <= 0.0) discard;`;
// a capa dura tem os dois cantos de fora arredondados (os da lombada não: ali a capa dobra). O pixel da face além do
// arco sai; a borda da tábua (VERT_BORDA) passa por fora dele e faz o contorno
const CANTOS = `
uniform vec2 uTam;
uniform float uRaio, uFora;
bool foraDoCanto(vec2 uv) {
    vec2 d = vec2(uv.x * uTam.x, abs(uv.y - 0.5) * uTam.y) - (vec2(uTam.x, 0.5 * uTam.y) - uRaio);
    return d.x > 0.0 && d.y > 0.0 && dot(d, d) > uRaio * uRaio;
}
// um ruído suave (de valor, com a interpolação suave), para as manchas do papel
float sorteio(vec2 i) { return fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453); }
float ruido(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(sorteio(i), sorteio(i + vec2(1.0, 0.0)), f.x), mix(sorteio(i + vec2(0.0, 1.0)), sorteio(i + vec2(1.0, 1.0)), f.x), f.y);
}`;

// a face de fora da capa dura (uFora), como a de um livro de verdade: o vinco da dobradiça junto da lombada (dois sulcos
// rasos: a normal inclina nas paredes deles, que pegam a luz de um lado e ficam na sombra do outro, e o fundo escurece;
// os dois acabam antes da margem do texto da capa, que começa em 64 da página, perto de 0,065 aqui),
// manchas largas e bem fracas do papel (sem grão: o papel não tinge igual) e a luz caindo um pouco para as bordas. A
// direção da folha ao longo de X sai das derivadas da posição na tela (vale com a capa em qualquer ângulo)
const CAPA_LUZ = `
    float ao = 1.0;
    if (uFora > 0.5) {
        float x = vUv.x * uTam.x;
        float dh = 0.0;
        float sulco = 0.0;
        const float LARGO = 0.0032;
        for (int i = 0; i < 2; i++) {
            float centro = i == 0 ? 0.030 : 0.043;
            float g = exp(-pow((x - centro) / LARGO, 2.0));
            dh += 2.0 * (x - centro) / (LARGO * LARGO) * g;
            sulco += g;
        }
        dh *= 0.0014;
        vec3 dpx = dFdx(vPos);
        vec3 dpy = dFdy(vPos);
        vec2 dux = dFdx(vUv);
        vec2 duy = dFdy(vUv);
        float det = dux.x * duy.y - dux.y * duy.x;
        if (abs(det) > 1e-12) n = normalize(n - dh * normalize((dpx * duy.y - dpy * dux.y) / det));
        ao = 1.0 - 0.12 * sulco;
        c *= 0.985 + 0.03 * (0.6 * ruido(vUv * vec2(70.0, 105.0)) + 0.4 * ruido(vUv * vec2(170.0, 255.0)));
        ao *= 1.0 - 0.06 * smoothstep(0.3, 0.75, length((vUv - 0.5) * vec2(1.0, 0.7)));
    }`;

const fragFolha = (dobra: boolean, capa = false) => `#version 300 es
precision highp float;
in vec2 vUv;
in vec3 vN;
in vec3 vPos;
uniform sampler2D uFrente, uVerso;
uniform vec3 uLuz;
uniform float uCalha;
out vec4 cor;
${dobra ? RECORTE : ''}
${capa ? CANTOS : ''}
void main() {
    ${dobra ? DESCARTE : 'float cob = 1.0;'}
    ${capa ? 'if (foraDoCanto(vUv)) discard;' : ''}
    vec3 cf = texture(uFrente, vUv).rgb;
    vec3 cv = texture(uVerso, vec2(1.0 - vUv.x, vUv.y)).rgb;
    bool fr = gl_FrontFacing;
    vec3 c = fr ? cf : cv;
    vec3 n = fr ? vN : -vN;
    ${capa ? CAPA_LUZ : ''}
    float l = 0.70 + 0.34 * max(dot(n, uLuz), 0.0);
    float u = vUv.x;
    float calha = 1.0 - uCalha * (0.2 * (1.0 - smoothstep(0.0, 0.05, u)) + 0.07 * (1.0 - smoothstep(0.0, 0.2, u)));
    float borda = 1.0 - 0.07 * (1.0 - smoothstep(0.0, 0.003, 1.0 - u));
    cor = vec4(c * l * calha * borda${capa ? ' * ao' : ''}, cob);
}`;

const fragVegetal = (dobra: boolean) => `#version 300 es
precision highp float;
in vec2 vUv;
in vec3 vN;
in vec3 vPos;
uniform sampler2D uCena, uBorra1, uBorra2, uImp;
uniform vec2 uTela;
uniform vec3 uTinta, uLuz, uFundo;
uniform float uTopoD, uTopoE, uTempo;
out vec4 cor;
${dobra ? RECORTE : ''}
vec3 sobreFundo(vec4 c) { return c.rgb + uFundo * (1.0 - c.a); }
void main() {
    ${dobra ? DESCARTE : 'float cob = 1.0;'}
    vec2 st = gl_FragCoord.xy / uTela;
    float topo = vPos.x > 0.0 ? uTopoD : uTopoE;
    float h = max(vPos.z - topo, 0.0);
    // deitado, o que está embaixo aparece borrado mas legível; levantado, vira só manchas
    float k = smoothstep(0.004, 0.14, h);
    vec3 b1 = sobreFundo(texture(uBorra1, st));
    vec3 sob = mix(mix(sobreFundo(texture(uCena, st)), b1, 0.7), sobreFundo(texture(uBorra2, st)), k);
    bool fr = gl_FrontFacing;
    vec3 n = fr ? vN : -vN;
    float dif = max(dot(n, uLuz), 0.0);
    vec3 papel = uTinta * mix(0.52 + 0.2 * dif, 0.66 + 0.24 * dif, k);
    vec3 c = mix(sob, papel, mix(0.5, 0.56, k));
    vec4 imp = texture(uImp, vUv);
    float f = fr ? 0.95 : 0.45;
    c = c * (1.0 - imp.a * f) + imp.rgb * f;
    cor = vec4(c, cob);
}`;

const VERT_SOMBRA = `${DEFORMA}
uniform float uTopoD, uTopoE;
uniform vec3 uLuzS;
out float vH;
out vec2 vUv;
void main() {
    vec3 n;
    vec2 uv = uvDaMalha();
    vec3 p = deforma(uv, n);
    float topo = p.x > 0.0 ? uTopoD : uTopoE;
    float h = max(p.z - topo, 0.0);
    vec3 q = p - uLuzS * (h / uLuzS.z);
    vH = h;
    vUv = uv;
    gl_Position = uVP * vec4(q.xy, topo, 1.0);
}`;

const FRAG_SOMBRA = `#version 300 es
precision highp float;
in float vH;
in vec2 vUv;
uniform float uForca;
out vec4 cor;
${RECORTE}
void main() {
    if (fora(vUv)) discard;
    float a = smoothstep(0.002, 0.03, vH) * exp(-vH * 1.3) * uForca;
    cor = vec4(a, a, a, a);
}`;

// as bordas da capa dura: uma faixa em volta da folha, pelo contorno de cantos arredondados (o pé, o canto de baixo, a
// borda da frente, o canto de cima, a cabeça e a lombada, nessa ordem, em aUv.x de 0 a 12: dois por trecho), da face
// de dentro (aUv.y 0) até a de fora (aUv.y 1, a uDesloca dela). O perfil é meia elipse: a grossura da tábua de altura,
// saindo BOJO da meia grossura para fora. A borda fica quase reta, com as quinas redondas, como o pano dobrado por cima
// da tábua, e encosta nas duas faces sem quina (a normal começa na de uma e termina na da outra). A direção para fora
// vem da própria folha deformada (vale com a capa em qualquer ângulo)
const VERT_BORDA = `${DEFORMA}
uniform float uDesloca, uRaio;
const float BOJO = ${BOJO.toFixed(3)};
out vec2 vUv;
out vec3 vN;
void main() {
    float k = floor(aUv.x * 0.5);
    float s = aUv.x - 2.0 * k;
    vec2 L = uTam;
    float R = uRaio;
    // o ponto do contorno nas contas da folha (X da lombada para fora, Y do meio) e a direção para fora dele
    vec2 P;
    vec2 fora;
    if (k < 0.5) { fora = vec2(0.0, -1.0); P = vec2(s * (L.x - R), -0.5 * L.y); }
    else if (k < 1.5) { float a = PI * (0.5 * s - 0.5); fora = vec2(cos(a), sin(a)); P = vec2(L.x - R, R - 0.5 * L.y) + R * fora; }
    else if (k < 2.5) { fora = vec2(1.0, 0.0); P = vec2(L.x, R - 0.5 * L.y + s * (L.y - 2.0 * R)); }
    else if (k < 3.5) { float a = PI * 0.5 * s; fora = vec2(cos(a), sin(a)); P = vec2(L.x - R, 0.5 * L.y - R) + R * fora; }
    else if (k < 4.5) { fora = vec2(0.0, 1.0); P = vec2((1.0 - s) * (L.x - R), 0.5 * L.y); }
    else { fora = vec2(-1.0, 0.0); P = vec2(0.0, (0.5 - s) * L.y); }
    vec2 q = vec2(P.x / L.x, P.y / L.y + 0.5);
    vec3 n;
    vec3 p = deforma(q, n);
    vec3 n2;
    vec3 o = normalize(p - deforma(q - fora / L * 0.01, n2));
    // a normal para o lado da face de fora e a grossura
    vec3 m = n * sign(uDesloca);
    float T = abs(uDesloca);
    float c = cos(PI * aUv.y);
    float sn = sin(PI * aUv.y);
    float B = BOJO * 0.5 * T;
    vN = normalize(o * (0.5 * T * sn) - m * (B * c));
    vUv = q;
    gl_Position = uVP * vec4(p + m * (0.5 * T * (1.0 - c)) + o * (B * sn), 1.0);
}`;

// a borda tem a cor da face de fora junto dela (o pano da capa dura dobra por cima da tábua) e a luz da face (com a
// calha da lombada e a borda da frente um pouco mais escuras, como nela): onde a borda encosta na face, as duas são
// iguais, e ela vai escurecendo conforme vira de lado para a luz
const FRAG_BORDA = `#version 300 es
precision highp float;
in vec2 vUv;
in vec3 vN;
uniform sampler2D uExterna;
uniform float uEspelho;
uniform vec3 uLuz;
out vec4 cor;
void main() {
    vec2 q = clamp(vUv, vec2(0.006), vec2(0.994));
    if (uEspelho > 0.5) q.x = 1.0 - q.x;
    vec3 c = texture(uExterna, q).rgb;
    float l = 0.70 + 0.34 * max(dot(normalize(vN), uLuz), 0.0);
    float u = vUv.x;
    float calha = 1.0 - 0.3 * (0.2 * (1.0 - smoothstep(0.0, 0.05, u)) + 0.07 * (1.0 - smoothstep(0.0, 0.2, u)));
    float borda = 1.0 - 0.07 * (1.0 - smoothstep(0.0, 0.003, 1.0 - u));
    cor = vec4(c * l * calha * borda, 1.0);
}`;

// um retângulo no plano de baixo do livro (a sombra dele)
const VERT_PLANO = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aUv;
uniform mat4 uVP;
uniform vec4 uRet;
uniform float uZp;
out vec2 vUv;
out vec2 vXy;
void main() {
    vUv = aUv;
    vXy = mix(uRet.xy, uRet.zw, aUv);
    gl_Position = uVP * vec4(vXy, uZp, 1.0);
}`;

const FRAG_SOMBRA_LIVRO = `#version 300 es
precision highp float;
in vec2 vXy;
uniform vec4 uLivro;
out vec4 cor;
float caixa(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
void main() {
    vec2 c = (uLivro.xy + uLivro.zw) * 0.5;
    vec2 b = (uLivro.zw - uLivro.xy) * 0.5;
    float d = caixa(vXy - c - vec2(0.035, -0.05), b);
    float perto = caixa(vXy - c - vec2(0.008, -0.012), b);
    // no fundo claro da página: uma sombra curta e leve em volta e a de contato, junto da borda
    float a = 0.16 * (1.0 - smoothstep(-0.04, 0.2, d)) + 0.34 * (1.0 - smoothstep(-0.006, 0.03, perto));
    cor = vec4(0.0, 0.0, 0.0, a);
}`;

// o chão da cena (o plano z = uChao, o da sombra do livro): um pedaço da trama pontilhada dos painéis em volta do livro,
// que some antes da borda. O raio do pixel bate no chão e, lá, vale o desenho da trama do CSS nas unidades do SVG dela
// (células de 29,5, linhas de 1, traços de 2 com vãos de 2,9167; uPasso é uma unidade no chão, do tamanho da trama dos
// painéis com a câmera parada). Como está no chão, a trama se move em perspectiva junto com o livro quando a câmera
// mexe. O pedaço: o retângulo do livro encolhido (uMancha: meio e meia medida), de cantos bem redondos, que some a
// uManchaR dele
const FRAG_TRAMA = `#version 300 es
precision highp float;
uniform vec3 uOlho, uEixoX, uEixoY, uEixoZ;
uniform vec2 uLente, uTelaPx;
uniform float uChao, uPasso;
uniform vec4 uTrama, uMancha;
uniform vec2 uManchaR;
out vec4 cor;
// a cobertura de uma linha de largura 1 a d do centro, num pixel de largura f (filtro de caixa)
float linhaT(float d, float f) { return clamp((min(d + f * 0.5, 0.5) - max(d - f * 0.5, -0.5)) / f, 0.0, 1.0); }
// os traços, centrados em 0,5 + k·P; de longe (o pixel maior que o traço), a média deles
float tracosT(float x, float f) {
    const float P = 29.5 / 6.0;
    float t = mod(x - 0.5 + P * 0.5, P) - P * 0.5;
    float c = clamp((1.0 - abs(t)) / f + 0.5, 0.0, 1.0);
    return mix(c, 2.0 / P, clamp(f * 0.5 - 0.5, 0.0, 1.0));
}
void main() {
    vec2 ndc = gl_FragCoord.xy / uTelaPx * 2.0 - 1.0;
    vec3 d = uEixoX * (ndc.x * uLente.x) + uEixoY * (ndc.y * uLente.y) - uEixoZ;
    vec3 p = uOlho + d * ((uChao - uOlho.z) / d.z);
    vec2 s = vec2(p.x, -p.y) / uPasso;
    vec2 f = max(fwidth(s), vec2(1e-4));
    float dy = abs(mod(s.y + 14.75, 29.5) - 14.75);
    float dx = abs(mod(s.x + 14.75, 29.5) - 14.75);
    float a = max(linhaT(dy, f.y) * tracosT(s.x, f.x), linhaT(dx, f.x) * tracosT(s.y, f.y)) * uTrama.a;
    float m = length(max(abs(p.xy - uMancha.xy) - uMancha.zw, 0.0) / uManchaR);
    a *= 1.0 - smoothstep(0.35, 1.0, m);
    cor = vec4(uTrama.rgb * a, a);
}`;

const VERT_TELA = `#version 300 es
out vec2 vSt;
void main() {
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    vSt = p;
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAG_COPIA = `#version 300 es
precision highp float;
in vec2 vSt;
uniform sampler2D uTex;
out vec4 cor;
void main() { cor = texture(uTex, vSt); }`;

const FRAG_BORRA = `#version 300 es
precision highp float;
in vec2 vSt;
uniform sampler2D uTex;
uniform vec2 uDir;
out vec4 cor;
void main() {
    vec4 c = texture(uTex, vSt) * 0.227027;
    c += (texture(uTex, vSt + uDir * 1.3846154) + texture(uTex, vSt - uDir * 1.3846154)) * 0.3162162;
    c += (texture(uTex, vSt + uDir * 3.2307692) + texture(uTex, vSt - uDir * 3.2307692)) * 0.0702703;
    cor = c;
}`;

const FRAG_ESCURECE = `#version 300 es
precision highp float;
in vec2 vSt;
uniform sampler2D uTex;
out vec4 cor;
void main() { cor = vec4(0.0, 0.0, 0.0, texture(uTex, vSt).r); }`;

const FRAG_FINAL = `#version 300 es
precision highp float;
in vec2 vSt;
uniform sampler2D uTex;
uniform float uTempo;
out vec4 cor;
void main() {
    vec4 t = texture(uTex, vSt);
    cor = vec4(max(t.rgb, 0.0), t.a);
}`;


// ---------- tipos ----------

// destaque: a área clicável sob o mouse (o sumário acende a linha dela); −1 sem nenhuma
type Face = { pagina: Pagina; num?: number; tex: WebGLTexture | null; nivel: number; alvos: Alvo[]; destaque: number; transparente: boolean; escura: boolean };
// a dobra livre (nas contas da folha: X da lombada para dentro, Y do meio): o vértice do cone (a), a linha da dobra que
// sai dele para dentro da folha (t), a normal dela para o lado que vira (n), o seno do meio-ângulo do cone (sb; 0 é a
// dobra vincada), a altura extra da parte virada (e, para passar por cima da outra pilha) e o lado em que a folha está
// deitada (+1 direita, −1 esquerda)
type Vinco = { ax: number; ay: number; tx: number; ty: number; nx: number; ny: number; sb: number; e: number; lado: 1 | -1 };
type Ponto2 = [number, number];
// a folha solta (do arrasto, ou virada a partir do canto levantado): o ponto g da dobra segue de onde estava (de) até
// o fim (para): o espelho dele do outro lado da lombada (a página vira) ou ele mesmo (a dobra encolhe até sumir), com
// o rolo limitado a raio
type Livre = { g: Ponto2; de: Ponto2; para: Ponto2; lado: 1 | -1; completa: boolean; raio: number };
type Anim = { de: number; para: number; t0: number; dur: number; dir: number; curl0: number; twist0: number; grabV: number; saida: boolean; livre?: Livre };
type Sheet = {
    i: number;
    frente: Face;
    verso: Face;
    rigida: boolean;
    vegetal: boolean;
    tinta: [number, number, number];
    lado: 0 | 1;
    phi: number;
    curl: number;
    twist: number;
    grabV: number;
    dobra: number;
    larg: number;
    inclina: number;
    zt: number;
    anim: Anim | null;
    vinco: Vinco | null;
};
type Cam = { cx: number; cy: number; zoom: number };

// o que a página mostra embaixo do livro: as páginas abertas e se dá para ir e voltar
export type Estado = { rotulo: string; inicio: boolean; fim: boolean };
export type Opcoes = { aoPronto: () => void; aoInteragir: () => void; aoMudar: (e: Estado) => void };
export type Controle = { parar: () => void; virar: (d: number) => void; ativar: (sim: boolean) => void };

const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const saida = (p: number) => 1 - Math.pow(1 - p, 3);
const lim = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const suave = (a: number, b: number, v: number) => {
    const t = lim((v - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
};

export async function iniciarLivro(cv: HTMLCanvasElement, o: Opcoes, sinal: AbortSignal): Promise<Controle | null> {
    const fam = familiasDe(cv);
    // as cores da paleta da página (o canvas precisa da cor de verdade)
    lerCores(cv);
    await carregarFontes(fam);
    if (sinal.aborted) return null;
    const gl = cv.getContext('webgl2', { antialias: false, alpha: true, depth: false, premultipliedAlpha: true, powerPreference: 'high-performance' });
    if (!gl) throw new Error('sem WebGL2');
    return montar(gl, cv, fam, o);
}

function montar(gl: WebGL2RenderingContext, cv: HTMLCanvasElement, fam: Familias, o: Opcoes): Controle {
    const defs = montarFolhas();
    const N = defs.length;

    const pFolha = programa(gl, VERT_FOLHA, fragFolha(false));
    const pFolhaDobrada = programa(gl, VERT_FOLHA, fragFolha(true));
    const pVegetal = programa(gl, VERT_FOLHA, fragVegetal(false));
    const pVegetalDobrado = programa(gl, VERT_FOLHA, fragVegetal(true));
    const pSombra = programa(gl, VERT_SOMBRA, FRAG_SOMBRA);
    const pSombraLivro = programa(gl, VERT_PLANO, FRAG_SOMBRA_LIVRO);
    const pTrama = programa(gl, VERT_TELA, FRAG_TRAMA);
    const pCopia = programa(gl, VERT_TELA, FRAG_COPIA);
    const pBorra = programa(gl, VERT_TELA, FRAG_BORRA);
    const pEscurece = programa(gl, VERT_TELA, FRAG_ESCURECE);
    const pFinal = programa(gl, VERT_TELA, FRAG_FINAL);
    const pBorda = programa(gl, VERT_BORDA, FRAG_BORDA);
    const pCapa = programa(gl, VERT_FOLHA, fragFolha(false, true));
    const mFolha = malha(gl, 64, 32);
    // o cone da folha dobrada pelo ponteiro: uma coluna por geratriz (as do meio) e as duas faixas dos lados; cada coluna
    // vai de borda a borda da folha (o shader acha as pontas), então uma linha de quadrados basta
    const mCone = malha(gl, N_CONE, 1);
    const mPlano = malha(gl, 1, 1);
    // as bordas da capa dura: os seis trechos do contorno (os retos em 4 pedaços, os cantos em 12), cada um com os
    // vértices só dele, e o meio círculo do perfil em 8
    const mBorda = (() => {
        const PEDACOS = [4, 12, 4, 12, 4, 4];
        const M = 8;
        const uv: number[] = [];
        const idx: number[] = [];
        PEDACOS.forEach((P, k) => {
            const base = uv.length / 2;
            for (let i = 0; i <= P; i++) for (let j = 0; j <= M; j++) uv.push(2 * k + i / P, j / M);
            for (let i = 0; i < P; i++)
                for (let j = 0; j < M; j++) {
                    const a = base + i * (M + 1) + j;
                    const b = a + M + 1;
                    idx.push(a, b, a + 1, b, b + 1, a + 1);
                }
        });
        const vao = gl.createVertexArray()!;
        gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
        gl.bindVertexArray(null);
        return { vao, n: idx.length };
    })();
    const vazio = gl.createVertexArray();
    const aniso = gl.getExtension('EXT_texture_filter_anisotropic');

    // ---------- texturas ----------
    const cor1 = (r: number, g: number, b: number, a = 255) => {
        const t = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([r, g, b, a]));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        return t;
    };
    const texPapel = cor1(236, 235, 231);
    const texEscura = cor1(38, 35, 31);
    const texVazia = cor1(0, 0, 0, 0);

    function enviar(tex: WebGLTexture | null, fonte: TexImageSource, premult: boolean, mip: boolean) {
        const t = tex ?? gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premult);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fonte);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        if (mip) {
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
        } else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        return t;
    }

    // o fundo da página, para o papel vegetal que passa por cima do vazio
    const fundo = (() => {
        const el = document.createElement('i');
        el.style.color = 'var(--fundo)';
        (cv.parentElement ?? document.body).appendChild(el);
        const m = getComputedStyle(el).color.match(/[\d.]+/g)?.map(Number) ?? [248, 248, 248];
        el.remove();
        return [m[0] / 255, m[1] / 255, m[2] / 255];
    })();
    // a cor das linhas da trama dos painéis (o traço do SVG em --trama: cinza, ou preto com opacidade nas faixas)
    const corTrama = (() => {
        const t = getComputedStyle(cv).getPropertyValue('--trama');
        const hex = /stroke='%23([0-9a-f]{3,6})'/i.exec(t)?.[1] ?? 'c4c4c4';
        const h = hex.length === 3 ? [...hex].map(c => c + c).join('') : hex;
        const op = Number(/stroke-opacity='([\d.]+)'/.exec(t)?.[1] ?? 1);
        return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255).concat(op);
    })();

    // ---------- as folhas ----------
    const face = (p: Pagina, num?: number): Face => ({
        pagina: p,
        num,
        tex: null,
        nivel: 0,
        alvos: [],
        destaque: -1,
        transparente: p.tipo === 'vegetal',
        escura: p.tipo === 'capa' || p.tipo === 'contracapa' || p.tipo === 'guarda',
    });
    const folhas: Sheet[] = defs.map((d, i) => {
        const vegetal = d.tipo === 'vegetal';
        const frente = face(d.frente, d.numFrente);
        const verso = vegetal ? frente : face(d.verso, d.numVerso);
        const tinta = (vegetal && tintaDoVegetal(d.frente)) || [246, 245, 241];
        return { i, frente, verso, rigida: d.tipo === 'capa' || d.tipo === 'contracapa', vegetal, tinta, lado: 0, phi: 0, curl: 0, twist: 0, grabV: 0.5, dobra: 0, larg: 1, inclina: 0, zt: 0, anim: null, vinco: null };
    });
    const faces = Array.from(new Set(folhas.flatMap(f => [f.frente, f.verso])));
    const TOTAL = defs.filter(d => d.tipo === 'papel').length * 2;

    const telas: Record<number, HTMLCanvasElement> = {};
    function renderizar(fc: Face, nivel: number) {
        const larg = NIVEIS[nivel];
        let tela = telas[larg];
        if (!tela) {
            tela = telas[larg] = document.createElement('canvas');
            tela.width = larg;
            tela.height = larg * 1.5;
        }
        const g = tela.getContext('2d')!;
        g.clearRect(0, 0, tela.width, tela.height);
        fc.alvos = desenharPagina(pincelCanvas(g, larg / 1000, fam), fc.pagina, fc.num, fc.destaque);
        fc.tex = enviar(fc.tex, tela, fc.transparente, true);
        fc.nivel = nivel;
    }
    const texDe = (fc: Face) => fc.tex ?? (fc.transparente ? texVazia : fc.escura ? texEscura : texPapel);

    // ---------- estado ----------
    let alvoContagem = 0;
    let ultimoLanc = -1;
    let agora = 0;
    const contagem = () => folhas.reduce((n, f) => n + f.lado, 0);
    const emMovimento = (f: Sheet) => !!f.anim || arrasto?.i === f.i || (peel.i === f.i && peel.e > 0.004);

    // o arrasto: a folha, o lado em que ela está deitada, onde o dedo apertou (na tela e, nas contas da folha, o ponto
    // pego g), o ponteiro agora (na tela), a altura em que o ponto pego ficou no quadro anterior (de onde a conta do
    // ponteiro parte), o histórico do ponto pego (para a velocidade ao soltar) e, se a folha já estava levantada pelo
    // cursor, a dobra de onde o arrasto parte (para a passagem não pular)
    let arrasto: {
        id: number;
        i: number;
        dir: number;
        x0: number;
        y0: number;
        phi0: number;
        grabV: number;
        hist: { t: number; x: number }[];
        g: Ponto2;
        c: Ponto2 | null;
        px: number;
        py: number;
        alt: number;
        t0: number;
        desde: { g: Ponto2; c: Ponto2 } | null;
        gD: Ponto2 | null;
        cD: Ponto2 | null;
    } | null = null;
    // a página que levanta com o cursor perto da borda: nas folhas de papel, o canto mais perto dobra na direção do
    // cursor (cx, cy: o cursor nas contas da folha); nas capas, a folha toda levanta um pouco
    const peel = { i: -1, lado: 0 as 0 | 1, e: 0, alvo: 0, grabV: 0.5, proximo: -1 as number, proximoLado: 0 as 0 | 1, cx: 0, cy: 0, pcx: 0, pcy: 0, g: [0, 0] as Ponto2, c: [0, 0] as Ponto2 };

    // ---------- a dobra livre ----------
    const RAIO = 0.065; // o raio do rolo do papel, em larguras da folha
    const S1: Ponto2 = [0, H / 2];
    const S2: Ponto2 = [0, -H / 2];
    // o papel não estica: preso na lombada, o ponto pego não pode ficar mais longe das pontas da lombada do que estava.
    // O lugar possível é o encontro de dois círculos (as duas bordas se cruzam no ponto pego e no espelho dele); fora
    // dele, vale o ponto mais perto: num dos dois arcos ou numa das duas pontas. (Projeções alternadas não chegavam lá
    // com o lugar estreito, perto da lombada, e a ponta da lombada acabava do lado que vira)
    function restringir(g: Ponto2, c: Ponto2): Ponto2 {
        const r1 = Math.hypot(g[0] - S1[0], g[1] - S1[1]);
        const r2 = Math.hypot(g[0] - S2[0], g[1] - S2[1]);
        const dentro = (p: Ponto2, s: Ponto2, r: number) => Math.hypot(p[0] - s[0], p[1] - s[1]) <= r + 1e-9;
        if (dentro(c, S1, r1) && dentro(c, S2, r2)) return c;
        const opcoes: Ponto2[] = [g, [-g[0], g[1]]];
        for (const [s, r, so, ro] of [
            [S1, r1, S2, r2],
            [S2, r2, S1, r1],
        ] as const) {
            const d = Math.hypot(c[0] - s[0], c[1] - s[1]);
            if (d <= r || d < 1e-9) continue;
            const p: Ponto2 = [s[0] + ((c[0] - s[0]) * r) / d, s[1] + ((c[1] - s[1]) * r) / d];
            if (dentro(p, so, ro)) opcoes.push(p);
        }
        let melhor = opcoes[0];
        let dm = Infinity;
        for (const p of opcoes) {
            const d = Math.hypot(p[0] - c[0], p[1] - c[1]);
            if (d < dm) {
                dm = d;
                melhor = p;
            }
        }
        return melhor;
    }
    // a dobra que leva o ponto pego g até c (já possível). O espelho é a mediatriz entre os dois: o que passa da dobra
    // deita por cima, girado nela, e g cai em c. O papel preso na lombada não enrola num rolo igual: enrola num cone com
    // o vértice onde a mediatriz cruza a linha da lombada (fora da folha, ou numa ponta dela quando a folha é puxada até
    // o limite), o rolo afinando rumo à lombada. Quase paralela à lombada, o vértice fica longe e o cone é um rolo. A
    // linha da dobra (onde o cone começa) é a mediatriz girada no vértice, para o lado de c, pela metade do ângulo que o
    // cone ocupa na folha; no pé do ponto pego o raio é o do rolo (menor nos puxões curtos), e o cone nunca chega à
    // lombada (fica com no máximo 90% do ângulo entre a mediatriz e ela). raio limita o rolo (a dobra que se desfaz
    // depois de solta guarda o rolo de quando foi solta)
    const A_LONGE = 40;
    function vincoEntre(g: Ponto2, c: Ponto2, lado: 1 | -1, acima: number, raio = RAIO): Vinco | null {
        const dx = g[0] - c[0];
        const dy = g[1] - c[1];
        const L = Math.hypot(dx, dy);
        if (L < 1e-4) return null;
        const nx = dx / L;
        const ny = dy / L;
        // o pé de g na mediatriz (o meio entre g e c) e a direção dela
        const qx = (g[0] + c[0]) / 2;
        const qy = (g[1] + c[1]) / 2;
        const ux = -ny;
        const uy = nx;
        const t = Math.abs(ux) * A_LONGE > Math.abs(qx) ? -qx / ux : qx * ux > 0 ? -A_LONGE : A_LONGE;
        const ax = qx + t * ux;
        const ay = qy + t * uy;
        // a mediatriz saindo do vértice para dentro da folha (rumo ao pé de g)
        const sg = t > 0 ? -1 : 1;
        const tmx = sg * ux;
        const tmy = sg * uy;
        // o ângulo, no vértice, entre a mediatriz e cada ponta da lombada (do lado de c; com o vértice na ponta, a
        // lombada sai dela rumo à outra ponta)
        const angulo = (s: Ponto2) => {
            let ex = s[0] - ax;
            let ey = s[1] - ay;
            if (Math.hypot(ex, ey) < 1e-6) {
                ex = 0;
                ey = -Math.sign(s[1]);
            }
            return Math.atan2(-(ex * nx + ey * ny), ex * tmx + ey * tmy);
        };
        const gama = Math.min(angulo(S1), angulo(S2));
        const r = Math.min(raio, L / 4);
        const sb = Math.abs(t) < 1e-3 ? 0 : lim(Math.min(r / Math.abs(t), (2 * 0.9 * gama) / PI), 0, 0.2);
        const meio = (PI * sb) / 2;
        const cm = Math.cos(meio);
        const sm = Math.sin(meio);
        return { ax, ay, tx: cm * tmx - sm * nx, ty: cm * tmy - sm * ny, nx: sm * tmx + cm * nx, ny: sm * tmy + cm * ny, sb, e: acima, lado };
    }
    // o ponto da folha mais longe na direção n (a que vai da ponta do puxão até o ponto pego): o último a desdobrar e o
    // primeiro a dobrar. Com n quase de lado, a borda inteira empata e vale o ponto dela na altura de g (sem pulo de um
    // canto ao outro). A dobra que leva esse ponto pelo mesmo puxão começa na borda e cresce a partir dela
    function pontaAlem(g: Ponto2, nx: number, ny: number): Ponto2 {
        const k = suave(0, 0.05, Math.abs(ny));
        return [W, g[1] + (Math.sign(ny) * (H / 2) - g[1]) * k];
    }
    // a dobra que se desfaz: a mesma dobra, levada pelo ponto mais longe do lado que vira (e o espelho dele), para
    // encolher até sumir naquele ponto, com o rolo de agora
    function desfazer(vc: Vinco, g: Ponto2, c: Ponto2): { g: Ponto2; de: Ponto2; raio: number } {
        const L = Math.hypot(g[0] - c[0], g[1] - c[1]);
        const nx = (g[0] - c[0]) / L;
        const ny = (g[1] - c[1]) / L;
        const p = pontaAlem(g, nx, ny);
        const qx = (g[0] + c[0]) / 2;
        const qy = (g[1] + c[1]) / 2;
        const s = 2 * ((p[0] - qx) * nx + (p[1] - qy) * ny);
        const de: Ponto2 = [p[0] - nx * s, p[1] - ny * s];
        // o raio que mantém o mesmo cone no pé novo (o meio entre p e o espelho dele, na mesma mediatriz)
        const pe: Ponto2 = [(p[0] + de[0]) / 2, (p[1] + de[1]) / 2];
        const raio = vc.sb * Math.hypot(pe[0] - vc.ax, pe[1] - vc.ay);
        return { g: p, de, raio };
    }
    // o ponto da folha sob o ponteiro na parte virada de uma dobra (a aba do canto levantado), ou null fora dela: a conta
    // da parte virada desfeita, na altura em que a aba está
    function naAba(vc: Vinco, px: number, py: number, f: Sheet, lado: 1 | -1): { p: Ponto2; alt: number } | null {
        const sb = vc.sb;
        const al = PI * sb;
        const c2 = 1 - 2 * sb * sb;
        const s2 = 2 * sb * Math.sqrt(Math.max(0, 1 - sb * sb));
        let alt = vc.e;
        let p: Ponto2 | null = null;
        for (let k = 0; k < 3; k++) {
            const X = noPapel(px, py, f, lado, alt);
            const rc = ((X[0] - vc.ax) * vc.tx + (X[1] - vc.ay) * vc.ty) / c2;
            const rs = -((X[0] - vc.ax) * vc.nx + (X[1] - vc.ay) * vc.ny);
            if (rs < 0) return null;
            const dT = rc * Math.cos(al) - rs * Math.sin(al);
            const dN = rc * Math.sin(al) + rs * Math.cos(al);
            p = [vc.ax + dT * vc.tx + dN * vc.nx, vc.ay + dT * vc.ty + dN * vc.ny];
            alt = rc * s2 + vc.e;
        }
        if (!p || p[0] < 0 || p[0] > W || Math.abs(p[1]) > H / 2) return null;
        return { p, alt };
    }
    // o ponto P da folha depois da dobra: nas contas da folha, com a altura sobre ela (a mesma conta do shader)
    function imagem(vc: Vinco, P: Ponto2): [number, number, number] {
        const dx = P[0] - vc.ax;
        const dy = P[1] - vc.ay;
        const dT = dx * vc.tx + dy * vc.ty;
        const dN = dx * vc.nx + dy * vc.ny;
        if (dN <= 0) return [P[0], P[1], 0];
        const sb = vc.sb;
        const cb = Math.sqrt(Math.max(0, 1 - sb * sb));
        const al = PI * sb;
        const rc = dT * Math.cos(al) + dN * Math.sin(al);
        const rs = dN * Math.cos(al) - dT * Math.sin(al);
        if (rs >= 0) {
            const c2 = 1 - 2 * sb * sb;
            return [vc.ax + vc.tx * rc * c2 - vc.nx * rs, vc.ay + vc.ty * rc * c2 - vc.ny * rs, rc * 2 * sb * cb + vc.e];
        }
        const rho = Math.hypot(dT, dN);
        const psi = Math.atan2(dN, dT) / sb;
        const cp = Math.cos(psi);
        const gT = cb * cb + sb * sb * cp;
        const gN = sb * Math.sin(psi);
        const sobe = psi <= PI / 2 ? 0.5 - 0.5 * Math.cos(2 * psi) : 1;
        return [vc.ax + rho * (gT * vc.tx + gN * vc.nx), vc.ay + rho * (gT * vc.ty + gN * vc.ny), rho * sb * cb * (1 - cp) + vc.e * sobe];
    }
    // a altura extra da parte virada: acima da outra pilha (a folha pode estar mais baixa que ela) e, mesmo com o cone
    // sumindo (a dobra junto da lombada), uma folga mínima sobre a parte deitada da própria folha, para as duas não
    // brigarem pelo mesmo pixel. No fim da virada (fim de 0 a 1) a folga some: a folha pousa na outra pilha sem degrau
    const FOLGA_VIRADA = 4 * ESP;
    function acimaDe(f: Sheet, lado: 1 | -1, tp: { d: number; e: number }, fim = 0) {
        const outra = lado > 0 ? tp.e : tp.d;
        return Math.max(FOLGA_VIRADA * (1 - fim), outra + ESP - (zBase(f) + ESP * 0.5));
    }
    // o ponteiro nas contas da folha, no plano em que o ponto pego está (a parte virada fica acima da folha deitada)
    function noPapel(px: number, py: number, f: Sheet, lado: 1 | -1, altura: number): Ponto2 {
        const [x, y] = noPlano(px, py, zBase(f) + ESP * 0.5 + altura);
        return [lado * x, y];
    }

    function lancar(f: Sheet, para: 0 | 1, rapido: boolean, sai = false) {
        // a folha de papel com o canto levantado pelo cursor vira a partir dele: a dobra do canto segue até o espelho
        // do canto do outro lado (sem voltar plana antes de virar)
        if (!f.rigida && f.vinco && peel.i === f.i && para !== f.lado) {
            const lado: 1 | -1 = f.lado ? -1 : 1;
            const alvo: Ponto2 = [-peel.g[0], peel.g[1]];
            const dist = Math.hypot(alvo[0] - peel.c[0], alvo[1] - peel.c[1]);
            f.anim = {
                de: 0,
                para: 0,
                t0: agora,
                dur: (rapido ? 0.7 : 1) * (0.3 + 0.3 * Math.min(1, dist / 1.4)),
                dir: lado,
                curl0: 0,
                twist0: 0,
                grabV: f.grabV,
                saida: true,
                livre: { g: peel.g, de: peel.c, para: alvo, lado, completa: true, raio: RAIO },
            };
            f.lado = para;
            return;
        }
        const alvoPhi = para ? PI : 0;
        const dist = Math.abs(alvoPhi - f.phi) / PI;
        const canto = (f.i % 2 === 0) !== (para === 0);
        f.anim = {
            de: f.phi,
            para: alvoPhi,
            t0: agora,
            dur: (rapido ? 0.5 : 0.8) * (sai ? 0.35 + 0.65 * dist : 0.5 + 0.5 * dist),
            dir: para ? 1 : -1,
            curl0: f.curl,
            twist0: f.twist,
            grabV: canto ? 0.92 : 0.08,
            saida: sai,
        };
        f.lado = para;
    }

    function poses(dt: number) {
        // a fila de viradas: uma folha por vez, com intervalo (curto quando o salto é grande)
        const c = contagem();
        const falta = Math.abs(alvoContagem - c);
        const rapido = falta > 1;
        // (espera a folha solta do arrasto pousar: outra virada por cima dela a faria pular)
        if (falta && !arrasto && !folhas.some(f => f.anim?.livre) && agora - ultimoLanc >= (rapido ? 0.085 : 0.12)) {
            if (alvoContagem > c && c < N) lancar(folhas[c], 1, rapido);
            else if (alvoContagem < c && c > 0) lancar(folhas[c - 1], 0, rapido);
            ultimoLanc = agora;
        }
        // a página que levanta com o cursor perto da borda (só a de cima da pilha, e parada: virou, solta)
        const topo = peel.lado ? c - 1 : c;
        if (peel.i >= 0 && (peel.i !== topo || folhas.some(f => f.anim))) {
            peel.e = 0;
            peel.i = -1;
            peel.proximo = -1;
        }
        const k = 1 - Math.exp(-dt * 11);
        if (peel.proximo !== peel.i) {
            peel.e += (0 - peel.e) * k;
            if (peel.e < 0.004 || peel.i < 0) {
                peel.i = peel.proximo;
                peel.lado = peel.proximoLado;
                peel.cx = peel.pcx;
                peel.cy = peel.pcy;
                peel.e = 0;
            }
        } else peel.e += (peel.alvo - peel.e) * k;

        for (const f of folhas) {
            f.dobra = 0;
            f.larg = 1;
            f.inclina = 0;
            if (f.anim?.livre) {
                // a folha solta depois do arrasto: deitada no lado de onde saiu, com a dobra (em dobras)
                f.phi = f.anim.livre.lado > 0 ? 0 : PI;
                f.curl = 0;
                f.twist = 0;
                continue;
            }
            if (f.anim) {
                const a = f.anim;
                const p = lim((agora - a.t0) / a.dur, 0, 1);
                const e = a.saida ? saida(p) : ease(p);
                const env = Math.sin(PI * p);
                f.phi = a.de + (a.para - a.de) * e;
                f.grabV = a.grabV;
                if (f.rigida) {
                    f.curl = 0;
                    f.twist = 0;
                } else {
                    // a borda vem atrasada (o ar segura a folha) e um canto lidera
                    f.curl = a.curl0 * (1 - e) - a.dir * 0.95 * env;
                    f.twist = a.twist0 * (1 - e) + a.dir * 0.42 * env * (2 * a.grabV - 1);
                }
                if (p >= 1) {
                    f.anim = null;
                    f.phi = a.para;
                    f.curl = 0;
                    f.twist = 0;
                }
            } else if (arrasto?.i === f.i) {
                // a capa: a pose vem do ponteiro (em mover); o papel: deitado, com a dobra (em dobras)
                if (!f.rigida) {
                    f.phi = arrasto.phi0;
                    f.curl = 0;
                    f.twist = 0;
                }
            } else if (peel.i === f.i && peel.e > 0.0005) {
                const e = peel.e;
                f.grabV = peel.grabV;
                if (f.rigida) {
                    f.phi = f.lado ? PI - 0.12 * e : 0.12 * e;
                } else f.phi = f.lado ? PI : 0;
                f.curl = 0;
                f.twist = 0;
            } else {
                f.phi = f.lado ? PI : 0;
                f.curl = 0;
                f.twist = 0;
            }
        }
    }

    // a dobra livre de cada folha de papel, depois da câmera do quadro (o ponto pego cai sob o ponteiro com a vista que
    // vai ser desenhada): a puxada pelo ponteiro, a que foi solta (até virar ou desdobrar) e o canto que levanta com o
    // cursor perto da borda. As outras ficam sem dobra
    function dobras() {
        const tp = topos();
        for (const f of folhas) {
            const solta = f.anim?.livre;
            if (solta) {
                const a = f.anim!;
                const p = lim((agora - a.t0) / a.dur, 0, 1);
                const e = saida(p);
                const c: Ponto2 = [solta.de[0] + (solta.para[0] - solta.de[0]) * e, solta.de[1] + (solta.para[1] - solta.de[1]) * e];
                // virando, no fim a folha passa para a altura da pilha do outro lado
                if (solta.completa) f.zt = solta.lado > 0 ? suave(0.45, 1, p) : 1 - suave(0.45, 1, p);
                f.vinco = vincoEntre(solta.g, c, solta.lado, acimaDe(f, solta.lado, tp, solta.completa ? suave(0.8, 1, p) : 0), solta.raio);
                if (p >= 1) {
                    f.anim = null;
                    f.vinco = null;
                    f.phi = f.lado ? PI : 0;
                    f.zt = f.lado;
                }
                continue;
            }
            if (arrasto?.i === f.i && !f.rigida) {
                const lado: 1 | -1 = arrasto.dir > 0 ? 1 : -1;
                const acima = acimaDe(f, lado, tp);
                // o ponto pego cai sob o ponteiro: o alvo da dobra (c) é corrigido até a imagem do ponto pego ficar no
                // raio do ponteiro, na altura em que ela está (a parte virada sobe com o cone e se inclina com ele, e a
                // altura depende da dobra). A conta parte da altura do quadro anterior, e poucas voltas bastam. Longe
                // demais, o papel estica até o limite e para
                let c = restringir(arrasto.g, noPapel(arrasto.px, arrasto.py, f, lado, arrasto.alt));
                for (let k = 0; k < 4; k++) {
                    const vk = vincoEntre(arrasto.g, c, lado, acima);
                    if (!vk) break;
                    const [ix, iy, iz] = imagem(vk, arrasto.g);
                    const [rx, ry] = noPapel(arrasto.px, arrasto.py, f, lado, iz);
                    c = restringir(arrasto.g, [c[0] + rx - ix, c[1] + ry - iy]);
                    arrasto.alt = iz;
                }
                arrasto.c = c;
                arrasto.hist.push({ t: agora, x: c[0] });
                while (arrasto.hist.length > 2 && agora - arrasto.hist[0].t > 0.1) arrasto.hist.shift();
                let g = arrasto.g;
                // a dobra nasce na borda: num puxão curto, o que dobra é o ponto da folha mais longe na direção oposta
                // ao ponteiro, levado pelo mesmo puxão (uma ponta pequena), e ele vem até o ponto pego conforme o puxão
                // cresce. Levando o próprio ponto pego desde o primeiro pixel, virava de uma vez tudo o que fica além
                // dele (meia página, pegando no miolo). Pegando na borda, os dois são o mesmo ponto
                const dx = g[0] - c[0];
                const dy = g[1] - c[1];
                const puxado = Math.hypot(dx, dy);
                const w = suave(0, 0.12, puxado);
                if (puxado > 1e-6 && w < 1) {
                    const b = pontaAlem(g, dx / puxado, dy / puxado);
                    g = [b[0] + (g[0] - b[0]) * w, b[1] + (g[1] - b[1]) * w];
                    c = restringir(g, [g[0] - dx, g[1] - dy]);
                }
                // saindo do canto levantado pelo cursor, a dobra dele passa para a do arrasto aos poucos (sem pulo)
                if (arrasto.desde) {
                    const e = saida(lim((agora - arrasto.t0) / 0.14, 0, 1));
                    const d = arrasto.desde;
                    g = [d.g[0] + (g[0] - d.g[0]) * e, d.g[1] + (g[1] - d.g[1]) * e];
                    // a mistura de duas dobras possíveis pode passar do limite do papel (o limite muda com g)
                    c = restringir(g, [d.c[0] + (c[0] - d.c[0]) * e, d.c[1] + (c[1] - d.c[1]) * e]);
                    if (e >= 1) arrasto.desde = null;
                }
                // a dobra desenhada (a soltura parte dela)
                arrasto.gD = g;
                arrasto.cD = c;
                f.vinco = vincoEntre(g, c, lado, acima);
                continue;
            }
            if (peel.i === f.i && peel.e > 0.0005 && !f.rigida && !f.anim) {
                // o canto mais perto do cursor dobra na diagonal, para dentro da folha (a dobra corta as duas bordas do
                // canto); quanto mais perto o cursor, mais ele levanta, e longe do canto nada
                const lado: 1 | -1 = f.lado ? -1 : 1;
                f.zt = f.lado;
                const g: Ponto2 = [W, peel.cy >= 0 ? H / 2 : -H / 2];
                const d = Math.hypot(peel.cx - g[0], peel.cy - g[1]);
                const passo = 0.13 * peel.e * (1 - suave(0.15, 0.55, d));
                const c = restringir(g, [g[0] - 0.7071 * passo, g[1] - Math.sign(g[1]) * 0.7071 * passo]);
                peel.g = g;
                peel.c = c;
                f.vinco = vincoEntre(g, c, lado, acimaDe(f, lado, tp));
                continue;
            }
            f.vinco = null;
        }
    }

    // as pilhas começam em cima da tábua da capa de baixo (a de fora dela fica no zero)
    const zDireita = (i: number) => (N - 1 - i) * ESP + GROSSO;
    const zEsquerda = (i: number) => i * ESP + GROSSO;
    const zBase = (f: Sheet) => {
        const t = f.anim?.livre || f.vinco || (arrasto?.i === f.i && !f.rigida) ? f.zt : lim(f.phi / PI, 0, 1);
        return zDireita(f.i) + (zEsquerda(f.i) - zDireita(f.i)) * t;
    };
    function topos() {
        let d = 0;
        let e = 0;
        for (const f of folhas) {
            if (emMovimento(f)) continue;
            if (f.lado === 0) d = Math.max(d, zDireita(f.i));
            else e = Math.max(e, zEsquerda(f.i));
        }
        return { d, e };
    }

    // ---------- câmera ----------
    // o livro já está no lugar quando a seção chega (sem entrada: nem de longe, nem acendendo)
    const cam: Cam = { cx: 0.5, cy: 0, zoom: 1 };
    const camAlvo: Cam = { cx: 0.5, cy: 0, zoom: 1 };
    // lendo um texto aproximado pelo clique (ver lerDePerto)
    let lendo = false;
    // o ponteiro sobre o livro (ponteiros.ts: a lupa desenhada no traço da fonte e, no resto, os do sistema); guarda
    // qual está, para só trocar quando muda
    let ponteiroAtual: Ponteiro = 'default';
    function ponteiro(p: Ponteiro) {
        if (p === ponteiroAtual) return;
        ponteiroAtual = p;
        cv.style.cursor = PONTEIROS[p];
    }
    const mouse = { x: 0, y: 0, sx: 0, sy: 0, dentro: false };
    let largCss = 1;
    let altCss = 1;

    const distanciaBase = () => {
        const asp = largCss / altCss;
        const t = Math.tan(FOV / 2);
        // o livro tem o tamanho de quando morava no painel (86% da altura da área, 885), num canvas que passa 100 para
        // cima e para baixo dela (1085): a trama e a sombra somem nesse vão. Aberto, no máximo 84% da largura (no
        // celular), para sobrar chão dos lados
        return Math.max(H / ((0.86 * 885) / 1085) / 2 / t, (2 * W) / 0.84 / 2 / (t * asp));
    };
    const centroDoLivro = () => 0.5 * (1 - lim(folhas[0].phi / PI, 0, 1)) - 0.5 * lim(folhas[N - 1].phi / PI, 0, 1);

    type Vista = { olho: number[]; eixoX: number[]; eixoY: number[]; eixoZ: number[]; vp: Float32Array; dist: number };
    function vista(c: Cam, m: { sx: number; sy: number } = mouse): Vista {
        const dist = distanciaBase() / c.zoom;
        const perto = suave(1.1, 2.2, c.zoom);
        const t = Math.tan(FOV / 2);
        const meiaA = dist * t;
        const meiaL = meiaA * (largCss / altCss);
        // de perto, a câmera segue o cursor (lendo um texto aproximado, só um pouco, para ele ficar parado); de longe,
        // o cursor só inclina um pouco a vista
        const segue = lendo ? 0.1 : 0.3;
        const ox = m.sx * segue * meiaL * perto;
        const oy = m.sy * segue * meiaA * perto;
        const px = m.sx * 0.07 * (1 - perto);
        const py = m.sy * 0.05 * (1 - perto);
        const alvo = [c.cx + ox, c.cy + oy, 0.01];
        const olho = [alvo[0] + px, alvo[1] + py - dist * 0.04, dist];
        const v = olhar(olho, alvo, [0, 1, 0]);
        const p = perspectiva(FOV, largCss / altCss, 0.02, 60);
        const eixoZ = norm([olho[0] - alvo[0], olho[1] - alvo[1], olho[2] - alvo[2]]);
        const eixoX = norm(cruz([0, 1, 0], eixoZ));
        const eixoY = cruz(eixoZ, eixoX);
        return { olho, eixoX, eixoY, eixoZ, vp: mult(p, v), dist };
    }
    let v = vista(cam);
    // a trama do chão: uma unidade do SVG dela no chão, para a célula ter na tela, com a câmera parada no livro aberto, o
    // tamanho da trama dos painéis (o background-size da seção)
    let passoTrama = 0.002;
    function medirTrama() {
        const celula = parseFloat(getComputedStyle(cv.parentElement ?? cv).backgroundSize) || 29.5;
        const parada = vista({ cx: 0, cy: 0, zoom: 1 }, { sx: 0, sy: 0 });
        const a = noPlano(largCss / 2, altCss / 2, CHAO, parada);
        const b = noPlano(largCss / 2 + celula, altCss / 2, CHAO, parada);
        passoTrama = Math.abs(b[0] - a[0]) / 29.5;
    }

    function noPlano(px: number, py: number, z: number, vv = v) {
        const nx = (px / largCss) * 2 - 1;
        const ny = 1 - (py / altCss) * 2;
        const t = Math.tan(FOV / 2);
        const dc = [nx * t * (largCss / altCss), ny * t, -1];
        const d = [0, 1, 2].map(k => vv.eixoX[k] * dc[0] + vv.eixoY[k] * dc[1] + vv.eixoZ[k] * dc[2]);
        const s = (z - vv.olho[2]) / d[2];
        return [vv.olho[0] + d[0] * s, vv.olho[1] + d[1] * s];
    }

    function zoomPara(z: number, px: number, py: number) {
        lendo = false;
        const z1 = lim(z, 0.8, 4.5);
        const [x, y] = noPlano(px, py, 0.02);
        const z0 = camAlvo.zoom;
        camAlvo.cx = x + (camAlvo.cx - x) * (z0 / z1);
        camAlvo.cy = y + (camAlvo.cy - y) * (z0 / z1);
        camAlvo.zoom = z1;
        prender();
        // de perto, um dedo passeia pela página em vez de rolar a página
        cv.style.touchAction = z1 > 1.1 ? 'none' : 'pan-y';
        o.aoInteragir();
    }
    function prender() {
        camAlvo.cx = lim(camAlvo.cx, -W, W);
        camAlvo.cy = lim(camAlvo.cy, -H / 2, H / 2);
    }

    // o texto aproximado para ler: o clique num texto leva a câmera até o meio dele, com o corpo em uns 18 px na tela
    // (sem o texto passar de 86% da largura nem de 80% da altura da tela, e com o zoom entre 2 e 4,5); outro clique, o
    // Esc ou virar a folha voltam ao livro inteiro (com o zoom em 1, a câmera volta sozinha para o meio do livro)
    function lerDePerto(lado: 0 | 1, a: Alvo) {
        const u = a.x + a.l / 2;
        const vv = a.y + a.a / 2;
        // os pixels da tela por unidade da cena com o zoom em 1, e o corpo do texto em pixels
        const px1 = altCss / (2 * distanciaBase() * Math.tan(FOV / 2));
        const corpo = ((a.ler ?? 18.5) / 1500) * H * px1;
        const z = lim(Math.min(18 / corpo, (0.86 * largCss) / (a.l * W * px1), (0.8 * altCss) / (a.a * H * px1)), 2, 4.5);
        camAlvo.cx = lado === 0 ? u * W : (u - 1) * W;
        camAlvo.cy = (0.5 - vv) * H;
        camAlvo.zoom = z;
        prender();
        lendo = true;
        destacar(null, -1);
        cv.style.touchAction = 'none';
        ponteiro('zoom-out');
        o.aoInteragir();
    }
    function sairDaLeitura() {
        zoomPara(1, largCss / 2, altCss / 2);
        ponteiro('default');
    }

    // ---------- o que está debaixo do cursor ----------
    function sob(px: number, py: number) {
        const tp = topos();
        const [x, y] = noPlano(px, py, Math.max(tp.d, tp.e));
        const c = contagem();
        const dentroY = Math.abs(y) <= H / 2;
        if (!dentroY || x < -W || x > W) return { x, y, lado: null as 0 | 1 | null, fc: null as Face | null, u: 0, v: 0 };
        const lado: 0 | 1 = x >= 0 ? 0 : 1;
        const f = lado === 0 ? folhas[c] : folhas[c - 1];
        if (!f) return { x, y, lado: null, fc: null, u: 0, v: 0 };
        const fc = lado === 0 ? f.frente : f.verso;
        const u = lado === 0 ? x / W : 1 + x / W;
        return { x, y, lado, fc, u, v: 0.5 - y / H };
    }
    const alvoEm = (fc: Face | null, u: number, vv: number) => fc?.alvos.find(a => u >= a.x && u <= a.x + a.l && vv >= a.y && vv <= a.y + a.a) ?? null;
    // o hover: a face com a área sob o mouse acende ela (redesenhada só quando a área muda); a que tinha antes apaga
    let destacada: Face | null = null;
    function destacar(fc: Face | null, i: number) {
        if (destacada === fc && (fc ? fc.destaque === i : true)) return;
        if (destacada && destacada !== fc) {
            destacada.destaque = -1;
            if (destacada.tex) renderizar(destacada, destacada.nivel);
        }
        destacada = fc;
        if (fc) {
            fc.destaque = i;
            if (fc.tex) renderizar(fc, fc.nivel);
        }
    }

    // os links das páginas (as linhas do sumário) só valem depois que o ponteiro se mexe: quando a página pedida muda,
    // eles se desarmam até o mouse andar uns pixels (ou o dedo tocar em outro lugar). Quem folheia clicando com o mouse
    // parado não cai sem querer num link da página que acabou de aparecer embaixo dele: o clique continua virando a folha
    let armado = true;
    let ultimoPonto: readonly [number, number] | null = null;
    let pontoDaTroca: readonly [number, number] | null = null;
    function desarmar() {
        armado = false;
        pontoDaTroca = ultimoPonto;
        destacar(null, -1);
        if (ponteiroAtual === 'pointer' || ponteiroAtual === 'zoom-in') ponteiro('default');
    }
    function conferirArmado(lx: number, ly: number, limiar: number) {
        ultimoPonto = [lx, ly];
        if (!armado && (!pontoDaTroca || Math.hypot(lx - pontoDaTroca[0], ly - pontoDaTroca[1]) > limiar)) armado = true;
    }
    // a área clicável sob o ponteiro, se os links estão armados. Os textos para ler não valem na faixa de fora da
    // página, onde o canto da folha levanta: lá o clique sempre vira a página
    function alvoSob(s: { x: number; fc: Face | null; u: number; v: number }) {
        if (!armado) return null;
        const a = alvoEm(s.fc, s.u, s.v);
        return a && a.ler !== undefined && Math.abs(s.x) > W * 0.72 ? null : a;
    }

    function irPara(cap: number) {
        alvoContagem = folhaDoCapitulo(defs, cap);
        o.aoInteragir();
    }
    function virar(d: number) {
        alvoContagem = lim(alvoContagem + d, 0, N);
        o.aoInteragir();
    }

    // ---------- entrada ----------
    // as coordenadas do ponteiro no canvas (a seção está em algum lugar da página)
    const local = (e: { clientX: number; clientY: number }) => {
        const r = cv.getBoundingClientRect();
        return [e.clientX - r.left, e.clientY - r.top] as const;
    };
    let toque: { id: number; x: number; y: number; movido: boolean; pan: boolean; cx: number; cy: number; dedo: boolean } | null = null;
    // dois dedos na tela: a pinça aproxima no ponto do meio
    const dedos = new Map<number, readonly [number, number]>();
    let pinca: { d0: number; z0: number } | null = null;
    const meioDosDedos = () => {
        const [a, b] = Array.from(dedos.values());
        return { d: Math.hypot(a[0] - b[0], a[1] - b[1]), x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2 };
    };

    function aoMover(e: PointerEvent) {
        const [lx, ly] = local(e);
        conferirArmado(lx, ly, e.pointerType === 'mouse' ? 3 : 12);
        mouse.x = (lx / largCss) * 2 - 1;
        mouse.y = 1 - (ly / altCss) * 2;
        mouse.dentro = e.pointerType === 'mouse';
        if (dedos.has(e.pointerId)) dedos.set(e.pointerId, [lx, ly]);
        if (pinca && dedos.size === 2) {
            const m = meioDosDedos();
            zoomPara(pinca.z0 * (m.d / Math.max(1, pinca.d0)), m.x, m.y);
            return;
        }
        if (toque && toque.id === e.pointerId) {
            const dx = lx - toque.x;
            const dy = ly - toque.y;
            if (!toque.movido && Math.hypot(dx, dy) > 6) {
                toque.movido = true;
                // no toque, de longe, o gesto na vertical é a rolagem da página (pan-y), não a folha
                if (!(toque.dedo && camAlvo.zoom <= 1.1 && Math.abs(dy) > Math.abs(dx))) comecarArrasto(e);
            }
            if (arrasto) moverArrasto(lx, ly);
            else if (toque.pan) {
                const k = (2 * v.dist * Math.tan(FOV / 2)) / altCss;
                camAlvo.cx = toque.cx - dx * k;
                camAlvo.cy = toque.cy + dy * k;
                prender();
            }
            return;
        }
        if (e.pointerType !== 'mouse') return;
        // sem botão: o cursor e a página que levanta (o link só acende armado)
        const s = sob(lx, ly);
        const alvoAqui = alvoSob(s);
        // os links acendem (a página é redesenhada); os textos só trocam o cursor. De perto, o clique volta ao livro
        const link = alvoAqui && alvoAqui.ler === undefined ? alvoAqui : null;
        destacar(link ? s.fc : null, link && s.fc ? s.fc.alvos.indexOf(link) : -1);
        ponteiro(link ? 'pointer' : camAlvo.zoom > 1.25 ? 'zoom-out' : alvoAqui ? 'zoom-in' : s.lado !== null ? 'grab' : 'default');
        const livre = !folhas.some(f => f.anim) && camAlvo.zoom < 1.35 && !alvoAqui;
        const c = contagem();
        let quer = -1;
        let quer2: 0 | 1 = 0;
        if (livre && s.lado !== null && Math.abs(s.x) > W * 0.72) {
            quer = s.lado === 0 ? c : c - 1;
            quer2 = s.lado;
            peel.grabV = lim(s.y / H + 0.5, 0, 1);
            // o cursor nas contas da folha que vai levantar; a que ainda está baixando guarda o canto dela
            peel.pcx = s.lado === 0 ? s.x : -s.x;
            peel.pcy = s.y;
            if (quer === peel.i) {
                peel.cx = peel.pcx;
                peel.cy = peel.pcy;
            }
        }
        peel.proximo = quer;
        peel.proximoLado = quer2;
        peel.alvo = quer >= 0 ? suave(0.72, 0.98, Math.abs(s.x) / W) * 0.6 + 0.4 : 0;
    }

    function comecarArrasto(e: PointerEvent) {
        if (!toque) return;
        const s = sob(toque.x, toque.y);
        const c = contagem();
        const ocupado = folhas.some(f => f.anim);
        // de perto, um dedo passeia em vez de pegar a página
        const passeio = toque.dedo && camAlvo.zoom > 1.1;
        if (s.lado !== null && !ocupado && !passeio) {
            const f = s.lado === 0 ? folhas[c] : folhas[c - 1];
            if (f) {
                const [x, y] = noPlano(toque.x, toque.y, 0.02);
                const lado: 1 | -1 = s.lado === 0 ? 1 : -1;
                f.zt = f.lado;
                const [px, py] = local(e);
                // com o canto levantado pelo cursor, apertando sobre a aba o ponto pego é o da aba (e não o da folha
                // deitada embaixo dela)
                const aba = !f.rigida && peel.i === f.i && f.vinco ? naAba(f.vinco, toque.x, toque.y, f, lado) : null;
                arrasto = {
                    id: e.pointerId,
                    i: f.i,
                    dir: lado,
                    x0: x,
                    y0: y,
                    phi0: f.lado ? PI : 0,
                    grabV: lim(s.y / H + 0.5, 0.02, 0.98),
                    hist: [],
                    // o ponto pego: onde o dedo apertou, no plano da própria folha (ou na aba levantada)
                    g: aba ? aba.p : noPapel(toque.x, toque.y, f, lado, 0),
                    c: null,
                    px,
                    py,
                    alt: aba ? aba.alt : 0,
                    t0: agora,
                    // a folha já tinha o canto levantado pelo cursor: o arrasto parte dessa dobra
                    desde: !f.rigida && peel.i === f.i && f.vinco ? { g: peel.g, c: peel.c } : null,
                    gD: null,
                    cD: null,
                };
                if (peel.i === f.i) peel.e = 0;
                peel.proximo = -1;
                alvoContagem = c;
                ponteiro('grabbing');
                o.aoInteragir();
                return;
            }
        }
        if (camAlvo.zoom > 1.1) {
            toque.pan = true;
            ponteiro('grabbing');
        }
    }

    function moverArrasto(lx: number, ly: number) {
        if (!arrasto) return;
        const f = folhas[arrasto.i];
        // o papel: a dobra segue o ponteiro, calculada a cada quadro (em dobras), com a vista do quadro
        arrasto.px = lx;
        arrasto.py = ly;
        f.grabV = arrasto.grabV;
        if (f.rigida) {
            // a capa é dura: gira inteira em volta da lombada
            const [x] = noPlano(lx, ly, 0.02);
            arrasto.hist.push({ t: agora, x });
            while (arrasto.hist.length > 2 && agora - arrasto.hist[0].t > 0.1) arrasto.hist.shift();
            const cosv = lim(Math.cos(arrasto.phi0) + (x - arrasto.x0) / W, -1, 1);
            f.phi = Math.acos(cosv);
            f.curl = 0;
            f.twist = 0;
        }
    }

    function soltarArrasto() {
        if (!arrasto) return;
        const f = folhas[arrasto.i];
        const h = arrasto.hist;
        const vx = h.length > 1 ? (h[h.length - 1].x - h[0].x) / Math.max(1e-3, h[h.length - 1].t - h[0].t) : 0;
        if (f.rigida) {
            const frente = arrasto.dir > 0 ? (f.phi > PI / 2 || vx < -1.1) && vx < 1.1 : !((f.phi < PI / 2 || vx > 1.1) && vx > -1.1);
            lancar(f, frente ? 1 : 0, false, true);
        } else {
            // o papel solto: o ponto pego passou da lombada (ou foi jogado para lá) e a página vira, indo até o espelho
            // dele do outro lado; jogado para fora, ou sem passar, a dobra se desfaz e ele volta para onde foi pego.
            // vx é a velocidade do ponto pego nas contas da folha (negativa: rumo à lombada)
            const lado: 1 | -1 = arrasto.dir > 0 ? 1 : -1;
            const c = arrasto.c ?? arrasto.g;
            const vira = (c[0] < 0 || vx < -1.1) && vx < 1.1;
            // a soltura parte da dobra que estava na tela. Virando, o ponto dela vai até o espelho; desfazendo, a mesma
            // dobra é levada pelo ponto mais longe do lado que vira e encolhe até sumir nele (levar o ponto pego de
            // volta deixava a parte além dele dobrada até o último quadro, e ela sumia de uma vez)
            const g0 = arrasto.gD ?? arrasto.g;
            const c0 = arrasto.cD ?? c;
            let livre: Livre = { g: g0, de: c0, para: g0, lado, completa: false, raio: RAIO };
            if (vira) livre = { g: g0, de: c0, para: [-g0[0], g0[1]], lado, completa: true, raio: RAIO };
            else if (f.vinco) {
                const d = desfazer(f.vinco, g0, c0);
                livre = { g: d.g, de: d.de, para: d.g, lado, completa: false, raio: d.raio };
            }
            const dist = Math.hypot(livre.para[0] - livre.de[0], livre.para[1] - livre.de[1]);
            f.anim = {
                de: 0,
                para: 0,
                t0: agora,
                dur: 0.22 + 0.3 * Math.min(1, dist / 1.4),
                dir: arrasto.dir,
                curl0: 0,
                twist0: 0,
                grabV: f.grabV,
                saida: true,
                livre,
            };
            if (vira) f.lado = arrasto.dir > 0 ? 1 : 0;
        }
        arrasto = null;
        alvoContagem = contagem();
    }

    function aoApertar(e: PointerEvent) {
        if (e.button !== 0) return;
        const [lx, ly] = local(e);
        conferirArmado(lx, ly, e.pointerType === 'mouse' ? 3 : 12);
        if (e.pointerType === 'touch') {
            dedos.set(e.pointerId, [lx, ly]);
            if (dedos.size === 2) {
                // o segundo dedo: larga a página (se pegou) e começa a pinça
                if (arrasto) soltarArrasto();
                toque = null;
                pinca = { d0: meioDosDedos().d, z0: camAlvo.zoom };
                return;
            }
        }
        cv.setPointerCapture(e.pointerId);
        toque = { id: e.pointerId, x: lx, y: ly, movido: false, pan: false, cx: camAlvo.cx, cy: camAlvo.cy, dedo: e.pointerType !== 'mouse' };
    }

    function largarDedo(e: PointerEvent) {
        dedos.delete(e.pointerId);
        if (dedos.size < 2) pinca = null;
    }

    function aoSoltar(e: PointerEvent) {
        largarDedo(e);
        if (!toque || toque.id !== e.pointerId) return;
        const t = toque;
        toque = null;
        if (arrasto) {
            soltarArrasto();
            ponteiro('grab');
            return;
        }
        if (t.movido) {
            ponteiro(camAlvo.zoom > 1.25 ? 'grab' : 'default');
            return;
        }
        // um clique: um link da página (se o ponteiro se mexeu desde que ela apareceu), um texto para ler de perto, ou
        // virar a página da metade clicada. De perto, fora dos links, o clique volta ao livro inteiro
        const [lx, ly] = local(e);
        const s = sob(lx, ly);
        const a = alvoSob(s);
        if (camAlvo.zoom > 1.25 && (!a || a.ler !== undefined)) return sairDaLeitura();
        if (a?.cap !== undefined) return irPara(a.cap);
        if (a?.pagina !== undefined) {
            alvoContagem = contagemDaPagina(defs, a.pagina);
            o.aoInteragir();
            return;
        }
        if (a?.caracteres) {
            alvoContagem = folhaDosCaracteres(defs);
            o.aoInteragir();
            return;
        }
        if (a?.ler !== undefined && s.lado !== null) return lerDePerto(s.lado, a);
        if (s.lado !== null && camAlvo.zoom < 1.25) virar(s.lado === 0 ? 1 : -1);
    }

    // o navegador tomou o gesto (a rolagem da página, no toque): solta a página sem contar como clique
    function aoCancelar(e: PointerEvent) {
        largarDedo(e);
        if (!toque || toque.id !== e.pointerId) return;
        toque = null;
        if (arrasto) soltarArrasto();
    }

    let acum = 0;
    let ultimaRoda = -1;
    let ultimoEvento = -1;
    // a roda que o livro usa não rola a página: nem o navegador nem o Lenis (a rolagem suave do site, que ouve a
    // janela e respeita a marca lenisStopPropagation)
    const consumir = (e: WheelEvent) => {
        e.preventDefault();
        (e as WheelEvent & { lenisStopPropagation?: boolean }).lenisStopPropagation = true;
    };
    function aoRolar(e: WheelEvent) {
        const [lx, ly] = local(e);
        if (e.ctrlKey || e.metaKey) {
            consumir(e);
            zoomPara(camAlvo.zoom * Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.08 : 0.004)), lx, ly);
            return;
        }
        const linha = e.deltaMode === 1 ? 33 : 1;
        if (camAlvo.zoom > 1.25) {
            // de perto, a roda passeia pela página; na borda, a rolagem volta para a página
            const k = (2 * v.dist * Math.tan(FOV / 2)) / altCss;
            const cx0 = camAlvo.cx;
            const cy0 = camAlvo.cy;
            camAlvo.cx += e.deltaX * linha * k;
            camAlvo.cy -= e.deltaY * linha * k;
            prender();
            if (Math.abs(camAlvo.cx - cx0) > 1e-6 || Math.abs(camAlvo.cy - cy0) > 1e-6) consumir(e);
            return;
        }
        // de longe, a roda vertical rola a página; a de lado (trackpad) folheia
        if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
        consumir(e);
        if (agora - ultimoEvento > 0.3) acum = 0;
        ultimoEvento = agora;
        acum += e.deltaX * linha;
        if (Math.abs(acum) >= 60 && agora - ultimaRoda > 0.13) {
            virar(Math.sign(acum));
            acum = 0;
            ultimaRoda = agora;
        }
    }

    // as setas folheiam quando boa parte do livro está na tela (e o foco não está num campo de texto)
    function aoTeclar(e: KeyboardEvent) {
        const alvo = e.target as HTMLElement | null;
        if (alvo && (alvo.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName))) return;
        const r = cv.getBoundingClientRect();
        const visto = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
        if (visto < r.height * 0.4) return;
        const focado = document.activeElement === cv;
        if (e.key === 'ArrowRight') virar(1);
        else if (e.key === 'ArrowLeft') virar(-1);
        else if (e.key === 'Escape' && camAlvo.zoom > 1.02) sairDaLeitura();
        else if (focado && (e.key === '+' || e.key === '=')) zoomPara(camAlvo.zoom * 1.5, largCss / 2, altCss / 2);
        else if (focado && e.key === '-') zoomPara(camAlvo.zoom / 1.5, largCss / 2, altCss / 2);
        else return;
        e.preventDefault();
    }

    function aoSair() {
        mouse.dentro = false;
        peel.proximo = -1;
        destacar(null, -1);
    }

    cv.style.touchAction = 'pan-y';
    cv.style.cursor = PONTEIROS.default;
    cv.addEventListener('pointerdown', aoApertar);
    cv.addEventListener('pointermove', aoMover);
    cv.addEventListener('pointerup', aoSoltar);
    cv.addEventListener('pointercancel', aoCancelar);
    cv.addEventListener('pointerleave', aoSair);
    cv.addEventListener('wheel', aoRolar, { passive: false });
    window.addEventListener('keydown', aoTeclar);

    // ---------- quadros de desenho ----------
    let largPx = 0;
    let altPx = 0;
    let msaa: { fb: WebGLFramebuffer; cor: WebGLRenderbuffer; prof: WebGLRenderbuffer } | null = null;
    let qA: Quadro | null = null;
    let qC: Quadro | null = null;
    let qM1: Quadro | null = null;
    let qM2: Quadro | null = null;
    let qQ1: Quadro | null = null;
    let qQ2: Quadro | null = null;
    let qS1: Quadro | null = null;
    let qS2: Quadro | null = null;

    function dimensionar() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        largCss = cv.clientWidth || 1;
        altCss = cv.clientHeight || 1;
        const l = Math.max(1, Math.round(largCss * dpr));
        const a = Math.max(1, Math.round(altCss * dpr));
        if (l === largPx && a === altPx) return;
        largPx = l;
        altPx = a;
        medirTrama();
        cv.width = l;
        cv.height = a;
        if (msaa) {
            gl.deleteFramebuffer(msaa.fb);
            gl.deleteRenderbuffer(msaa.cor);
            gl.deleteRenderbuffer(msaa.prof);
        }
        [qA, qC, qM1, qM2, qQ1, qQ2, qS1, qS2].forEach(q => liberarQuadro(gl, q, false));
        const amostras = Math.min(4, gl.getParameter(gl.MAX_SAMPLES) as number);
        const fb = gl.createFramebuffer()!;
        const cor = gl.createRenderbuffer()!;
        const prof = gl.createRenderbuffer()!;
        gl.bindRenderbuffer(gl.RENDERBUFFER, cor);
        gl.renderbufferStorageMultisample(gl.RENDERBUFFER, amostras, gl.RGBA8, l, a);
        gl.bindRenderbuffer(gl.RENDERBUFFER, prof);
        gl.renderbufferStorageMultisample(gl.RENDERBUFFER, amostras, gl.DEPTH_COMPONENT24, l, a);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, cor);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, prof);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        msaa = { fb, cor, prof };
        qA = quadroDeDesenho(gl, l, a);
        qC = quadroDeDesenho(gl, l, a);
        const m = (d: number) => [Math.max(1, Math.round(l / d)), Math.max(1, Math.round(a / d))] as const;
        qM1 = quadroDeDesenho(gl, ...m(2));
        qM2 = quadroDeDesenho(gl, ...m(2));
        qQ1 = quadroDeDesenho(gl, ...m(4));
        qQ2 = quadroDeDesenho(gl, ...m(4));
        qS1 = quadroDeDesenho(gl, ...m(4));
        qS2 = quadroDeDesenho(gl, ...m(4));
    }

    // ---------- desenho ----------
    function usar(p: Prog) {
        gl.useProgram(p.p);
        return p.u;
    }
    function tex(unidade: number, t: WebGLTexture | null, local: WebGLUniformLocation | null) {
        gl.activeTexture(gl.TEXTURE0 + unidade);
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.uniform1i(local, unidade);
    }
    function poseUniforms(u: Prog['u'], f: Sheet) {
        gl.uniform1f(u.uPhi, f.phi);
        gl.uniform1f(u.uCurl, f.curl);
        gl.uniform1f(u.uTwist, f.twist);
        gl.uniform1f(u.uGrabV, f.grabV);
        gl.uniform1f(u.uDobra, f.dobra);
        gl.uniform1f(u.uLarg, f.larg);
        gl.uniform1f(u.uInclina, f.inclina);
        gl.uniform1f(u.uZ, zBase(f) + (emMovimento(f) ? ESP * 0.5 : 0));
        gl.uniform2f(u.uTam, f.rigida ? W * SOBRA_L : W, f.rigida ? H * SOBRA_A : H);
        const vc = f.vinco;
        gl.uniform1f(u.uDobrar, vc ? 1 : 0);
        if (vc) {
            gl.uniform4f(u.uEixo, vc.ax, vc.ay, vc.tx, vc.ty);
            gl.uniform4f(u.uCone, vc.nx, vc.ny, vc.sb, vc.e);
            gl.uniform1f(u.uLado, vc.lado);
        }
    }
    // a folha: inteira na malha comum ou, com a dobra livre, em três partes: a deitada e a virada na malha comum e o
    // cone na malha dele (cada parte o shader corta no que é dela; sem cone, a dobra vincada, ele não entra)
    function desenharMalha(u: Prog['u'], f: Sheet) {
        const vc = f.vinco;
        gl.bindVertexArray(mFolha.vao);
        if (!vc) {
            gl.uniform1f(u.uParte, -1);
            gl.drawElements(gl.TRIANGLES, mFolha.n, gl.UNSIGNED_SHORT, 0);
            return;
        }
        gl.uniform1f(u.uParte, 0);
        gl.drawElements(gl.TRIANGLES, mFolha.n, gl.UNSIGNED_SHORT, 0);
        gl.uniform1f(u.uParte, 2);
        gl.drawElements(gl.TRIANGLES, mFolha.n, gl.UNSIGNED_SHORT, 0);
        if (vc.sb > 0) {
            gl.uniform1f(u.uParte, 1);
            gl.bindVertexArray(mCone.vao);
            gl.drawElements(gl.TRIANGLES, mCone.n, gl.UNSIGNED_SHORT, 0);
        }
    }
    // a folha com a dobra livre usa o shader do recorte, e o alfa dela é quanto do pixel ela cobre (na dobra mais fina
    // que um pixel, a cobertura parcial suaviza a borda); as outras, o opaco
    function desenharFolha(f: Sheet) {
        // a capa dura tem o shader dela (o dos cantos arredondados, o único das folhas paradas que descarta pixel)
        const u = usar(f.vinco ? pFolhaDobrada : f.rigida ? pCapa : pFolha);
        gl.uniformMatrix4fv(u.uVP, false, v.vp);
        gl.uniform3fv(u.uLuz, LUZ);
        gl.uniform1f(u.uCalha, f.rigida ? 0.3 : 1);
        poseUniforms(u, f);
        tex(0, texDe(f.frente), u.uFrente);
        tex(1, texDe(f.verso), u.uVerso);
        gl.uniform1f(u.uDesloca, 0);
        if (f.rigida) {
            gl.uniform1f(u.uRaio, RAIO_CAPA);
            gl.uniform1f(u.uFora, 0);
        }
        if (f.vinco) gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
        desenharMalha(u, f);
        if (f.vinco) gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
        if (f.rigida) desenharTabua(f, u);
    }
    // a capa dura como tábua: a folha dela é a face de dentro (a guarda); a de fora é a mesma folha empurrada GROSSO
    // pela normal (para cima na capa, que tem a arte na frente; para baixo na contracapa, que tem a arte no verso), e a
    // borda arredondada fecha as duas
    function desenharTabua(f: Sheet, u: Prog['u']) {
        const fora = f.frente.pagina.tipo === 'capa' ? 1 : -1;
        gl.uniform1f(u.uDesloca, fora * GROSSO);
        gl.uniform1f(u.uFora, 1);
        desenharMalha(u, f);
        gl.uniform1f(u.uDesloca, 0);
        gl.uniform1f(u.uFora, 0);
        const ub = usar(pBorda);
        gl.uniformMatrix4fv(ub.uVP, false, v.vp);
        gl.uniform3fv(ub.uLuz, LUZ);
        poseUniforms(ub, f);
        gl.uniform1f(ub.uDesloca, fora * GROSSO);
        gl.uniform1f(ub.uRaio, RAIO_CAPA);
        tex(0, texDe(fora > 0 ? f.frente : f.verso), ub.uExterna);
        gl.uniform1f(ub.uEspelho, fora > 0 ? 0 : 1);
        gl.bindVertexArray(mBorda.vao);
        gl.drawElements(gl.TRIANGLES, mBorda.n, gl.UNSIGNED_SHORT, 0);
    }
    function tela(q: Quadro | null) {
        if (q) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, q.fb);
            gl.viewport(0, 0, q.w, q.h);
        } else {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, largPx, altPx);
        }
    }
    function passe(p: Prog, q: Quadro | null, fonte: WebGLTexture, extra?: (u: Prog['u']) => void) {
        tela(q);
        const u = usar(p);
        tex(0, fonte, u.uTex);
        extra?.(u);
        gl.bindVertexArray(vazio);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function borrar(a: Quadro, b: Quadro, passo: number) {
        passe(pBorra, b, a.cor, u => gl.uniform2f(u.uDir, passo / a.w, 0));
        passe(pBorra, a, b.cor, u => gl.uniform2f(u.uDir, 0, passo / a.h));
    }
    function resolver(q: Quadro) {
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, msaa!.fb);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, q.fb);
        gl.blitFramebuffer(0, 0, largPx, altPx, 0, 0, largPx, altPx, gl.COLOR_BUFFER_BIT, gl.NEAREST);
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    }
    function plano(p: Prog, ret: number[], z: number) {
        const u = usar(p);
        gl.uniformMatrix4fv(u.uVP, false, v.vp);
        gl.uniform4f(u.uRet, ret[0], ret[1], ret[2], ret[3]);
        gl.uniform1f(u.uZp, z);
        return u;
    }
    // de onde a onde vai o livro no chão: as duas pilhas, cada uma enquanto tem folha deitada
    function extensao() {
        const x0 = -W * (folhas.some(f => f.phi > 0.02) ? lim(Math.max(...folhas.map(f => f.phi)) / PI, 0, 1) : 0);
        const x1 = W * lim(1 - Math.min(...folhas.map(f => f.phi)) / PI, 0, 1);
        return [x0, x1];
    }

    function desenhar() {
        const tp = topos();
        tela(null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, msaa!.fb);
        gl.viewport(0, 0, largPx, altPx);
        // transparente: o livro fica direto sobre o fundo da página
        gl.clearColor(0, 0, 0, 0);
        gl.clearDepth(1);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.BLEND);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // o chão: o pedaço de trama em volta do livro (o retângulo do livro encolhido 0,3, que some até 1 para os lados e
        // até 0,65 para cima e para baixo), sempre acabando antes da borda da área parada (no celular, quase quadrada,
        // sobra menos para os lados)
        const [x0, x1] = extensao();
        gl.disable(gl.DEPTH_TEST);
        const ut = usar(pTrama);
        const t = Math.tan(FOV / 2);
        const meiaA = distanciaBase() * t * 0.9;
        const meiaL = distanciaBase() * t * (largCss / altCss) * 0.95;
        const mx = Math.max(0, Math.min((x1 - x0) / 2 - 0.3, meiaL - 0.25));
        const my = H / 2 - 0.3;
        gl.uniform3fv(ut.uOlho, v.olho);
        gl.uniform3fv(ut.uEixoX, v.eixoX);
        gl.uniform3fv(ut.uEixoY, v.eixoY);
        gl.uniform3fv(ut.uEixoZ, v.eixoZ);
        gl.uniform2f(ut.uLente, t * (largCss / altCss), t);
        gl.uniform2f(ut.uTelaPx, largPx, altPx);
        gl.uniform1f(ut.uChao, CHAO);
        gl.uniform1f(ut.uPasso, passoTrama);
        gl.uniform4f(ut.uTrama, corTrama[0], corTrama[1], corTrama[2], corTrama[3]);
        gl.uniform4f(ut.uMancha, (x0 + x1) / 2, 0, mx, my);
        gl.uniform2f(ut.uManchaR, lim(meiaL - mx, 0.15, 1), lim(meiaA - my, 0.15, 0.65));
        gl.bindVertexArray(vazio);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.enable(gl.DEPTH_TEST);

        // a sombra do livro no chão (o alfa se soma, para a sombra aparecer sobre o canvas transparente)
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.disable(gl.DEPTH_TEST);
        const u = plano(pSombraLivro, [x0 - 0.7, -H / 2 - 0.7, x1 + 0.7, H / 2 + 0.7], CHAO);
        gl.uniform4f(u.uLivro, x0, (-H / 2) * SOBRA_A, x1, (H / 2) * SOBRA_A);
        gl.bindVertexArray(mPlano.vao);
        gl.drawElements(gl.TRIANGLES, mPlano.n, gl.UNSIGNED_SHORT, 0);
        gl.disable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);

        // as folhas paradas (opacas), da de cima para a de baixo: a profundidade descarta cedo as escondidas na pilha
        const paradas = folhas.filter(f => !f.vegetal && !emMovimento(f)).sort((a, b) => zBase(b) - zBase(a));
        const moventes = folhas.filter(f => emMovimento(f));
        for (const f of paradas) desenharFolha(f);

        // as sombras das folhas em movimento, borradas, escurecendo as pilhas
        if (moventes.length) {
            tela(qS1);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.disable(gl.DEPTH_TEST);
            gl.enable(gl.BLEND);
            gl.blendEquation(gl.MAX);
            const us = usar(pSombra);
            gl.uniformMatrix4fv(us.uVP, false, v.vp);
            gl.uniform1f(us.uTopoD, tp.d);
            gl.uniform1f(us.uTopoE, tp.e);
            gl.uniform3fv(us.uLuzS, LUZ_SOMBRA);
            for (const f of moventes) {
                gl.uniform1f(us.uForca, f.vegetal ? 0.2 : 0.62);
                poseUniforms(us, f);
                desenharMalha(us, f);
            }
            gl.blendEquation(gl.FUNC_ADD);
            gl.disable(gl.BLEND);
            borrar(qS1!, qS2!, 1);
            borrar(qS1!, qS2!, 2);
            gl.bindFramebuffer(gl.FRAMEBUFFER, msaa!.fb);
            gl.viewport(0, 0, largPx, altPx);
            gl.enable(gl.BLEND);
            gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            const ue = usar(pEscurece);
            tex(0, qS1!.cor, ue.uTex);
            gl.bindVertexArray(vazio);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            gl.disable(gl.BLEND);
            gl.enable(gl.DEPTH_TEST);
            for (const f of moventes) if (!f.vegetal) desenharFolha(f);
        }

        // o papel vegetal lê a cena pronta: cópia nítida, meio borrada e bem borrada
        const vegetais = folhas.filter(f => f.vegetal);
        resolver(qA!);
        let final = qA!;
        if (vegetais.length) {
            // o borrão cresce com a aproximação, mais devagar que ela (de perto, o texto embaixo segue legível)
            gl.disable(gl.DEPTH_TEST);
            const passos = Math.ceil(Math.sqrt(cam.zoom));
            passe(pCopia, qM1, qA!.cor);
            for (let i = 0; i < passos; i++) borrar(qM1!, qM2!, 1.1 * (i + 1));
            passe(pCopia, qQ1, qM1!.cor);
            for (let i = 0; i < passos + 1; i++) borrar(qQ1!, qQ2!, 1.5 * (i + 1));
            gl.bindFramebuffer(gl.FRAMEBUFFER, msaa!.fb);
            gl.viewport(0, 0, largPx, altPx);
            gl.enable(gl.DEPTH_TEST);
            for (const f of vegetais) {
                // o vegetal com a dobra livre usa o shader do recorte (e a cobertura parcial na dobra fina)
                const uv = usar(f.vinco ? pVegetalDobrado : pVegetal);
                gl.uniformMatrix4fv(uv.uVP, false, v.vp);
                gl.uniform3fv(uv.uLuz, LUZ);
                gl.uniform2f(uv.uTela, largPx, altPx);
                gl.uniform3f(uv.uFundo, fundo[0], fundo[1], fundo[2]);
                gl.uniform1f(uv.uTopoD, tp.d);
                gl.uniform1f(uv.uTopoE, tp.e);
                gl.uniform1f(uv.uTempo, (agora * 60) % 97);
                tex(0, qM1!.cor, uv.uBorra1);
                tex(1, qQ1!.cor, uv.uBorra2);
                tex(3, qA!.cor, uv.uCena);
                tex(2, texDe(f.frente), uv.uImp);
                gl.uniform3f(uv.uTinta, f.tinta[0] / 255, f.tinta[1] / 255, f.tinta[2] / 255);
                poseUniforms(uv, f);
                if (f.vinco) gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
                desenharMalha(uv, f);
                if (f.vinco) gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
            }
            resolver(qC!);
            final = qC!;
        }

        gl.disable(gl.DEPTH_TEST);
        passe(pFinal, null, final.cor, uf => {
            gl.uniform1f(uf.uTempo, agora);
        });
    }

    // ---------- texturas sob demanda ----------
    function visiveis() {
        const c = contagem();
        const s = new Set<Face>();
        const dir = (i: number) => {
            const f = folhas[i];
            if (!f) return;
            s.add(f.frente);
            if (f.vegetal) dir(i + 1);
        };
        const esq = (i: number) => {
            const f = folhas[i];
            if (!f) return;
            s.add(f.verso);
            if (f.vegetal) esq(i - 1);
        };
        dir(c);
        esq(c - 1);
        for (const f of folhas)
            if (emMovimento(f)) {
                s.add(f.frente);
                s.add(f.verso);
                dir(f.i + 1);
                esq(f.i - 1);
            }
        return s;
    }
    function desejado(fc: Face, vis: Set<Face>, c: number, i: number) {
        if (vis.has(fc)) return cam.zoom > 1.5 || camAlvo.zoom > 1.5 ? 3 : 2;
        if (Math.abs(i - c) <= 3) return 2;
        return 1;
    }
    function carregarTexturas() {
        const t0 = performance.now();
        const c = contagem();
        const vis = visiveis();
        const ordem = folhas
            .map(f => f)
            .sort((a, b) => Math.abs(a.i - c + 0.5) - Math.abs(b.i - c + 0.5))
            .flatMap(f => [f.frente, f.verso].map(fc => ({ fc, i: f.i })));
        const vistos = new Set<Face>();
        const pend = ordem.filter(x => {
            if (vistos.has(x.fc)) return false;
            vistos.add(x.fc);
            return true;
        });
        pend.sort((a, b) => Number(vis.has(b.fc)) - Number(vis.has(a.fc)));
        for (const { fc, i } of pend) {
            const d = desejado(fc, vis, c, i);
            if (fc.nivel < d) {
                renderizar(fc, d);
                if (performance.now() - t0 > 10) return;
            }
        }
        // sem nada para subir: devolve à resolução média o que não está mais de perto
        for (const { fc, i } of pend) {
            if (fc.nivel === 3 && desejado(fc, vis, c, i) < 3) {
                renderizar(fc, 2);
                return;
            }
        }
    }

    // ---------- o que a página mostra embaixo do livro ----------
    function rotuloDe(c: number) {
        if (c <= 0) return 'Capa';
        if (c >= N) return 'Contracapa';
        let esq: number | undefined;
        let dir: number | undefined;
        for (let i = c - 1; i >= 0; i--)
            if (!folhas[i].vegetal) {
                esq = folhas[i].verso.num;
                break;
            }
        for (let i = c; i < N; i++)
            if (!folhas[i].vegetal) {
                dir = folhas[i].frente.num;
                break;
            }
        const nums = [esq, dir].filter((x): x is number => !!x);
        if (!nums.length) return 'Capa';
        return nums.length === 2 ? `Páginas ${nums[0]}–${nums[1]} de ${TOTAL}` : `Página ${nums[0]} de ${TOTAL}`;
    }
    let ultimoAviso = '';
    // a página pedida: quando ela muda (pelo clique, pelas setas, pela roda, por um link ou pela folha solta), os links
    // das páginas se desarmam
    let alvoVisto = alvoContagem;
    function avisar() {
        if (alvoContagem !== alvoVisto) {
            alvoVisto = alvoContagem;
            desarmar();
            // virou a folha lendo um texto de perto: volta ao livro inteiro
            if (lendo) sairDaLeitura();
        }
        const rotulo = rotuloDe(contagem());
        const chave = `${rotulo}|${alvoContagem}`;
        if (chave === ultimoAviso) return;
        ultimoAviso = chave;
        o.aoMudar({ rotulo, inicio: alvoContagem <= 0, fim: alvoContagem >= N });
    }

    // ---------- laço ----------
    dimensionar();
    // as primeiras faces já nítidas antes de mostrar o livro
    for (const f of folhas.slice(0, 3)) {
        renderizar(f.frente, 2);
        renderizar(f.verso, 2);
    }
    for (const fc of faces) if (!fc.tex) renderizar(fc, 1);
    o.aoPronto();
    avisar();

    let raf = 0;
    let rodando = false;
    let antes = performance.now();
    const inicio = antes;
    let pausado = 0;
    let parouEm = 0;
    const quadro = (t: number) => {
        raf = requestAnimationFrame(quadro);
        // com o menu do cabeçalho aberto, a cortina cobre o livro: não desenha (o tempo segue, as viradas continuam)
        if (document.documentElement.hasAttribute('data-menu-aberto')) {
            antes = t;
            return;
        }
        const dt = Math.min(0.05, Math.max(0, (t - antes) / 1000));
        antes = t;
        agora = (t - inicio - pausado) / 1000;
        dimensionar();
        poses(dt);
        if (camAlvo.zoom <= 1.02) {
            camAlvo.cx = centroDoLivro();
            camAlvo.cy = 0;
        }
        const k = 1 - Math.exp(-dt * 7);
        cam.cx += (camAlvo.cx - cam.cx) * k;
        cam.cy += (camAlvo.cy - cam.cy) * k;
        cam.zoom += (camAlvo.zoom - cam.zoom) * k;
        const km = 1 - Math.exp(-dt * 4);
        mouse.sx += ((mouse.dentro ? mouse.x : 0) - mouse.sx) * km;
        mouse.sy += ((mouse.dentro ? mouse.y : 0) - mouse.sy) * km;
        v = vista(cam);
        dobras();
        carregarTexturas();
        desenhar();
        avisar();
    };
    // o laço só roda com a seção na tela; o tempo parado não conta (as viradas continuam de onde estavam)
    function ativar(sim: boolean) {
        if (sim === rodando) return;
        rodando = sim;
        if (sim) {
            const t = performance.now();
            if (parouEm) pausado += t - parouEm;
            antes = t;
            raf = requestAnimationFrame(quadro);
        } else {
            parouEm = performance.now();
            cancelAnimationFrame(raf);
        }
    }

    // para a verificação: o estado e atalhos de teste
    (window as unknown as { __livroRune?: unknown }).__livroRune = {
        estado: () => ({ contagem: contagem(), alvo: alvoContagem, zoom: cam.zoom, lendo, N, rodando, rotulo: rotuloDe(contagem()), folhas: folhas.map(f => ({ phi: +f.phi.toFixed(3), lado: f.lado, nivel: [f.frente.nivel, f.verso.nivel] })) }),
        irPara,
        virar,
        caracteres: () => (alvoContagem = folhaDosCaracteres(defs)),
        zoom: (z: number, px = largCss / 2, py = altCss / 2) => zoomPara(z, px, py),
        // um ponto de uma página aberta (u, v de 0 a 1; lado 0 = direita) em pixels do canvas, para clicar nos testes
        naTela: (lado: 0 | 1, u: number, vv: number) => {
            const x = lado === 0 ? u * W : (u - 1) * W;
            const y = (0.5 - vv) * H;
            const m = v.vp;
            const cx = m[0] * x + m[4] * y + m[12];
            const cy = m[1] * x + m[5] * y + m[13];
            const cw = m[3] * x + m[7] * y + m[15];
            return [((cx / cw + 1) / 2) * largCss, ((1 - cy / cw) / 2) * altCss];
        },
    };

    return {
        virar,
        ativar,
        parar: () => {
            ativar(false);
            cv.removeEventListener('pointerdown', aoApertar);
            cv.removeEventListener('pointermove', aoMover);
            cv.removeEventListener('pointerup', aoSoltar);
            cv.removeEventListener('pointercancel', aoCancelar);
            cv.removeEventListener('pointerleave', aoSair);
            cv.removeEventListener('wheel', aoRolar);
            window.removeEventListener('keydown', aoTeclar);
            for (const fc of faces) if (fc.tex) gl.deleteTexture(fc.tex);
            delete (window as unknown as { __livroRune?: unknown }).__livroRune;
        },
    };
}
