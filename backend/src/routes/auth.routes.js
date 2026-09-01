const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { register, login, changePassword, forgotPassword, resetPassword, logout, me } = require('../controllers/auth.controller');

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.put('/password', requireAuth, changePassword);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);

module.exports = router;
