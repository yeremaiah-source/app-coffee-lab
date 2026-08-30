const prisma = require('../prismaClient');

async function listar(req, res, next) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.sub },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const noLeidas = await prisma.notification.count({ where: { userId: req.user.sub, leida: false } });
    res.json({ notifications, noLeidas });
  } catch (e) { next(e); }
}

async function marcarLeida(req, res, next) {
  try {
    const notif = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notif || notif.userId !== req.user.sub) return res.status(404).json({ error: 'No encontrada.' });
    await prisma.notification.update({ where: { id: req.params.id }, data: { leida: true } });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

async function marcarTodasLeidas(req, res, next) {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user.sub, leida: false }, data: { leida: true } });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

// Helper interno (no es un endpoint) usado por otros controladores para
// crear una notificación — centralizado acá para que la lógica de
// "quién se entera de qué" viva en un solo lugar.
async function crearNotificacion({ userId, tipo, mensaje }) {
  if (!userId) return;
  await prisma.notification.create({ data: { userId, tipo, mensaje } });
}

// Notificación masiva: le llega a todos los usuarios registrados menos
// (opcionalmente) uno solo, en una sola operación en vez de una por
// usuario — se usa para "alguien publicó una receta nueva" y para los
// anuncios de novedades que manda un administrador.
async function crearNotificacionMasiva({ tipo, mensaje, excluirUserId }) {
  const usuarios = await prisma.user.findMany({
    where: excluirUserId ? { id: { not: excluirUserId } } : undefined,
    select: { id: true },
  });
  if (usuarios.length === 0) return;
  await prisma.notification.createMany({
    data: usuarios.map(u => ({ userId: u.id, tipo, mensaje })),
  });
}

// Endpoint: un administrador anuncia una novedad de la app a todos los
// usuarios registrados (nueva función, cambio importante, etc.).
async function anunciar(req, res, next) {
  try {
    const { mensaje } = req.body;
    if (!mensaje || !mensaje.trim()) {
      return res.status(400).json({ error: 'El mensaje del anuncio no puede estar vacío.' });
    }
    await crearNotificacionMasiva({
      tipo: 'anuncio',
      mensaje: mensaje.trim(),
      excluirUserId: req.user.sub,
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

module.exports = { listar, marcarLeida, marcarTodasLeidas, crearNotificacion, crearNotificacionMasiva, anunciar };
