const prisma = require('../prismaClient');

async function listar(req, res, next) {
  try {
    const coffees = await prisma.coffee.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        addedBy: { select: { username: true } },
        favoritos: req.user ? { where: { userId: req.user.sub }, select: { id: true } } : false,
      },
    });
    const coffeesConFavorito = coffees.map(c => {
      const { favoritos, ...resto } = c;
      return { ...resto, favoritoPorMi: req.user ? favoritos.length > 0 : false };
    });
    res.json(coffeesConFavorito);
  } catch (e) { next(e); }
}

async function toggleFavorito(req, res, next) {
  try {
    const coffee = await prisma.coffee.findUnique({ where: { id: req.params.id } });
    if (!coffee) return res.status(404).json({ error: 'Café no encontrado.' });

    const existente = await prisma.coffeeFavorito.findUnique({
      where: { coffeeId_userId: { coffeeId: req.params.id, userId: req.user.sub } },
    });
    if (existente) {
      await prisma.coffeeFavorito.delete({ where: { id: existente.id } });
    } else {
      await prisma.coffeeFavorito.create({ data: { coffeeId: req.params.id, userId: req.user.sub } });
    }
    res.json({ favorito: !existente });
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

    const LIMITES = { nombre: 120, origen: 120, pais: 80, region: 120, productor: 120, variedad: 120, proceso: 80, tueste: 60, notasSensoriales: 2000 };
    const valores = { nombre, origen, pais, region, productor, variedad, proceso, tueste, notasSensoriales };
    for (const [campo, max] of Object.entries(LIMITES)) {
      if (valores[campo] && String(valores[campo]).length > max) {
        return res.status(400).json({ error: `El campo ${campo} no puede superar los ${max} caracteres.` });
      }
    }

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

module.exports = { listar, obtenerUno, crear, toggleFavorito };
