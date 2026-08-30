const prisma = require('../prismaClient');
const { crearNotificacion, crearNotificacionMasiva } = require('./notifications.controller');

async function listar(req, res, next) {
  try {
    const recipes = await prisma.recipe.findMany({
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { username: true } } },
    });
    res.json(recipes);
  } catch (e) { next(e); }
}

async function crear(req, res, next) {
  try {
    const { nombre, metodo, cafe, molienda, dosisG, aguaG, temperaturaC, ratio, tiempoSeg, pasos, notas } = req.body;
    if (!nombre || !metodo) {
      return res.status(400).json({ error: 'Nombre y método son obligatorios.' });
    }
    const recipe = await prisma.recipe.create({
      data: {
        authorId: req.user.sub,
        nombre, metodo, cafe, molienda, dosisG, aguaG, temperaturaC, ratio, tiempoSeg, pasos, notas,
      },
      include: { author: { select: { username: true } } },
    });
    res.status(201).json(recipe);
    // Solo se avisa de recetas nuevas de verdad (versión 1) — duplicar
    // una receta ya notifica al autor original por su cuenta, y no
    // hace falta spamear a todos por cada versión editada.
    if (recipe.version === 1) {
      await crearNotificacionMasiva({
        tipo: 'receta_nueva',
        mensaje: `@${recipe.author.username} publicó una receta nueva: "${recipe.nombre}"`,
        excluirUserId: req.user.sub,
      });
    }
  } catch (e) { next(e); }
}

// Duplica una receta existente como punto de partida de una nueva versión,
// enlazada a la original vía parentRecipeId.
async function duplicar(req, res, next) {
  try {
    const original = await prisma.recipe.findUnique({ where: { id: req.params.id } });
    if (!original) return res.status(404).json({ error: 'Receta no encontrada.' });

    const nueva = await prisma.recipe.create({
      data: {
        authorId: req.user.sub,
        nombre: `${original.nombre} (v${original.version + 1})`,
        metodo: original.metodo,
        cafe: original.cafe,
        molienda: original.molienda,
        dosisG: original.dosisG,
        aguaG: original.aguaG,
        temperaturaC: original.temperaturaC,
        ratio: original.ratio,
        tiempoSeg: original.tiempoSeg,
        pasos: original.pasos,
        notas: req.body.notas || original.notas,
        version: original.version + 1,
        parentRecipeId: original.id,
      },
    });
    res.status(201).json(nueva);
    if (original.authorId !== req.user.sub) {
      await crearNotificacion({
        userId: original.authorId,
        tipo: 'receta_duplicada',
        mensaje: `Alguien duplicó tu receta "${original.nombre}" para modificarla.`,
      });
    }
  } catch (e) { next(e); }
}

async function actualizar(req, res, next) {
  try {
    const recipe = await prisma.recipe.findUnique({ where: { id: req.params.id } });
    if (!recipe) return res.status(404).json({ error: 'Receta no encontrada.' });
    if (recipe.authorId !== req.user.sub && req.user.role !== 'administrador') {
      return res.status(403).json({ error: 'Solo el autor o un administrador puede editar esta receta.' });
    }
    // Whitelist explícita: nunca se aceptan campos como authorId, id,
    // version o parentRecipeId desde el cliente (asignación masiva).
    const { nombre, metodo, cafe, molienda, dosisG, aguaG, temperaturaC, ratio, tiempoSeg, pasos, notas, resultados } = req.body;
    const updated = await prisma.recipe.update({
      where: { id: req.params.id },
      data: { nombre, metodo, cafe, molienda, dosisG, aguaG, temperaturaC, ratio, tiempoSeg, pasos, notas, resultados },
    });
    res.json(updated);
  } catch (e) { next(e); }
}

module.exports = { listar, crear, duplicar, actualizar };
