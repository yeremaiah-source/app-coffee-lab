/**
 * Motor de estimación de TDS.
 *
 * IMPORTANTE — esto es una aproximación estadística, no un reemplazo del
 * refractómetro. Sirve para dar una referencia rápida cuando el usuario no
 * midió, pero cualquier TDS medido con refractómetro siempre tiene
 * prioridad y además retroalimenta al modelo (ver `registrarMedicionReal`).
 *
 * Diseño modular a propósito: todo lo que llama a este archivo usa
 * `estimateTDS(...)` y `registrarMedicionReal(...)`. El día que se quiera
 * reemplazar la heurística de abajo por un modelo de machine learning
 * entrenado con datos reales, alcanza con reescribir el cuerpo de esas dos
 * funciones (o la función `computeBaseHeuristic`) — nada del resto del
 * backend ni del frontend necesita cambiar, porque la forma de la
 * respuesta (`{ estimado, rangoMin, rangoMax, confianza, confianzaLabel }`)
 * se mantiene igual.
 */

const prisma = require('../prismaClient');

// Rangos típicos publicados por la industria (guías SCA / Golden Cup,
// referencias de extracción por método) usados como punto de partida
// antes de tener datos propios de calibración. Son el "prior" estadístico
// del modelo, no una medición.
const RANGOS_BASE = {
  Espresso:   { min: 7.5,  max: 12.5, centro: 9.5,  spread: 0.6 },
  Filtro:     { min: 1.10, max: 1.45, centro: 1.28, spread: 0.10 },
  'Cold Brew': { min: 1.0, max: 2.4,  centro: 1.6,  spread: 0.25 },
};

// Ajuste direccional del tueste sobre la solubilidad: un tueste más oscuro
// desarrolla más compuestos solubles en el mismo tiempo, uno más claro
// extrae un poco más lento. Es un factor pequeño y acotado a propósito —
// no reemplaza la molienda ni el tiempo, que pesan mucho más.
const FACTOR_TUESTE = { claro: -0.06, medio: 0, oscuro: 0.08 };

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

/**
 * Heurística base (sin calibración): a partir de ratio y tiempo de
 * contacto, estima dónde debería caer el TDS dentro del rango típico del
 * método. No usa datos de otros usuarios — es matemática simple sobre los
 * parámetros de la propia extracción.
 */
function computeBaseHeuristic({ metodo, dosisG, aguaG, tiempoSeg, tueste }) {
  const rango = RANGOS_BASE[metodo] || RANGOS_BASE.Filtro;
  const ratioNum = aguaG && dosisG ? aguaG / dosisG : null;

  // Ratio más bajo (más concentrado) empuja el TDS hacia arriba del centro
  // del rango; ratio más alto (más diluido) lo empuja hacia abajo.
  // Normalizado contra un ratio de referencia típico del método.
  const ratioRef = metodo === 'Espresso' ? 2 : metodo === 'Cold Brew' ? 8 : 16;
  let ajusteRatio = ratioNum ? (ratioRef - ratioNum) / ratioRef * (rango.max - rango.min) * 0.35 : 0;

  // Más tiempo de contacto → más sólidos disueltos, con retornos
  // decrecientes (raíz, no lineal): los primeros segundos extraen mucho
  // más que los últimos.
  const tiempoRef = metodo === 'Espresso' ? 28 : metodo === 'Cold Brew' ? 16 * 3600 : 210;
  let ajusteTiempo = 0;
  if (tiempoSeg) {
    const proporcion = Math.sqrt(tiempoSeg / tiempoRef) - 1;
    ajusteTiempo = proporcion * (rango.max - rango.min) * 0.25;
  }

  const ajusteTueste = tueste ? (FACTOR_TUESTE[tueste] || 0) * (rango.max - rango.min) : 0;

  const estimado = clamp(rango.centro + ajusteRatio + ajusteTiempo + ajusteTueste, rango.min, rango.max);
  return { estimado, rango };
}

/** Lee (o crea) la fila de calibración de un método. Aislado para que se
 * pueda reemplazar por otra fuente de datos (o por un modelo entrenado)
 * sin tocar el resto del archivo. */
async function getCalibration(metodo) {
  const row = await prisma.tdsCalibration.findUnique({ where: { metodo } });
  return row || { metodo, muestras: 0, sesgoPromedio: 0 };
}

function confianzaDesdeMuestras(muestras) {
  const score = Math.min(1, muestras / 20);
  const label = muestras === 0 ? 'baja' : muestras < 10 ? 'media' : 'alta';
  return { score: Number(score.toFixed(2)), label };
}

/**
 * Estimación pública. No mide nada — proyecta, a partir de los parámetros
 * de la extracción y de lo que el propio uso real fue enseñando (sesgo de
 * calibración por método), dónde es más probable que caiga el TDS.
 */
async function estimateTDS({ metodo, dosisG, aguaG, tiempoSeg, tueste }) {
  const { estimado: base, rango } = computeBaseHeuristic({ metodo, dosisG, aguaG, tiempoSeg, tueste });
  const calibracion = await getCalibration(metodo);
  const estimado = clamp(base + calibracion.sesgoPromedio, rango.min, rango.max);

  // El rango de confianza se angosta a medida que hay más mediciones
  // reales calibrando ese método (comportamiento estadístico esperable:
  // más muestras, menor incertidumbre), con un piso razonable.
  const spread = rango.spread / Math.sqrt(calibracion.muestras + 1);
  const { score, label } = confianzaDesdeMuestras(calibracion.muestras);

  return {
    estimado: Number(estimado.toFixed(2)),
    rangoMin: Number(clamp(estimado - spread, rango.min, rango.max).toFixed(2)),
    rangoMax: Number(clamp(estimado + spread, rango.min, rango.max).toFixed(2)),
    confianza: score,
    confianzaLabel: label,
    esEstimado: true,
    nota: 'Aproximación estadística. No reemplaza la medición con refractómetro.',
  };
}

/**
 * Se llama cada vez que un usuario carga un TDS medido de verdad. Ajusta
 * el sesgo de calibración de ese método con una media incremental (O(1),
 * no reprocesa historial completo) — así el motor mejora solo con el uso,
 * sin batch jobs ni reentrenamiento manual.
 */
async function registrarMedicionReal({ metodo, dosisG, aguaG, tiempoSeg, tueste, tdsReal }) {
  if (tdsReal === null || tdsReal === undefined) return;
  const { estimado: base } = computeBaseHeuristic({ metodo, dosisG, aguaG, tiempoSeg, tueste });
  const residual = tdsReal - base;

  const actual = await getCalibration(metodo);
  const nuevasMuestras = actual.muestras + 1;
  const nuevoSesgo = actual.sesgoPromedio + (residual - actual.sesgoPromedio) / nuevasMuestras;

  await prisma.tdsCalibration.upsert({
    where: { metodo },
    update: { muestras: nuevasMuestras, sesgoPromedio: nuevoSesgo },
    create: { metodo, muestras: 1, sesgoPromedio: residual },
  });
}

module.exports = { estimateTDS, registrarMedicionReal };
