const { verifyToken } = require('../utils/jwt');
const prisma = require('../prismaClient');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Falta el token de autenticación.' });
  }
  try {
    const payload = verifyToken(header.replace('Bearer ', ''));
    // Se compara contra la versión de token guardada en la base — si
    // el usuario cerró sesión o cambió su contraseña desde que se
    // firmó este token, tokenVersion ya no coincide y el token queda
    // invalidado de verdad, no solo "olvidado" del lado del cliente.
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { tokenVersion: true } });
    if (!user || user.tokenVersion !== payload.tokenVersion) {
      return res.status(401).json({ error: 'Tu sesión ya no es válida — iniciá sesión de nuevo.' });
    }
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tenés permiso para esta acción.' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
