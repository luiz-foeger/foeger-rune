'use client';

import { useEffect, useRef, useState } from 'react';
import Painel from './Painel';
import { TITULO_ESTILOS } from '../_lib/conteudo';
import { useVisivel } from '../_lib/movimento';

// o "Seven* Styles" da Feixen: cada letra nova entra cinza e pendurada abaixo da linha, fica um instante e sobe preta
// para o lugar; a seguinte só vem depois. No fim, o asterisco entra depois da primeira palavra, pequeno e alto, e a
// nota do pé do painel explica. Ritmo tirado da gravação (a letra fica pendurada de ~0,1 a ~0,5 s).
type Passo = { n: number; asterisco: boolean; pendente: number | 'asterisco' | null; espera: number };

function roteiro(texto: string, comAsterisco: boolean): Passo[] {
    let s = 11;
    const sorteio = (min: number, max: number) => {
        s = (s * 9301 + 49297) % 233280;
        return min + (s / 233280) * (max - min);
    };
    const passos: Passo[] = [];
    for (let i = 1; i <= texto.length; i++) {
        if (texto[i - 1] === ' ') {
            passos.push({ n: i, asterisco: false, pendente: null, espera: 60 });
            continue;
        }
        passos.push({ n: i, asterisco: false, pendente: i - 1, espera: sorteio(90, 430) });
        passos.push({ n: i, asterisco: false, pendente: null, espera: sorteio(40, 140) });
    }
    if (comAsterisco) {
        passos.push({ n: texto.length, asterisco: false, pendente: null, espera: 260 });
        passos.push({ n: texto.length, asterisco: true, pendente: 'asterisco', espera: 240 });
        passos.push({ n: texto.length, asterisco: true, pendente: null, espera: 0 });
    }
    return passos;
}

// serve também para outros títulos digitados (o "Features" vira "Recursos"), sem asterisco nem nota
export default function TituloEstilos({
    texto = TITULO_ESTILOS.texto,
    asteriscoDepois = TITULO_ESTILOS.asteriscoDepois,
    nota = TITULO_ESTILOS.nota,
}: {
    texto?: string;
    asteriscoDepois?: number | null;
    nota?: string | null;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const visivel = useVisivel(ref, { limiar: 0.6, umaVez: true });
    const [passo, setPasso] = useState<Passo>({ n: 0, asterisco: false, pendente: null, espera: 0 });
    useEffect(() => {
        if (!visivel) return;
        const passos = roteiro(texto, asteriscoDepois !== null);
        let i = 0;
        let id = 0;
        const andar = () => {
            const p = passos[i];
            setPasso(p);
            i += 1;
            if (i < passos.length) id = window.setTimeout(andar, p.espera);
        };
        id = window.setTimeout(andar, 350);
        return () => window.clearTimeout(id);
    }, [visivel, texto, asteriscoDepois]);

    // a frase inteira fica no lugar desde o começo (as letras que faltam, invisíveis): na gravação, a palavra não
    // recentra enquanto é digitada, começa já no ponto em que a frase pronta fica centrada
    const letras = texto.split('');
    return (
        <Painel colunas={4} linhas={1} rotulo={texto}>
            <div ref={ref} className="fx-digitada">
                <div className="fx-titulo-estilos" aria-label={texto}>
                    {letras.map((ch, i) => (
                        <span key={i} className="fx-letra" data-oculta={i >= passo.n || undefined} data-pendente={passo.pendente === i || undefined} aria-hidden>
                            {ch}
                            {asteriscoDepois !== null && i === asteriscoDepois - 1 && (
                                <span className="fx-asterisco" data-oculta={!passo.asterisco || undefined} data-pendente={passo.pendente === 'asterisco' || undefined}>
                                    *
                                </span>
                            )}
                        </span>
                    ))}
                </div>
            </div>
            {nota && <p className="fx-nota">{nota}</p>}
        </Painel>
    );
}
