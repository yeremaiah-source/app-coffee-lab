const prisma = require('../prismaClient');
const { subirImagen } = require('../utils/cloudinary');

async function subirAvatar(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen.' });
    const url = await subirImagen(req.file.buffer, 'avatares');
    await prisma.user.update({ where: { id: req.user.sub }, data: { avatarUrl: url } });
    res.json({ avatarUrl: url });
  } catch (e) { next(e); }
}

async function subirFotoComunidad(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen.' });
    const url = await subirImagen(req.file.buffer, 'comunidad');
    res.json({ url });
  } catch (e) { next(e); }
}

module.exports = { subirAvatar, subirFotoComunidad };
