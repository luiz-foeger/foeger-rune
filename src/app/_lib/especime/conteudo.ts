// o conteúdo do livro da página: o espécime da Föeger Rune no lugar do "O livro da Föeger" do clone-tantan, na ordem
// dos livros de verdade: a capa com a guarda lisa por dentro; as páginas de abertura (a falsa folha de rosto, o
// frontispício, a folha de rosto, os créditos no verso dela e o sumário, numa página da direita); a dupla que apresenta
// os três estilos; os capítulos com abertura e matéria, com papel vegetal entre algumas páginas; os caracteres; o
// colofão; e a contracapa, também com a guarda por dentro. Os números e os fatos são os da prévia de 05/11 (311 glifos em cada estilo,
// as larguras de cada estilo, o revezamento das minúsculas, o L do meio e o f do começo).
import type { Familia } from './pincel';

export type IdCapitulo = 'historia' | 'alfabeto' | 'estilos' | 'variacoes' | 'texto' | 'uso';
export type Capitulo = {
    // o id do capítulo (as pranchas e as mostras de cada um são achadas por ele, não pela posição)
    id: IdCapitulo;
    n: number;
    tema: string;
    // o título em escada: cada linha com o recuo em fração da caixa do título (0 = esquerda)
    titulo: [string, number][];
    // o título no sumário em duas linhas: a primeira na Inter Tight leve, a segunda na Rune do capítulo
    sumario: [string, string];
    estilo: Familia;
    secoes: [string, string];
    visaoGeral: string;
    corpo: [string, string, string];
    citacao: string;
    // a abertura em página (a prancha à esquerda, o título no papel) ou dupla (uma prancha nas duas páginas)
    modo: 'pagina' | 'dupla';
    cor: string;
    tinta: string;
    legenda: [string, string];
    // o papel vegetal antes da página da direita da matéria: a cor do papel e o desenho impresso nele
    vegetal?: { tinta: [number, number, number]; desenho: 'construcao' | 'cortes' };
    paginas?: [number, number];
};

// as cores do livro: as da paleta da página (--p-*), lidas por lerCores antes de desenhar (o canvas e o SVG do PDF
// precisam da cor de verdade, não da variável). Os valores daqui são os da paleta dos pigmentos minerais.
export const COR = {
    cut: '#e3b55a',
    polished: '#8aa4da',
    worn: '#62b08d',
    laranja: '#c95a40',
    roxo: '#2d4ca3',
    tintaQuente: '#f6e0d8',
    tintaFrio: '#dde3f3',
    tintaPolished: '#dfe6f5',
    wornEscuro: '#2e7d5c',
    frioEscuro: '#1e3473',
    claroFrio: '#f2f4fb',
};
const VARIAVEIS: Record<keyof typeof COR, string> = {
    cut: '--p-cut',
    polished: '--p-polished',
    worn: '--p-worn',
    laranja: '--p-quente',
    roxo: '--p-frio',
    tintaQuente: '--p-tinta-quente',
    tintaFrio: '--p-tinta-frio',
    tintaPolished: '--p-tinta-polished',
    wornEscuro: '--p-worn-escuro',
    frioEscuro: '--p-frio-escuro',
    claroFrio: '--p-claro-frio',
};
const rgb = (hex: string): [number, number, number] => {
    const h = hex.replace('#', '');
    return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
};
export function lerCores(el: Element) {
    const cs = getComputedStyle(el);
    for (const k of Object.keys(VARIAVEIS) as (keyof typeof COR)[]) {
        const v = cs.getPropertyValue(VARIAVEIS[k]).trim();
        if (/^#[0-9a-f]{6}$/i.test(v)) COR[k] = v;
    }
    // o papel vegetal do capítulo 3 tem a cor do tom frio claro
    const v = CAPITULOS.find(x => x.id === 'variacoes')?.vegetal;
    if (v) v.tinta = rgb(COR.tintaFrio);
}

export const CAPITULOS: Capitulo[] = [
    {
        id: 'historia',
        n: 1,
        tema: 'Como nasceu',
        titulo: [['A Mão', 0.04], ['&', 0.5], ['O Gabarito', 0.16]],
        sumario: ['A Mão', '& O Gabarito'],
        estilo: 'cut',
        secoes: ['Do gabarito à fonte', 'Da Sans à Rune'],
        visaoGeral:
            'A Föeger Rune começou como uma folha de gabarito preenchida à mão, em janeiro de 2026. Em novembro, o desenho virou pedra: refeito só com retas, com acentos, sinais e três desgastes.',
        corpo: [
            'Tudo começou numa folha de gabarito, com um quadrado para cada letra. O desenho foi feito à mão e virou fonte por um serviço on-line, com 81 glifos: as letras, os números, o ponto, a vírgula e parte dos acentos. Era a Föeger Sans, ainda sem pontuação e sem nenhum ajuste de espaço.',
            'Em novembro, cada letra foi refeita a partir do próprio desenho. As alturas foram alinhadas sem esticar as letras, as curvas da vetorização viraram retas e as quinas ganharam o corte reto do cinzel. As letras caíram de 3.390 para 1.262 pontos sem perder o jeito da mão.',
            'Os acentos saíram das marcas do próprio desenho, os sinais vieram de folhas desenhadas pelo autor e a fonte trocou de nome: Rune, porque runas são letras gravadas em pedra.',
        ],
        citacao: 'Toda letra começou num quadrado.',
        modo: 'pagina',
        cor: '#e4e1da',
        tinta: '#1b1a18',
        legenda: ['Föeger Rune Cut', 'O gabarito'],
    },
    {
        id: 'alfabeto',
        n: 2,
        tema: 'Alfabeto',
        titulo: [['A', 0], ['Pedra', 0.16], ['&', 0.6], ['O Corte', 0.36]],
        sumario: ['A Pedra', '& O Corte'],
        estilo: 'cut',
        secoes: ['Maiúsculas e minúsculas', 'Números e sinais'],
        visaoGeral:
            'Vinte e seis maiúsculas, vinte e seis minúsculas, os números e os sinais do dia a dia, tirados do mesmo traço. A Cut é a pedra recém-cortada: o desenho como saiu da mão e um corte reto em cada quina.',
        corpo: [
            'A Föeger Rune começou num gabarito, uma letra por quadrado, desenhada à mão. Cada traço virou contorno e cada contorno virou pedra: o desenho ficou como saiu da mão, e só as quinas ganharam um corte reto, como o golpe de um cinzel.',
            'Por isso nenhuma letra é perfeitamente reta e nenhuma é igual à outra. O peso é alto e os miolos são pequenos: de longe, a palavra parece um muro de pedras encaixadas; de perto, cada pedra tem o seu desenho.',
            'O alfabeto cobre o português inteiro, com os acentos, a pontuação, os números e os símbolos no mesmo traço. São 311 glifos em cada estilo, contando as variações que entram sozinhas.',
        ],
        citacao: 'Toda pedra começa bruta.',
        modo: 'pagina',
        cor: COR.cut,
        tinta: '#1b1a18',
        legenda: ['Föeger Rune Cut', 'Quinas vivas'],
        vegetal: { tinta: [246, 245, 241], desenho: 'construcao' },
    },
    {
        id: 'estilos',
        n: 3,
        tema: 'Estilos',
        titulo: [['O Uso', 0.04], ['&', 0.55], ['O Desgaste', 0.14]],
        sumario: ['O Uso', '& O Desgaste'],
        estilo: 'polished',
        secoes: ['Cut, Polished e Worn', 'Quinas de fora e de dentro'],
        visaoGeral:
            'Três desgastes da mesma pedra. A Cut tem as quinas vivas; a Polished rolou um pouco no rio; a Worn passou anos na correnteza e ficou redonda. O desenho é o mesmo, o que muda é o tempo.',
        corpo: [
            'O desgaste não é um efeito por cima da letra: cada estilo é uma fonte inteira, com os 311 glifos refeitos. As quinas de fora arredondam primeiro; as de dentro, os cantos dos miolos, resistem mais.',
            'A Polished guarda o corte com as pontas lixadas e vai bem em títulos e textos curtos. A Worn é a mais macia: perde os ângulos, ganha volume e serve quando a pedra precisa parecer amiga.',
            'Quanto mais gasta, mais estreita: o A tem 801 unidades de largura na Cut, 749 na Polished e 710 na Worn. A mesma frase ocupa menos linha a cada estilo, como a pedra que perde lascas no rio.',
        ],
        citacao: 'Pedra que rola não cria limo!',
        modo: 'dupla',
        cor: COR.polished,
        tinta: '#1b1a18',
        legenda: ['Föeger Rune Polished', 'Rolada no rio'],
    },
    {
        id: 'variacoes',
        n: 4,
        tema: 'Variações',
        titulo: [['A Regra', 0], ['&', 0.5], ['A Exceção', 0.2]],
        sumario: ['A Regra', '& A Exceção'],
        estilo: 'worn',
        secoes: ['Letras repetidas', 'O L do meio e o f do começo'],
        visaoGeral:
            'Quem talha à mão não repete o golpe. Quando uma minúscula aparece de novo logo em seguida, a fonte troca o corte sozinha, e a palavra nunca fica com cara de carimbo.',
        corpo: [
            'Cada minúscula tem até quatro cortes, que se revezam: o desenho de base, depois a variação dois, a três e a quatro, e de novo a base. O texto não muda; quem faz a troca é a própria fonte, pelas alternativas de contexto.',
            'Duas letras ainda mudam conforme o lugar: o L ganha outro corte quando vem depois de outra letra, e o f tem um desenho próprio para o começo da palavra.',
            'As trocas valem nos três estilos e em qualquer programa que ligue as alternativas de contexto, o que quase todos fazem sem pedir.',
        ],
        citacao: 'Sonhei ontem que uma pedra rolava, rolava e não paraaava!',
        modo: 'pagina',
        cor: COR.roxo,
        tinta: '#f2f4fb',
        legenda: ['Föeger Rune Worn', 'Nenhuma igual'],
        vegetal: { tinta: [221, 227, 243], desenho: 'cortes' },
    },
    {
        id: 'texto',
        n: 5,
        tema: 'Texto',
        titulo: [['O Texto', 0], ['&', 0.48], ['A Escala', 0.12]],
        sumario: ['O Texto', '& A Escala'],
        estilo: 'cut',
        secoes: ['Acentos e frações', 'Do cartaz ao parágrafo'],
        visaoGeral:
            'Feita para títulos, cartazes e palavras curtas, a Rune aguenta o parágrafo em corpo grande. Os acentos são pedras à parte, como o ponto da logo da Föeger.',
        corpo: [
            'Os acentos não nascem da letra: são pedras soltas, pousadas por cima, cada uma com o seu corte. O til, o circunflexo e o trema seguem o mesmo traço pesado das letras.',
            'Também vêm prontas as frações mais comuns, os números elevados e os símbolos do dia a dia: setas, estrela, coração e o sinal de certo.',
            'Grande, a pedra aparece inteira; em corpo de texto, o desenho vira textura, pesada e irregular, que pede espaço entre as linhas.',
        ],
        citacao: 'Jane quer LP, fax, CD, giz, TV e bom whisky.',
        modo: 'dupla',
        cor: COR.laranja,
        tinta: '#1b1a18',
        legenda: ['Föeger Rune Cut', 'Pedras à parte'],
    },
    {
        id: 'uso',
        n: 6,
        tema: 'Em uso',
        titulo: [['A Rua', 0.04], ['&', 0.5], ['A Estante', 0.16]],
        sumario: ['A Rua', '& A Estante'],
        estilo: 'polished',
        secoes: ['Cartazes, livros e discos', 'Cada estilo no seu lugar'],
        visaoGeral:
            'A Cut grita no cartaz colado na rua, a Polished conta histórias na capa do livro e a Worn aparece gasta no selo do disco. A mesma pedra, três lugares.',
        corpo: [
            'Na rua, a Cut ocupa o cartaz inteiro. No lambe-lambe de um festival, cada linha vai de uma borda à outra, em corpos diferentes, como o tipo de madeira das gráficas de cartaz, e as quinas vivas aguentam a tinta falhada do papel barato.',
            'Na estante, a Polished vai bem nas capas: no título de um livro infantil ela fica amiga sem perder o peso, e num guia de viagem divide a capa com a paisagem e as placas de direção.',
            'No disco, a Worn combina com o que já tem uso: a capa de papelão gasta, o selo do lado B, a etiqueta do sebo. Quanto mais gasta a peça, mais a Worn parece estar em casa.',
        ],
        citacao: 'Cada pedra no seu lugar.',
        modo: 'dupla',
        cor: COR.worn,
        tinta: '#1b1a18',
        legenda: ['Föeger Rune Cut', 'O cartaz do festival'],
    },
];

export const LIVRO = {
    titulo: 'Föeger Rune',
    cabeca: 'FÖEGER RUNE — ESPÉCIME',
    pe: 'UMA FONTE DA FÖEGER',
    edicao: 'Edição 01 — 2026',
    frase: 'Pedra que se gasta.',
};

// as páginas do livro: cada folha tem a frente (a página da direita enquanto está à direita) e o verso (a da esquerda
// depois de virada)
export type Pagina =
    | { tipo: 'capa' }
    | { tipo: 'guarda' }
    | { tipo: 'contracapa' }
    | { tipo: 'falsa-rosto' }
    | { tipo: 'frontispicio' }
    | { tipo: 'rosto' }
    | { tipo: 'creditos' }
    | { tipo: 'sumario' }
    | { tipo: 'estilos-esq' }
    | { tipo: 'estilos-dir' }
    | { tipo: 'abertura-imagem'; cap: number }
    | { tipo: 'abertura-titulo'; cap: number }
    | { tipo: 'artigo-esq'; cap: number }
    | { tipo: 'artigo-dir'; cap: number }
    | { tipo: 'vegetal'; cap: number }
    | { tipo: 'caracteres-esq' }
    | { tipo: 'caracteres-dir' }
    | { tipo: 'colofao' };

export type Folha = { frente: Pagina; verso: Pagina; tipo: 'capa' | 'papel' | 'vegetal' | 'contracapa'; numFrente?: number; numVerso?: number };

// as páginas dos caracteres, a da dupla dos estilos e a do colofão, para o sumário, e o total de páginas numeradas, para a ficha
// dos créditos (preenchidos na montagem)
export const EXTRAS: { caracteres?: [number, number]; paginas?: number; estilos?: number; colofao?: number } = {};

export function montarFolhas(): Folha[] {
    const f: Folha[] = [];
    f.push({ tipo: 'capa', frente: { tipo: 'capa' }, verso: { tipo: 'guarda' } });
    f.push({ tipo: 'papel', frente: { tipo: 'falsa-rosto' }, verso: { tipo: 'frontispicio' } });
    f.push({ tipo: 'papel', frente: { tipo: 'rosto' }, verso: { tipo: 'creditos' } });
    f.push({ tipo: 'papel', frente: { tipo: 'sumario' }, verso: { tipo: 'estilos-esq' } });
    let direita: Pagina = { tipo: 'estilos-dir' };
    CAPITULOS.forEach((c, i) => {
        f.push({ tipo: 'papel', frente: direita, verso: { tipo: 'abertura-imagem', cap: i } });
        f.push({ tipo: 'papel', frente: { tipo: 'abertura-titulo', cap: i }, verso: { tipo: 'artigo-esq', cap: i } });
        if (c.vegetal) f.push({ tipo: 'vegetal', frente: { tipo: 'vegetal', cap: i }, verso: { tipo: 'vegetal', cap: i } });
        direita = { tipo: 'artigo-dir', cap: i };
    });
    f.push({ tipo: 'papel', frente: direita, verso: { tipo: 'caracteres-esq' } });
    f.push({ tipo: 'papel', frente: { tipo: 'caracteres-dir' }, verso: { tipo: 'colofao' } });
    f.push({ tipo: 'contracapa', frente: { tipo: 'guarda' }, verso: { tipo: 'contracapa' } });
    // números de página: a falsa folha de rosto é a 1; o papel vegetal não conta
    let n = 1;
    for (const folha of f) {
        if (folha.tipo !== 'papel') continue;
        folha.numFrente = n++;
        folha.numVerso = n++;
    }
    CAPITULOS.forEach((c, i) => {
        const ini = f.find(x => x.verso.tipo === 'abertura-imagem' && 'cap' in x.verso && x.verso.cap === i)!.numVerso!;
        const fim = f.find(x => x.frente.tipo === 'artigo-dir' && 'cap' in x.frente && x.frente.cap === i)!.numFrente!;
        c.paginas = [ini, fim];
    });
    const car = f.find(x => x.verso.tipo === 'caracteres-esq')!.numVerso!;
    EXTRAS.caracteres = [car, car + 1];
    EXTRAS.paginas = n - 1;
    EXTRAS.estilos = f.find(x => x.verso.tipo === 'estilos-esq')!.numVerso!;
    EXTRAS.colofao = f.find(x => x.verso.tipo === 'colofao')!.numVerso!;
    return f;
}

// a folha a virar para chegar ao capítulo i (a abertura fica aberta: a folha da abertura-imagem já virada)
export function folhaDoCapitulo(folhas: Folha[], i: number) {
    return folhas.findIndex(x => x.verso.tipo === 'abertura-imagem' && 'cap' in x.verso && x.verso.cap === i) + 1;
}

// quantas folhas virar para a página n ficar aberta (o sumário leva a qualquer página): se ela é o verso de uma folha
// (à esquerda), essa folha já virou; se é a frente (à direita), só as de antes
export function contagemDaPagina(folhas: Folha[], n: number) {
    const i = folhas.findIndex(f => f.numFrente === n || f.numVerso === n);
    if (i < 0) return 0;
    return folhas[i].numVerso === n ? i + 1 : i;
}

// a página dos caracteres (o sumário também leva a ela)
export function folhaDosCaracteres(folhas: Folha[]) {
    return folhas.findIndex(x => x.verso.tipo === 'caracteres-esq') + 1;
}

// a ordem do PDF: capa, as páginas numeradas (com o papel vegetal no lugar dele) e a contracapa
export function paginasDoPdf(folhas: Folha[]): { pagina: Pagina; num?: number }[] {
    const lista: { pagina: Pagina; num?: number }[] = [{ pagina: { tipo: 'capa' } }];
    folhas.forEach((f, i) => {
        if (f.tipo === 'papel') {
            // a frente vem antes do verso; o verso da folha anterior já entrou
            lista.push({ pagina: f.frente, num: f.numFrente });
            lista.push({ pagina: f.verso, num: f.numVerso });
        } else if (f.tipo === 'vegetal') lista.push({ pagina: f.frente });
        else if (f.tipo === 'contracapa' && i > 0) lista.push({ pagina: f.verso });
    });
    return lista;
}
