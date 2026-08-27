const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { preview } = require('../controllers/tds.controller');

router.post('/estimate', requireAuth, preview);

module.exports = router;
