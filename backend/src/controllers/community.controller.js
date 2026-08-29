const prisma = require('../prismaClient');
const { crearNotificacion } = require('./notifications.controller');
const { registrarAuditoria } = require('../utils/auditLog');

async function listarFeed(req, res, next) {
  try {
    const posts = await prisma.communityPost.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        extraction: true,
        user: { select: { username: true, avatarUrl: true } },
        comments: { include: { user: { select: { username: true, avatarUrl: true } } }, orderBy: { createdAt: 'asc' } },
      },
    });
    res.json(posts);
  } catch (e) { next(e); }
}

async function publicar(req, res, next) {
  try {
    const { extractionId, descripcion, fotoUrl } = req.body;
    const extraction = await prisma.extraction.findUnique({ where: { id: extractionId } });
    if (!extraction || extraction.userId !== req.user.sub) {
      return res.status(404).json({ error: 'Extracción no encontrada o no te pertenece.' });
    }
    const post = await prisma.communityPost.create({
      data: { extractionId, userId: req.user.sub, descripcion, fotoUrl: fotoUrl || null },
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
      include: { post: true, user: { select: { username: true } } },
    });
    if (comment.post.userId !== req.user.sub) {
      await crearNotificacion({
        userId: comment.post.userId,
        tipo: 'comentario',
        mensaje: `@${comment.user.username} comentó tu extracción: "${texto.slice(0, 80)}"`,
      });
    }
    res.status(201).json(comment);
  } catch (e) { next(e); }
}

async function eliminarComentario(req, res, next) {
  try {
    const comment = await prisma.comment.findUnique({ where: { id: req.params.id }, include: { user: { select: { username: true } } } });
    if (!comment) return res.status(404).json({ error: 'Comentario no encontrado.' });
    const esAutor = comment.userId === req.user.sub;
    const esAdmin = req.user.role === 'administrador';
    if (!esAutor && !esAdmin) {
      return res.status(403).json({ error: 'No tenés permiso para borrar este comentario.' });
    }
    await prisma.comment.delete({ where: { id: req.params.id } });
    if (esAdmin && !esAutor) {
      await registrarAuditoria({
        adminId: req.user.sub,
        adminUsername: req.user.username,
        accion: 'moderar_comentario',
        detalle: `Borró un comentario de @${comment.user.username}: "${comment.texto.slice(0, 80)}"`,
      });
    }
    res.status(204).send();
  } catch (e) { next(e); }
}

async function eliminarPost(req, res, next) {
  try {
    const post = await prisma.communityPost.findUnique({ where: { id: req.params.id }, include: { user: { select: { username: true } } } });
    if (!post) return res.status(404).json({ error: 'Publicación no encontrada.' });
    const esAutor = post.userId === req.user.sub;
    const esAdmin = req.user.role === 'administrador';
    if (!esAutor && !esAdmin) {
      return res.status(403).json({ error: 'No tenés permiso para borrar esta publicación.' });
    }
    // Se borran primero los comentarios (la FK no tiene cascada) y recién
    // después la publicación, todo en una sola transacción.
    await prisma.$transaction([
      prisma.comment.deleteMany({ where: { postId: req.params.id } }),
      prisma.communityPost.delete({ where: { id: req.params.id } }),
    ]);
    if (esAdmin && !esAutor) {
      await registrarAuditoria({
        adminId: req.user.sub,
        adminUsername: req.user.username,
        accion: 'moderar_publicacion',
        detalle: `Borró una publicación de @${post.user.username}`,
      });
    }
    res.status(204).send();
  } catch (e) { next(e); }
}

module.exports = { listarFeed, publicar, comentar, eliminarComentario, eliminarPost };
