const prisma = require('../prismaClient');
const { registrarAuditoria } = require('../utils/auditLog');

async function listar(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, email: true, role: true, createdAt: true, avatarUrl: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(users);
  } catch (e) { next(e); }
}

// Datos de tránsito para el panel de administrador: últimos accesos
// (usuario, fecha, IP, dispositivo) y una cuenta aproximada de "usuarios
// activos" — se considera activo a quien inició sesión en los últimos
// 15 minutos, como aproximación razonable sin necesitar websockets.
async function actividad(req, res, next) {
  try {
    const quinceMinAtras = new Date(Date.now() - 15 * 60 * 1000);
    const [ultimosAccesos, activosAhora, totalAccesosHoy] = await Promise.all([
      prisma.loginEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: { user: { select: { username: true } } },
      }),
      prisma.loginEvent.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: quinceMinAtras } },
      }),
      prisma.loginEvent.count({
        where: { createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) } },
      }),
    ]);
    res.json({
      ultimosAccesos,
      activosAhora: activosAhora.length,
      totalAccesosHoy,
    });
  } catch (e) { next(e); }
}

async function auditoria(req, res, next) {
  try {
    const logs = await prisma.adminAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(logs);
  } catch (e) { next(e); }
}

async function cambiarRol(req, res, next) {
  try {
    const { role } = req.body;
    if (!['usuario', 'barista', 'administrador'].includes(role)) {
      return res.status(400).json({ error: 'Rol inválido.' });
    }
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado.' });
    if (role !== 'administrador') {
      const admins = await prisma.user.count({ where: { role: 'administrador' } });
      if (target.role === 'administrador' && admins <= 1) {
        return res.status(400).json({ error: 'Tiene que quedar al menos un administrador.' });
      }
    }
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { role } });
    await registrarAuditoria({
      adminId: req.user.sub,
      adminUsername: req.user.username,
      accion: 'cambio_rol',
      detalle: `Cambió el rol de @${target.username} de "${target.role}" a "${role}"`,
    });
    res.json({ id: user.id, username: user.username, role: user.role });
  } catch (e) { next(e); }
}

async function eliminar(req, res, next) {
  try {
    if (req.params.id === req.user.sub) {
      return res.status(400).json({ error: 'No podés eliminar tu propia cuenta desde acá.' });
    }
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado.' });
    await prisma.user.delete({ where: { id: req.params.id } });
    await registrarAuditoria({
      adminId: req.user.sub,
      adminUsername: req.user.username,
      accion: 'eliminar_usuario',
      detalle: `Eliminó la cuenta de @${target.username}`,
    });
    res.status(204).send();
  } catch (e) { next(e); }
}

async function perfilPublico(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
      select: { id: true, username: true, avatarUrl: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

    const [recetas, posts] = await Promise.all([
      prisma.recipe.findMany({ where: { authorId: user.id }, orderBy: { createdAt: 'desc' } }),
      prisma.communityPost.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        include: { extraction: true, comments: true },
      }),
    ]);

    res.json({
      username: user.username,
      avatarUrl: user.avatarUrl,
      miembroDesde: user.createdAt,
      recetas,
      posts,
    });
  } catch (e) { next(e); }
}

module.exports = { listar, cambiarRol, eliminar, actividad, perfilPublico, auditoria };
