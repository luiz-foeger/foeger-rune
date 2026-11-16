'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useLenis } from 'lenis/react';
import { FiltroDesgaste, ajustarDesgaste } from './Desgaste';
import { LINHAS, PALAVRAS, type Ponto } from '../_lib/glifos';

// ——— a abertura ———
// a do clone da Studio Namma (portfolio-simulacao, nova/clone-namma/_comp/Abertura.tsx, ~4,6 s), com a Rune no lugar
// da palavra da Föeger: a câmera começa colada no u, com a palavra em linhas de construção (o contorno fino do Cut, as
// guias das linhas da fonte, com as medidas, e as das bordas de cada letra atravessando a tela, e as quinas marcadas
// como nos cartões do desgaste), e se afasta até a palavra inteira; a tinta sobe por dentro das letras nas cores dos
// três estilos e no preto por último; a palavra se gasta da Cut à Worn (o mesmo desfoque da fonte) e as letras descem
// por trás da linha mais baixa, da esquerda para a direita, borradas na vertical. A palavra fica onde o "Rune" do hero
// mora (o SVG de medida dele): quando a abertura sai, o hero faz a entrada dele (as fatias do topo e a subida), que
// esperava pelo data-trocando, como na troca de página. Cobre a página desde o primeiro quadro, e o cabeçalho espera
// por baixo (clone.css, seção 28); qualquer rolagem, toque, clique ou tecla pula para a descida. Com movimento
// reduzido, ela não existe. Dura ~5 s
const palavra = PALAVRAS.Rune;
const DUR = 5.05;
const SAIDA = 4.3; // aonde o pulo leva: o começo da descida
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
const power3In = (x: number) => x ** 4;
const trecho = (v: number, a: number, b: number) => Math.min(1, Math.max(0, (v - a) / (b - a)));
const misturar = (a: number, b: number, k: number) => a + (b - a) * k;

// as caixas das letras e as quinas (os vértices do Cut, da esquerda para a direita), em unidades da fonte
const CAIXAS = palavra.glifos.map(g => {
    const vs = g.pedras.flatMap(p => p.vertices.flat());
    return { x0: Math.min(...vs.map(v => v[0])), x1: Math.max(...vs.map(v => v[0])), y0: Math.min(...vs.map(v => v[1])), y1: Math.max(...vs.map(v => v[1])) };
});
const QUINAS: Ponto[] = palavra.glifos.flatMap(g => g.pedras.flatMap(p => p.vertices.flat())).sort((a, b) => a[0] - b[0]);
const FUNDO = Math.max(...CAIXAS.map(c => c.y1)); // a linha mais baixa da palavra, onde o hero corta a entrada

// k: px da tela por unidade da fonte; (ox, oy): onde fica o (0, 0) da fonte na tela; fs: a letra dos rótulos
type Medidas = { W: number; H: number; k: number; ox: number; oy: number; fs: number };

export default function Abertura() {
    const id = useId().replace(/:/g, '');
    const lenis = useLenis();
    const [m, setM] = useState<Medidas | null>(null);
    const [acabou, setAcabou] = useState(false);
    const camera = useRef<SVGGElement>(null);
    const guias = useRef<SVGGElement>(null);
    const rotulos = useRef<SVGGElement>(null);
    const contornos = useRef<SVGGElement>(null);
    const pontos = useRef<SVGGElement>(null);
    const raiz = useRef<SVGGElement>(null);
    const borrao = useRef<SVGFEGaussianBlurElement>(null);
    const letras = useRef<(SVGGElement | null)[]>([]);
    const tintas = useRef<(SVGGElement | null)[]>([]);
    const cheias = useRef<(SVGGElement | null)[]>([]);
    const ondas = useRef<(SVGPathElement | null)[]>([]);

    // antes do primeiro quadro: segura as entradas da página (o hero, os títulos, os painéis), volta ao topo e mede
    // onde o "Rune" do hero mora
    useLayoutEffect(() => {
        const sair = () => {
            document.documentElement.removeAttribute('data-trocando');
            setAcabou(true);
        };
        const medida = document.querySelector<SVGSVGElement>('.fx-hero-medida');
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !medida) {
            sair();
            return;
        }
        document.documentElement.setAttribute('data-trocando', '');
        window.scrollTo(0, 0);
        const r = medida.getBoundingClientRect();
        const vb = medida.viewBox.baseVal;
        const k = r.width / vb.width;
        const W = window.innerWidth;
        const H = window.innerHeight;
        setM({ W, H, k, ox: r.left - vb.x * k, oy: r.top - vb.y * k, fs: Math.max(9, (14 * W) / (W < 900 ? 945 : 1889)) });
        return () => document.documentElement.removeAttribute('data-trocando');
    }, []);

    // a rolagem fica parada enquanto ela está na tela
    useEffect(() => {
        if (!lenis) return;
        if (acabou) lenis.start();
        else lenis.stop();
    }, [lenis, acabou]);

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
        let inicio = performance.now();
        let salto = 0;
        let quadro = 0;
        let cheio = false;
        const acabar = () => {
            document.documentElement.removeAttribute('data-trocando');
            setAcabou(true);
        };
        // o pulo: daqui para a descida (o resto da linha do tempo já é a conta do tempo, então nada fica pela metade)
        const pular = () => {
            const t = (performance.now() - inicio) / 1000 + salto;
            if (t < SAIDA) salto += SAIDA - t;
        };
        const segurar = (e: Event) => {
            e.preventDefault();
            pular();
        };
        // com a janela mudando de tamanho, a palavra já não está no lugar do hero: sai
        const mudou = () => {
            inicio = -Infinity;
        };
        window.addEventListener('wheel', segurar, { passive: false });
        window.addEventListener('touchmove', segurar, { passive: false });
        window.addEventListener('pointerdown', pular);
        window.addEventListener('keydown', pular);
        window.addEventListener('resize', mudou);
        ajustarDesgaste(raiz.current, 0, 0, k);
        const passo = (agora: number) => {
            const t = (agora - inicio) / 1000 + salto;
            // a câmera (0–2,2 s)
            const c = power3InOut(trecho(t, 0, 2.2));
            const s = misturar(ZOOM, 1, c);
            const fx = misturar(foco0.x, W / 2, c);
            const fy = misturar(foco0.y, H / 2, c);
            camera.current?.setAttribute('transform', `translate(${W / 2} ${H / 2}) scale(${s.toFixed(4)}) translate(${(-fx).toFixed(2)} ${(-fy).toFixed(2)})`);
            // as guias se desenham atravessando a tela (0–1,3 s), os rótulos acendem depois, e tudo some quando a tinta
            // enche (3,15–3,5 s)
            const g = guias.current;
            if (g) {
                [...g.children].forEach((el, i) => {
                    const kk = power2InOut(trecho(t, 0.05 + i * 0.04, 0.9 + i * 0.04));
                    const ln = el as SVGLineElement;
                    if (ln.dataset.eixo === 'h') ln.setAttribute('x2', misturar(-W, W * 2, kk).toFixed(1));
                    else ln.setAttribute('y2', misturar(-H, H * 2, kk).toFixed(1));
                });
                g.style.opacity = String(1 - trecho(t, 3.15, 3.5));
            }
            if (rotulos.current) rotulos.current.style.opacity = String(0.6 * trecho(t, 0.9, 1.3) * (1 - trecho(t, 3.15, 3.5)));
            if (contornos.current) contornos.current.style.opacity = String(trecho(t, 0.15, 0.8) * (1 - trecho(t, 3.2, 3.5)));
            if (pontos.current) {
                [...pontos.current.children].forEach((el, i) => {
                    (el as SVGElement).style.opacity = String(trecho(t, 0.35 + i * 0.018, 0.45 + i * 0.018));
                });
                pontos.current.style.opacity = String(1 - trecho(t, 3.1, 3.4));
            }
            // a tinta: as ondas sobem uma atrás da outra, nas cores dos estilos e no preto por último (2,2–3,45 s)
            CORES.forEach((_, j) => {
                const d = onda(misturar(deOnda, ateOnda, power2InOut(trecho(t, 2.2 + j * 0.15, 3.0 + j * 0.15))), t * 5 + j * 1.7);
                palavra.glifos.forEach((_, i) => ondas.current[i * CORES.length + j]?.setAttribute('d', d));
            });
            // cheia de preto, a letra de tinta dá lugar à desenhada, igual, que o filtro de desgaste pode gastar
            const agoraCheio = t >= 3.45;
            if (agoraCheio !== cheio) {
                cheio = agoraCheio;
                tintas.current.forEach(el => el?.style.setProperty('opacity', cheio ? '0' : '1'));
                cheias.current.forEach(el => el?.style.setProperty('opacity', cheio ? '1' : '0'));
            }
            // o desgaste, da Cut à Worn (3,5–4,3 s), com a curva do passeio da régua
            if (cheio) {
                const x = trecho(t, 3.5, 4.3);
                const suave = x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2;
                ajustarDesgaste(raiz.current, 50 * suave, 50 * suave, k);
            }
            // a saída: cada letra desce por trás da linha mais baixa, borrada na vertical (4,35–5,05 s)
            letras.current.forEach((el, i) => {
                const kk = power3In(trecho(t, 4.35 + i * 0.06, 4.85 + i * 0.06));
                el?.setAttribute('transform', `translate(0 ${(kk * F * 1.3).toFixed(2)})`);
            });
            borrao.current?.setAttribute('stdDeviation', `0 ${((trecho(t, 4.4, 4.85) * 10) / k).toFixed(2)}`);
            if (t < DUR) quadro = requestAnimationFrame(passo);
            else acabar();
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
        <div className="fx-abertura" aria-hidden>
            {m &&
                (() => {
                    const { W, H, k, ox, oy, fs } = m;
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
                                {/* nas contas da fonte: a linha mais baixa da palavra, a desfocagem da descida e o corte de cada
                                    letra para a tinta */}
                                <clipPath id={`${id}-base`}>
                                    <rect x={-5000} y={-5000} width={palavra.largura + 10000} height={5000 + FUNDO + 2} />
                                </clipPath>
                                <filter id={`${id}-borrao`} x="-20%" y="-60%" width="140%" height="220%">
                                    <feGaussianBlur ref={borrao} stdDeviation="0 0" />
                                </filter>
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
                                    {comRotulos && GUIAS.map((l, i) => (
                                        <text key={i} x={W - 2 * fs} y={l.embaixo ? sy(l.y) + fs + 6 : sy(l.y) - 7} textAnchor="end">
                                            {l.rotulo}
                                        </text>
                                    ))}
                                </g>
                                <g transform={`translate(${ox} ${oy}) scale(${k})`}>
                                    <g ref={contornos} fill="none" stroke="var(--tinta)" strokeWidth={1} style={{ opacity: 0 }}>
                                        {palavra.glifos.flatMap((g, i) => g.pedras.map((p, n) => <path key={`${i}-${n}`} d={p.d} vectorEffect="non-scaling-stroke" />))}
                                    </g>
                                    <g clipPath={`url(#${id}-base)`}>
                                        <g ref={raiz} filter={`url(#${id}-borrao)`}>
                                            {palavra.glifos.map((g, i) => (
                                                <g
                                                    key={i}
                                                    ref={el => {
                                                        letras.current[i] = el;
                                                    }}
                                                >
                                                    <g
                                                        ref={el => {
                                                            tintas.current[i] = el;
                                                        }}
                                                        clipPath={`url(#${id}-letra-${i})`}
                                                    >
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
                                                    <g
                                                        ref={el => {
                                                            cheias.current[i] = el;
                                                        }}
                                                        style={{ opacity: 0 }}
                                                    >
                                                        <FiltroDesgaste id={`${id}-d${i}`} modo="ambos" />
                                                        {g.pedras.map((p, n) => (
                                                            <path key={n} d={p.d} fill="var(--tinta)" fillRule="evenodd" filter={`url(#${id}-d${i})`} />
                                                        ))}
                                                    </g>
                                                </g>
                                            ))}
                                        </g>
                                    </g>
                                </g>
                                {/* as quinas do Cut, marcadas como nos cartões do desgaste */}
                                <g ref={pontos}>
                                    {QUINAS.map(([x, y], i) => (
                                        <circle key={i} cx={sx(x)} cy={sy(y)} r={raio} fill="#fff" stroke="var(--tinta)" strokeWidth={1.2} vectorEffect="non-scaling-stroke" style={{ opacity: 0 }} />
                                    ))}
                                </g>
                            </g>
                        </svg>
                    );
                })()}
        </div>
    );
}
