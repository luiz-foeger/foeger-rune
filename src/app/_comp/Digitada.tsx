'use client';

import { useEffect, useRef, useState } from 'react';
import Painel from './Painel';
import { FRASE } from '../_lib/conteudo';
import { useVisivel } from '../_lib/movimento';

// a frase digitada letra a letra quando a linha dela chega à tela (70 a 230 ms por tecla, como na gravação), com o
// cursor laranja, que fica aceso enquanto digita e depois pisca. Texto e cursor ficam centrados juntos. A conta é
// pela linha, não pelo painel: com o painel parado pela metade na tela, a frase já aparece (antes, com 60% do painel,
// ele ficava em branco).
// O calt fica ligado: as letras repetidas saem com as variações da fonte.
// É uma seção sem régua: o painel aberto, direto no fundo, com a trama sumindo nas bordas.
function intervalos(n: number) {
    // sorteio fixo (o mesmo ritmo a cada visita)
    let s = 7;
    return Array.from({ length: n }, () => {
        s = (s * 9301 + 49297) % 233280;
        return 70 + (s / 233280) * 160;
    });
}

export default function Digitada() {
    const ref = useRef<HTMLDivElement>(null);
    const visivel = useVisivel(ref, { limiar: 0.3, umaVez: true });
    const [n, setN] = useState(0);
    useEffect(() => {
        if (!visivel) return;
        const passos = intervalos(FRASE.length);
        let i = 0;
        let id = window.setTimeout(function tecla() {
            i += 1;
            setN(i);
            if (i < FRASE.length) id = window.setTimeout(tecla, passos[i]);
        }, 450);
        return () => window.clearTimeout(id);
    }, [visivel]);
    return (
        <Painel colunas={4} linhas={1} rotulo={FRASE} aberto>
            <div className="fx-digitada">
                <div ref={ref} className="fx-digitada-texto" data-digitando={n > 0 && n < FRASE.length}>
                    {FRASE.slice(0, n)}
                    <i className="fx-cursor-texto" aria-hidden />
                </div>
            </div>
        </Painel>
    );
}
