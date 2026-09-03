const express = require('express');
const router = express.Router();
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { listar, obtenerUno, crear, toggleFavorito } = require('../controllers/coffees.controller');

router.get('/', optionalAuth, listar);
router.get('/:id', obtenerUno);
router.use(requireAuth);
router.post('/', crear);
router.post('/:id/favorito', toggleFavorito);

module.exports = router;
