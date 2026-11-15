import Mascara from './Mascara';

// o título de uma parte da página ("Três Estilos", "Caracteres", "Variações", "O Livro"; na "Na prática", o dela e o
// "Playground"): solto, sem painel, na fonte de texto e centrado. O título e a nota (se houver) sobem da máscara ao
// chegar à tela, a nota um pouco depois
export default function Titulo({ texto, nota = null, ancora }: { texto: string; nota?: string | null; ancora?: string }) {
    return (
        <header id={ancora} className="fx-cabeca">
            <Mascara como="h2" className="fx-cabeca-titulo">
                {texto}
            </Mascara>
            {nota && (
                <Mascara como="p" className="fx-cabeca-nota" atraso={0.12}>
                    {nota}
                </Mascara>
            )}
        </header>
    );
}
