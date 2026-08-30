const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { listar, marcarLeida, marcarTodasLeidas, anunciar } = require('../controllers/notifications.controller');

router.use(requireAuth);
router.get('/', listar);
router.put('/:id/leida', marcarLeida);
router.put('/leer-todas', marcarTodasLeidas);
router.post('/anuncio', requireRole('administrador'), anunciar);

module.exports = router;
