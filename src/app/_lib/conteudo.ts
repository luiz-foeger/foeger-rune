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
export const TITULO_ESTILOS = { texto: 'Três Estilos', asteriscoDepois: 4, nota: '* Mais as letras alternativas' };

// o testador: a cor de cada estilo (a da faixa dele, mais adiante na página), o parágrafo (o "Hi, my name is George…")
// e o humor de cada um, de 0 a 100
export const CORES_ESTILO: Record<Estilo, string> = { cut: 'var(--p-cut)', polished: 'var(--p-polished)', worn: 'var(--p-worn)' };
export const PARAGRAFO = ['Oi, meu nome é Rune.', 'Sou feita de pedra e', 'o uso me arredonda.'];
export const HUMOR = {
    titulo: 'Humor',
    nomes: ['Tradicional', 'Moderna', 'Séria', 'Divertida', 'Retrô', 'Digital', 'Simpática'],
    valores: {
        cut: [60, 60, 80, 40, 60, 40, 40],
        polished: [40, 80, 40, 80, 40, 60, 80],
        worn: [80, 40, 20, 100, 80, 20, 100],
    } as Record<Estilo, number[]>,
};

// as faixas coloridas, uma por estilo (as da Ease são sete): a cor do fundo, a manchete que corre com a rolagem e os
// textos dos quatro painéis de texto (a história da fonte, em tamanhos crescentes)
export const COR_FAIXA: Record<Estilo, string> = { cut: 'var(--p-cut)', polished: 'var(--p-polished)', worn: 'var(--p-worn)' };
export const MANCHETES: Record<Estilo, string> = {
    cut: 'Toda pedra começa bruta!',
    polished: 'Rolando no rio, a pedra fica lisa!',
    worn: 'Tanto bate até que fura!',
};
export const TEXTOS = [
    'A Föeger Rune começou desenhada à mão, uma letra por quadrado. Cada traço virou contorno, e cada contorno virou pedra: quinas vivas, cortes tortos de cinzel e nenhuma letra igual à outra.',
    'São três desgastes da mesma pedra. A Cut é o corte de hoje, com retas e quinas vivas. A Polished já rolou um pouco no rio. A Worn passou anos na correnteza e ficou redonda.',
    'Quando uma letra se repete na palavra, ela troca de corte: o segundo s não é igual ao primeiro, como acontece com quem talha à mão. O L e o f mudam conforme o lugar.',
    'Tem os acentos do português, pontuação, números e símbolos no mesmo traço. São 311 glifos em cada estilo, e cada versão nova traz mais pedras.',
];
export const TAMANHOS_TEXTO = [20, 24, 27, 30];

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
export const TITULO_RECURSOS = 'Recursos';
// o título do livro, digitado como o dos estilos, com a nota no pé do painel
export const TITULO_LIVRO = { texto: 'O Livro', asteriscoDepois: 7, nota: '* O espécime da Föeger Rune, para folhear aqui ou baixar em PDF' };

// o cabeçalho, igual ao do site principal: o menu (as seções da página, pelas âncoras), a logo da Föeger no meio e,
// no lugar do PT/EN de lá, o PDF à direita
export const CABECALHO = {
    menu: 'Menu',
    fechar: 'Fechar',
    itens: [
        { texto: 'Alfabeto', alvo: 'alfabeto' },
        { texto: 'Estilos', alvo: 'estilos' },
        { texto: 'Testar', alvo: 'testador' },
        { texto: 'Recursos', alvo: 'recursos' },
        { texto: 'O Livro', alvo: 'livro' },
    ],
    acao: { texto: 'Baixar', href: '/foeger-rune-especime.pdf' },
};
export const HERO = { legenda: ['Föeger Rune', 'Desenhada por Luiz Föeger'] };
