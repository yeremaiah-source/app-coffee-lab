const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { crear, listarMias, comparar, consistencia, insights } = require('../controllers/extractions.controller');

router.use(requireAuth);
router.post('/', crear);
router.get('/', listarMias);
router.get('/comparar', comparar);
router.get('/consistencia', consistencia);
router.get('/insights', insights);

module.exports = router;
