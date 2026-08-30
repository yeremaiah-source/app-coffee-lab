const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { listar, crear, actualizar, eliminar } = require('../controllers/experimentos.controller');

router.use(requireAuth);
router.get('/', listar);
router.post('/', crear);
router.put('/:id', actualizar);
router.delete('/:id', eliminar);

module.exports = router;
