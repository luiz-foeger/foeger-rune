'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLenis } from 'lenis/react';
import { Logo } from './LogoFoeger';
import { Rola } from './Rola';
import { useNavegar } from './Transicao';
import { CABECALHO } from '../_lib/conteudo';

// o topo: o cabeçalho (o hero com as pedras está em HeroPedras.tsx)

// ——— o cabeçalho, nascido do cabeçalho do site principal (luizfoeger.vercel.app; portfolio: rumo/_fa/Cabecalho.tsx) ———
// Fixo e transparente, em modo diferença, com a letra, as medidas e o hover de lá (o texto que rola), mas sem o menu:
// à esquerda as duas páginas ("A fonte" e "Na prática", a atual apagada), no meio a logo da Föeger na versão escrita
// (leva ao topo da home) e à direita só o "Baixar", que baixa a fonte (o PDF do espécime fica no botão do livro). Fica
// num portal num div posto no começo do body: fora do [data-clone], que tem container-type e prenderia o fixed, e antes
// do conteúdo, para o Tab e o leitor de tela chegarem à navegação primeiro.
export function Cabecalho() {
    const lenis = useLenis();
    const caminho = usePathname();
    const navegar = useNavegar();
    const [lugar, setLugar] = useState<HTMLElement | null>(null);
    // o lugar do portal, criado no navegador e posto no começo do body; sai junto com o cabeçalho
    useEffect(() => {
        const div = document.createElement('div');
        div.className = 'fx-topo';
        document.body.prepend(div);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- o portal só existe no navegador
        setLugar(div);
        return () => div.remove();
    }, []);

    if (!lugar) return null;
    return createPortal(
        <>
            <div className="fx-desfoque" aria-hidden />
            <header className="fx-cab">
                <nav className="fx-cab-paginas" aria-label="Páginas">
                    {CABECALHO.paginas.map(p => (
                        <Link
                            key={p.href}
                            href={p.href}
                            className="fx-cab-acao"
                            data-atual={p.href === caminho || undefined}
                            aria-current={p.href === caminho ? 'page' : undefined}
                            onClick={e => {
                                // com Ctrl, Cmd, Shift ou Alt (nova aba, nova janela, baixar), o navegador cuida
                                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                                e.preventDefault();
                                if (p.href !== caminho) navegar(p.href);
                            }}
                        >
                            <Rola>{p.texto}</Rola>
                        </Link>
                    ))}
                </nav>
                <a
                    className="fx-cab-logo"
                    href="#"
                    aria-label="Föeger"
                    onClick={e => {
                        e.preventDefault();
                        // na home, volta ao topo (direto, com movimento reduzido); na outra página, leva à home (pela
                        // transição, Transicao.tsx)
                        const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                        if (caminho !== '/') navegar('/');
                        else if (lenis) lenis.scrollTo(0, { immediate: reduzido });
                        else window.scrollTo({ top: 0, behavior: reduzido ? 'auto' : 'smooth' });
                        // o hero recolhe as letras soltas (e os cacos) para o lugar
                        window.dispatchEvent(new Event('fx-logo'));
                    }}
                >
                    <Logo />
                </a>
                {/* o leitor de tela ouve "Baixar a fonte" (na home também há o "Baixar o PDF" do livro) */}
                <a className="fx-cab-acao fx-cab-baixar" href={CABECALHO.acao.href} download aria-label={CABECALHO.acao.rotulo}>
                    <Rola>
                        {CABECALHO.acao.texto}
                        <span aria-hidden> ↓</span>
                    </Rola>
                </a>
            </header>
        </>,
        lugar,
    );
}
