import CartaoDetalhe, { type Detalhe } from './CartaoDetalhe';
import CartaoInspetor from './CartaoInspetor';
import CartaoLetra from './CartaoLetra';
import CartaoPalavra, { type PalavraCfg } from './CartaoPalavra';
import CartaoRegua from './CartaoRegua';
import { BlocoY } from './Blocos';

// a seção do desgaste: os cartões de perto da Föeger Rune numa grade de 4 × 4 módulos, movidos pelo mesmo σ (a régua
// no alto), como na fonte, em que a Polished (σ 26) e a Worn (σ 50) saem da Cut pelo mesmo desfoque. A exceção é o A,
// que anda com a divisa do Y ao lado: cada par da fileira anda junto (a régua com as lupas do R e do H, o Y com o A).
// Os números são medidos com a conta que gerou a fonte (medidas.ts) ou são as medidas dela (glifos.ts): as coordenadas
// das quinas, as linhas, o quanto cada quina anda, o miolo do A que fecha, os miolos do "Opa!" e a tinta que o Y perde.
const R: Detalhe = { letra: 'R', cor: 'var(--p-quente)', foco: [690, -60], zoom: 0.9, tipo: 'fora' };
const H: Detalhe = { letra: 'H', cor: 'var(--p-quente)', foco: [213, -40], zoom: 0.95, tipo: 'fora' };
const B: Detalhe = { letra: 'b', cor: 'var(--p-polished)', foco: [334, -420], zoom: 1.0, tipo: 'dentro', guia: { y: -545, rotulo: 'ALTURA DO X 545' } };
const OPA: PalavraCfg = { chave: 'Opa!', destaque: 2, cor: 'var(--p-frio)' };

export default function SecaoDesgaste() {
    return (
        <div className="fx-grade" id="desgaste">
            <CartaoRegua estilo={{ gridColumn: '1 / span 2', gridRow: '1' }} />
            <CartaoDetalhe cfg={R} estilo={{ gridColumn: '3', gridRow: '1' }} />
            <CartaoDetalhe cfg={H} estilo={{ gridColumn: '4', gridRow: '1' }} />
            <CartaoInspetor cor="var(--p-frio)" corPontos="var(--p-frio-escuro)" estilo={{ gridColumn: '1 / span 2', gridRow: '2 / span 2' }} />
            <BlocoY estilo={{ gridColumn: '3 / span 2', gridRow: '2 / span 2' }} />
            <CartaoDetalhe cfg={B} estilo={{ gridColumn: '1', gridRow: '4' }} />
            <CartaoLetra letra="g" cor="var(--p-worn)" estilo={{ gridColumn: '2', gridRow: '4' }} />
            <CartaoPalavra cfg={OPA} estilo={{ gridColumn: '3 / span 2', gridRow: '4' }} />
        </div>
    );
}
