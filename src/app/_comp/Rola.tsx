// o texto que rola no hover, o do cabeçalho do site principal: o texto e a cópia empilhados numa janela; no hover do
// link, o texto sobe e a cópia entra por baixo (.fx-rola, no clone.css). A cópia fica escondida dos leitores de tela.
// Usado no cabeçalho (Topo.tsx) e no rodapé (Rodape.tsx)
export function Rola({ children }: { children: React.ReactNode }) {
    return (
        <span className="fx-rola">
            <span>{children}</span>
            <span aria-hidden>{children}</span>
        </span>
    );
}
