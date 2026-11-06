'use client';

import { useState } from 'react';
import Painel from './Painel';
import { ESTILOS, type Estilo } from '../_lib/conteudo';

// o alfabeto em quatro linhas no estilo escolhido e, embaixo, os três desgastes no lugar dos pesos da Ease
// (o escolhido fica verde). Sem o calt: cada letra aparece no desenho de base, sem as trocas por posição.
const LINHAS = ['AaBbCcDdEeFfGg', 'HhIiJjKkLlMm', 'NnOoPpQqRrSsTt', 'UuVvWwXxYyZz'];
// no celular, o painel fica com 2 colunas e 3 fileiras, e o alfabeto em sete linhas mais curtas
const LINHAS_CELULAR = ['AaBbCcDd', 'EeFfGgHh', 'IiJjKkLl', 'MmNnOoPp', 'QqRrSsTt', 'UuVvWwXx', 'YyZz'];
const quebrar = (linhas: string[]) =>
    linhas.map((l, i) => (
        <span key={l}>
            {i > 0 && <br />}
            {l}
        </span>
    ));

export default function Alfabeto() {
    const [ativo, setAtivo] = useState<Estilo>('polished');
    const familia = ESTILOS.find(e => e.id === ativo)!.familia;
    return (
        <Painel colunas={4} linhas={2} rotulo="Alfabeto" celular={{ colunas: 2, linhas: 3 }}>
            <p className="fx-alfabeto fx-so-largo" style={{ fontFamily: familia }}>
                {quebrar(LINHAS)}
            </p>
            <p className="fx-alfabeto fx-so-celular" style={{ fontFamily: familia }}>
                {quebrar(LINHAS_CELULAR)}
            </p>
            <div className="fx-estilos" role="radiogroup" aria-label="Estilos">
                {ESTILOS.map(e => (
                    <button
                        key={e.id}
                        type="button"
                        role="radio"
                        aria-checked={e.id === ativo}
                        className="fx-estilo"
                        data-ativo={e.id === ativo}
                        onMouseEnter={() => setAtivo(e.id)}
                        onFocus={() => setAtivo(e.id)}
                        onClick={() => setAtivo(e.id)}
                    >
                        <span className="fx-estilo-nome">{e.nome}</span>
                        <span className="fx-estilo-aa" style={{ fontFamily: e.familia }}>
                            Aa
                        </span>
                    </button>
                ))}
            </div>
        </Painel>
    );
}
