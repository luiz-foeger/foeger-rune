// o conteúdo do livro da página: o espécime da Föeger Rune no lugar do "O livro da Föeger" do clone-tantan, com a
// mesma ordem de folhas (capa, rosto, sumário em duas páginas, capítulos com abertura e matéria, papel vegetal entre
// algumas páginas, colofão e contracapa). Os números e os fatos são os da prévia de 05/11 (311 glifos em cada estilo,
// as larguras de cada estilo, o revezamento das minúsculas, o L do meio e o f do começo).
import type { Familia } from './pincel';

export type Capitulo = {
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

export const COR = {
    cut: '#b3806d',
    polished: '#ffc6dc',
    worn: '#00d470',
    laranja: '#fd5100',
    roxo: '#9d5af9',
};

export const CAPITULOS: Capitulo[] = [
    {
        n: 1,
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
        n: 2,
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
        n: 3,
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
        tinta: '#f6f3ff',
        legenda: ['Föeger Rune Worn', 'Nenhuma igual'],
        vegetal: { tinta: [236, 228, 252], desenho: 'cortes' },
    },
    {
        n: 4,
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
    | { tipo: 'rosto' }
    | { tipo: 'sumario-esq' }
    | { tipo: 'sumario-dir' }
    | { tipo: 'abertura-imagem'; cap: number }
    | { tipo: 'abertura-titulo'; cap: number }
    | { tipo: 'artigo-esq'; cap: number }
    | { tipo: 'artigo-dir'; cap: number }
    | { tipo: 'vegetal'; cap: number }
    | { tipo: 'caracteres-esq' }
    | { tipo: 'caracteres-dir' }
    | { tipo: 'colofao' };

export type Folha = { frente: Pagina; verso: Pagina; tipo: 'capa' | 'papel' | 'vegetal' | 'contracapa'; numFrente?: number; numVerso?: number };

// as páginas dos caracteres, para o sumário (preenchidas na montagem)
export const EXTRAS: { caracteres?: [number, number] } = {};

export function montarFolhas(): Folha[] {
    const f: Folha[] = [];
    f.push({ tipo: 'capa', frente: { tipo: 'capa' }, verso: { tipo: 'guarda' } });
    f.push({ tipo: 'papel', frente: { tipo: 'rosto' }, verso: { tipo: 'sumario-esq' } });
    let direita: Pagina = { tipo: 'sumario-dir' };
    CAPITULOS.forEach((c, i) => {
        f.push({ tipo: 'papel', frente: direita, verso: { tipo: 'abertura-imagem', cap: i } });
        f.push({ tipo: 'papel', frente: { tipo: 'abertura-titulo', cap: i }, verso: { tipo: 'artigo-esq', cap: i } });
        if (c.vegetal) f.push({ tipo: 'vegetal', frente: { tipo: 'vegetal', cap: i }, verso: { tipo: 'vegetal', cap: i } });
        direita = { tipo: 'artigo-dir', cap: i };
    });
    f.push({ tipo: 'papel', frente: direita, verso: { tipo: 'caracteres-esq' } });
    f.push({ tipo: 'papel', frente: { tipo: 'caracteres-dir' }, verso: { tipo: 'colofao' } });
    f.push({ tipo: 'contracapa', frente: { tipo: 'guarda' }, verso: { tipo: 'contracapa' } });
    // números de página: o rosto é a 1; o papel vegetal não conta
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
    return f;
}

// a folha a virar para chegar ao capítulo i (a abertura fica aberta: a folha da abertura-imagem já virada)
export function folhaDoCapitulo(folhas: Folha[], i: number) {
    return folhas.findIndex(x => x.verso.tipo === 'abertura-imagem' && 'cap' in x.verso && x.verso.cap === i) + 1;
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
