const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { listar, crear } = require('../controllers/pourtrainer.controller');

router.use(requireAuth);
router.get('/', listar);
router.post('/', crear);

module.exports = router;
