const prisma = require('../prismaClient');
const { calcularExtraccion } = require('../utils/extractionAnalysis');
const { estimateTDS, registrarMedicionReal } = require('../utils/tdsEstimator');

async function crear(req, res, next) {
  try {
    const { metodo, cafe, molienda, dosisG, aguaG, tiempoSeg, temperaturaC, tds, tueste, notas } = req.body;

    // Validación estricta del lado del servidor — nunca se confía en que
    // el frontend ya validó. Rechaza tipos incorrectos, negativos, cero,
    // y valores fuera de un rango físicamente realista.
    if (!metodo || typeof metodo !== 'string') {
      return res.status(400).json({ error: 'El método es obligatorio.' });
    }
    if (typeof dosisG !== 'number' || dosisG <= 0 || dosisG > 200) {
      return res.status(400).json({ error: 'La dosis tiene que ser un número mayor a 0 y menor a 200g.' });
    }
    if (typeof aguaG !== 'number' || aguaG <= 0 || aguaG > 5000) {
      return res.status(400).json({ error: 'El agua/rendimiento tiene que ser un número mayor a 0 y menor a 5000g.' });
    }
    if (tiempoSeg !== undefined && tiempoSeg !== null && (typeof tiempoSeg !== 'number' || tiempoSeg < 0 || tiempoSeg > 86400)) {
      return res.status(400).json({ error: 'El tiempo tiene que ser un número válido (en segundos).' });
    }
    if (temperaturaC !== undefined && temperaturaC !== null && (typeof temperaturaC !== 'number' || temperaturaC < 0 || temperaturaC > 100)) {
      return res.status(400).json({ error: 'La temperatura tiene que estar entre 0 y 100°C.' });
    }
    if (tds !== undefined && tds !== null && (typeof tds !== 'number' || tds <= 0 || tds > 30)) {
      return res.status(400).json({ error: 'El TDS medido tiene que ser un número entre 0 y 30%.' });
    }

    let tdsFinal = tds || null;
    let tdsEstimado = false;
    let tdsRangoMin = null, tdsRangoMax = null, tdsConfianza = null, tdsConfianzaLabel = null;

    if (tds) {
      // TDS medido por el usuario: se guarda tal cual y retroalimenta el
      // motor de estimación para ese método.
      await registrarMedicionReal({ metodo, dosisG, aguaG, tiempoSeg, tueste, tdsReal: tds });
    } else {
      // No hay medición: se estima. Queda marcado como estimado en la
      // base, nunca se confunde con un valor medido.
      const estimacion = await estimateTDS({ metodo, dosisG, aguaG, tiempoSeg, tueste });
      tdsFinal = estimacion.estimado;
      tdsEstimado = true;
      tdsRangoMin = estimacion.rangoMin;
      tdsRangoMax = estimacion.rangoMax;
      tdsConfianza = estimacion.confianza;
      tdsConfianzaLabel = estimacion.confianzaLabel;
    }

    const analisis = calcularExtraccion({ dosisG, aguaG, tds: tdsFinal, tiempoSeg, metodo });

    const extraction = await prisma.extraction.create({
      data: {
        userId: req.user.sub,
        metodo,
        cafe: cafe || null,
        molienda: molienda || null,
        dosisG,
        aguaG,
        ratio: analisis.ratio,
        tiempoSeg: tiempoSeg || null,
        temperaturaC: temperaturaC || null,
        tds: tdsFinal,
        tdsEstimado,
        tdsRangoMin,
        tdsRangoMax,
        tdsConfianza,
        tdsConfianzaLabel,
        ey: analisis.ey,
        categoria: analisis.categoria,
        recomendacion: analisis.recomendacion,
        notas: notas || null,
      },
    });
    res.status(201).json(extraction);
  } catch (e) { next(e); }
}

async function listarMias(req, res, next) {
  try {
    const extractions = await prisma.extraction.findMany({
      where: { userId: req.user.sub },
      orderBy: { createdAt: 'desc' },
    });
    res.json(extractions);
  } catch (e) { next(e); }
}

async function comparar(req, res, next) {
  try {
    // Compara las últimas N extracciones del usuario para detectar tendencias simples.
    const ids = (req.query.ids || '').split(',').filter(Boolean);
    const where = ids.length
      ? { id: { in: ids }, userId: req.user.sub }
      : { userId: req.user.sub };
    const extractions = await prisma.extraction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: ids.length ? undefined : 10,
    });
    res.json(extractions);
  } catch (e) { next(e); }
}

module.exports = { crear, listarMias, comparar };
