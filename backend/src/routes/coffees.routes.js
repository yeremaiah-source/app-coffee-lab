const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { listar, obtenerUno, crear } = require('../controllers/coffees.controller');

router.get('/', listar);
router.get('/:id', obtenerUno);
router.use(requireAuth);
router.post('/', crear);

module.exports = router;
