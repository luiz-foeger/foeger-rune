import type { CSSProperties, RefObject } from 'react';
import Seta from './Seta';

// as peças da Feixen que ainda ficam nas faixas coloridas: a barra de ferramentas, a régua vertical da direita e as
// janelinhas de controle (as lentes, a lupa e as faixas cinza saíram com os cartões antigos).
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
