'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useLenis } from 'lenis/react';
import { Logo } from './LogoFoeger';
import { CABECALHO } from '../_lib/conteudo';

// o topo: o cabeçalho (o hero com as pedras está em HeroPedras.tsx)

// ——— o cabeçalho, igual ao do site principal (luizfoeger.vercel.app; portfolio: rumo/_fa/Cabecalho.tsx) ———
// Fixo e transparente, em modo diferença, com as três peças de lá: à esquerda o "Menu" com o hambúrguer (no hover, as
// linhas correm e o texto rola; aberto, as linhas viram um X e o rótulo troca para "Fechar"), no meio a logo da
// Föeger na versão escrita (leva ao topo) e à direita, no lugar do PT/EN de lá, o "Baixar" do PDF. O menu é a cortina
// de lá, mas preta (lá é azul-marinho), com as seções da página: os itens entram do desfoque e, no hover de um, os outros apagam e
// desfocam e o sublinhado corre. Fica num portal no body: o [data-clone] tem container-type, que prenderia o fixed.
function Rola({ texto }: { texto: string }) {
    return (
        <span className="fx-rola">
            <span>{texto}</span>
            <span aria-hidden>{texto}</span>
        </span>
    );
}

export function Cabecalho() {
    const lenis = useLenis();
    const [aberto, setAberto] = useState(false);
    const [montado, setMontado] = useState(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- o portal só existe no navegador
    useEffect(() => setMontado(true), []);

    // com a cortina aberta, a página não rola; o Esc fecha
    useEffect(() => {
        if (aberto) lenis?.stop();
        else lenis?.start();
        // quando a cortina termina de descer (1,4 s), a página por trás para de desenhar; ao fechar, volta na hora
        const html = document.documentElement;
        if (!aberto) {
            html.removeAttribute('data-menu-aberto');
            return;
        }
        const id = window.setTimeout(() => html.setAttribute('data-menu-aberto', ''), 1400);
        return () => window.clearTimeout(id);
    }, [aberto, lenis]);
    useEffect(() => {
        const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false);
        window.addEventListener('keydown', tecla);
        return () => window.removeEventListener('keydown', tecla);
    }, []);

    // a posição do alvo sem o deslocamento da entrada (o painel ainda fora da tela está 80 u abaixo do lugar dele)
    const rolarPara = (alvo: string | number) => {
        const el = typeof alvo === 'string' ? document.getElementById(alvo) : null;
        let y = typeof alvo === 'number' ? alvo : 0;
        if (el) {
            const t = getComputedStyle(el).transform;
            y = el.getBoundingClientRect().top + window.scrollY - new DOMMatrix(t === 'none' ? undefined : t).m42 - 90;
        }
        if (lenis) lenis.scrollTo(y);
        else window.scrollTo({ top: y, behavior: 'smooth' });
    };
    // fecha a cortina e rola depois que ela sobe
    const ir = (alvo: string | number) => () => {
        const estava = aberto;
        setAberto(false);
        window.setTimeout(() => rolarPara(alvo), estava ? 350 : 0);
    };

    if (!montado) return null;
    return createPortal(
        <>
            <div className="fx-cortina" data-aberto={aberto || undefined} aria-hidden={!aberto}>
                <nav className="fx-cortina-lista" aria-label="Seções">
                    {CABECALHO.itens.map((m, i) => (
                        <button key={m.alvo} type="button" onClick={ir(m.alvo)} tabIndex={aberto ? 0 : -1} style={{ '--i': i } as CSSProperties}>
                            <span className="fx-sublinha">{m.texto}</span>
                        </button>
                    ))}
                </nav>
            </div>
            <div className="fx-desfoque" aria-hidden />
            <header className="fx-cab" data-aberto={aberto || undefined}>
                <button type="button" className="fx-cab-menu" onClick={() => setAberto(a => !a)} aria-expanded={aberto}>
                    <span className="fx-hamburguer" aria-hidden>
                        <span>
                            <i />
                        </span>
                        <span>
                            <i />
                        </span>
                    </span>
                    <span className="fx-cab-rotulo">
                        <span>
                            <Rola texto={CABECALHO.menu} />
                        </span>
                        <span aria-hidden>
                            <Rola texto={CABECALHO.fechar} />
                        </span>
                    </span>
                </button>
                <a
                    className="fx-cab-logo"
                    href="#"
                    aria-label="Föeger"
                    onClick={e => {
                        e.preventDefault();
                        ir(0)();
                        // o hero recolhe as letras soltas (e os cacos) para o lugar
                        window.dispatchEvent(new Event('fx-logo'));
                    }}
                >
                    <Logo />
                </a>
                <a className="fx-cab-acao" href={CABECALHO.acao.href} download>
                    <Rola texto={`${CABECALHO.acao.texto} ↓`} />
                </a>
            </header>
        </>,
        document.body,
    );
}
