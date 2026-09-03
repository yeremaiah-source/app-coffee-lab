const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { listar, ranking, crear } = require('../controllers/pourtrainer.controller');

router.get('/ranking', ranking); // público: cualquiera puede ver el ranking
router.use(requireAuth);
router.get('/', listar);
router.post('/', crear);

module.exports = router;
