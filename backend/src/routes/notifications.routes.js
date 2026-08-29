const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { listar, marcarLeida, marcarTodasLeidas } = require('../controllers/notifications.controller');

router.use(requireAuth);
router.get('/', listar);
router.put('/:id/leida', marcarLeida);
router.put('/leer-todas', marcarTodasLeidas);

module.exports = router;
