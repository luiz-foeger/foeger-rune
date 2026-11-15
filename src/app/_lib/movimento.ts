'use client';

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

// visível na tela? com "uma vez", fica verdadeiro depois da primeira vez (a entrada dos painéis e a digitação)
export function useVisivel(ref: RefObject<Element | null>, { limiar = 0, umaVez = false, margem = '0px' } = {}) {
    const [visivel, setVisivel] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([e]) => {
                if (e.isIntersecting) {
                    setVisivel(true);
                    if (umaVez) obs.disconnect();
                } else if (!umaVez) setVisivel(false);
            },
            { threshold: limiar, rootMargin: margem },
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [ref, limiar, umaVez, margem]);
    return visivel;
}

// a página está coberta e não precisa desenhar: enquanto a cortina da troca de página desce por cima dela
// (Transicao.tsx; a página vira uma imagem que só gira e encolhe, e cada quadro desenhado por baixo obrigava a refazer
// essa imagem)
export const pausado = () => document.documentElement.hasAttribute('data-cobrindo');

// um laço de quadros (requestAnimationFrame) que só roda com o elemento na tela; recebe o tempo em segundos. Com
// "qps", pula quadros para não passar disso (os cartões com filtro de desgaste rodam a 30: o movimento é lento e cada
// quadro refaz os desfoques)
export function useLaco(ref: RefObject<Element | null>, quadro: (t: number) => void, qps = 60) {
    const ativo = useVisivel(ref);
    const fn = useRef(quadro);
    useLayoutEffect(() => {
        fn.current = quadro;
    });
    useEffect(() => {
        if (!ativo) return;
        let id = 0;
        let ultimo = -Infinity;
        const intervalo = 1000 / qps - 2;
        const passo = (agora: number) => {
            // coberta pela cortina da troca de página: nada a desenhar por trás dela
            if (agora - ultimo >= intervalo && !pausado()) {
                ultimo = agora;
                fn.current(agora / 1000);
            }
            id = requestAnimationFrame(passo);
        };
        id = requestAnimationFrame(passo);
        return () => cancelAnimationFrame(id);
    }, [ativo, qps]);
}

export const suave = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

// um ciclo de ida e volta: parado em 0, sobe, parado em 1, desce (tempos em segundos)
export function vaiEVolta(t: number, { parado0, sobe, parado1, desce }: { parado0: number; sobe: number; parado1: number; desce: number }) {
    const periodo = parado0 + sobe + parado1 + desce;
    let f = t % periodo;
    if (f < parado0) return 0;
    f -= parado0;
    if (f < sobe) return suave(f / sobe);
    f -= sobe;
    if (f < parado1) return 1;
    f -= parado1;
    return 1 - suave(f / desce);
}
