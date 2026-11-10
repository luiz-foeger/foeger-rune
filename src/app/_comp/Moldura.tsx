import type { CSSProperties, ReactNode } from 'react';

// as peças que se repetem nos cartões da seção do desgaste: as faixas cinza das linhas da fonte, a lente de
// transferidor, a lupa com cabo e a etiqueta do canto.
// Medidas em unidades do vídeo (u); dentro do SVG do cartão, 1 unidade = 1 u.

// ---- as peças dos cartões da seção do desgaste (dentro do SVG do cartão, 1 unidade = 1 u) ----

// as faixas cinza das linhas da fonte, atrás das letras; com rótulo, o nome e a medida de verdade na ponta direita
export function Faixas({ faixas, x0 = 60, x1, altura = 27 }: { faixas: { topo: number; rotulo?: string }[]; x0?: number; x1: number; altura?: number }) {
    return (
        <g aria-hidden>
            {faixas.map(f => (
                <g key={f.topo}>
                    <rect x={x0} y={f.topo} width={x1 - x0} height={altura} fill="var(--faixa)" />
                    {f.rotulo && (
                        <text className="fx-guia-rotulo" x={x1 - 8} y={f.topo + altura / 2 + 4.5} textAnchor="end" fill="#111">
                            {f.rotulo}
                        </text>
                    )}
                </g>
            ))}
        </g>
    );
}

// a lente de transferidor: o disco claro com o anel graduado (de 2 em 2 graus) e o conteúdo ampliado recortado
export function Transferidor({ id, cx, cy, r, children }: { id: string; cx: number; cy: number; r: number; children: ReactNode }) {
    const tracos: string[] = [];
    for (let g = 0; g < 360; g += 2) {
        const a = (g * Math.PI) / 180;
        const r0 = r - 16;
        const r1 = g % 10 === 0 ? r - 30 : r - 23;
        tracos.push(`M${(cx + Math.cos(a) * r0).toFixed(1)} ${(cy + Math.sin(a) * r0).toFixed(1)}L${(cx + Math.cos(a) * r1).toFixed(1)} ${(cy + Math.sin(a) * r1).toFixed(1)}`);
    }
    return (
        <g>
            <clipPath id={id}>
                <circle cx={cx} cy={cy} r={r - 16} />
            </clipPath>
            <circle cx={cx} cy={cy} r={r} fill="#fbfbfa" />
            <g clipPath={`url(#${id})`}>{children}</g>
            <path d={tracos.join('')} stroke="#111" strokeWidth="1" />
            <circle cx={cx} cy={cy} r={r - 16} fill="none" stroke="#111" strokeWidth="1.2" />
            <circle cx={cx} cy={cy} r={r - 4} fill="none" stroke="#111" strokeWidth="1" />
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#111" strokeWidth="2.6" />
        </g>
    );
}

// a lupa com cabo (os cartões de 1 módulo): o disco, o colar e o cabo preto saindo para baixo e à direita
export function Lupa({ id, cx, cy, r, children }: { id: string; cx: number; cy: number; r: number; children: ReactNode }) {
    const ang = Math.PI / 4;
    const arcoColar = (raio: number, de: number, ate: number) => {
        const a = (de * Math.PI) / 180;
        const b = (ate * Math.PI) / 180;
        return `M${(cx + Math.cos(a) * raio).toFixed(1)} ${(cy + Math.sin(a) * raio).toFixed(1)}A${raio} ${raio} 0 0 1 ${(cx + Math.cos(b) * raio).toFixed(1)} ${(cy + Math.sin(b) * raio).toFixed(1)}`;
    };
    const cabo0 = r + 22;
    const cabo1 = r + 170;
    const lx = Math.cos(ang);
    const ly = Math.sin(ang);
    const larg = 27;
    const pc = (t: number, s: number) => `${(cx + lx * t - ly * s).toFixed(1)} ${(cy + ly * t + lx * s).toFixed(1)}`;
    return (
        <g>
            <clipPath id={id}>
                <circle cx={cx} cy={cy} r={r} />
            </clipPath>
            <circle cx={cx} cy={cy} r={r} fill="#fbfbfa" />
            <g clipPath={`url(#${id})`}>{children}</g>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#111" strokeWidth="2" />
            <path d={arcoColar(r + 7, 8, 82)} stroke="#111" strokeWidth="9" fill="none" />
            <path d={arcoColar(r + 17, 18, 72)} stroke="#111" strokeWidth="6" fill="none" />
            <path d={`M${pc(cabo0, -larg)}L${pc(cabo1, -larg)}L${pc(cabo1, larg)}L${pc(cabo0, larg)}Z`} fill="#111" />
        </g>
    );
}

// a etiqueta do canto (a letra inteira pequena, com um círculo onde a lupa está olhando)
export function Etiqueta({ children, estilo }: { children: ReactNode; estilo?: CSSProperties }) {
    return (
        <div className="fx-etiqueta" style={estilo} aria-hidden>
            {children}
        </div>
    );
}
