// o conteúdo do clone: a estrutura é a da página da Ease na Studio Feixen Fonts; os textos e a fonte são da Föeger Rune
export type Estilo = 'cut' | 'polished' | 'worn';

// os três desgastes fazem o papel dos pesos (Regular … Black) da Ease
export const ESTILOS: { id: Estilo; nome: string; familia: string }[] = [
    { id: 'cut', nome: 'Cut', familia: 'var(--ff-cut)' },
    { id: 'polished', nome: 'Polished', familia: 'var(--ff-polished)' },
    { id: 'worn', nome: 'Worn', familia: 'var(--ff-worn)' },
];

// o "Rounded Redefined" da Ease: a ideia da fonte, a pedra que se gasta
export const FRASE = 'Pedra que se gasta';

// o "Seven* Styles": a palavra digitada com a letra pendurada; o asterisco entra no fim, depois da primeira palavra
// sem asterisco nem nota (o asterisco vinha do 'Seven* Styles' da Feixen)
export const TITULO_ESTILOS = { texto: 'Três Estilos', asteriscoDepois: null as number | null, nota: null as string | null };

// o testador: a cor de cada estilo (a da faixa dele, mais adiante na página), o parágrafo (o "Hi, my name is George…")
// e o humor de cada um, de 0 a 100
export const CORES_ESTILO: Record<Estilo, string> = { cut: 'var(--p-cut)', polished: 'var(--p-polished)', worn: 'var(--p-worn)' };
export const PARAGRAFO = ['Oi, meu nome é Rune.', 'Sou feita de pedra e', 'o uso me arredonda.'];

// as faixas coloridas, uma por estilo (as da Ease são sete): a cor do fundo, a manchete que corre com a rolagem e os
// textos dos quatro painéis de texto (a história da fonte, em tamanhos crescentes)
export const COR_FAIXA: Record<Estilo, string> = { cut: 'var(--p-cut)', polished: 'var(--p-polished)', worn: 'var(--p-worn)' };
export const MANCHETES: Record<Estilo, string> = {
    cut: 'Toda pedra começa bruta!',
    polished: 'Rolando no rio, a pedra fica lisa!',
    worn: 'Tanto bate até que fura!',
};

// o começo do "text book" da Ease (até 0:25): a seção escura com R U N E e o texto que troca de caixa (em minúsculas,
// as letras repetidas mostram as variações da fonte; em maiúsculas, não) e os recursos
export const RUNE = [
    { letra: 'R', estilo: 'cut' as Estilo, cor: 'var(--p-quente-claro)' },
    { letra: 'U', estilo: 'polished' as Estilo, cor: 'var(--p-polished)' },
    { letra: 'N', estilo: 'worn' as Estilo, cor: '#c8c8c8' },
    { letra: 'E', estilo: 'cut' as Estilo, cor: 'var(--p-cut)' },
];
export const VARIACOES = [
    { estilo: 'cut' as Estilo, titulo: 'Cut, com as variações', linhas: ['Sonhei ontem', 'que uma pedra', 'rolava, rolava', 'e não paraaava!'] },
    { estilo: 'worn' as Estilo, titulo: 'Worn, com as variações', linhas: ['Nossa, essssa', 'correnteeeeza', 'tá me deixando', 'tooooda lisa.'] },
];
// o título das variações (as trocas do calt), solto e sem nota
export const TITULO_VARIACOES = { texto: 'Variações', nota: null };
// o título do playground, solto e sem nota
export const TITULO_ESCREVA = { texto: 'Playground', nota: null };
// o título da seção dos caracteres, solto (na fonte de texto, como o dos estilos), com a nota embaixo
export const TITULO_CARACTERES = { texto: 'Caracteres', nota: 'Números, acentos, pontuação e símbolos: 177 em cada estilo' };
// o título do livro, solto como os outros (na fonte de texto, centrado), sem o asterisco e a nota
export const TITULO_LIVRO = { texto: 'O Livro', nota: null };

// a segunda página: a fonte em uso (as peças das faixas) e o playground. Os endereços (as páginas, as âncoras e o PDF)
// ficam sempre em inglês, numa palavra só: sem acento e curtos
export const PAGINA_PRATICA = { caminho: '/showcase', titulo: 'Na prática' };

// o cabeçalho, igual ao do site principal: o menu (as seções das duas páginas, pelas âncoras; sem página, é a home),
// a logo da Föeger no meio e, à direita, as duas páginas (a atual marcada) e o PDF, no lugar do PT/EN de lá
export const CABECALHO: {
    menu: string;
    fechar: string;
    itens: { texto: string; alvo: string; pagina?: string }[];
    paginas: { texto: string; href: string }[];
    acao: { texto: string; href: string };
} = {
    menu: 'Menu',
    fechar: 'Fechar',
    itens: [
        { texto: 'Alfabeto', alvo: 'alphabet' },
        { texto: 'Estilos', alvo: 'styles' },
        { texto: 'Testar', alvo: 'tester' },
        { texto: 'Caracteres', alvo: 'characters' },
        { texto: 'Variações', alvo: 'variations' },
        { texto: 'O Livro', alvo: 'book' },
        { texto: 'Na prática', alvo: '', pagina: PAGINA_PRATICA.caminho },
        { texto: 'Playground', alvo: 'playground', pagina: PAGINA_PRATICA.caminho },
    ],
    paginas: [
        { texto: 'A fonte', href: '/' },
        { texto: PAGINA_PRATICA.titulo, href: PAGINA_PRATICA.caminho },
    ],
    acao: { texto: 'Baixar', href: '/foeger-rune-specimen.pdf' },
};
export const HERO = { legenda: ['Föeger Rune', 'Desenhada por Luiz Föeger'] };
