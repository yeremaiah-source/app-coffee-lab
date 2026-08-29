const express = require('express');
const multer = require('multer');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { subirAvatar, subirFotoComunidad } = require('../controllers/uploads.controller');

// Solo imágenes reales (validado por tipo MIME, no por extensión de
// archivo, que se puede falsear fácilmente), máximo 5MB, en memoria
// (nunca se escribe al disco del servidor — va directo a Cloudinary).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const permitidos = ['image/jpeg', 'image/png', 'image/webp'];
    if (!permitidos.includes(file.mimetype)) {
      return cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP.'));
    }
    cb(null, true);
  },
});

router.use(requireAuth);
router.post('/avatar', upload.single('imagen'), subirAvatar);
router.post('/community-photo', upload.single('imagen'), subirFotoComunidad);

module.exports = router;
