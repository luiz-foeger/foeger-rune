'use client';

import { useRef, type CSSProperties, type ReactNode } from 'react';
import { useVisivel } from '../_lib/movimento';

// o painel da Feixen: moldura com a trama pontilhada, réguas em cima e embaixo e letras nos lados, tudo tirado da
// grade de módulos (413) e calhas (59). Cada coluna leva dois números da régua (4 3 nas pares, 2 1 nas ímpares), com
// um traço no meio e traços dobrados nas calhas; cada fileira leva duas letras (B A embaixo, D C acima).
// No celular (até 899 px), a página tem 2 colunas de módulo: o painel usa "celular" (ou, sem ele, no máximo 2
// colunas e as mesmas fileiras), e as réguas e as letras dos lados saem nas duas versões, uma escondida pelo CSS.
const M = 413;
const G = 59;
const u = (n: number) => `calc(${n} * var(--u))`;

export function Regua({ colunas, lado, classe }: { colunas: number; lado: 'topo' | 'base'; classe?: string }) {
    const nums: ReactNode[] = [];
    const tracos: number[] = [];
    for (let i = 0; i < colunas; i++) {
        const x = i * (M + G);
        // num cartão de uma coluna só, a régua conta 2 1
        const [a, b] = colunas === 1 || i % 2 === 1 ? [2, 1] : [4, 3];
        nums.push(
            <span key={`a${i}`} className="fx-regua-num" style={{ left: u(x + M * 0.25) }}>{a}</span>,
            <span key={`b${i}`} className="fx-regua-num" style={{ left: u(x + M * 0.75) }}>{b}</span>,
        );
        tracos.push(x + M / 2);
        if (i > 0) tracos.push(x);
        if (i < colunas - 1) tracos.push(x + M);
    }
    return (
        <div className={classe ? `fx-regua ${classe}` : 'fx-regua'} data-lado={lado} aria-hidden>
            {nums}
            {tracos.map(x => <i key={x} className="fx-regua-traco" style={{ left: u(x) }} />)}
        </div>
    );
}

function Lado({ linhas, lado, classe }: { linhas: number; lado: 'esq' | 'dir'; classe?: string }) {
    const letras: ReactNode[] = [];
    const tracos: number[] = [];
    for (let j = 0; j < linhas; j++) {
        const y = j * (M + G);
        const p = linhas - 1 - j;
        const [a, b] = [String.fromCharCode(66 + 2 * p), String.fromCharCode(65 + 2 * p)];
        letras.push(
            <span key={`a${j}`} className="fx-lado-letra" style={{ top: u(y + M * 0.25) }}>{a}</span>,
            <span key={`b${j}`} className="fx-lado-letra" style={{ top: u(y + M * 0.75) }}>{b}</span>,
        );
        tracos.push(y + M / 2);
        if (j > 0) tracos.push(y);
        if (j < linhas - 1) tracos.push(y + M);
    }
    return (
        <div className={classe ? `fx-lado ${classe}` : 'fx-lado'} data-lado={lado} aria-hidden>
            {letras}
            {tracos.map(y => <i key={y} className="fx-lado-traco" style={{ top: u(y) }} />)}
        </div>
    );
}

export default function Painel({
    colunas,
    linhas,
    children,
    rotulo,
    estilo,
    solto = false,
    celular,
}: {
    colunas: number;
    linhas: number;
    children?: ReactNode;
    rotulo?: string;
    estilo?: CSSProperties; // o lugar na grade dos cartões
    solto?: boolean; // sem moldura, sem trama e sem letras dos lados, só a régua de baixo (as palavras soltas das faixas)
    celular?: { colunas: number; linhas: number }; // o tamanho no celular, quando não é o padrão
}) {
    const ref = useRef<HTMLElement>(null);
    // entra quando um quinto dele já está na tela, como na gravação (o painel de baixo aparece ainda apagado)
    const visivel = useVisivel(ref, { limiar: 0.2, umaVez: true });
    const colC = celular?.colunas ?? Math.min(2, colunas);
    const linC = celular?.linhas ?? linhas;
    const muda = colC !== colunas || linC !== linhas;
    const largo = muda ? 'fx-so-largo' : undefined;
    return (
        <section
            ref={ref}
            aria-label={rotulo}
            className="fx-painel fx-revela"
            data-visivel={visivel}
            data-solto={solto || undefined}
            style={{ '--col': colunas, '--lin': linhas, '--col-c': colC, '--lin-c': linC, ...estilo } as CSSProperties}
        >
            {!solto && <Regua colunas={colunas} lado="topo" classe={largo} />}
            <Regua colunas={colunas} lado="base" classe={largo} />
            {!solto && <Lado linhas={linhas} lado="esq" classe={largo} />}
            {!solto && <Lado linhas={linhas} lado="dir" classe={largo} />}
            {muda && (
                <>
                    {!solto && <Regua colunas={colC} lado="topo" classe="fx-so-celular" />}
                    <Regua colunas={colC} lado="base" classe="fx-so-celular" />
                    {!solto && <Lado linhas={linC} lado="esq" classe="fx-so-celular" />}
                    {!solto && <Lado linhas={linC} lado="dir" classe="fx-so-celular" />}
                </>
            )}
            <div className="fx-tela">{children}</div>
        </section>
    );
}
