const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { listar, cambiarRol, eliminar } = require('../controllers/users.controller');

router.use(requireAuth, requireRole('administrador'));
router.get('/', listar);
router.put('/:id/rol', cambiarRol);
router.delete('/:id', eliminar);

module.exports = router;
