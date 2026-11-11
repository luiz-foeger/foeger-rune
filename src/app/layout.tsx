import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import Rolagem from './_comp/Rolagem';
import Transicao from './_comp/Transicao';
import './globals.css';
import './clone.css';

// o site da Föeger Rune: a fonte nos três desgastes (Cut, Polished e Worn), o espécime no livro realista e o PDF para
// baixar. Nasceu do clone da Studio Feixen Fonts (guardado em C:\pessoal\clone-feixen) e vai ganhando cara própria.
// As fontes são as prévias de 05/11/2026 do projeto C:\pessoal\foeger-rune (com o nome do CFF trocado para o navegador
// aceitar); a Inter Tight faz os textos de interface e a DM Mono, os rótulos do livro.
const cut = localFont({ src: './_fontes/FoegerRune-Cut-previa.otf', weight: '400', variable: '--ff-cut', display: 'block' });
const polished = localFont({ src: './_fontes/FoegerRune-Polished-previa.otf', weight: '400', variable: '--ff-polished', display: 'block' });
const worn = localFont({ src: './_fontes/FoegerRune-Worn-previa.otf', weight: '400', variable: '--ff-worn', display: 'block' });
const ui = localFont({ src: './_fontes/inter-tight-latin.woff2', weight: '300 700', variable: '--ff-ui', display: 'block' });
const mono = localFont({ src: './_fontes/dm-mono-400-latin.woff2', weight: '400', variable: '--ff-mono', display: 'swap' });

export const metadata: Metadata = {
    title: 'Föeger Rune',
    robots: { index: false, follow: false },
};

export const viewport: Viewport = {
    themeColor: '#f8f8f8',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        // a paleta escolhida pelo endereço (?paleta=azul) vai no html antes de a página aparecer
        <html lang="pt-BR" suppressHydrationWarning>
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: "try{var p=new URLSearchParams(location.search).get('paleta');if(p)document.documentElement.dataset.paleta=p}catch(e){}",
                    }}
                />
            </head>
            <body className={`${cut.variable} ${polished.variable} ${worn.variable} ${ui.variable} ${mono.variable}`}>
                <Rolagem>
                    {/* a transição entre as páginas: o palco (a página) e a cortina ficam aqui, fora do [data-clone],
                        e sobrevivem à troca de rota */}
                    <Transicao>
                        <div data-clone>
                            {children}
                        </div>
                    </Transicao>
                </Rolagem>
            </body>
        </html>
    );
}
