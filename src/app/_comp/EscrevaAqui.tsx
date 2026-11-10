"use client";

import { useId, useState, type CSSProperties } from "react";
import Painel from "./Painel";
import { familiaDe } from "./Faixa";
import Inspetor from "./Inspetor";
import { CapaInfantil, CenaDisco, FolhaCartaz, type Bloco } from "./Pratica";
import { COR_FAIXA, ESTILOS, type Estilo } from "../_lib/conteudo";

// o "escreva aqui": o visitante escreve um texto e vê a Föeger Rune nele, numa peça de verdade das faixas (o cartaz
// colado, a capa do livro infantil ou a capa do disco), no estilo que escolher. O texto vira o título da peça, quebrado
// em linhas como a peça pede, e o resto dela fica igual (as linhas de apoio, o acabamento, as sombras). A faixa toma a
// cor do estilo escolhido, como as faixas de cima, e o inspetor mostra a fonte e o tamanho de cada texto.
type Objeto = "cartaz" | "livro" | "disco";
const OBJETOS: { id: Objeto; nome: string; estilo: Estilo }[] = [
  { id: "cartaz", nome: "Cartaz", estilo: "cut" },
  { id: "livro", nome: "Livro", estilo: "polished" },
  { id: "disco", nome: "Disco", estilo: "worn" },
];
const INICIAL = "Pedra que rola";
const VAZIO = "Escreva aqui";

// o texto em até "max" linhas, com as palavras repartidas por igual (no cartaz, cada linha vira um corpo, como no tipo
// de madeira; nas capas, o título em duas linhas)
function quebrar(texto: string, max: number) {
  const palavras = texto.trim().split(/\s+/).filter(Boolean);
  if (palavras.length <= 1) return palavras;
  const n = Math.min(max, palavras.length);
  const alvo = palavras.join(" ").length / n;
  const linhas: string[] = [];
  let atual = "";
  for (const p of palavras) {
    const junto = atual ? `${atual} ${p}` : p;
    if (atual && junto.length > alvo * 1.15 && linhas.length < n - 1) {
      linhas.push(atual);
      atual = p;
    } else atual = junto;
  }
  linhas.push(atual);
  return linhas;
}

// o cartaz do festival com o texto no meio, no lugar do "QUEBRA PEDRA"
const cartazCom = (texto: string): Bloco[] => [
  { linhas: ["21 MAR ★ 20H", "GALPÃO DA PEDREIRA"] },
  { linhas: quebrar(texto, 2), teto: 230 },
  { linhas: ["OS LASCADOS", "CINZEL ★ BRITA 3"], faixa: true },
  { linhas: ["pista a R$ 20", "traga seu capacete"] },
];

export default function EscrevaAqui() {
  const id = useId().replace(/:/g, "");
  const [texto, setTexto] = useState(INICIAL);
  const [objeto, setObjeto] = useState<Objeto>("cartaz");
  const [estilo, setEstilo] = useState<Estilo>("cut");
  const familia = familiaDe(estilo);
  const t = texto.trim() || VAZIO;
  const nomeObjeto = OBJETOS.find((o) => o.id === objeto)!.nome.toLowerCase();
  return (
    <section
      id="escreva"
      className="fx-faixa fx-escreva"
      aria-label="Escreva aqui"
      style={{ "--cor-faixa": COR_FAIXA[estilo] } as CSSProperties}
    >
      <div className="fx-faixa-miolo">
        {/* o campo do texto, escrito na própria fonte, e as escolhas: a peça e o estilo */}
        <Painel
          colunas={4}
          linhas={1}
          rotulo="Escreva o seu texto e escolha a peça e o estilo"
          celular={{ colunas: 2, linhas: 2 }}
        >
          <div className="fx-escreva-controles">
            <label
              className="fx-etiqueta-estilo fx-escreva-rotulo"
              htmlFor={`${id}-campo`}
            >
              Escreva aqui
            </label>
            <input
              id={`${id}-campo`}
              className="fx-escreva-campo"
              style={{ fontFamily: familia }}
              value={texto}
              maxLength={32}
              placeholder={VAZIO}
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => setTexto(e.target.value)}
            />
            <div className="fx-escreva-opcoes">
              <div
                className="fx-escreva-grupo"
                role="radiogroup"
                aria-label="Peça"
              >
                <span className="fx-escreva-grupo-nome">Peça</span>
                {OBJETOS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={o.id === objeto}
                    className="fx-escreva-botao"
                    data-ativo={o.id === objeto}
                    onClick={() => {
                      // cada peça abre no estilo dela (o cartaz no Cut, o livro no Polished, o disco no
                      // Worn); depois, o estilo troca à vontade
                      setObjeto(o.id);
                      setEstilo(o.estilo);
                    }}
                  >
                    {o.nome}
                  </button>
                ))}
              </div>
              <div
                className="fx-escreva-grupo"
                role="radiogroup"
                aria-label="Estilo"
              >
                <span className="fx-escreva-grupo-nome">Estilo</span>
                {ESTILOS.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    role="radio"
                    aria-checked={e.id === estilo}
                    className="fx-escreva-botao"
                    data-ativo={e.id === estilo}
                    style={{ fontFamily: e.familia }}
                    onClick={() => setEstilo(e.id)}
                  >
                    {e.nome}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Painel>
        {/* a peça com o texto; troca inteira quando muda o estilo, para as linhas que enchem a largura medirem de
                    novo na fonte nova */}
        <div className="fx-escreva-peca">
          <Painel
            key={estilo}
            colunas={4}
            linhas={2}
            rotulo={`O texto ${t} no ${nomeObjeto}`}
            celular={{ colunas: 2, linhas: 3 }}
            nu
            entrada={false}
          >
            {objeto === "cartaz" && (
              <div
                className="fx-muro fx-escreva-muro"
                style={{ fontFamily: familia }}
                aria-hidden
              >
                <FolhaCartaz
                  cartaz={cartazCom(t)}
                  copia={0}
                  filtro={`${id}-tinta`}
                />
              </div>
            )}
            {objeto === "livro" && (
              <div
                className="fx-v-mesa fx-v-estante"
                style={{ fontFamily: familia }}
                aria-hidden
              >
                <CapaInfantil titulo={quebrar(t, 2)} />
              </div>
            )}
            {objeto === "disco" && (
              <div
                className="fx-v-mesa"
                style={{ fontFamily: familia }}
                aria-hidden
              >
                <CenaDisco titulo={quebrar(t, 2)} />
              </div>
            )}
          </Painel>
        </div>
      </div>
      <Inspetor escopo=".fx-escreva-peca" />
    </section>
  );
}
