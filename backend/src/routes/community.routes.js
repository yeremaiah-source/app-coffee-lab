const express = require('express');
const router = express.Router();
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { listarFeed, publicar, comentar, eliminarComentario, eliminarPost, toggleLike } = require('../controllers/community.controller');

router.get('/', optionalAuth, listarFeed); // público, pero sabe quién sos si venís logueado
router.use(requireAuth);
router.post('/', publicar);
router.post('/:postId/comentarios', comentar);
router.delete('/comentarios/:id', eliminarComentario);
router.post('/:id/like', toggleLike);
router.delete('/:id', eliminarPost);

module.exports = router;
