const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { listarFeed, publicar, comentar } = require('../controllers/community.controller');

router.get('/', listarFeed); // público: cualquiera puede ver el feed
router.use(requireAuth);
router.post('/', publicar);
router.post('/:postId/comentarios', comentar);

module.exports = router;
