// o motor do livro em WebGL2, trazido do clone-tantan (os shaders e a física das folhas são os mesmos): cada folha é
// uma malha que se curva em arco a partir da lombada, as folhas paradas formam as duas pilhas, as que estão virando
// projetam sombra nelas e o papel vegetal é desenhado por último, lendo a cena já pronta.
// O que muda para morar dentro da página: o canvas é o de um painel (as coordenadas do ponteiro são as dele), a roda
// do mouse rola a página (folheia só a roda de lado, a do trackpad; Ctrl + roda aproxima; de perto, a roda passeia
// pela página até a borda e depois devolve a rolagem), as setas do teclado só valem com o livro à vista, o laço para
// quando o painel sai da tela, o toque deixa a página rolar na vertical (pan-y) e dois dedos aproximam. As páginas
// são as do espécime da Föeger Rune, desenhadas pelo pincel de canvas.
import { malha, olhar, perspectiva, programa, quadroDeDesenho, liberarQuadro, mult, norm, cruz, type Quadro, type Prog } from './gl';
import { montarFolhas, folhaDoCapitulo, folhaDosCaracteres, CAPITULOS, type Pagina } from '../especime/conteudo';
import { desenharPagina, type Alvo } from '../especime/paginas';
import { carregarFontes, familiasDe, pincelCanvas, type Familias } from '../especime/pincel';
import { desenharMesa, MESA } from './mesa';

const W = 1;
const H = 1.5;
const ESP = 0.0016;
const PI = Math.PI;
const FOV = (28 * PI) / 180;
const LUZ = norm([-0.3, 0.45, 1]);
const LUZ_SOMBRA = norm([-0.38, 0.5, 1]);
const NIVEIS = [0, 512, 1024, 2560];

// ---------- shaders ----------

const DEFORMA = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aUv;
uniform mat4 uVP;
uniform float uPhi, uCurl, uTwist, uGrabV, uZ, uDobra, uLarg, uInclina;
uniform vec2 uTam;
const float PI = 3.14159265;
// o ângulo da folha ao longo de u: a curva começa na dobra (na lombada, sem arrasto) e vai até uLarg depois dela;
// a dobra pode ser inclinada (o canto puxado) e a torção adianta um canto
float ang(float t, float v) {
    float d = max(uDobra + uInclina * (v - 0.5), 0.0);
    return uPhi + uCurl * smoothstep(d, d + uLarg, t) + uTwist * (v - uGrabV) * t;
}
// a folha em arco: a cada passo ao longo de u o ângulo muda; fora de [0, π] a folha deita na pilha
vec3 deforma(vec2 q, out vec3 n) {
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

const VERT_FOLHA = `${DEFORMA}
out vec2 vUv;
out vec3 vN;
out vec3 vPos;
void main() {
    vec3 n;
    vec3 p = deforma(aUv, n);
    vUv = aUv;
    vN = n;
    vPos = p;
    gl_Position = uVP * vec4(p, 1.0);
}`;

const FRAG_FOLHA = `#version 300 es
precision highp float;
in vec2 vUv;
in vec3 vN;
in vec3 vPos;
uniform sampler2D uFrente, uVerso;
uniform vec3 uLuz;
uniform float uCalha;
out vec4 cor;
void main() {
    vec3 cf = texture(uFrente, vUv).rgb;
    vec3 cv = texture(uVerso, vec2(1.0 - vUv.x, vUv.y)).rgb;
    bool fr = gl_FrontFacing;
    vec3 c = fr ? cf : cv;
    vec3 n = fr ? vN : -vN;
    float l = 0.70 + 0.34 * max(dot(n, uLuz), 0.0);
    float u = vUv.x;
    float calha = 1.0 - uCalha * (0.2 * (1.0 - smoothstep(0.0, 0.05, u)) + 0.07 * (1.0 - smoothstep(0.0, 0.2, u)));
    float borda = 1.0 - 0.07 * (1.0 - smoothstep(0.0, 0.003, 1.0 - u));
    cor = vec4(c * l * calha * borda, 1.0);
}`;

const FRAG_VEGETAL = `#version 300 es
precision highp float;
in vec2 vUv;
in vec3 vN;
in vec3 vPos;
uniform sampler2D uCena, uBorra1, uBorra2, uImp;
uniform vec2 uTela;
uniform vec3 uTinta, uLuz;
uniform float uTopoD, uTopoE, uTempo;
out vec4 cor;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main() {
    vec2 st = gl_FragCoord.xy / uTela;
    float topo = vPos.x > 0.0 ? uTopoD : uTopoE;
    float h = max(vPos.z - topo, 0.0);
    // deitado, o que está embaixo aparece borrado mas legível; levantado, vira só manchas
    float k = smoothstep(0.004, 0.14, h);
    vec3 b1 = texture(uBorra1, st).rgb;
    vec3 sob = mix(mix(texture(uCena, st).rgb, b1, 0.7), texture(uBorra2, st).rgb, k);
    bool fr = gl_FrontFacing;
    vec3 n = fr ? vN : -vN;
    float dif = max(dot(n, uLuz), 0.0);
    vec3 papel = uTinta * mix(0.52 + 0.2 * dif, 0.66 + 0.24 * dif, k);
    vec3 c = mix(sob, papel, mix(0.5, 0.56, k));
    vec4 imp = texture(uImp, vUv);
    float f = fr ? 0.95 : 0.45;
    c = c * (1.0 - imp.a * f) + imp.rgb * f;
    c += (hash(gl_FragCoord.xy + uTempo) - 0.5) * 0.07;
    cor = vec4(c, 1.0);
}`;

const VERT_SOMBRA = `${DEFORMA}
uniform float uTopoD, uTopoE;
uniform vec3 uLuzS;
out float vH;
void main() {
    vec3 n;
    vec3 p = deforma(aUv, n);
    float topo = p.x > 0.0 ? uTopoD : uTopoE;
    float h = max(p.z - topo, 0.0);
    vec3 q = p - uLuzS * (h / uLuzS.z);
    vH = h;
    gl_Position = uVP * vec4(q.xy, topo, 1.0);
}`;

const FRAG_SOMBRA = `#version 300 es
precision highp float;
in float vH;
uniform float uForca;
out vec4 cor;
void main() {
    float a = smoothstep(0.002, 0.03, vH) * exp(-vH * 1.3) * uForca;
    cor = vec4(a, a, a, a);
}`;

// um retângulo no plano da mesa (a mesa e a sombra do livro)
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

const FRAG_MESA = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uNitida, uBorrada;
uniform float uDesfoque;
out vec4 cor;
void main() {
    cor = vec4(mix(texture(uNitida, vUv).rgb, texture(uBorrada, vUv).rgb, uDesfoque), 1.0);
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
    float a = 0.42 * (1.0 - smoothstep(-0.05, 0.32, d)) + 0.45 * (1.0 - smoothstep(-0.006, 0.03, perto));
    cor = vec4(0.0, 0.0, 0.0, a);
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
uniform float uTempo, uFade;
out vec4 cor;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main() {
    vec3 c = texture(uTex, vSt).rgb;
    c += (hash(gl_FragCoord.xy + fract(uTempo * 7.13) * 91.7) - 0.5) * 0.05;
    float v = length((vSt - 0.5) * vec2(1.0, 0.92));
    c *= 1.0 - 0.3 * smoothstep(0.42, 0.95, v);
    cor = vec4(c * uFade, 1.0);
}`;


// ---------- tipos ----------

type Face = { pagina: Pagina; num?: number; tex: WebGLTexture | null; nivel: number; alvos: Alvo[]; transparente: boolean; escura: boolean };
type Anim = { de: number; para: number; t0: number; dur: number; dir: number; curl0: number; twist0: number; grabV: number; saida: boolean; dobra?: { base: number; inclina0: number; larg0: number; completa: boolean } };
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
    await carregarFontes(fam);
    if (sinal.aborted) return null;
    const gl = cv.getContext('webgl2', { antialias: false, alpha: false, depth: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('sem WebGL2');
    return montar(gl, cv, fam, o);
}

function montar(gl: WebGL2RenderingContext, cv: HTMLCanvasElement, fam: Familias, o: Opcoes): Controle {
    const defs = montarFolhas();
    const N = defs.length;

    const pFolha = programa(gl, VERT_FOLHA, FRAG_FOLHA);
    const pVegetal = programa(gl, VERT_FOLHA, FRAG_VEGETAL);
    const pSombra = programa(gl, VERT_SOMBRA, FRAG_SOMBRA);
    const pMesa = programa(gl, VERT_PLANO, FRAG_MESA);
    const pSombraLivro = programa(gl, VERT_PLANO, FRAG_SOMBRA_LIVRO);
    const pCopia = programa(gl, VERT_TELA, FRAG_COPIA);
    const pBorra = programa(gl, VERT_TELA, FRAG_BORRA);
    const pEscurece = programa(gl, VERT_TELA, FRAG_ESCURECE);
    const pFinal = programa(gl, VERT_TELA, FRAG_FINAL);
    const mFolha = malha(gl, 64, 32);
    const mPlano = malha(gl, 1, 1);
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

    const mesa = desenharMesa(fam);
    const texMesa = enviar(null, mesa.nitida, false, true);
    const texMesaBorrada = enviar(null, mesa.borrada, false, false);

    // ---------- as folhas ----------
    const face = (p: Pagina, num?: number): Face => ({
        pagina: p,
        num,
        tex: null,
        nivel: 0,
        alvos: [],
        transparente: p.tipo === 'vegetal',
        escura: p.tipo === 'capa' || p.tipo === 'contracapa' || p.tipo === 'guarda',
    });
    const folhas: Sheet[] = defs.map((d, i) => {
        const vegetal = d.tipo === 'vegetal';
        const frente = face(d.frente, d.numFrente);
        const verso = vegetal ? frente : face(d.verso, d.numVerso);
        const cap = 'cap' in d.frente ? d.frente.cap : 0;
        const tinta = (vegetal && CAPITULOS[cap].vegetal?.tinta) || [246, 245, 241];
        return { i, frente, verso, rigida: d.tipo === 'capa' || d.tipo === 'contracapa', vegetal, tinta, lado: 0, phi: 0, curl: 0, twist: 0, grabV: 0.5, dobra: 0, larg: 1, inclina: 0, zt: 0, anim: null };
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
        fc.alvos = desenharPagina(pincelCanvas(g, larg / 1000, fam), fc.pagina, fc.num);
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

    let arrasto: { id: number; i: number; dir: number; x0: number; y0: number; phi0: number; grabV: number; hist: { t: number; x: number }[] } | null = null;
    const peel = { i: -1, lado: 0 as 0 | 1, e: 0, alvo: 0, grabV: 0.5, proximo: -1 as number, proximoLado: 0 as 0 | 1 };

    function lancar(f: Sheet, para: 0 | 1, rapido: boolean, sai = false) {
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
        if (falta && !arrasto && agora - ultimoLanc >= (rapido ? 0.085 : 0.12)) {
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
                peel.e = 0;
            }
        } else peel.e += (peel.alvo - peel.e) * k;

        for (const f of folhas) {
            if (f.anim?.dobra) {
                // a dobra solta: corre até a lombada (vira) ou até a borda (volta), e o lado de cima assenta
                const a = f.anim;
                const d = a.dobra!;
                const p = lim((agora - a.t0) / a.dur, 0, 1);
                const e = saida(p);
                f.phi = d.base;
                f.dobra = a.de + (a.para - a.de) * e;
                f.inclina = d.inclina0 * (1 - e);
                f.twist = 0;
                if (d.completa) {
                    f.curl = a.curl0 + (a.dir * PI - a.curl0) * e;
                    f.larg = d.larg0 + (0.02 - d.larg0) * e;
                    f.zt = d.base ? 1 - e : e;
                }
                if (p >= 1) {
                    f.anim = null;
                    f.phi = f.lado ? PI : 0;
                    f.curl = 0;
                    f.dobra = 0;
                    f.larg = 1;
                    f.inclina = 0;
                    f.zt = f.lado;
                }
                continue;
            }
            if (!(arrasto?.i === f.i && !f.rigida)) {
                f.dobra = 0;
                f.larg = 1;
                f.inclina = 0;
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
                // a pose vem do ponteiro (em mover)
            } else if (peel.i === f.i && peel.e > 0.0005) {
                const s = f.lado ? -1 : 1;
                const e = peel.e;
                f.grabV = peel.grabV;
                if (f.rigida) {
                    f.phi = f.lado ? PI - 0.12 * e : 0.12 * e;
                    f.curl = 0;
                    f.twist = 0;
                } else {
                    f.phi = f.lado ? PI + 0.32 * e : -0.32 * e;
                    f.curl = s * 0.68 * e;
                    f.twist = s * 0.5 * e * (2 * peel.grabV - 1);
                }
            } else {
                f.phi = f.lado ? PI : 0;
                f.curl = 0;
                f.twist = 0;
            }
        }
    }

    const zDireita = (i: number) => (N - 1 - i) * ESP;
    const zEsquerda = (i: number) => i * ESP;
    const zBase = (f: Sheet) => {
        const t = f.anim?.dobra || (arrasto?.i === f.i && !f.rigida) ? f.zt : lim(f.phi / PI, 0, 1);
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
    const cam: Cam = { cx: 0.5, cy: 0, zoom: 0.74 };
    const camAlvo: Cam = { cx: 0.5, cy: 0, zoom: 1 };
    const mouse = { x: 0, y: 0, sx: 0, sy: 0, dentro: false };
    let largCss = 1;
    let altCss = 1;
    let intro = 0;

    const distanciaBase = () => {
        const asp = largCss / altCss;
        const t = Math.tan(FOV / 2);
        return Math.max(H / 0.86 / 2 / t, (2 * W) / 0.9 / 2 / (t * asp));
    };
    const centroDoLivro = () => 0.5 * (1 - lim(folhas[0].phi / PI, 0, 1)) - 0.5 * lim(folhas[N - 1].phi / PI, 0, 1);

    type Vista = { olho: number[]; eixoX: number[]; eixoY: number[]; eixoZ: number[]; vp: Float32Array; dist: number };
    function vista(c: Cam): Vista {
        const dist = distanciaBase() / c.zoom;
        const perto = suave(1.1, 2.2, c.zoom);
        const t = Math.tan(FOV / 2);
        const meiaA = dist * t;
        const meiaL = meiaA * (largCss / altCss);
        // de perto, a câmera segue o cursor; de longe, o cursor só inclina um pouco a vista
        const ox = mouse.sx * 0.3 * meiaL * perto;
        const oy = mouse.sy * 0.3 * meiaA * perto;
        const px = mouse.sx * 0.07 * (1 - perto);
        const py = mouse.sy * 0.05 * (1 - perto);
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

    function irPara(cap: number) {
        alvoContagem = folhaDoCapitulo(defs, cap);
        o.aoInteragir();
    }
    function virar(d: number) {
        alvoContagem = lim(alvoContagem + d, 0, N);
        o.aoInteragir();
    }

    // ---------- entrada ----------
    // as coordenadas do ponteiro no canvas (o painel está em algum lugar da página)
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
                comecarArrasto(e);
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
        // sem botão: o cursor e a página que levanta
        const s = sob(lx, ly);
        const alvoAqui = alvoEm(s.fc, s.u, s.v);
        cv.style.cursor = alvoAqui ? 'pointer' : s.lado !== null ? 'grab' : camAlvo.zoom > 1.25 ? 'grab' : 'default';
        const livre = !folhas.some(f => f.anim) && camAlvo.zoom < 1.35 && !alvoAqui;
        const c = contagem();
        let quer = -1;
        let quer2: 0 | 1 = 0;
        if (livre && s.lado !== null && Math.abs(s.x) > W * 0.72) {
            quer = s.lado === 0 ? c : c - 1;
            quer2 = s.lado;
            peel.grabV = lim(s.y / H + 0.5, 0, 1);
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
                arrasto = { id: e.pointerId, i: f.i, dir: s.lado === 0 ? 1 : -1, x0: x, y0: y, phi0: f.lado ? PI : 0, grabV: lim(s.y / H + 0.5, 0.02, 0.98), hist: [] };
                f.zt = f.lado;
                if (peel.i === f.i) peel.e = 0;
                peel.proximo = -1;
                alvoContagem = c;
                cv.style.cursor = 'grabbing';
                o.aoInteragir();
                return;
            }
        }
        if (camAlvo.zoom > 1.1) {
            toque.pan = true;
            cv.style.cursor = 'grabbing';
        }
    }

    function moverArrasto(lx: number, ly: number) {
        if (!arrasto) return;
        const f = folhas[arrasto.i];
        const [x, y] = noPlano(lx, ly, 0.02);
        arrasto.hist.push({ t: agora, x });
        while (arrasto.hist.length > 2 && agora - arrasto.hist[0].t > 0.1) arrasto.hist.shift();
        f.grabV = arrasto.grabV;
        if (f.rigida) {
            // a capa é dura: gira inteira em volta da lombada
            const cosv = lim(Math.cos(arrasto.phi0) + (x - arrasto.x0) / W, -1, 1);
            f.phi = Math.acos(cosv);
            f.curl = 0;
            f.twist = 0;
            return;
        }
        // o papel dobra: o ponto pego vai para o cursor e a dobra fica no meio do caminho (a mediatriz entre os dois),
        // com o pedaço de lá virado por cima; puxado pelo canto, a dobra inclina
        const lado = arrasto.dir;
        const ug = (lado * arrasto.x0) / W;
        const up = (lado * x) / W;
        const vg = arrasto.y0 / H + 0.5;
        const vp = y / H + 0.5;
        const du = up - ug;
        const puxado = Math.max(0, -du);
        const k = du < -0.02 ? lim((H * (vp - vg)) / (W * du), -0.7, 0.7) : 0;
        const mu = (ug + up) / 2;
        const mv = (vg + vp) / 2;
        f.phi = arrasto.phi0;
        f.curl = lado * (PI - 0.18) * suave(0, 0.12, puxado);
        f.dobra = du < 0 ? Math.max(0, mu + k * (mv - 0.5)) : 1.2;
        f.inclina = -k;
        f.larg = 0.14;
        f.twist = 0;
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
            // a dobra solta: passou da metade (ou foi jogada) vira; senão volta
            const rumo = -arrasto.dir * vx;
            const vira = (f.dobra < 0.55 || rumo > 1.1) && rumo > -1.1;
            const para = vira ? 0 : 1 + f.larg;
            f.anim = {
                de: f.dobra,
                para,
                t0: agora,
                dur: 0.28 + 0.5 * Math.abs(para - f.dobra),
                dir: arrasto.dir,
                curl0: f.curl,
                twist0: 0,
                grabV: f.grabV,
                saida: true,
                dobra: { base: arrasto.phi0, inclina0: f.inclina, larg0: f.larg, completa: vira },
            };
            if (vira) f.lado = arrasto.dir > 0 ? 1 : 0;
        }
        arrasto = null;
        alvoContagem = contagem();
    }

    function aoApertar(e: PointerEvent) {
        if (e.button !== 0) return;
        const [lx, ly] = local(e);
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
            cv.style.cursor = 'grab';
            return;
        }
        if (t.movido) {
            cv.style.cursor = camAlvo.zoom > 1.25 ? 'grab' : 'default';
            return;
        }
        // um clique: o sumário, ou virar a página da metade clicada
        const [lx, ly] = local(e);
        const s = sob(lx, ly);
        const a = alvoEm(s.fc, s.u, s.v);
        if (a?.cap !== undefined) return irPara(a.cap);
        if (a?.caracteres) {
            alvoContagem = folhaDosCaracteres(defs);
            o.aoInteragir();
            return;
        }
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
        else if (e.key === 'Escape' && camAlvo.zoom > 1.02) zoomPara(1, largCss / 2, altCss / 2);
        else if (focado && (e.key === '+' || e.key === '=')) zoomPara(camAlvo.zoom * 1.5, largCss / 2, altCss / 2);
        else if (focado && e.key === '-') zoomPara(camAlvo.zoom / 1.5, largCss / 2, altCss / 2);
        else return;
        e.preventDefault();
    }

    function aoSair() {
        mouse.dentro = false;
        peel.proximo = -1;
    }

    cv.style.touchAction = 'pan-y';
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
        gl.uniform2f(u.uTam, f.rigida ? W * 1.012 : W, f.rigida ? H * 1.018 : H);
    }
    function desenharFolha(f: Sheet) {
        const u = usar(pFolha);
        gl.uniformMatrix4fv(u.uVP, false, v.vp);
        gl.uniform3fv(u.uLuz, LUZ);
        gl.uniform1f(u.uCalha, f.rigida ? 0.3 : 1);
        poseUniforms(u, f);
        tex(0, texDe(f.frente), u.uFrente);
        tex(1, texDe(f.verso), u.uVerso);
        gl.bindVertexArray(mFolha.vao);
        gl.drawElements(gl.TRIANGLES, mFolha.n, gl.UNSIGNED_SHORT, 0);
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

    function desenhar() {
        const tp = topos();
        tela(null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, msaa!.fb);
        gl.viewport(0, 0, largPx, altPx);
        gl.clearColor(0.08, 0.075, 0.07, 1);
        gl.clearDepth(1);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.BLEND);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // a mesa (fora de foco quando a câmera chega perto)
        let u = plano(pMesa, [-MESA.l / 2, -MESA.a / 2, MESA.l / 2, MESA.a / 2], -0.006);
        tex(0, texMesa, u.uNitida);
        tex(1, texMesaBorrada, u.uBorrada);
        gl.uniform1f(u.uDesfoque, suave(1.15, 2.4, cam.zoom));
        gl.bindVertexArray(mPlano.vao);
        gl.drawElements(gl.TRIANGLES, mPlano.n, gl.UNSIGNED_SHORT, 0);

        // a sombra do livro na mesa
        const x0 = -W * (folhas.some(f => f.phi > 0.02) ? lim(Math.max(...folhas.map(f => f.phi)) / PI, 0, 1) : 0);
        const x1 = W * lim(1 - Math.min(...folhas.map(f => f.phi)) / PI, 0, 1);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.disable(gl.DEPTH_TEST);
        u = plano(pSombraLivro, [x0 - 0.7, -H / 2 - 0.7, x1 + 0.7, H / 2 + 0.7], -0.004);
        gl.uniform4f(u.uLivro, x0, (-H / 2) * 1.018, x1, (H / 2) * 1.018);
        gl.bindVertexArray(mPlano.vao);
        gl.drawElements(gl.TRIANGLES, mPlano.n, gl.UNSIGNED_SHORT, 0);
        gl.disable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);

        // as folhas paradas (opacas)
        const paradas = folhas.filter(f => !f.vegetal && !emMovimento(f));
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
                gl.bindVertexArray(mFolha.vao);
                gl.drawElements(gl.TRIANGLES, mFolha.n, gl.UNSIGNED_SHORT, 0);
            }
            gl.blendEquation(gl.FUNC_ADD);
            gl.disable(gl.BLEND);
            borrar(qS1!, qS2!, 1);
            borrar(qS1!, qS2!, 2);
            gl.bindFramebuffer(gl.FRAMEBUFFER, msaa!.fb);
            gl.viewport(0, 0, largPx, altPx);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
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
            const uv = usar(pVegetal);
            gl.uniformMatrix4fv(uv.uVP, false, v.vp);
            gl.uniform3fv(uv.uLuz, LUZ);
            gl.uniform2f(uv.uTela, largPx, altPx);
            gl.uniform1f(uv.uTopoD, tp.d);
            gl.uniform1f(uv.uTopoE, tp.e);
            gl.uniform1f(uv.uTempo, (agora * 60) % 97);
            tex(0, qM1!.cor, uv.uBorra1);
            tex(1, qQ1!.cor, uv.uBorra2);
            tex(3, qA!.cor, uv.uCena);
            for (const f of vegetais) {
                tex(2, texDe(f.frente), uv.uImp);
                gl.uniform3f(uv.uTinta, f.tinta[0] / 255, f.tinta[1] / 255, f.tinta[2] / 255);
                poseUniforms(uv, f);
                gl.bindVertexArray(mFolha.vao);
                gl.drawElements(gl.TRIANGLES, mFolha.n, gl.UNSIGNED_SHORT, 0);
            }
            resolver(qC!);
            final = qC!;
        }

        gl.disable(gl.DEPTH_TEST);
        passe(pFinal, null, final.cor, uf => {
            gl.uniform1f(uf.uTempo, agora);
            gl.uniform1f(uf.uFade, suave(0, 1, intro));
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
    function avisar() {
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
        intro = Math.min(1, intro + dt / 1.4);
        dimensionar();
        poses(dt);
        if (camAlvo.zoom <= 1.02) {
            camAlvo.cx = centroDoLivro();
            camAlvo.cy = 0;
        }
        const k = 1 - Math.exp(-dt * (intro < 1 ? 2.6 : 7));
        cam.cx += (camAlvo.cx - cam.cx) * k;
        cam.cy += (camAlvo.cy - cam.cy) * k;
        cam.zoom += (camAlvo.zoom - cam.zoom) * k;
        const km = 1 - Math.exp(-dt * 4);
        mouse.sx += ((mouse.dentro ? mouse.x : 0) - mouse.sx) * km;
        mouse.sy += ((mouse.dentro ? mouse.y : 0) - mouse.sy) * km;
        v = vista(cam);
        carregarTexturas();
        desenhar();
        avisar();
    };
    // o laço só roda com o painel na tela; o tempo parado não conta (as viradas continuam de onde estavam)
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
        estado: () => ({ contagem: contagem(), alvo: alvoContagem, zoom: cam.zoom, N, rodando, rotulo: rotuloDe(contagem()), folhas: folhas.map(f => ({ phi: +f.phi.toFixed(3), lado: f.lado, nivel: [f.frente.nivel, f.verso.nivel] })) }),
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
            gl.deleteTexture(texMesa);
            gl.deleteTexture(texMesaBorrada);
            delete (window as unknown as { __livroRune?: unknown }).__livroRune;
        },
    };
}
