import { useState, useEffect } from 'react';

const FRUTAS = ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝'];

const FRASES_NUTRICAO = [
  'Colhendo frutas frescas...',
  'Misturando ingredientes saudáveis...',
  'Equilibrando os nutrientes...',
  'Preparando uma receita especial...',
  'Higienizando os vegetais...',
  'Calculando as vitaminas...',
  'Preparando um cardápio delicioso...',
  'Organizando o plano de metas...'
];

interface FruitLoaderProps {
  mensagem?: string;
  fullScreen?: boolean;
}

export default function FruitLoader({ mensagem, fullScreen = true }: FruitLoaderProps) {
  const [frutaIndex, setFrutaIndex] = useState(0);
  const [fraseIndex, setFraseIndex] = useState(0);

  useEffect(() => {
    // Rotacionar frutas rapidamente (a cada 250ms)
    const frutaInterval = setInterval(() => {
      setFrutaIndex(prev => (prev + 1) % FRUTAS.length);
    }, 250);

    // Rotacionar frases mais lentamente (a cada 2.5s) se não houver mensagem customizada
    let fraseInterval: any;
    if (!mensagem) {
      setFraseIndex(Math.floor(Math.random() * FRASES_NUTRICAO.length));
      fraseInterval = setInterval(() => {
        setFraseIndex((prev) => (prev + 1) % FRASES_NUTRICAO.length);
      }, 2500);
    }

    return () => {
      clearInterval(frutaInterval);
      if (fraseInterval) clearInterval(fraseInterval);
    };
  }, [mensagem]);

  const textoExibido = mensagem || FRASES_NUTRICAO[fraseIndex];

  const content = (
    <div className="fruit-loader-content">
      <div className="fruit-loader-ring">
        <div className="fruit-loader-emoji">{FRUTAS[frutaIndex]}</div>
      </div>
      <p className="fruit-loader-text">{textoExibido}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fruit-loader-overlay">
        {content}
      </div>
    );
  }

  return content;
}
