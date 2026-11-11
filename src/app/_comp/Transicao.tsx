'use client';

import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLenis } from 'lenis/react';

// a transição entre as páginas, a do clone da Studio Namma (portfolio-simulacao, nova/clone-namma/_comp/Casca.tsx),
// medida no vídeo dela (45,45–48,3 s): no clique, uma cortina desce com a borda de baixo inclinada, girando como um
// ponteiro preso bem à esquerda da tela (a borda vai de ~0,5° a ~12°; o pivô fica a ~1 largura de tela à esquerda), e
// cobre tudo em ~0,9 s (power2.inOut). Por baixo, a página desce, gira ~2,5°, cresce até 1,3× e desbota. Com a tela
// coberta, a rota troca. Na saída, em vez do esmaecer até o fundo da Namma (que no preto passava por um cinza sujo),
// a cortina sobe como a do menu dela ao fechar: a borda inclinada para o outro lado, presa à direita, e a página nova
// se endireita por baixo (girada ao contrário, mais baixa e um pouco maior). A cortina é preta, a mesma do menu.
// Na troca, o html leva data-trocando: os títulos e os painéis da página nova esperam a cortina subir para entrar.
// Fica no layout, por fora do [data-clone] (que tem container-type e prenderia o fixed), e por isso sobrevive à troca
// de rota: o palco (a página) e a cortina são os mesmos antes e depois. Com movimento reduzido, a troca é direta.
const PIVO = 1.05;
const COBRIR = 0.9;
const DESCOBRIR = 0.85;
const ASSENTAR = 1.1;
const CORTINA = '#111111';

type Curva = (x: number) => number;
// a curva do GSAP que a análise do vídeo achou (power2.inOut, a cúbica)
const power2InOut: Curva = x => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
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
// a borda subindo, inclinada para o outro lado (mais baixa à esquerda): de k = 0, com o canto da direita no pé da
// tela, a k = 1, com o da esquerda no alto; a inclinação vai de ~11° a ~3° no caminho, como um ponteiro que assenta
const subindo = (k: number, W: number, H: number) => {
    const inclinacao = (0.2 - 0.14 * k) * W;
    const dir = H - k * (H + inclinacao);
    return `polygon(0px 0px, ${W}px 0px, ${W}px ${dir.toFixed(1)}px, 0px ${(dir + inclinacao).toFixed(1)}px)`;
};
const trocando = (sim: boolean) => document.documentElement.toggleAttribute('data-trocando', sim);

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
    const moldura = useRef<HTMLDivElement>(null);
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
            // cobre: a borda desce girando e a página por baixo desce, gira, cresce e escurece (atrás dela, a moldura
            // fica no preto da cortina: a página apaga rumo ao preto em vez de desbotar para o claro, e a folga que
            // abre em cima dela emenda com a cortina)
            const W = window.innerWidth;
            const H = window.innerHeight;
            const tmax = (H / (PIVO * W)) * 1.04;
            el.style.background = CORTINA;
            if (moldura.current) moldura.current.style.background = CORTINA;
            el.style.clipPath = descendo(0, W);
            el.style.display = 'block';
            p.style.transformOrigin = `50% ${(window.scrollY + H / 2).toFixed(0)}px`;
            await tween(COBRIR, power2InOut, k => {
                el.style.clipPath = descendo(k * tmax, W);
                p.style.transform = `translateY(${(k * 16).toFixed(3)}vh) rotate(${(k * 2.5).toFixed(3)}deg) scale(${(1 + 0.3 * k).toFixed(4)})`;
                p.style.opacity = String(1 - 0.45 * k);
            });
            el.style.clipPath = 'none';
            // com a tela coberta, a página some (e volta ao lugar, para a seção da nova ser medida certa) e a rota
            // troca; os títulos e os painéis da nova esperam
            p.style.opacity = '0';
            p.style.transform = '';
            trocando(true);
            pendente.current = { destino, ancora };
            lenisRef.current?.scrollTo(0, { immediate: true, force: true });
            window.scrollTo(0, 0);
            rotas.push(destino, { scroll: false });
        },
        [caminho, rotas],
    );

    // a página nova chegou embaixo da cortina: rola até a seção, a cortina sobe e a página se endireita e acende
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
            const W = window.innerWidth;
            const H = window.innerHeight;
            const pose = (k: number) => {
                if (!p) return;
                const r = 1 - k;
                p.style.transform = `translateY(${(r * 10).toFixed(3)}vh) rotate(${(-r * 2.5).toFixed(3)}deg) scale(${(1 + 0.1 * r).toFixed(4)})`;
                p.style.opacity = String(1 - 0.45 * r);
            };
            if (p) p.style.transformOrigin = `50% ${(y + H / 2).toFixed(0)}px`;
            pose(0);
            if (el) el.style.clipPath = subindo(0, W, H);
            // a cortina sobe e, ao mesmo tempo, a página se endireita e os títulos e painéis à vista entram
            trocando(false);
            await Promise.all([
                tween(DESCOBRIR, power2InOut, k => {
                    if (el) el.style.clipPath = subindo(k, W, H);
                }),
                // a página na mesma curva, só mais longa: termina de assentar já descoberta
                tween(ASSENTAR, power2InOut, pose),
            ]);
            if (el) {
                el.style.display = 'none';
                el.style.clipPath = '';
            }
            if (p) {
                p.style.transform = '';
                p.style.opacity = '';
                p.style.transformOrigin = '';
            }
            if (moldura.current) moldura.current.style.background = '';
            ocupado.current = false;
        })();
        return () => {
            vivo = false;
        };
    }, [caminho]);

    return (
        <Contexto.Provider value={navegar}>
            {/* a moldura corta a sobra dos lados quando a página cresce na troca (sem ela, aparecia a rolagem de lado) */}
            <div ref={moldura} className="fx-palco-moldura">
                <div ref={palco} className="fx-palco">
                    {children}
                </div>
            </div>
            <div ref={veu} className="fx-transicao" aria-hidden />
        </Contexto.Provider>
    );
}
