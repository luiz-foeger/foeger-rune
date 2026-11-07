// o desgaste da Föeger Rune num filtro SVG, com as quinas de fora e as de dentro separadas, como os controles
// "Outside Corners" e "Inside Corners" da Feixen. A conta é a da fonte: desfoque gaussiano (σ em unidades da fonte) e
// corte no meio-tom. Com o mesmo σ nos dois, o resultado é o desgaste da fonte (26 = Polished, 50 = Worn).
//   ambos:  corte(desfoque σ)               → a pedra gasta, como na fonte
//   fora:   a pedra ∩ corte(desfoque σ)     → só as pontas recuam
//   dentro: a pedra ∪ corte(desfoque σ)     → só os vãos se enchem
//   livre:  as duas coisas com σ diferentes → (pedra ∩ corte σf) ∪ (corte σd − pedra)
// O filtro vai em cada pedra (contorno de fora + furos), para os pingos e acentos não grudarem. A área do filtro é a
// caixa da própria pedra: o corte no meio nunca passa dela, e assim o desfoque custa bem menos.
export type ModoDesgaste = 'ambos' | 'fora' | 'dentro' | 'livre';

// pxPorUnidade (pixels da tela por unidade da fonte, opcional): com ele, a inclinação do corte deixa a borda com ~0,6 px
// de transição em qualquer σ, e no σ 0 o corte vira identidade (a borda fica com a suavização do próprio navegador, sem
// serrilhar). Sem ele, a inclinação é a fixa dos cartões.
export const corte = (sigma: number, pxPorUnidade?: number) => {
    const k = pxPorUnidade
        ? Math.min(140, Math.max(1, (sigma * Math.sqrt(2 * Math.PI) * pxPorUnidade) / 0.6))
        : // o corte fica mais íngreme quando o desfoque cresce, para a borda continuar nítida
          Math.min(140, Math.max(13, 2.5 * sigma));
    return `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${k.toFixed(2)} ${(0.5 - k / 2).toFixed(3)}`;
};

const ladrilho = (cor: string, passo: number) =>
    `data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${passo}" height="${passo}" viewBox="0 0 10 10"><circle cx="5" cy="5" r="2.4" fill="${cor}"/></svg>`,
    )}`;

function Ramo({ lado, saida }: { lado: 'fora' | 'dentro'; saida: string }) {
    return (
        <>
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.01" result={`b${lado}`} data-sigma={lado} />
            <feColorMatrix in={`b${lado}`} type="matrix" values={corte(0)} result={saida} data-corte={lado} />
        </>
    );
}

export function FiltroDesgaste({
    id,
    modo,
    contorno,
    raioContorno = 3.2,
    pontos,
}: {
    id: string;
    modo: ModoDesgaste;
    contorno?: string;
    raioContorno?: number;
    // a retícula de pontos (dentro da lente de transferidor); o ladrilho precisa começar dentro da área do filtro (a
    // caixa da pedra), por isso vai no canto dela (x, y)
    pontos?: { cor: string; passo: number; x: number; y: number };
}) {
    return (
        <filter id={id} x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
            {modo === 'ambos' && <Ramo lado="fora" saida="pedra" />}
            {modo === 'fora' && (
                <>
                    <Ramo lado="fora" saida="tf" />
                    <feComposite in="tf" in2="SourceGraphic" operator="in" result="pedra" />
                </>
            )}
            {modo === 'dentro' && (
                <>
                    <Ramo lado="dentro" saida="td" />
                    <feMerge result="pedra">
                        <feMergeNode in="SourceGraphic" />
                        <feMergeNode in="td" />
                    </feMerge>
                </>
            )}
            {modo === 'livre' && (
                <>
                    <Ramo lado="fora" saida="tf" />
                    <feComposite in="tf" in2="SourceGraphic" operator="in" result="pf" />
                    <Ramo lado="dentro" saida="td" />
                    <feComposite in="td" in2="SourceGraphic" operator="out" result="vaos" />
                    <feMerge result="pedra">
                        <feMergeNode in="pf" />
                        <feMergeNode in="vaos" />
                    </feMerge>
                </>
            )}
            {pontos && (
                <>
                    {/* o ladrilho é branco e a cor vem de um flood: assim a cor pode ser uma variável da paleta */}
                    <feImage href={ladrilho('#fff', pontos.passo)} x={pontos.x} y={pontos.y} width={pontos.passo} height={pontos.passo} preserveAspectRatio="none" result="ponto" />
                    <feTile in="ponto" result="trama" />
                    <feFlood style={{ floodColor: pontos.cor }} result="corPontos" />
                    <feComposite in="corPontos" in2="trama" operator="in" result="tramaCor" />
                    <feComposite in="tramaCor" in2="pedra" operator="in" result="reticula" />
                </>
            )}
            {contorno && (
                <>
                    <feMorphology in="pedra" operator="erode" radius={raioContorno} result="miolo" />
                    <feComposite in="pedra" in2="miolo" operator="out" result="anel" />
                    <feFlood floodColor={contorno} result="cor" />
                    <feComposite in="cor" in2="anel" operator="in" result="linha" />
                </>
            )}
            {(pontos || contorno) && (
                <feMerge>
                    <feMergeNode in="pedra" />
                    {pontos && <feMergeNode in="reticula" />}
                    {contorno && <feMergeNode in="linha" />}
                </feMerge>
            )}
        </filter>
    );
}

// o filtro solto num SVG vazio, para usar em texto HTML (style filter: url(#id)); aí o σ vai em px do texto:
// σ(px) = σ(unidades da fonte) × tamanho da letra (px) / 1000
export function DefsDesgaste({ id, modo }: { id: string; modo: ModoDesgaste }) {
    return (
        <svg className="fx-defs" width="0" height="0" aria-hidden>
            <defs>
                <FiltroDesgaste id={id} modo={modo} />
            </defs>
        </svg>
    );
}

// muda o σ de todos os filtros de desgaste dentro de um elemento (as primitivas ficam guardadas na primeira chamada)
type Primitivas = { sigma: Element[]; corte: Element[]; lado: ('fora' | 'dentro')[]; ladoCorte: ('fora' | 'dentro')[] };
const guardadas = new WeakMap<Element, Primitivas>();
export function ajustarDesgaste(raiz: Element | null, fora: number, dentro: number, pxPorUnidade?: number) {
    if (!raiz) return;
    let p = guardadas.get(raiz);
    if (!p) {
        const sigma = [...raiz.querySelectorAll('[data-sigma]')];
        const cortes = [...raiz.querySelectorAll('[data-corte]')];
        p = {
            sigma,
            corte: cortes,
            lado: sigma.map(el => (el.getAttribute('data-sigma') === 'fora' ? 'fora' : 'dentro')),
            ladoCorte: cortes.map(el => (el.getAttribute('data-corte') === 'fora' ? 'fora' : 'dentro')),
        };
        guardadas.set(raiz, p);
    }
    const sf = Math.max(0.01, fora);
    const sd = Math.max(0.01, dentro);
    const vf = sf.toFixed(2);
    const vd = sd.toFixed(2);
    const cf = corte(sf, pxPorUnidade);
    const cd = corte(sd, pxPorUnidade);
    p.sigma.forEach((el, i) => el.setAttribute('stdDeviation', p.lado[i] === 'fora' ? vf : vd));
    p.corte.forEach((el, i) => el.setAttribute('values', p.ladoCorte[i] === 'fora' ? cf : cd));
}
