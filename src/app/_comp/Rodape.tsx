import { Rola } from './Rola';
import { RODAPE } from '../_lib/conteudo';

// o rodapé das duas páginas: uma linha só, no pé, centrada no eixo da página (o mesmo dos controles do livro), com a
// letra, a tinta e o hover do cabeçalho (o texto que rola): o e-mail, as redes do site principal e o crédito do
// colofão, que leva a ele. Ocupa o respiro que o corpo já deixava embaixo da última seção, e a página continua
// terminando no livro (na home) e no playground (na "Na prática")
export default function Rodape() {
    const fora = { target: '_blank', rel: 'noopener noreferrer' };
    return (
        <footer className="fx-rodape">
            {/* role="list": sem os marcadores, o Safari deixa de anunciar a lista */}
            <ul className="fx-rodape-links" role="list" aria-label="Contato">
                <li>
                    <a className="fx-rodape-link" href={`mailto:${RODAPE.email}`}>
                        <Rola>{RODAPE.email}</Rola>
                    </a>
                </li>
                {RODAPE.redes.map(r => (
                    <li key={r.texto}>
                        <a className="fx-rodape-link" href={r.href} {...fora}>
                            <Rola>{r.texto}</Rola>
                        </a>
                    </li>
                ))}
            </ul>
            <a className="fx-rodape-link" href={RODAPE.credito.href} {...fora} aria-label={`${RODAPE.credito.texto}, o site da Föeger`}>
                <Rola>
                    {RODAPE.credito.texto}
                    <span className="fx-rodape-seta" aria-hidden>
                        ↑
                    </span>
                </Rola>
            </a>
        </footer>
    );
}
