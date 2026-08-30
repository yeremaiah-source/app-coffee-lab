const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { listar, crear, duplicar, actualizar, historial, eliminar } = require('../controllers/recipes.controller');

router.get('/', listar); // público: cualquiera puede ver recetas
router.get('/:id/historial', historial); // público: ver todas las versiones
router.use(requireAuth);
router.post('/', crear);
router.post('/:id/duplicar', duplicar);
router.put('/:id', actualizar);
router.delete('/:id', eliminar);

module.exports = router;
