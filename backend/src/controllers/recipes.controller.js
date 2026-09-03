const prisma = require('../prismaClient');
const { crearNotificacion } = require('./notifications.controller');

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
    // Límites de longitud — evita que alguien mande cadenas gigantescas
    // que inflen la base de datos o rompan la interfaz de otros.
    const LIMITES = { nombre: 120, metodo: 60, cafe: 120, molienda: 80, ratio: 30, pasos: 5000, notas: 2000 };
    for (const [campo, max] of Object.entries(LIMITES)) {
      const valor = { nombre, metodo, cafe, molienda, ratio, pasos, notas }[campo];
      if (valor && String(valor).length > max) {
        return res.status(400).json({ error: `El campo ${campo} no puede superar los ${max} caracteres.` });
      }
    }
    const recipe = await prisma.recipe.create({
      data: {
        authorId: req.user.sub,
        nombre, metodo, cafe, molienda, dosisG, aguaG, temperaturaC, ratio, tiempoSeg, pasos, notas,
      },
      include: { author: { select: { username: true } } },
    });
    res.status(201).json(recipe);
    // Nota: antes esto le mandaba una notificación a TODOS los
    // usuarios registrados por cada receta nueva — cualquier usuario
    // autenticado podía activarlo creando recetas repetidamente, sin
    // ningún límite. Se sacó: las notificaciones masivas quedan
    // reservadas solo para anuncios de administrador.
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

// Devuelve toda la "familia" de versiones de una receta: sube hasta
// encontrar la raíz (v1, sin parentRecipeId) y después baja juntando
// todos los descendientes, sea quien sea que los haya duplicado — así
// se puede ver v1, v2, v3... aunque las hayan modificado personas
// distintas.
async function historial(req, res, next) {
  try {
    let actual = await prisma.recipe.findUnique({ where: { id: req.params.id } });
    if (!actual) return res.status(404).json({ error: 'Receta no encontrada.' });

    // Subir hasta la raíz.
    let raiz = actual;
    while (raiz.parentRecipeId) {
      const padre = await prisma.recipe.findUnique({ where: { id: raiz.parentRecipeId } });
      if (!padre) break;
      raiz = padre;
    }

    // Bajar por todos los descendientes (por niveles, sin límite de
    // profundidad fijo — Prisma no soporta consultas recursivas
    // nativas, así que se arma a mano).
    const familia = [raiz];
    let nivelActualIds = [raiz.id];
    while (nivelActualIds.length > 0) {
      const hijos = await prisma.recipe.findMany({ where: { parentRecipeId: { in: nivelActualIds } } });
      if (hijos.length === 0) break;
      familia.push(...hijos);
      nivelActualIds = hijos.map(h => h.id);
    }

    const familiaConAutor = await prisma.recipe.findMany({
      where: { id: { in: familia.map(f => f.id) } },
      include: {
        author: { select: { username: true } },
        // Solo se trae el favorito puntual del visitante actual (si
        // está logueado) — nunca se expone quién más marcó qué.
        favoritos: req.user ? { where: { userId: req.user.sub }, select: { id: true } } : false,
      },
      orderBy: { version: 'asc' },
    });

    const familiaConFavorito = familiaConAutor.map(r => {
      const { favoritos, ...resto } = r;
      return { ...resto, favoritoPorMi: req.user ? favoritos.length > 0 : false };
    });

    res.json(familiaConFavorito);
  } catch (e) { next(e); }
}

async function toggleFavorito(req, res, next) {
  try {
    const recipe = await prisma.recipe.findUnique({ where: { id: req.params.id } });
    if (!recipe) return res.status(404).json({ error: 'Receta no encontrada.' });

    const existente = await prisma.recipeFavorito.findUnique({
      where: { recipeId_userId: { recipeId: req.params.id, userId: req.user.sub } },
    });
    if (existente) {
      await prisma.recipeFavorito.delete({ where: { id: existente.id } });
    } else {
      await prisma.recipeFavorito.create({ data: { recipeId: req.params.id, userId: req.user.sub } });
    }
    res.json({ favorito: !existente });
  } catch (e) { next(e); }
}

async function eliminar(req, res, next) {
  try {
    const recipe = await prisma.recipe.findUnique({ where: { id: req.params.id }, include: { author: { select: { username: true } } } });
    if (!recipe) return res.status(404).json({ error: 'Receta no encontrada.' });
    const esAutor = recipe.authorId === req.user.sub;
    const esAdmin = req.user.role === 'administrador';
    if (!esAutor && !esAdmin) {
      return res.status(403).json({ error: 'No tenés permiso para borrar esta receta.' });
    }
    // Si esta receta tiene versiones hijas (fue duplicada por alguien),
    // esas quedan huérfanas de padre en vez de romperse — Prisma ya lo
    // permite porque parentRecipeId es opcional.
    await prisma.recipe.delete({ where: { id: req.params.id } });
    if (esAdmin && !esAutor) {
      const { registrarAuditoria } = require('../utils/auditLog');
      await registrarAuditoria({
        adminId: req.user.sub,
        adminUsername: req.user.username,
        accion: 'moderar_receta',
        detalle: `Borró la receta "${recipe.nombre}" de @${recipe.author.username}`,
      });
    }
    res.status(204).send();
  } catch (e) { next(e); }
}

module.exports = { listar, crear, duplicar, actualizar, historial, eliminar, toggleFavorito };
