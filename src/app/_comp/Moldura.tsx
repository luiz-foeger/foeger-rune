import type { CSSProperties, ReactNode, RefObject } from 'react';
import Seta from './Seta';

// as peças que se repetem nos cartões: a barra de ferramentas, a régua vertical da direita e as janelinhas de controle
// (nas faixas coloridas) e, na seção do desgaste, as faixas cinza das linhas da fonte, a lente de transferidor, a lupa
// com cabo e a etiqueta do canto.
// Medidas em unidades do vídeo (u); dentro do SVG do cartão, 1 unidade = 1 u.
const u = (n: number) => `calc(${n} * var(--u))`;

export function Ferramentas({ lupa = false, estilo }: { lupa?: boolean; estilo?: CSSProperties }) {
    return (
        <div className="fx-ferramentas" style={estilo} aria-hidden>
            <div className="fx-janela-barra">
                <span>×</span>
                <span>»</span>
            </div>
            <div className="fx-ferramenta">
                <svg viewBox="0 0 30 30">
                    <circle cx="15" cy="15" r="11" fill="#111" />
                </svg>
            </div>
            <div className="fx-ferramenta">
                <svg viewBox="0 0 30 30">
                    <circle cx="15" cy="15" r="11" fill="none" stroke="#111" strokeWidth="1.6" />
                </svg>
            </div>
            <div className="fx-ferramenta">
                <svg viewBox="0 0 30 30">
                    <path d="M6 24L24 6" stroke="#111" strokeWidth="1.6" />
                    <path d="M4 24h4M22 6h4" stroke="#111" strokeWidth="1.6" />
                </svg>
            </div>
            {lupa && (
                <div className="fx-ferramenta" data-escura>
                    <svg viewBox="0 0 30 30">
                        <circle cx="16.5" cy="12.5" r="8" fill="none" stroke="#fff" strokeWidth="1.8" />
                        <path d="M12.5 12.5h8M16.5 8.5v8M10.5 18.5L5 24" stroke="#fff" strokeWidth="1.8" />
                    </svg>
                </div>
            )}
        </div>
    );
}

// a régua da direita: blocos de 01 a 12 com tracinhos e a barra preta, repetidos na altura do cartão
export function ReguaV({ altura, estilo }: { altura: number; estilo?: CSSProperties }) {
    const blocos = Math.max(1, Math.floor((altura - 6) / 203));
    return (
        <svg className="fx-regua-v" viewBox={`0 0 49 ${altura}`} preserveAspectRatio="none" style={estilo} aria-hidden>
            {Array.from({ length: blocos }, (_, bloco) => (
                <g key={bloco}>
                    {Array.from({ length: 12 }, (_, k) => {
                        const y = 12 + bloco * 203 + k * 16.6;
                        return (
                            <g key={k}>
                                <text x="1" y={y + 3.4} fontSize="9.5" fill="#111" fontFamily="var(--ff-ui)">
                                    {String(k + 1).padStart(2, '0')}
                                </text>
                                <path d={`M20 ${y}H27M23 ${y + 8.3}H27`} stroke="#111" strokeWidth="0.8" />
                            </g>
                        );
                    })}
                    <rect x="35" y={6 + bloco * 203} width="9" height="196" fill="#111" />
                </g>
            ))}
            <path d={`M29 4V${altura - 4}`} stroke="#111" strokeWidth="0.8" />
        </svg>
    );
}

// a janelinha com um ou mais controles deslizantes; o pegador de cada um é movido por fora (pela ref), em %
export type Controle = { nome: string; cor: string };
export function Janela({
    itens,
    pegadores,
    escura = false,
    seta,
    estilo,
}: {
    itens: Controle[];
    pegadores: RefObject<(HTMLSpanElement | null)[]>;
    escura?: boolean;
    seta?: number; // em qual pegador fica a seta do mouse
    estilo?: CSSProperties;
}) {
    return (
        <div className="fx-controle" data-escura={escura || undefined} style={estilo} aria-hidden>
            <div className="fx-janela-barra">
                <span>×</span>
                <span>»</span>
            </div>
            {itens.map((c, i) => (
                <div key={c.nome} className="fx-controle-item">
                    <div className="fx-controle-nome">{c.nome}</div>
                    <div className="fx-controle-trilho">
                        <span
                            ref={el => {
                                pegadores.current[i] = el;
                            }}
                            className="fx-controle-pegador"
                            style={{ background: c.cor }}
                        >
                            {seta === i && <Seta style={{ left: u(4), top: u(4) }} />}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}

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
