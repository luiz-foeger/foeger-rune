'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// o inspetor das faixas: passando o mouse num texto de qualquer peça, uma etiqueta junto do ponteiro diz a fonte e o
// tamanho dele (o corpo de verdade na tela), e o texto ganha um contorno. No toque, aparece ao tocar e some sozinho.
// Fica no lugar das legendas de tamanho que iam embaixo das peças. A fonte sai do nome que o navegador resolveu,
// comparado com as variáveis das fontes do layout (o next/font dá nomes gerados a elas)
const NOMES: [string, string][] = [
    ['--ff-cut', 'Föeger Rune Cut'],
    ['--ff-polished', 'Föeger Rune Polished'],
    ['--ff-worn', 'Föeger Rune Worn'],
    ['--ff-ui', 'Inter Tight'],
    ['--ff-mono', 'DM Mono'],
];
type Alvo = { nome: string; px: number; x: number; y: number; caixa: DOMRect };

const primeira = (lista: string) => lista.split(',')[0].trim().replace(/['"]/g, '');

export default function Inspetor({ escopo }: { escopo: string }) {
    const [alvo, setAlvo] = useState<Alvo | null>(null);
    useEffect(() => {
        const raiz = document.querySelector(escopo);
        if (!raiz) return;
        const cs = getComputedStyle(document.body);
        const familias = NOMES.map(([v, nome]) => [primeira(cs.getPropertyValue(v)), nome] as const);
        const nomeDe = (ff: string) => familias.find(([f]) => f === primeira(ff))?.[1] ?? primeira(ff);
        // só conta o elemento que tem texto dele mesmo (não o painel inteiro que tem textos dentro)
        const temTexto = (el: Element) => Array.from(el.childNodes).some(n => n.nodeType === Node.TEXT_NODE && n.textContent?.trim());
        let some = 0;
        let quadro = 0;
        const ver = (e: PointerEvent) => {
            const el = e.target as Element;
            cancelAnimationFrame(quadro);
            quadro = requestAnimationFrame(() => {
                if (!raiz.contains(el) || !temTexto(el)) {
                    if (e.pointerType !== 'touch') setAlvo(null);
                    return;
                }
                const s = getComputedStyle(el);
                setAlvo({ nome: nomeDe(s.fontFamily), px: Math.round(parseFloat(s.fontSize)), x: e.clientX, y: e.clientY, caixa: el.getBoundingClientRect() });
                if (e.pointerType === 'touch') {
                    window.clearTimeout(some);
                    some = window.setTimeout(() => setAlvo(null), 2200);
                }
            });
        };
        const sair = () => setAlvo(null);
        raiz.addEventListener('pointermove', ver as EventListener);
        raiz.addEventListener('pointerdown', ver as EventListener);
        raiz.addEventListener('pointerleave', sair);
        window.addEventListener('scroll', sair, { passive: true });
        return () => {
            cancelAnimationFrame(quadro);
            window.clearTimeout(some);
            raiz.removeEventListener('pointermove', ver as EventListener);
            raiz.removeEventListener('pointerdown', ver as EventListener);
            raiz.removeEventListener('pointerleave', sair);
            window.removeEventListener('scroll', sair);
        };
    }, [escopo]);
    if (!alvo) return null;
    // a etiqueta vai para o outro lado do ponteiro quando chega perto da borda da tela
    const esquerda = alvo.x > window.innerWidth - 260;
    return createPortal(
        <>
            <div
                className="fx-inspetor-caixa"
                style={{ left: alvo.caixa.left - 4, top: alvo.caixa.top - 3, width: alvo.caixa.width + 8, height: alvo.caixa.height + 6 }}
                aria-hidden
            />
            <div className="fx-inspetor" style={{ left: esquerda ? undefined : alvo.x + 14, right: esquerda ? window.innerWidth - alvo.x + 14 : undefined, top: alvo.y + 18 }} aria-hidden>
                {alvo.nome} <b>{alvo.px} px</b>
            </div>
        </>,
        document.body,
    );
}
