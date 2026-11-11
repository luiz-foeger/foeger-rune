'use client';

import { useRef, type CSSProperties, type ElementType, type ReactNode } from 'react';
import { useVisivel } from '../_lib/movimento';

// o texto que sobe da máscara, o gesto que a Studio Namma repete no site inteiro (clone: portfolio-simulacao,
// nova/clone-namma/_comp/Mascara.tsx): ao chegar à tela, a linha sobe de trás da borda de baixo da própria caixa. O
// movimento está no clone.css (.fx-mascara); aqui fica só o gatilho, uma vez, com a linha já um pouco dentro da tela.
// "atraso" escalona as linhas de um mesmo bloco (o título e a nota embaixo dele)
export default function Mascara({
    como: Tag = 'span',
    className,
    atraso = 0,
    children,
    ...resto
}: {
    como?: ElementType;
    className?: string;
    atraso?: number;
    children: ReactNode;
    'aria-hidden'?: boolean;
}) {
    const ref = useRef<HTMLElement>(null);
    const visivel = useVisivel(ref, { umaVez: true, margem: '0px 0px -8% 0px' });
    return (
        <Tag ref={ref} className={className} data-visivel={visivel} style={atraso ? ({ '--atraso': `${atraso}s` } as CSSProperties) : undefined} {...resto}>
            <span className="fx-mascara">
                <span className="fx-mascara-linha">{children}</span>
            </span>
        </Tag>
    );
}
