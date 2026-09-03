const express = require('express');
const router = express.Router();
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { listar, crear, duplicar, actualizar, historial, eliminar, toggleFavorito } = require('../controllers/recipes.controller');

router.get('/', listar); // público: cualquiera puede ver recetas
router.get('/:id/historial', optionalAuth, historial); // público, pero sabe quién sos si venís logueado
router.use(requireAuth);
router.post('/', crear);
router.post('/:id/duplicar', duplicar);
router.post('/:id/favorito', toggleFavorito);
router.put('/:id', actualizar);
router.delete('/:id', eliminar);

module.exports = router;
