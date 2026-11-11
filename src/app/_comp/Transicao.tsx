'use client';

import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLenis } from 'lenis/react';

// a transição entre as páginas, a do clone da Studio Namma (portfolio-simulacao, nova/clone-namma/_comp/Casca.tsx),
// medida no vídeo dela (45,45–48,3 s): meio segundo depois do clique, uma cortina desce com a borda de baixo
// inclinada, girando como um ponteiro preso bem à esquerda da tela (a borda vai de ~0,5° a ~12°; o pivô fica a ~1
// largura de tela à esquerda), e cobre tudo em ~1 s (power2.inOut). Por baixo, a página desce, gira ~2,5°, cresce até
// 1,3× e desbota. Com a tela coberta, a rota troca; na página nova, a cortina esmaece até a cor do fundo (~0,45 s),
// espera um pouco e sai, e a página sobe para o lugar. A cortina é preta, a mesma do menu do site.
// Fica no layout, por fora do [data-clone] (que tem container-type e prenderia o fixed), e por isso sobrevive à troca
// de rota: o palco (a página) e a cortina são os mesmos antes e depois. Com movimento reduzido, a troca é direta.
const ATRASO = 0.5;
const PIVO = 1.05;
const COBRIR = 1.0;
const CORTINA = '#111111';

type Curva = (x: number) => number;
// as curvas do GSAP que a análise do vídeo achou (power2 é a cúbica, power3 a quártica)
const power2InOut: Curva = x => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
const power3Out: Curva = x => 1 - (1 - x) ** 4;
const espera = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
// chama aCada(p) a cada quadro com o progresso já passado pela curva, de 0 a 1
function tween(duracao: number, curva: Curva, aCada: (p: number) => void) {
    return new Promise<void>(fim => {
        let inicio = -1;
        const passo = (agora: number) => {
            if (inicio < 0) inicio = agora;
            const x = Math.min(1, (agora - inicio) / 1000 / duracao);
            aCada(curva(x));
            if (x < 1) requestAnimationFrame(passo);
            else fim();
        };
        requestAnimationFrame(passo);
    });
}
// a borda descendo (o ponteiro preso à esquerda): t é a tangente do giro
const descendo = (t: number, W: number) => {
    const P = PIVO * W;
    return `polygon(0px 0px, ${W}px 0px, ${W}px ${((P + W) * t).toFixed(1)}px, 0px ${(P * t).toFixed(1)}px)`;
};
// mistura duas cores #rrggbb
const misturarCor = (de: string, para: string, k: number) => {
    const h = (c: string) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
    const [a, b] = [h(de), h(para)];
    return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(' ')})`;
};
// a cor do fundo da página (muda com a paleta), em #rrggbb
const fundoDaPagina = () => {
    const el = document.querySelector('[data-clone]');
    const v = el ? getComputedStyle(el).getPropertyValue('--fundo').trim() : '';
    return /^#[0-9a-f]{6}$/i.test(v) ? v : '#f8f8f8';
};

const Contexto = createContext<(href: string) => void>(() => {});
// a navegação com a cortina: os links das páginas, o menu e a logo usam esta função
export const useNavegar = () => useContext(Contexto);

export default function Transicao({ children }: { children: ReactNode }) {
    const caminho = usePathname();
    const rotas = useRouter();
    const lenis = useLenis();
    const lenisRef = useRef(lenis);
    useEffect(() => {
        lenisRef.current = lenis;
    }, [lenis]);
    const palco = useRef<HTMLDivElement>(null);
    const veu = useRef<HTMLDivElement>(null);
    const ocupado = useRef(false);
    // a troca em andamento: a rota de destino e a âncora (a seção) para onde a página nova rola
    const pendente = useRef<{ destino: string; ancora: string | null } | null>(null);

    // a posição de uma seção sem o deslocamento da entrada (o painel ainda fora da tela está 80 u abaixo do lugar dele)
    const topoDe = (id: string | null) => {
        const el = id ? document.getElementById(id) : null;
        if (!el) return 0;
        const t = getComputedStyle(el).transform;
        return el.getBoundingClientRect().top + window.scrollY - new DOMMatrix(t === 'none' ? undefined : t).m42 - 90;
    };

    const navegar = useCallback(
        async (href: string) => {
            const [destino, ancora = null] = href.split('#');
            if (ocupado.current) return;
            // na mesma página, só rola até a seção
            if (destino === caminho) {
                lenisRef.current?.scrollTo(topoDe(ancora), { duration: 1.4 });
                return;
            }
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                rotas.push(href);
                return;
            }
            const el = veu.current;
            const p = palco.current;
            if (!el || !p) return rotas.push(href);
            ocupado.current = true;
            rotas.prefetch(destino);
            await espera(ATRASO * 1000);
            // cobre: a borda desce girando e a página por baixo desce, gira, cresce e desbota
            const W = window.innerWidth;
            const H = window.innerHeight;
            const tmax = (H / (PIVO * W)) * 1.04;
            el.style.background = CORTINA;
            el.style.clipPath = descendo(0, W);
            el.style.display = 'block';
            p.style.transformOrigin = `50% ${(window.scrollY + H / 2).toFixed(0)}px`;
            await tween(COBRIR, power2InOut, k => {
                el.style.clipPath = descendo(k * tmax, W);
                p.style.transform = `translateY(${(k * 16).toFixed(3)}vh) rotate(${(k * 2.5).toFixed(3)}deg) scale(${(1 + 0.3 * k).toFixed(4)})`;
                p.style.opacity = String(1 - 0.45 * k);
            });
            el.style.clipPath = 'none';
            // com a tela coberta, a página volta ao lugar (escondida) e a rota troca
            p.style.transform = 'translateY(5vh)';
            p.style.opacity = '0';
            pendente.current = { destino, ancora };
            lenisRef.current?.scrollTo(0, { immediate: true, force: true });
            window.scrollTo(0, 0);
            rotas.push(destino, { scroll: false });
        },
        [caminho, rotas],
    );

    // a página nova chegou embaixo da cortina: rola até a seção, a cortina esmaece até o fundo e sai, e a página sobe
    useEffect(() => {
        const t = pendente.current;
        if (!t || t.destino !== caminho) return;
        pendente.current = null;
        let vivo = true;
        (async () => {
            await document.fonts.ready;
            await espera(60);
            if (!vivo) return;
            const el = veu.current;
            const p = palco.current;
            const y = topoDe(t.ancora);
            lenisRef.current?.scrollTo(y, { immediate: true, force: true });
            window.scrollTo(0, y);
            if (p) p.style.transformOrigin = '';
            const fundo = fundoDaPagina();
            await tween(0.45, power2InOut, k => {
                if (el) el.style.background = misturarCor(CORTINA, fundo, k);
            });
            await espera(250);
            if (el) el.style.display = 'none';
            await tween(0.6, power3Out, k => {
                if (!p) return;
                p.style.transform = `translateY(${((1 - k) * 5).toFixed(3)}vh)`;
                p.style.opacity = String(k);
            });
            if (p) {
                p.style.transform = '';
                p.style.opacity = '';
            }
            ocupado.current = false;
        })();
        return () => {
            vivo = false;
        };
    }, [caminho]);

    return (
        <Contexto.Provider value={navegar}>
            {/* a moldura corta a sobra dos lados quando a página cresce na troca (sem ela, aparecia a rolagem de lado) */}
            <div className="fx-palco-moldura">
                <div ref={palco} className="fx-palco">
                    {children}
                </div>
            </div>
            <div ref={veu} className="fx-transicao" aria-hidden />
        </Contexto.Provider>
    );
}
