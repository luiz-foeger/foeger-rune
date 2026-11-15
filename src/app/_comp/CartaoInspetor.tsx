'use client';

import { useId, useRef, type CSSProperties } from 'react';
import Painel from './Painel';
import { FiltroDesgaste, ajustarDesgaste } from './Desgaste';
import { Faixas, Transferidor } from './Moldura';
import { LINHAS, PALAVRAS, type Ponto } from '../_lib/glifos';
import { MEDIDAS, emSigma } from '../_lib/medidas';
import { sigmaDaDivisa } from '../_lib/divisa';
import { useLaco } from '../_lib/movimento';

// o cartão grande (2 × 2) do A: a letra inteira com as quinas do Cut marcadas e as coordenadas delas (em unidades da
// fonte, com y para cima, como no editor), as faixas das linhas da fonte com as medidas, e a lente de transferidor no
// miolo. O miolo do A é um triângulo estreito, de 30° em cima (o ângulo vai marcado na lente): o desgaste o enche até
// fechar em σ 44, antes da Worn (σ 50). A leitura é a área dele, da mesma conta que gerou a fonte (medidas.ts). O
// desgaste não vem da régua do σ, como nos outros cartões: o A anda com a divisa do Y ao lado, o par dele na fileira
// (divisa.ts).
const L = 885;
const S = 0.9; // u por unidade da fonte
const CAP_TOPO = 55;
const ZOOM = 1.35;
const RAIO = 266;

const milhar = (n: number) => Math.round(n).toLocaleString('pt-BR').replace(/\./g, ' ');

export default function CartaoInspetor({ cor, corPontos, estilo }: { cor: string; corPontos: string; estilo?: CSSProperties }) {
    const id = useId().replace(/:/g, '');
    const ref = useRef<HTMLDivElement>(null);
    const leitura = useRef<SVGTSpanElement>(null);
    const angular = useRef<SVGGElement>(null);
    const p = PALAVRAS.A;
    const g = p.glifos[0];
    const [fora, miolo] = g.pedras[0].vertices;
    // o miolo: o vértice de cima e o ângulo entre os dois lados dele
    const topo = miolo.reduce((a, b) => (b[1] < a[1] ? b : a));
    const lados = miolo.filter(v => v !== topo).map(v => Math.atan2(v[1] - topo[1], v[0] - topo[0]));
    const angulo = Math.round((Math.abs(lados[0] - lados[1]) * 180) / Math.PI);
    const foco: Ponto = [miolo.reduce((s, v) => s + v[0], 0) / 3, miolo.reduce((s, v) => s + v[1], 0) / 3];

    const x0 = (L - p.largura * S) / 2;
    const base = CAP_TOPO + LINHAS.maiuscula * S;
    const naCarta = (q: Ponto): Ponto => [x0 + q[0] * S, base + q[1] * S];
    const centro = naCarta(foco);
    const naLente = (q: Ponto): Ponto => [centro[0] + (q[0] - foco[0]) * ZOOM, centro[1] + (q[1] - foco[1]) * ZOOM];
    const dentroDaLente = (q: Ponto) => Math.hypot(q[0] - centro[0], q[1] - centro[1]) < RAIO + 8;
    const canto = { x: Math.min(...fora.map(v => v[0])), y: Math.min(...fora.map(v => v[1])) };
    const meio: Ponto = [p.largura / 2, -LINHAS.maiuscula / 2];

    useLaco(
        ref,
        () => {
            const s = sigmaDaDivisa();
            ajustarDesgaste(ref.current, s, s);
            const area = emSigma(MEDIDAS.A.areaMiolos, s);
            if (leitura.current) leitura.current.textContent = area < 1 ? 'FECHADO' : `${milhar(area)} u²`;
            // o ângulo e as retas do espaço de dentro somem junto com ele; fica o contorno tracejado de onde ele era
            angular.current?.setAttribute('opacity', Math.min(1, (1.6 * area) / MEDIDAS.A.areaMiolos[0]).toFixed(2));
        },
        30,
    );

    const pedras = (fill: string, filtro: string) => g.pedras.map((pd, i) => <path key={i} d={pd.d} fill={fill} fillRule="evenodd" filter={`url(#${filtro})`} />);
    // as retas dos dois lados do miolo, atravessando a lente, e o setor do ângulo no vértice de cima
    const pTopo = naLente(topo);
    const reta = (a: number) => `M${(pTopo[0] - Math.cos(a) * 700).toFixed(1)} ${(pTopo[1] - Math.sin(a) * 700).toFixed(1)}L${(pTopo[0] + Math.cos(a) * 700).toFixed(1)} ${(pTopo[1] + Math.sin(a) * 700).toFixed(1)}`;
    const rs = 46;
    const [a0, a1] = [Math.min(...lados), Math.max(...lados)];
    const setor = `M${pTopo[0]} ${pTopo[1]}L${(pTopo[0] + Math.cos(a0) * rs).toFixed(1)} ${(pTopo[1] + Math.sin(a0) * rs).toFixed(1)}A${rs} ${rs} 0 0 1 ${(pTopo[0] + Math.cos(a1) * rs).toFixed(1)} ${(pTopo[1] + Math.sin(a1) * rs).toFixed(1)}Z`;
    const am = (a0 + a1) / 2;

    return (
        <Painel colunas={2} linhas={2} rotulo={`A: o espaço de dentro, de ${angulo}°, fecha com o desgaste`} estilo={estilo}>
            <div ref={ref} style={{ position: 'absolute', inset: 0 }}>
                <svg className="fx-cartao-svg" viewBox={`0 0 ${L} ${L}`} aria-hidden>
                    <defs>
                        <FiltroDesgaste id={`${id}-f`} modo="ambos" />
                        {/* na lente: o contorno preto fino e a retícula de pontos, feitos dentro do próprio filtro */}
                        <FiltroDesgaste id={`${id}-fl`} modo="ambos" contorno="#111" raioContorno={1.5 / ZOOM} pontos={{ cor: corPontos, passo: 5.5 / ZOOM, ...canto }} />
                    </defs>
                    <Faixas
                        faixas={[
                            { topo: CAP_TOPO, rotulo: `MAIÚSCULA ${LINHAS.maiuscula}` },
                            { topo: base - LINHAS.x * S, rotulo: `ALTURA DO X ${LINHAS.x}` },
                            { topo: base - 27 },
                        ]}
                        x1={L - 30}
                    />
                    <text className="fx-guia-rotulo" x={L - 38} y={base + 20} textAnchor="end" fill="#111">
                        LINHA DE BASE 0
                    </text>
                    <g transform={`translate(${x0} ${base}) scale(${S})`}>{pedras(cor, `${id}-f`)}</g>
                    {/* as quinas de fora do Cut, com as coordenadas */}
                    {fora.map((v, i) => {
                        const [x, y] = naCarta(v);
                        if (dentroDaLente([x, y])) return null;
                        const dx = v[0] - meio[0];
                        const dy = v[1] - meio[1];
                        const n = Math.hypot(dx, dy) || 1;
                        return (
                            <g key={i}>
                                <circle cx={x} cy={y} r="5.5" fill="#fff" stroke="#111" strokeWidth="1.4" />
                                <text x={x + (dx / n) * 16} y={y + (dy / n) * 16 + 5} textAnchor={dx >= 0 ? 'start' : 'end'} className="fx-coordenada">
                                    {`${v[0]}, ${-v[1]}`}
                                </text>
                            </g>
                        );
                    })}
                    <Transferidor id={`${id}-lente`} cx={centro[0]} cy={centro[1]} r={RAIO}>
                        <g transform={`translate(${centro[0]} ${centro[1]}) scale(${ZOOM}) translate(${-foco[0]} ${-foco[1]})`}>{pedras(cor, `${id}-fl`)}</g>
                        <g ref={angular}>
                            <path d={reta(lados[0]) + reta(lados[1])} stroke="#111" strokeWidth="1.2" strokeDasharray="5 4" fill="none" />
                            <path d={setor} fill="#b9b9b9" opacity="0.9" />
                            <text className="fx-raio" x={pTopo[0] + Math.cos(am) * (rs + 22)} y={pTopo[1] + Math.sin(am) * (rs + 22) + 5} textAnchor="middle" fill="#111">
                                {angulo}°
                            </text>
                        </g>
                        <path d={`M${miolo.map(v => naLente(v).map(c => c.toFixed(1)).join(' ')).join('L')}Z`} fill="none" stroke="#fff" strokeWidth="1.6" strokeDasharray="6 5" />
                        <text className="fx-leitura" fill="#fff" x={centro[0] - RAIO * 0.62} y={centro[1] + RAIO * 0.56}>
                            ESPAÇO DE DENTRO
                            <tspan ref={leitura} x={centro[0] - RAIO * 0.62} dy="17">
                                {milhar(MEDIDAS.A.areaMiolos[0])} u²
                            </tspan>
                        </text>
                    </Transferidor>
                </svg>
            </div>
        </Painel>
    );
}
