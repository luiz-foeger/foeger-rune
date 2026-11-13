// os ponteiros do livro: os do sistema. O texto que aproxima para ler e o livro de perto (que volta com um clique) usam
// a mão de clique, como os links; o motor pede cada um pelo nome do que o clique faz ali
export type Ponteiro = 'default' | 'pointer' | 'grab' | 'grabbing' | 'zoom-in' | 'zoom-out';

export const PONTEIROS: Record<Ponteiro, string> = {
    default: 'default',
    pointer: 'pointer',
    grab: 'grab',
    grabbing: 'grabbing',
    'zoom-in': 'pointer',
    'zoom-out': 'pointer',
};
