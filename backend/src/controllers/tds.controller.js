const { estimateTDS } = require('../utils/tdsEstimator');

async function preview(req, res, next) {
  try {
    const { metodo, dosisG, aguaG, tiempoSeg, tueste } = req.body;
    if (!metodo || !dosisG || !aguaG) {
      return res.status(400).json({ error: 'Método, dosis y agua son obligatorios para estimar.' });
    }
    const estimacion = await estimateTDS({ metodo, dosisG, aguaG, tiempoSeg, tueste });
    res.json(estimacion);
  } catch (e) { next(e); }
}

module.exports = { preview };
