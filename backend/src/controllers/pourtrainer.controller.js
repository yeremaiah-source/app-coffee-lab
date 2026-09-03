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

// Ranking público: el mejor puntaje de cada usuario, por tipo de
// ejercicio (mezclar puntajes de ejercicios distintos no tendría
// sentido, cada uno tiene su propia escala/dificultad). Solo se
// expone username, foto, y el puntaje — nada más.
async function ranking(req, res, next) {
  try {
    const ejercicio = req.query.ejercicio || 'Pulso constante';
    const agrupado = await prisma.pourTrainerSesion.groupBy({
      by: ['userId'],
      where: { ejercicio },
      _max: { puntaje: true },
      orderBy: { _max: { puntaje: 'desc' } },
      take: 10,
    });
    const usuarios = await prisma.user.findMany({
      where: { id: { in: agrupado.map(g => g.userId) } },
      select: { id: true, username: true, avatarUrl: true },
    });
    const mapaUsuarios = Object.fromEntries(usuarios.map(u => [u.id, u]));
    const resultado = agrupado.map(g => ({
      username: mapaUsuarios[g.userId]?.username || 'Usuario',
      avatarUrl: mapaUsuarios[g.userId]?.avatarUrl || null,
      mejorPuntaje: g._max.puntaje,
    }));
    res.json(resultado);
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

module.exports = { listar, ranking, crear };
