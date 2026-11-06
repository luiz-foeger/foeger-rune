import type { CSSProperties, ReactNode, Ref, RefObject } from 'react';
import Seta from './Seta';

// as peças que se repetem nos cartões da Feixen: a barra de ferramentas, a régua vertical da direita, as faixas
// cinza, as janelinhas de controle, a seta de lupa e as lentes (a simples, a de transferidor e a lupa com cabo).
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

// as faixas cinza atrás das letras (no SVG do cartão)
export function Faixas({ topos, x0 = 60, x1, altura = 27 }: { topos: number[]; x0?: number; x1: number; altura?: number }) {
    return (
        <g aria-hidden>
            {topos.map(t => (
                <rect key={t} x={x0} y={t} width={x1 - x0} height={altura} fill="var(--faixa)" />
            ))}
        </g>
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

// a seta da ferramenta de lupa (um círculo com +, de cabo para baixo à esquerda)
export function SetaLupa({ ref, estilo }: { ref?: Ref<SVGSVGElement>; estilo?: CSSProperties }) {
    return (
        <svg ref={ref} className="fx-seta-lupa" viewBox="0 0 70 70" style={estilo} aria-hidden>
            <path d="M20 50L4 66" stroke="#111" strokeWidth="9" strokeLinecap="round" />
            <circle cx="36" cy="34" r="25" fill="#fff" stroke="#111" strokeWidth="5" />
            <path d="M24 34h24M36 22v24" stroke="#111" strokeWidth="5" />
        </svg>
    );
}

// a lente simples: disco claro com borda preta, e o conteúdo ampliado recortado no círculo
export function Lente({ id, cx, cy, r, children, borda = 2 }: { id: string; cx: number; cy: number; r: number; children: ReactNode; borda?: number }) {
    return (
        <g>
            <clipPath id={id}>
                <circle cx={cx} cy={cy} r={r} />
            </clipPath>
            <circle cx={cx} cy={cy} r={r} fill="#fbfbfa" />
            <g clipPath={`url(#${id})`}>{children}</g>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#111" strokeWidth={borda} />
        </g>
    );
}

// a lente de transferidor: a mesma lente com o anel de graduação, duas retas tracejadas pelo centro e o setor cinza
export function Transferidor({ id, cx, cy, r, children }: { id: string; cx: number; cy: number; r: number; children: ReactNode }) {
    const tracos: string[] = [];
    for (let g = 0; g < 360; g += 2) {
        const a = (g * Math.PI) / 180;
        const r0 = r - 16;
        const r1 = g % 10 === 0 ? r - 30 : r - 23;
        tracos.push(`M${(cx + Math.cos(a) * r0).toFixed(1)} ${(cy + Math.sin(a) * r0).toFixed(1)}L${(cx + Math.cos(a) * r1).toFixed(1)} ${(cy + Math.sin(a) * r1).toFixed(1)}`);
    }
    const reta = (graus: number) => {
        const a = (graus * Math.PI) / 180;
        return `M${(cx - Math.cos(a) * (r - 16)).toFixed(1)} ${(cy - Math.sin(a) * (r - 16)).toFixed(1)}L${(cx + Math.cos(a) * (r - 16)).toFixed(1)} ${(cy + Math.sin(a) * (r - 16)).toFixed(1)}`;
    };
    // o setor cinza, num ponto da reta tracejada de cima
    const a0 = (-112 * Math.PI) / 180;
    const sx = cx + Math.cos(a0) * r * 0.42;
    const sy = cy + Math.sin(a0) * r * 0.42;
    const setor = (raio: number, de: number, ate: number) => {
        const p = (g: number) => [sx + Math.cos((g * Math.PI) / 180) * raio, sy + Math.sin((g * Math.PI) / 180) * raio];
        const [x0, y0] = p(de);
        const [x1, y1] = p(ate);
        return `M${sx.toFixed(1)} ${sy.toFixed(1)}L${x0.toFixed(1)} ${y0.toFixed(1)}A${raio} ${raio} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}Z`;
    };
    return (
        <g>
            <clipPath id={id}>
                <circle cx={cx} cy={cy} r={r - 16} />
            </clipPath>
            <circle cx={cx} cy={cy} r={r} fill="#fbfbfa" />
            <g clipPath={`url(#${id})`}>
                {children}
                <path d={reta(-68) + reta(22)} stroke="#111" strokeWidth="1.2" strokeDasharray="5 4" fill="none" />
                <path d={setor(34, -150, -68)} fill="#b9b9b9" opacity="0.9" />
            </g>
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
    const nx = -ly;
    const ny = lx;
    const larg = 27;
    const pc = (t: number, s: number) => `${(cx + lx * t + nx * s).toFixed(1)} ${(cy + ly * t + ny * s).toFixed(1)}`;
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
