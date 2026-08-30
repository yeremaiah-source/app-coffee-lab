const prisma = require('../prismaClient');
const { calcularExtraccion } = require('../utils/extractionAnalysis');
const { estimateTDS, registrarMedicionReal } = require('../utils/tdsEstimator');

async function crear(req, res, next) {
  try {
    const { metodo, cafe, molienda, dosisG, aguaG, tiempoSeg, temperaturaC, tds, tueste, notas } = req.body;
    if (!metodo || !dosisG || !aguaG) {
      return res.status(400).json({ error: 'Método, dosis y agua son obligatorios.' });
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
