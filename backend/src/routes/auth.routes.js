const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { register, login, changePassword } = require('../controllers/auth.controller');

router.post('/register', register);
router.post('/login', login);
router.put('/password', requireAuth, changePassword);

module.exports = router;
