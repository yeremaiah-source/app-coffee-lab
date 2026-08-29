const crypto = require('crypto');
const prisma = require('../prismaClient');
const { hashPassword, verifyPassword } = require('../utils/hash');
const { signToken } = require('../utils/jwt');
const { sendPasswordResetEmail } = require('../utils/email');

async function register(req, res, next) {
  try {
    const { username, email, password } = req.body;
    if (!username || !password || !email) {
      return res.status(400).json({ error: 'Usuario, email y contraseña son obligatorios.' });
    }
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailValido) {
      return res.status(400).json({ error: 'El email no es válido.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
    }
    const existing = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
    if (existing) {
      return res.status(409).json({ error: 'Ese usuario o email ya está registrado.' });
    }
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { username, email, passwordHash, role: 'usuario' },
    });
    const token = signToken(user);
    res.status(201).json({ token, user: { id: user.id, username: user.username, role: user.role, avatarUrl: user.avatarUrl } });
  } catch (e) { next(e); }
}

async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son obligatorios.' });
    }
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });

    const token = signToken(user);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, avatarUrl: user.avatarUrl } });

    // Registro de acceso para el panel de administrador — no bloquea la
    // respuesta al usuario, se guarda después de contestarle.
    prisma.loginEvent.create({
      data: {
        userId: user.id,
        ip: req.ip,
        userAgent: (req.headers['user-agent'] || '').slice(0, 255),
      },
    }).catch(err => console.error('No se pudo registrar el login event:', err));
  } catch (e) { next(e); }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Falta la contraseña actual o la nueva.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres.' });
    }
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'La contraseña actual no es correcta.' });

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

async function forgotPassword(req, res, next) {
  try {
    const { usernameOrEmail } = req.body;
    // Respuesta genérica siempre igual, exista o no el usuario — evita
    // que alguien pueda usar este endpoint para descubrir qué usuarios
    // están registrados (enumeración de usuarios).
    const respuestaGenerica = { message: 'Si el usuario existe, te enviamos un email con instrucciones.' };
    if (!usernameOrEmail) return res.json(respuestaGenerica);

    const user = await prisma.user.findFirst({
      where: { OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }] },
    });
    if (!user || !user.email) return res.json(respuestaGenerica);

    const token = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
    await prisma.user.update({ where: { id: user.id }, data: { resetToken: token, resetTokenExpires } });

    const frontendOrigin = (process.env.FRONTEND_ORIGIN || '').split(',')[0].trim() || 'http://localhost';
    const resetUrl = `${frontendOrigin}/?reset=${token}`;
    await sendPasswordResetEmail(user.email, resetUrl);

    res.json(respuestaGenerica);
  } catch (e) { next(e); }
}

async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Falta el token o la nueva contraseña.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
    }
    const user = await prisma.user.findUnique({ where: { resetToken: token } });
    if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
      return res.status(400).json({ error: 'El link de recuperación es inválido o venció. Pedí uno nuevo.' });
    }
    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpires: null },
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

module.exports = { register, login, changePassword, forgotPassword, resetPassword };
