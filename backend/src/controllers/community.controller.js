const prisma = require('../prismaClient');

async function listarFeed(req, res, next) {
  try {
    const posts = await prisma.communityPost.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        extraction: true,
        user: { select: { username: true } },
        comments: { include: { user: { select: { username: true } } }, orderBy: { createdAt: 'asc' } },
      },
    });
    res.json(posts);
  } catch (e) { next(e); }
}

async function publicar(req, res, next) {
  try {
    const { extractionId, descripcion } = req.body;
    const extraction = await prisma.extraction.findUnique({ where: { id: extractionId } });
    if (!extraction || extraction.userId !== req.user.sub) {
      return res.status(404).json({ error: 'Extracción no encontrada o no te pertenece.' });
    }
    const post = await prisma.communityPost.create({
      data: { extractionId, userId: req.user.sub, descripcion },
    });
    res.status(201).json(post);
  } catch (e) { next(e); }
}

async function comentar(req, res, next) {
  try {
    const { texto } = req.body;
    if (!texto) return res.status(400).json({ error: 'El comentario no puede estar vacío.' });
    const comment = await prisma.comment.create({
      data: { postId: req.params.postId, userId: req.user.sub, texto },
    });
    res.status(201).json(comment);
  } catch (e) { next(e); }
}

module.exports = { listarFeed, publicar, comentar };
