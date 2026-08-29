const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { listarFeed, publicar, comentar, eliminarComentario } = require('../controllers/community.controller');

router.get('/', listarFeed); // público: cualquiera puede ver el feed
router.use(requireAuth);
router.post('/', publicar);
router.post('/:postId/comentarios', comentar);
router.delete('/comentarios/:id', eliminarComentario);

module.exports = router;
