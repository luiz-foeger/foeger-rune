'use client';

// a rolagem suave (Lenis), a mesma do site onde o clone nasceu: o livro marca a roda que usa (lenisStopPropagation)
import type { ReactNode } from 'react';
import { ReactLenis } from 'lenis/react';

export default function Rolagem({ children }: { children: ReactNode }) {
    return (
        <ReactLenis root options={{ lerp: 0.1, duration: 1.5, smoothWheel: true }}>
            {children}
        </ReactLenis>
    );
}
