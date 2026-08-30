const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { listar, cambiarRol, eliminar, actividad, perfilPublico, auditoria, directorio } = require('../controllers/users.controller');

router.get('/directorio', directorio); // público: listado de todos los usuarios
router.get('/:username/perfil-publico', perfilPublico); // público: cualquiera puede verlo

router.use(requireAuth, requireRole('administrador'));
router.get('/', listar);
router.get('/actividad', actividad);
router.get('/auditoria', auditoria);
router.put('/:id/rol', cambiarRol);
router.delete('/:id', eliminar);

module.exports = router;
