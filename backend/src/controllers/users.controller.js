const prisma = require('../prismaClient');

async function listar(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(users);
  } catch (e) { next(e); }
}

async function cambiarRol(req, res, next) {
  try {
    const { role } = req.body;
    if (!['usuario', 'barista', 'administrador'].includes(role)) {
      return res.status(400).json({ error: 'Rol inválido.' });
    }
    if (role !== 'administrador') {
      const admins = await prisma.user.count({ where: { role: 'administrador' } });
      const target = await prisma.user.findUnique({ where: { id: req.params.id } });
      if (target.role === 'administrador' && admins <= 1) {
        return res.status(400).json({ error: 'Tiene que quedar al menos un administrador.' });
      }
    }
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { role } });
    res.json({ id: user.id, username: user.username, role: user.role });
  } catch (e) { next(e); }
}

async function eliminar(req, res, next) {
  try {
    if (req.params.id === req.user.sub) {
      return res.status(400).json({ error: 'No podés eliminar tu propia cuenta desde acá.' });
    }
    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) { next(e); }
}

module.exports = { listar, cambiarRol, eliminar };
