import Painel from './Painel';
import { TITULO_ESTILOS } from '../_lib/conteudo';

// o título de uma parte da página ("Três* Estilos", "Recursos", "O Livro*"), parado: a palavra pronta, com o asterisco
// pequeno e alto depois da primeira palavra e a nota no pé do painel que o explica
export default function TituloEstilos({
    texto = TITULO_ESTILOS.texto,
    asteriscoDepois = TITULO_ESTILOS.asteriscoDepois,
    nota = TITULO_ESTILOS.nota,
    ancora,
}: {
    texto?: string;
    asteriscoDepois?: number | null;
    nota?: string | null;
    ancora?: string;
}) {
    const corte = asteriscoDepois ?? texto.length;
    return (
        <Painel colunas={4} linhas={1} rotulo={texto} ancora={ancora}>
            <div className="fx-digitada">
                <div className="fx-titulo-estilos" aria-label={texto}>
                    <span aria-hidden>
                        {texto.slice(0, corte)}
                        {asteriscoDepois !== null && <span className="fx-asterisco">*</span>}
                        {texto.slice(corte)}
                    </span>
                </div>
            </div>
            {nota && <p className="fx-nota">{nota}</p>}
        </Painel>
    );
}
