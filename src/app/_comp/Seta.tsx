import type { CSSProperties, Ref } from 'react';

// a seta do mouse que "usa" os cartões na gravação (preta com borda branca); a ponta fica no canto de cima
export default function Seta({ style, ref }: { style?: CSSProperties; ref?: Ref<SVGSVGElement> }) {
    return (
        <svg ref={ref} className="fx-seta" viewBox="0 0 30 44" style={style} aria-hidden>
            <path d="M2 2L2 35L10.5 27.5L16.5 41L22.5 38.5L16.5 25.5L28 25.5Z" fill="#111" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
        </svg>
    );
}
