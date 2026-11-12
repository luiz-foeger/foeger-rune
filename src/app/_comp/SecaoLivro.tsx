'use client';

import { useEffect, useRef, useState } from 'react';
import { iniciarLivro, type Controle, type Estado } from '../_lib/livro3d/motor';

// o livro do espécime, como na página antiga da fonte (a /nova/foeger-sans do portfolio-simulacao): o título digitado
// vem antes (na página), aqui ficam o livro e, embaixo, as setas, as páginas abertas e o botão de baixar o PDF. O livro
// é o realista do clone-tantan, solto direto no fundo da página (sem painel, réguas nem moldura), sobre um pedaço de
// trama que o motor desenha no chão e que some em volta dele, numa área do tamanho de um painel de 4 × 2 (2 × 2 no
// celular). O motor só começa quando a seção chega perto da tela e só desenha enquanto ela está nela.
export const PDF = '/foeger-rune-specimen.pdf';

export default function SecaoLivro() {
    const tela = useRef<HTMLCanvasElement>(null);
    const controle = useRef<Controle | null>(null);
    const [perto, setPerto] = useState(false);
    const [pronto, setPronto] = useState(false);
    const [erro, setErro] = useState('');
    const [estado, setEstado] = useState<Estado>({ rotulo: 'Capa', inicio: true, fim: false });

    // perto da tela (uma tela antes), o motor começa a montar as páginas
    useEffect(() => {
        const cv = tela.current;
        if (!cv) return;
        const ob = new IntersectionObserver(([x]) => x.isIntersecting && setPerto(true), { rootMargin: '100% 0px' });
        ob.observe(cv);
        return () => ob.disconnect();
    }, []);

    useEffect(() => {
        const cv = tela.current;
        if (!cv || !perto) return;
        const ctl = new AbortController();
        let pedido = 0;
        // na tela, desenha; fora dela, para. Conferido na rolagem e no redimensionamento (e não por um
        // IntersectionObserver: a montagem das páginas prende a linha principal por um instante e o observador
        // ficava com a posição de antes, sem recalcular depois que a rolagem parava)
        const conferir = () => {
            const r = cv.getBoundingClientRect();
            controle.current?.ativar(r.width > 0 && r.bottom > 0 && r.top < window.innerHeight);
        };
        const aoMudarTela = () => {
            cancelAnimationFrame(pedido);
            pedido = requestAnimationFrame(conferir);
        };
        // (sem dica embaixo do livro, ninguém mais precisa saber da primeira interação)
        iniciarLivro(cv, { aoPronto: () => setPronto(true), aoInteragir: () => {}, aoMudar: setEstado }, ctl.signal)
            .then(c => {
                if (!c) return;
                if (ctl.signal.aborted) return c.parar();
                controle.current = c;
                window.addEventListener('scroll', aoMudarTela, { passive: true });
                window.addEventListener('resize', aoMudarTela);
                aoMudarTela();
            })
            .catch((e: Error) => setErro(e.message));
        return () => {
            ctl.abort();
            cancelAnimationFrame(pedido);
            window.removeEventListener('scroll', aoMudarTela);
            window.removeEventListener('resize', aoMudarTela);
            controle.current?.parar();
            controle.current = null;
        };
    }, [perto]);

    return (
        <>
            <section className="fx-livro" aria-label="O livro">
                <canvas ref={tela} className="fx-livro-tela" tabIndex={0} aria-label="O espécime da Föeger Rune: clique na página ou arraste o canto para folhear" />
                {/* sem tela de carregamento: o livro aparece quando fica pronto; só um erro, se houver, ocupa o lugar dele */}
                {erro && <div className="fx-livro-carregando">{erro}</div>}
            </section>
            <div className="fx-livro-controles">
                <button type="button" className="fx-livro-seta" onClick={() => controle.current?.virar(-1)} disabled={!pronto || estado.inicio} aria-label="Página anterior">
                    ←
                </button>
                <span className="fx-livro-paginas" aria-live="polite">
                    {estado.rotulo}
                </span>
                <button type="button" className="fx-livro-seta" onClick={() => controle.current?.virar(1)} disabled={!pronto || estado.fim} aria-label="Próxima página">
                    →
                </button>
                <a className="fx-livro-baixar" href={PDF} download>
                    <i />
                    <span>Baixar o PDF ↓</span>
                    <i />
                </a>
            </div>
        </>
    );
}
