// o conteúdo do livro da página: o espécime da Föeger Rune, na ordem dos livros de verdade e contado como a vida de uma
// pedra, a partir da logo da Föeger, de onde a fonte nasceu: a capa com a guarda lisa por dentro; as páginas de
// abertura (a falsa folha de rosto, o frontispício, a folha de rosto, os créditos no verso dela, o sumário e, numa
// dupla, a logo peça por peça e a apresentação); os quatro capítulos (como as letras foram construídas, os três estilos,
// as variações e a fonte do título ao texto); os caracteres; o colofão; e a contracapa, também com a guarda por dentro.
// Cada assunto abre numa dupla: à esquerda, uma página de cor chapada com letras enormes; à direita, a introdução; e,
// entre as duas, um papel vegetal impresso com o desenho de construção do assunto. As matérias seguem as páginas dos
// espécimes de fundição (a referência é o livro da Studio Feixen): uma dupla por assunto, com a letra grande, caixas
// com o nome do que mostram e os números de verdade da fonte. Os números e os fatos são os da prévia de 05/11 (311 glifos em cada estilo, as larguras de cada estilo, o revezamento das minúsculas,
// o L do meio e o f do começo).

export type IdCapitulo = 'construcao' | 'estilos' | 'variacoes' | 'tamanhos';
export type Capitulo = {
    // o id do capítulo (as páginas de cada um são achadas por ele, não pela posição)
    id: IdCapitulo;
    n: number;
    titulo: string;
    // a frase do capítulo, na introdução
    epigrafe: string;
    // a visão geral, na introdução, e os três textos que as matérias usam (nas legendas e junto das amostras)
    visaoGeral: string;
    corpo: [string, string, string];
    // quantas páginas o capítulo tem depois da introdução (sempre par: ele fecha numa página da direita, e a página de
    // cor do capítulo seguinte fica à esquerda da introdução dele)
    materias: number;
    // as seções da introdução: o nome, a página (contada a partir da introdução: 1 é a seguinte) e se aparece no sumário
    secoes: { nome: string; k: number; sumario?: boolean }[];
    // a página de cor e a última do capítulo
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
type Rgb = [number, number, number];
const rgb = (hex: string): Rgb => {
    const h = hex.replace('#', '');
    return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)) as Rgb;
};

// os papéis vegetais, um antes de cada assunto: o desenho impresso nele e a cor do papel. O das variações tem a cor do
// tom frio claro da paleta (lida por lerCores); os outros, a do papel vegetal comum
export type DesenhoVegetal = 'construcao' | 'contornos' | 'cortes' | 'regua' | 'gabarito';
export const VEGETAIS: { desenho: DesenhoVegetal; tinta: Rgb }[] = [
    { desenho: 'construcao', tinta: [246, 245, 241] },
    { desenho: 'contornos', tinta: [246, 245, 241] },
    { desenho: 'cortes', tinta: [221, 227, 243] },
    { desenho: 'regua', tinta: [246, 245, 241] },
    { desenho: 'gabarito', tinta: [246, 245, 241] },
];

export function lerCores(el: Element) {
    const cs = getComputedStyle(el);
    for (const k of Object.keys(VARIAVEIS) as (keyof typeof COR)[]) {
        const v = cs.getPropertyValue(VARIAVEIS[k]).trim();
        if (/^#[0-9a-f]{6}$/i.test(v)) COR[k] = v;
    }
    VEGETAIS[2].tinta = rgb(COR.tintaFrio);
}

export const CAPITULOS: Capitulo[] = [
    {
        id: 'construcao',
        n: 1,
        titulo: 'A construção das letras',
        epigrafe: 'Toda pedra começa bruta.',
        visaoGeral: 'A Föeger Rune começou na logo da Föeger. Das letras dela veio a ideia de um alfabeto inteiro, desenhado à mão num gabarito e depois refeito só com retas, com o corte do cinzel nas quinas.',
        corpo: [
            'A logo já era feita de pedras: cada letra uma peça de retas, e os pingos do ö e o ponto, soltos. Dela veio a vontade de ir além da logo: as outras letras, os números e os sinais, no mesmo traço.',
            'Cada letra foi desenhada à mão num gabarito, um quadrado por letra. O desenho virou contorno, e as curvas da vetorização viraram retas: o alfabeto caiu de 3.390 para 1.262 pontos sem perder o jeito da mão.',
            'Nas quinas, um corte reto, como o golpe de um cinzel. Por isso nenhuma letra é perfeitamente reta e nenhuma é igual à outra: de longe, a palavra parece um muro de pedras encaixadas; de perto, cada pedra tem o seu desenho.',
        ],
        materias: 4,
        secoes: [
            { nome: 'Pontos de construção', k: 1, sumario: true },
            { nome: 'As linhas e os pontos', k: 3, sumario: true },
        ],
    },
    {
        id: 'estilos',
        n: 2,
        titulo: 'Os três estilos',
        epigrafe: 'Pedra que rola não cria limo!',
        visaoGeral: 'Três desgastes da mesma pedra. A Cut tem as quinas vivas; a Polished rolou um pouco no rio; a Worn passou anos na correnteza e ficou redonda.',
        corpo: [
            'O desgaste não é um efeito por cima da letra: cada estilo é uma fonte inteira, com os 311 glifos refeitos. As quinas de fora arredondam primeiro; as de dentro, os cantos dos miolos, resistem mais.',
            'A Polished guarda o corte com as pontas lixadas e vai bem em títulos e textos curtos. A Worn é a mais macia: perde os ângulos, ganha volume e serve quando a pedra precisa parecer amiga.',
            'Quanto mais gasta, mais estreita: o A tem 801 unidades de largura na Cut, 749 na Polished e 710 na Worn. A mesma palavra ocupa menos linha a cada estilo.',
        ],
        materias: 6,
        secoes: [
            { nome: 'Os três estilos juntos', k: 1 },
            { nome: 'Visão geral dos estilos', k: 3, sumario: true },
            { nome: 'O desgaste de perto', k: 5 },
        ],
    },
    {
        id: 'variacoes',
        n: 3,
        titulo: 'As variações',
        epigrafe: 'Sonhei ontem que uma pedra rolava, rolava e não paraaava!',
        visaoGeral: 'Quem talha à mão não repete o golpe. Quando uma minúscula aparece de novo logo em seguida, a fonte troca o corte sozinha, e a palavra nunca fica com cara de carimbo.',
        corpo: [
            'A ideia veio da logo: os dois e de Föeger foram desenhados diferentes, e o segundo virou a primeira variação do e. Daí, cada minúscula ganhou até quatro cortes.',
            'Os cortes se revezam: o desenho de base, depois a variação dois, a três e a quatro, e de novo a base. O texto não muda; quem faz a troca é a própria fonte, pelas alternativas de contexto, nos três estilos.',
            'Duas letras ainda mudam conforme o lugar: o L ganha outro corte quando vem depois de outra letra, e o f tem um desenho próprio para o começo da palavra.',
        ],
        materias: 6,
        secoes: [
            { nome: 'Os quatro cortes do s', k: 1 },
            { nome: 'As trocas', k: 3, sumario: true },
            { nome: 'Os quatro cortes do e', k: 5 },
        ],
    },
    {
        id: 'tamanhos',
        n: 4,
        titulo: 'Do título ao texto',
        epigrafe: 'Jane quer LP, fax, CD, giz, TV e bom whisky.',
        visaoGeral: 'Feita para títulos, cartazes e palavras curtas, a Rune aguenta o parágrafo em corpo grande. Grande, a pedra aparece inteira; pequena, vira textura.',
        corpo: [
            'Grande, a pedra aparece inteira: as quinas, os cortes e o peso. É onde a Rune mais aparece, em títulos, cartazes, capas e palavras soltas.',
            'Em corpo de texto, o desenho vira textura, pesada e irregular, que pede frases curtas e espaço entre as linhas.',
            'Os acentos são pedras à parte, pousadas por cima, e as frações, os números elevados e os símbolos do dia a dia vêm no mesmo traço.',
        ],
        materias: 10,
        secoes: [
            { nome: 'Em corpo de cartaz', k: 1 },
            { nome: 'Cascata de tamanhos', k: 3, sumario: true },
            { nome: 'Palavras e números', k: 5 },
            { nome: 'Acentos, frações e sinais', k: 7 },
            { nome: 'Exemplos de texto', k: 9, sumario: true },
        ],
    },
];

export const LIVRO = {
    titulo: 'Föeger Rune',
    edicao: 'Edição 01 — 2026',
    frase: 'Pedra que se gasta.',
    apresentacao:
        'A Föeger Rune nasceu da logo da Föeger. Das letras dela vieram as outras, desenhadas à mão num gabarito, uma por quadrado, e refeitas só com retas, com o corte reto do cinzel nas quinas: é a Cut. A mesma pedra, rolada no rio, deu a Polished, com as pontas lixadas, e a Worn, redonda. São três fontes inteiras, com 311 glifos em cada uma.',
};

// as páginas do livro: cada folha tem a frente (a página da direita enquanto está à direita) e o verso (a da esquerda
// depois de virada). As do capítulo: a de cor, a introdução (a da direita, embaixo do vegetal) e as seguintes (k a partir
// de 0)
export type Pagina =
    | { tipo: 'capa' }
    | { tipo: 'guarda' }
    | { tipo: 'contracapa' }
    | { tipo: 'falsa-rosto' }
    | { tipo: 'frontispicio' }
    | { tipo: 'rosto' }
    | { tipo: 'creditos' }
    | { tipo: 'sumario' }
    | { tipo: 'logo' }
    | { tipo: 'apresentacao' }
    | { tipo: 'cor'; cap: number }
    | { tipo: 'abertura'; cap: number }
    | { tipo: 'materia'; cap: number; k: number }
    | { tipo: 'vegetal'; v: number }
    | { tipo: 'letras' }
    | { tipo: 'acentos' }
    | { tipo: 'sinais' }
    | { tipo: 'colofao' };

// a cor do papel vegetal de uma página (as outras não têm)
export const tintaDoVegetal = (p: Pagina) => (p.tipo === 'vegetal' ? VEGETAIS[p.v].tinta : undefined);

export type Folha = { frente: Pagina; verso: Pagina; tipo: 'capa' | 'papel' | 'vegetal' | 'contracapa'; numFrente?: number; numVerso?: number };

// as páginas que o sumário e os créditos precisam saber (preenchidas na montagem): a apresentação, as três dos
// caracteres, o colofão e o total de páginas numeradas, para a ficha
export const EXTRAS: { apresentacao?: number; letras?: number; acentos?: number; sinais?: number; colofao?: number; paginas?: number } = {};

export function montarFolhas(): Folha[] {
    // as páginas na ordem de leitura, com os vegetais onde eles entram (sempre entre duas folhas: depois de uma página da
    // esquerda, antes de uma da direita)
    const seq: (Pagina | { vegetal: number })[] = [
        { tipo: 'falsa-rosto' },
        { tipo: 'frontispicio' },
        { tipo: 'rosto' },
        { tipo: 'creditos' },
        { tipo: 'sumario' },
        { tipo: 'apresentacao' },
        { tipo: 'logo' },
    ];
    CAPITULOS.forEach((ch, cap) => {
        seq.push({ tipo: 'cor', cap }, { vegetal: cap }, { tipo: 'abertura', cap });
        for (let k = 0; k < ch.materias; k++) seq.push({ tipo: 'materia', cap, k });
    });
    seq.push({ tipo: 'cor', cap: CAPITULOS.length }, { vegetal: CAPITULOS.length }, { tipo: 'letras' }, { tipo: 'acentos' }, { tipo: 'sinais' }, { tipo: 'colofao' });
    const f: Folha[] = [{ tipo: 'capa', frente: { tipo: 'capa' }, verso: { tipo: 'guarda' } }];
    let frente: Pagina | null = null;
    for (const x of seq) {
        if ('vegetal' in x) {
            if (frente) throw new Error('o papel vegetal tem de ficar entre duas folhas');
            f.push({ tipo: 'vegetal', frente: { tipo: 'vegetal', v: x.vegetal }, verso: { tipo: 'vegetal', v: x.vegetal } });
        } else if (!frente) frente = x;
        else {
            f.push({ tipo: 'papel', frente, verso: x });
            frente = null;
        }
    }
    if (frente) throw new Error('o livro tem de fechar numa página da esquerda');
    f.push({ tipo: 'contracapa', frente: { tipo: 'guarda' }, verso: { tipo: 'contracapa' } });
    // números de página: a falsa folha de rosto é a 1; o papel vegetal não conta
    let n = 1;
    for (const folha of f) {
        if (folha.tipo !== 'papel') continue;
        folha.numFrente = n++;
        folha.numVerso = n++;
    }
    const pagina = (t: Pagina['tipo'], lado: 'frente' | 'verso', cap?: number) => {
        const x = f.find(y => y[lado].tipo === t && (cap === undefined || ('cap' in y[lado] && (y[lado] as { cap: number }).cap === cap)))!;
        return lado === 'frente' ? x.numFrente! : x.numVerso!;
    };
    CAPITULOS.forEach((c, cap) => {
        const ini = pagina('cor', 'verso', cap);
        c.paginas = [ini, ini + 1 + c.materias];
    });
    EXTRAS.apresentacao = pagina('apresentacao', 'verso');
    EXTRAS.letras = pagina('letras', 'frente');
    EXTRAS.acentos = pagina('acentos', 'verso');
    EXTRAS.sinais = pagina('sinais', 'frente');
    EXTRAS.colofao = pagina('colofao', 'verso');
    EXTRAS.paginas = n - 1;
    return f;
}

// quantas folhas virar para o capítulo i ficar aberto: a introdução à direita, limpa, com o vegetal já virado por cima
// da página de cor
export function folhaDoCapitulo(folhas: Folha[], i: number) {
    return folhas.findIndex(x => x.frente.tipo === 'abertura' && x.frente.cap === i);
}

// quantas folhas virar para a página n ficar aberta (o sumário leva a qualquer página): se ela é o verso de uma folha
// (à esquerda), essa folha já virou; se é a frente (à direita), só as de antes
export function contagemDaPagina(folhas: Folha[], n: number) {
    const i = folhas.findIndex(f => f.numFrente === n || f.numVerso === n);
    if (i < 0) return 0;
    return folhas[i].numVerso === n ? i + 1 : i;
}

// a página das letras, a primeira dos caracteres (o sumário também leva a ela), com o vegetal do gabarito já virado
export function folhaDosCaracteres(folhas: Folha[]) {
    return folhas.findIndex(x => x.frente.tipo === 'letras');
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
