'use client';

// o espécime para imprimir: as mesmas páginas do livro da página, uma por folha de cerca de 14 × 21 cm (a proporção
// 2:3 das folhas do livro), desenhadas pelo pincel de SVG, com o texto de verdade. É daqui que sai o PDF para baixar
// (public/foeger-rune-especime.pdf), gerado pelo Chromium com as fontes embutidas.
// Uso: abrir http://localhost:3700/livro e imprimir (ou gerar com o puppeteer, page.pdf, depois
// que a <main> ganhar data-pronto)
import { useEffect, useState } from 'react';
import { CAPITULOS, lerCores, montarFolhas, paginasDoPdf } from '../_lib/especime/conteudo';
import { desenharPagina, PAPEL } from '../_lib/especime/paginas';
import { carregarFontes, familiasDe, pincelSvg } from '../_lib/especime/pincel';

// a folha em pixels inteiros (528 × 792 px = 396 × 594 pt, 139,7 × 209,6 mm): com 140 mm, a borda caía no meio de um
// pixel e o visualizador de PDF mostrava um filete claro na borda das páginas escuras
const CSS = `
@page { size: 528px 792px; margin: 0; }
.fx-impressao { display: flex; flex-direction: column; align-items: center; gap: 24px; padding: 32px 0; background: #d9d8d4; }
.fx-folha-a { width: 528px; height: 792px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15); }
.fx-folha-a svg { display: block; }
@media print {
    html, body, [data-clone] { background: ${PAPEL} !important; min-height: 0 !important; }
    .fx-impressao { gap: 0; padding: 0; background: none; }
    .fx-folha-a { box-shadow: none; break-after: page; }
    .fx-folha-a:last-child { break-after: auto; }
}`;

export default function EspecimeParaImprimir() {
    const [paginas, setPaginas] = useState<string[] | null>(null);

    useEffect(() => {
        let vivo = true;
        (async () => {
            const raiz = document.querySelector('[data-clone]') ?? document.body;
            const fam = familiasDe(raiz);
            lerCores(raiz);
            await carregarFontes(fam);
            const lista = paginasDoPdf(montarFolhas());
            const svgs = lista.map(({ pagina, num }, i) => {
                const p = pincelSvg(fam, `p${i}`);
                desenharPagina(p, pagina, num);
                // o papel vegetal sai na cor dele (no livro, a cor vem do shader)
                const t = pagina.tipo === 'vegetal' ? CAPITULOS[pagina.cap].vegetal?.tinta : undefined;
                return p.svg(t ? `rgb(${t.join(',')})` : undefined);
            });
            if (vivo) setPaginas(svgs);
        })();
        return () => {
            vivo = false;
        };
    }, []);

    return (
        <main className="fx-impressao" data-pronto={paginas ? true : undefined}>
            <style>{CSS}</style>
            {paginas?.map((svg, i) => <div key={i} className="fx-folha-a" dangerouslySetInnerHTML={{ __html: svg }} />)}
        </main>
    );
}
