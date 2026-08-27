const prisma = require('../prismaClient');

async function listar(req, res, next) {
  try {
    const coffees = await prisma.coffee.findMany({
      orderBy: { createdAt: 'desc' },
      include: { addedBy: { select: { username: true } } },
    });
    res.json(coffees);
  } catch (e) { next(e); }
}

async function obtenerUno(req, res, next) {
  try {
    const coffee = await prisma.coffee.findUnique({ where: { id: req.params.id } });
    if (!coffee) return res.status(404).json({ error: 'Café no encontrado.' });

    // Ficha profesional completa: se acompaña de las recetas y extracciones
    // asociadas a ese café (matching simple por nombre; se puede normalizar
    // a una relación real más adelante).
    const recetasAsociadas = await prisma.recipe.findMany({ where: { cafe: coffee.nombre } });
    res.json({ ...coffee, recetasAsociadas });
  } catch (e) { next(e); }
}

async function crear(req, res, next) {
  try {
    const { nombre, origen, pais, region, productor, variedad, proceso, altitudMsnm, tueste, fechaTueste, notasSensoriales } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre del café es obligatorio.' });

    const coffee = await prisma.coffee.create({
      data: {
        addedById: req.user.sub,
        nombre, origen, pais, region, productor, variedad, proceso,
        altitudMsnm, tueste,
        fechaTueste: fechaTueste ? new Date(fechaTueste) : null,
        notasSensoriales,
      },
    });
    res.status(201).json(coffee);
  } catch (e) { next(e); }
}

module.exports = { listar, obtenerUno, crear };
