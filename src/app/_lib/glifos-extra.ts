// letras que os cartões usam e que ainda não estão em glifos.ts: tiradas da prévia FoegerRune-Cut-previa.otf do site
// no mesmo formato (pedras com o contorno de fora e os furos, em unidades da fonte, y para baixo, base em 0). O mesmo
// jeito de tirar dá o A idêntico ao de glifos.ts.
import type { Palavra } from './glifos';

export const PALAVRAS_EXTRA: Record<string, Palavra> = {
    Y: {
        largura: 807,
        glifos: [
            {
                ch: 'Y',
                x: 0,
                avanco: 807,
                pedras: [
                    {
                        d: 'M508 -331L785 -644L544 -787L395 -510L297 -785L22 -671L284 -332L235 -27L534 26Z',
                        vertices: [[[508, -331], [785, -644], [544, -787], [395, -510], [297, -785], [22, -671], [284, -332], [235, -27], [534, 26]]],
                    },
                ],
            },
        ],
    },
};
