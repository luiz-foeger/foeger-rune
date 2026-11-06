// ajudantes de WebGL2 do livro (cópia dos do clone-tantan, sem mudança): programa, malha da folha, texturas a partir
// de canvas, framebuffers e matrizes (colunas, como o GLSL espera)

export type Prog = { p: WebGLProgram; u: Record<string, WebGLUniformLocation | null> };

export function programa(gl: WebGL2RenderingContext, vert: string, frag: string): Prog {
    const sh = (tipo: number, src: string) => {
        const s = gl.createShader(tipo)!;
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
        return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vert));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, frag));
    gl.bindAttribLocation(p, 0, 'aUv');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link');
    const u: Prog['u'] = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < n; i++) {
        const info = gl.getActiveUniform(p, i)!;
        const nome = info.name.replace(/\[0\]$/, '');
        u[nome] = gl.getUniformLocation(p, info.name);
    }
    return { p, u };
}

// a malha de uma folha: nx × ny quadrados em (u, v) de 0 a 1, com a frente no sentido anti-horário vista de +z
export function malha(gl: WebGL2RenderingContext, nx: number, ny: number) {
    const uv: number[] = [];
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) uv.push(i / nx, j / ny);
    const idx: number[] = [];
    for (let j = 0; j < ny; j++)
        for (let i = 0; i < nx; i++) {
            const a = j * (nx + 1) + i;
            const b = a + 1;
            const c = a + nx + 1;
            const d = c + 1;
            idx.push(a, b, c, b, d, c);
        }
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return { vao, n: idx.length };
}

export function textura(gl: WebGL2RenderingContext, fonte: TexImageSource | null, mipmap = true) {
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    if (fonte) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fonte);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([236, 235, 231, 255]));
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (fonte && mipmap) {
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        const ext = gl.getExtension('EXT_texture_filter_anisotropic');
        if (ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    } else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    return t;
}

// um framebuffer com textura de cor (e, se pedido, um depth compartilhável)
export function quadroDeDesenho(gl: WebGL2RenderingContext, w: number, h: number, depth?: WebGLRenderbuffer | true) {
    const cor = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, cor);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, cor, 0);
    let rb: WebGLRenderbuffer | null = null;
    if (depth === true) {
        rb = gl.createRenderbuffer()!;
        gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
    } else if (depth) {
        rb = depth;
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fb, cor, rb, w, h };
}
export type Quadro = ReturnType<typeof quadroDeDesenho>;

export function liberarQuadro(gl: WebGL2RenderingContext, q: Quadro | null, comDepth: boolean) {
    if (!q) return;
    gl.deleteFramebuffer(q.fb);
    gl.deleteTexture(q.cor);
    if (comDepth && q.rb) gl.deleteRenderbuffer(q.rb);
}

// ---------- matrizes 4×4 (em colunas) ----------
export type M4 = Float32Array;

export function perspectiva(fovY: number, aspecto: number, perto: number, longe: number): M4 {
    const f = 1 / Math.tan(fovY / 2);
    const nf = 1 / (perto - longe);
    return new Float32Array([f / aspecto, 0, 0, 0, 0, f, 0, 0, 0, 0, (longe + perto) * nf, -1, 0, 0, 2 * longe * perto * nf, 0]);
}

export function olhar(olho: number[], alvo: number[], cima: number[]): M4 {
    const z = norm([olho[0] - alvo[0], olho[1] - alvo[1], olho[2] - alvo[2]]);
    const x = norm(cruz(cima, z));
    const y = cruz(z, x);
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -ponto(x, olho), -ponto(y, olho), -ponto(z, olho), 1]);
}

export function mult(a: M4, b: M4): M4 {
    const r = new Float32Array(16);
    for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++) {
            let s = 0;
            for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k];
            r[i * 4 + j] = s;
        }
    return r;
}

export const norm = (v: number[]) => {
    const l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
};
export const cruz = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const ponto = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
