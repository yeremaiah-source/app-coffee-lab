/**
 * Motor de análisis de extracción.
 *
 * No solo calcula: interpreta. A partir de dosis, agua y TDS medido (o
 * estimado), devuelve el EY (Extraction Yield), lo clasifica contra el
 * rango "Golden Cup" de referencia de la industria (18–22%) y sugiere
 * un ajuste concreto.
 *
 * Fórmula estándar: EY (%) = TDS (%) × (peso de la bebida / dosis de café)
 */

function calcularExtraccion({ dosisG, aguaG, tds, tiempoSeg, metodo }) {
  if (!dosisG || !aguaG) {
    return { ey: null, categoria: null, recomendacion: 'Faltan dosis y/o agua para calcular.' };
  }

  // Si no hay TDS medido (refractómetro), se deja en null: el EY real
  // solo se puede calcular con un TDS medido. Ratio y rendimiento sí se
  // pueden mostrar siempre.
  const rendimientoBebidaG = aguaG; // aproximación estándar sin medir absorción exacta
  const ratioNum = aguaG / dosisG;

  let ey = null;
  let categoria = null;
  let recomendacion = 'Cargá el TDS medido con un refractómetro para obtener el EY y una recomendación de ajuste.';

  if (tds) {
    ey = Number(((tds * rendimientoBebidaG) / dosisG).toFixed(2));

    if (ey < 18) {
      categoria = 'Subextraído';
      recomendacion = 'Subextraído: probá moler más fino, subir la temperatura 1-2°C, o extender el tiempo de contacto. En espresso, también podés bajar el flujo (molienda más fina) para alargar el shot.';
    } else if (ey <= 22) {
      categoria = 'Balanceado (Golden Cup)';
      recomendacion = 'Extracción dentro del rango de referencia (18–22% EY). Si el sabor no te convence del todo, el problema probablemente esté en el café o el tueste, no en la extracción.';
    } else {
      categoria = 'Sobreextraído';
      recomendacion = 'Sobreextraído: probá moler más grueso, bajar la temperatura 1-2°C, o acortar el tiempo de contacto.';
    }
  }

  return {
    ratio: `1:${ratioNum.toFixed(1)}`,
    rendimientoBebidaG,
    ey,
    categoria,
    recomendacion,
  };
}

module.exports = { calcularExtraccion };
