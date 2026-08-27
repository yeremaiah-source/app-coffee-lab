const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { crear, listarMias, comparar } = require('../controllers/extractions.controller');

router.use(requireAuth);
router.post('/', crear);
router.get('/', listarMias);
router.get('/comparar', comparar);

module.exports = router;
