const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { listar, crear, duplicar, actualizar } = require('../controllers/recipes.controller');

router.get('/', listar); // público: cualquiera puede ver recetas
router.use(requireAuth);
router.post('/', crear);
router.post('/:id/duplicar', duplicar);
router.put('/:id', actualizar);

module.exports = router;
