const prisma = require('../prismaClient');

/**
 * Registra una acción administrativa sensible (cambio de rol,
 * eliminación de usuario/contenido). Nunca guarda contraseñas, tokens
 * ni datos sensibles — solo una descripción legible de qué pasó.
 */
async function registrarAuditoria({ adminId, adminUsername, accion, detalle }) {
  try {
    await prisma.adminAuditLog.create({
      data: { adminId, adminUsername, accion, detalle: detalle || null },
    });
  } catch (e) {
    // La auditoría nunca debe romper la operación real que la disparó.
    console.error('No se pudo registrar la auditoría:', e);
  }
}

module.exports = { registrarAuditoria };
