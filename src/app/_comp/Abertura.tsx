'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useLenis } from 'lenis/react';
import { LINHAS, PALAVRAS, type Ponto } from '../_lib/glifos';
import { RUNE } from '../_lib/conteudo';

// ——— a abertura ———
// a do clone da Studio Namma (portfolio-simulacao, nova/clone-namma/_comp/Abertura.tsx), com a Rune no lugar da palavra
// da Föeger: a câmera começa colada no u, com a palavra em linhas de construção (o contorno fino do Cut, as guias das
// linhas da fonte, com as medidas, e as das bordas de cada letra atravessando a tela, e as quinas marcadas), e se
// afasta até a palavra inteira; a tinta sobe por dentro das letras
// nas cores dos três estilos e no preto por último. A palavra fica onde o "Rune" do hero mora (o SVG de medida dele) e
// não sai dali: cheia de preto, ela é o próprio nome do hero, e a capa esmaece por cima dele (o hero não faz a entrada
// dele nem gasta letras enquanto ela está na tela, HeroPedras.tsx). Cobre a página desde o primeiro quadro; o
// cabeçalho espera escondido e o painel do alfabeto, embaixo, sobe e acende quando ela sai (clone.css, seção 28).
// Qualquer rolagem, toque, clique ou tecla pula para o fim da tinta. Com movimento reduzido, ela não existe. ~4 s
const palavra = PALAVRAS.Rune;
const SAIDA = 3.45; // a tinta preta cobriu tudo: daqui a capa esmaece (e é aonde o pulo leva)
const ESMAECE = 0.7; // o tempo da capa sumindo (o do clone.css, com folga)
const ZOOM = 3.4;
const CORES = ['var(--p-cut)', 'var(--p-polished)', 'var(--p-worn)', 'var(--tinta)'];
const GUIAS: { y: number; rotulo: string; embaixo?: boolean }[] = [
    { y: -LINHAS.maiuscula, rotulo: `MAIÚSCULA ${LINHAS.maiuscula}` },
    { y: -LINHAS.x, rotulo: `ALTURA DO X ${LINHAS.x}` },
    { y: 0, rotulo: 'LINHA DE BASE 0', embaixo: true },
];

// as curvas do clone (as do GSAP)
const power2InOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
const power3InOut = (x: number) => (x < 0.5 ? 8 * x ** 4 : 1 - (-2 * x + 2) ** 4 / 2);
const trecho = (v: number, a: number, b: number) => Math.min(1, Math.max(0, (v - a) / (b - a)));
const misturar = (a: number, b: number, k: number) => a + (b - a) * k;

// as caixas das letras e as quinas (os vértices do Cut, da esquerda para a direita, com a letra de cada uma), em
// unidades da fonte
const CAIXAS = palavra.glifos.map(g => {
    const vs = g.pedras.flatMap(p => p.vertices.flat());
    return { x0: Math.min(...vs.map(v => v[0])), x1: Math.max(...vs.map(v => v[0])), y0: Math.min(...vs.map(v => v[1])), y1: Math.max(...vs.map(v => v[1])) };
});
const QUINAS: { p: Ponto; letra: number }[] = palavra.glifos
    .flatMap((g, letra) => g.pedras.flatMap(p => p.vertices.flat()).map(p => ({ p, letra })))
    .sort((a, b) => a.p[0] - b.p[0]);

// as marcas das quinas, em estudo (no protótipo, /intro?quinas=...): azul, a cor forte do site, como as marcas azuis da
// abertura da Namma (a padrão); tinta, a cor do estilo de cada letra, as da tinta que vem depois; brancas, como as
// coordenadas dos cartões do desgaste; letras, as cores de cada letra do RUNE da seção escura. As pretas saíram
type Quinas = 'azul' | 'tinta' | 'brancas' | 'letras';
const TINTA_DA_LETRA = ['var(--p-cut)', 'var(--p-polished)', 'var(--p-worn)', 'var(--p-cut)'];
const marca = (q: Quinas, letra: number) =>
    q === 'azul'
        ? { fill: 'var(--p-frio)', stroke: 'var(--p-frio)' }
        : q === 'tinta'
          ? { fill: TINTA_DA_LETRA[letra], stroke: 'var(--tinta)' }
          : q === 'brancas'
            ? { fill: '#fff', stroke: 'var(--tinta)' }
            : { fill: RUNE[letra].cor, stroke: 'var(--tinta)' };

// k: px da tela por unidade da fonte; (ox, oy): onde fica o (0, 0) da fonte na tela; fs: a letra dos rótulos
type Medidas = { W: number; H: number; k: number; ox: number; oy: number; fs: number; quinas: Quinas };

export default function Abertura() {
    const id = useId().replace(/:/g, '');
    const lenis = useLenis();
    const [m, setM] = useState<Medidas | null>(null);
    const [saindo, setSaindo] = useState(false);
    const [acabou, setAcabou] = useState(false);
    const camera = useRef<SVGGElement>(null);
    const guias = useRef<SVGGElement>(null);
    const rotulos = useRef<SVGGElement>(null);
    const contornos = useRef<SVGGElement>(null);
    const pontos = useRef<SVGGElement>(null);
    const ondas = useRef<(SVGPathElement | null)[]>([]);

    // antes do primeiro quadro: volta ao topo e mede onde o "Rune" do hero mora
    useLayoutEffect(() => {
        const medida = document.querySelector<SVGSVGElement>('.fx-hero-medida');
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !medida) {
            setAcabou(true);
            return;
        }
        window.scrollTo(0, 0);
        const r = medida.getBoundingClientRect();
        const vb = medida.viewBox.baseVal;
        const k = r.width / vb.width;
        const W = window.innerWidth;
        const H = window.innerHeight;
        const pedido = new URLSearchParams(window.location.search).get('quinas');
        const quinas: Quinas = pedido === 'tinta' || pedido === 'brancas' || pedido === 'letras' ? pedido : 'azul';
        setM({ W, H, k, ox: r.left - vb.x * k, oy: r.top - vb.y * k, fs: Math.max(9, (14 * W) / (W < 900 ? 945 : 1889)), quinas });
    }, []);

    // a rolagem fica parada enquanto a capa cobre a página
    useEffect(() => {
        if (!lenis) return;
        if (saindo || acabou) lenis.start();
        else lenis.stop();
    }, [lenis, saindo, acabou]);

    // a capa esmaece e, depois, sai da página
    useEffect(() => {
        if (!saindo) return;
        const t = window.setTimeout(() => setAcabou(true), ESMAECE * 1000);
        return () => window.clearTimeout(t);
    }, [saindo]);

    // a linha do tempo
    useEffect(() => {
        if (!m) return;
        const { W, H, k, ox, oy } = m;
        const sx = (x: number) => ox + x * k;
        const sy = (y: number) => oy + y * k;
        const F = LINHAS.maiuscula;
        // a câmera: de 3,4× no u, perto do topo dele, até 1× na tela inteira (a palavra no lugar do hero)
        const u = CAIXAS[1];
        const foco0 = { x: sx(u.x0 + (u.x1 - u.x0) * 0.3), y: sy(u.y0 + F * 0.1) };
        // a onda, nas contas da fonte (a amplitude e o comprimento do clone, em frações da maiúscula)
        const onda = (topo: number, fase: number) => {
            const amp = F * 0.05;
            const comp = F * 0.7;
            const a = -1200;
            const b = palavra.largura + 1200;
            let d = `M${a} 3000L${a} ${topo.toFixed(1)}`;
            for (let x = a; x <= b; x += comp / 8) d += `L${x.toFixed(1)} ${(topo + Math.sin((x / comp) * Math.PI * 2 + fase) * amp).toFixed(1)}`;
            return `${d}L${b} 3000Z`;
        };
        const deOnda = F * 0.12;
        const ateOnda = -F * 1.35;
        const inicio = performance.now();
        let salto = 0;
        let quadro = 0;
        // o pulo: daqui para o fim da tinta (a linha do tempo é toda conta do tempo, então nada fica pela metade)
        const pular = () => {
            const t = (performance.now() - inicio) / 1000 + salto;
            if (t < SAIDA) salto += SAIDA - t;
        };
        const segurar = (e: Event) => {
            e.preventDefault();
            pular();
        };
        // com a janela mudando de tamanho, a palavra já não está no lugar do hero: a capa sai
        const mudou = () => setSaindo(true);
        window.addEventListener('wheel', segurar, { passive: false });
        window.addEventListener('touchmove', segurar, { passive: false });
        window.addEventListener('pointerdown', pular);
        window.addEventListener('keydown', pular);
        window.addEventListener('resize', mudou);
        const passo = (agora: number) => {
            const t = (agora - inicio) / 1000 + salto;
            // a câmera (0–2,2 s)
            const c = power3InOut(trecho(t, 0, 2.2));
            const s = misturar(ZOOM, 1, c);
            const fx = misturar(foco0.x, W / 2, c);
            const fy = misturar(foco0.y, H / 2, c);
            camera.current?.setAttribute('transform', `translate(${W / 2} ${H / 2}) scale(${s.toFixed(4)}) translate(${(-fx).toFixed(2)} ${(-fy).toFixed(2)})`);
            // as guias se desenham atravessando a tela (0–1,3 s), os rótulos acendem depois, e a construção some
            // enquanto a tinta enche, até o fim dela
            const some = 1 - trecho(t, 3.1, SAIDA);
            const g = guias.current;
            if (g) {
                [...g.children].forEach((el, i) => {
                    const kk = power2InOut(trecho(t, 0.05 + i * 0.04, 0.9 + i * 0.04));
                    const ln = el as SVGLineElement;
                    if (ln.dataset.eixo === 'h') ln.setAttribute('x2', misturar(-W, W * 2, kk).toFixed(1));
                    else ln.setAttribute('y2', misturar(-H, H * 2, kk).toFixed(1));
                });
                g.style.opacity = String(some);
            }
            if (rotulos.current) rotulos.current.style.opacity = String(0.6 * trecho(t, 0.9, 1.3) * some);
            if (contornos.current) contornos.current.style.opacity = String(trecho(t, 0.15, 0.8) * (1 - trecho(t, 3.2, SAIDA)));
            if (pontos.current) {
                [...pontos.current.children].forEach((el, i) => {
                    (el as SVGElement).style.opacity = String(trecho(t, 0.35 + i * 0.018, 0.45 + i * 0.018));
                });
                pontos.current.style.opacity = String(some);
            }
            // a tinta: as ondas sobem uma atrás da outra, nas cores dos estilos e no preto por último (2,2–3,45 s)
            CORES.forEach((_, j) => {
                const d = onda(misturar(deOnda, ateOnda, power2InOut(trecho(t, 2.2 + j * 0.15, 3.0 + j * 0.15))), t * 5 + j * 1.7);
                palavra.glifos.forEach((_, i) => ondas.current[i * CORES.length + j]?.setAttribute('d', d));
            });
            if (t < SAIDA) quadro = requestAnimationFrame(passo);
            else setSaindo(true);
        };
        quadro = requestAnimationFrame(passo);
        return () => {
            cancelAnimationFrame(quadro);
            window.removeEventListener('wheel', segurar);
            window.removeEventListener('touchmove', segurar);
            window.removeEventListener('pointerdown', pular);
            window.removeEventListener('keydown', pular);
            window.removeEventListener('resize', mudou);
        };
    }, [m]);

    if (acabou) return null;
    return (
        <div className="fx-abertura" data-saindo={saindo || undefined} aria-hidden>
            {m &&
                (() => {
                    const { W, H, k, ox, oy, fs, quinas } = m;
                    const sx = (x: number) => ox + x * k;
                    const sy = (y: number) => oy + y * k;
                    const xs = CAIXAS.flatMap(c => [sx(c.x0), sx(c.x1)]);
                    // as medidas só entram se couberem à direita da palavra (no celular, a palavra ocupa a largura toda);
                    // o maior rótulo tem 15 letras, ~0,7 da letra cada
                    const comRotulos = W - 2 * fs - 15 * 0.7 * fs > sx(CAIXAS[CAIXAS.length - 1].x1) + 2 * fs;
                    // as quinas acompanham o tamanho da letra (4,5 px com a maiúscula de ~330 px), entre 2,5 e 4,5
                    const raio = Math.min(4.5, Math.max(2.5, LINHAS.maiuscula * k * 0.0136));
                    // a câmera no primeiro quadro (para a palavra inteira não piscar antes dele)
                    const u = CAIXAS[1];
                    const fx = sx(u.x0 + (u.x1 - u.x0) * 0.3);
                    const fy = sy(u.y0 + LINHAS.maiuscula * 0.1);
                    return (
                        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
                            <defs>
                                {/* o corte de cada letra para a tinta, nas contas da fonte */}
                                {palavra.glifos.map((g, i) => (
                                    <clipPath key={i} id={`${id}-letra-${i}`}>
                                        {g.pedras.map((p, n) => (
                                            <path key={n} d={p.d} clipRule="evenodd" />
                                        ))}
                                    </clipPath>
                                ))}
                            </defs>
                            <g ref={camera} transform={`translate(${W / 2} ${H / 2}) scale(${ZOOM}) translate(${-fx} ${-fy})`}>
                                <g ref={guias} stroke="var(--tinta)" strokeOpacity={0.45} strokeWidth={1}>
                                    {GUIAS.map((l, i) => (
                                        <line key={`h${i}`} data-eixo="h" x1={-W} y1={sy(l.y)} x2={-W} y2={sy(l.y)} vectorEffect="non-scaling-stroke" />
                                    ))}
                                    {xs.map((x, i) => (
                                        <line key={`v${i}`} data-eixo="v" x1={x} y1={-H} x2={x} y2={-H} vectorEffect="non-scaling-stroke" />
                                    ))}
                                </g>
                                {/* as medidas das linhas da fonte, como nas faixas dos cartões do desgaste */}
                                <g ref={rotulos} className="fx-abertura-rotulo" fontSize={fs} style={{ opacity: 0 }}>
                                    {comRotulos &&
                                        GUIAS.map((l, i) => (
                                            <text key={i} x={W - 2 * fs} y={l.embaixo ? sy(l.y) + fs + 6 : sy(l.y) - 7} textAnchor="end">
                                                {l.rotulo}
                                            </text>
                                        ))}
                                </g>
                                <g transform={`translate(${ox} ${oy}) scale(${k})`}>
                                    <g ref={contornos} fill="none" stroke="var(--tinta)" strokeWidth={1} style={{ opacity: 0 }}>
                                        {palavra.glifos.flatMap((g, i) => g.pedras.map((p, n) => <path key={`${i}-${n}`} d={p.d} vectorEffect="non-scaling-stroke" />))}
                                    </g>
                                    {palavra.glifos.map((g, i) => (
                                        <g key={i} clipPath={`url(#${id}-letra-${i})`}>
                                            {CORES.map((cor, j) => (
                                                <path
                                                    key={j}
                                                    ref={el => {
                                                        ondas.current[i * CORES.length + j] = el;
                                                    }}
                                                    fill={cor}
                                                />
                                            ))}
                                        </g>
                                    ))}
                                </g>
                                {/* as quinas do Cut, marcadas */}
                                <g ref={pontos}>
                                    {QUINAS.map(({ p: [x, y], letra }, i) => (
                                        <circle key={i} cx={sx(x)} cy={sy(y)} r={raio} {...marca(quinas, letra)} strokeWidth={1.2} vectorEffect="non-scaling-stroke" style={{ opacity: 0 }} />
                                    ))}
                                </g>
                            </g>
                        </svg>
                    );
                })()}
        </div>
    );
}
