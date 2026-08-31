const prisma = require('../prismaClient');

async function listar(req, res, next) {
  try {
    const sesiones = await prisma.pourTrainerSesion.findMany({
      where: { userId: req.user.sub },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(sesiones);
  } catch (e) { next(e); }
}

async function crear(req, res, next) {
  try {
    const { ejercicio, puntaje, detalle } = req.body;
    if (!ejercicio || typeof ejercicio !== 'string') {
      return res.status(400).json({ error: 'Falta indicar qué ejercicio se practicó.' });
    }
    if (typeof puntaje !== 'number' || puntaje < 0 || puntaje > 100) {
      return res.status(400).json({ error: 'El puntaje tiene que ser un número entre 0 y 100.' });
    }
    const sesion = await prisma.pourTrainerSesion.create({
      data: {
        userId: req.user.sub,
        ejercicio,
        puntaje: Math.round(puntaje),
        detalle: detalle ? JSON.stringify(detalle).slice(0, 2000) : null,
      },
    });
    res.status(201).json(sesion);
  } catch (e) { next(e); }
}

module.exports = { listar, crear };
