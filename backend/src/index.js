require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// ---------- Validaciones de arranque ----------
// No dejamos levantar el servidor con un JWT_SECRET débil o ausente —
// es la clave que firma todas las sesiones, un valor corto o default
// invalida cualquier otra medida de seguridad del resto de la API.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error(
    'ERROR: JWT_SECRET no está definido o es demasiado corto (mínimo 32 caracteres). ' +
    'Generá uno con: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
  );
  process.exit(1);
}

// Si estamos en producción y no hay ningún origen configurado para
// CORS, el servidor quedaría abierto a cualquier sitio — un deploy mal
// configurado no debe convertirse silenciosamente en una API pública
// sin restricciones. Mejor que directamente no arranque.
if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_ORIGIN) {
  console.error(
    'ERROR: FRONTEND_ORIGIN no está definido en producción. Sin esto, CORS quedaría ' +
    'abierto a cualquier origen. Configurá FRONTEND_ORIGIN con la URL real del frontend.'
  );
  process.exit(1);
}

const authRoutes = require('./routes/auth.routes');
const extractionsRoutes = require('./routes/extractions.routes');
const recipesRoutes = require('./routes/recipes.routes');
const coffeesRoutes = require('./routes/coffees.routes');
const communityRoutes = require('./routes/community.routes');
const usersRoutes = require('./routes/users.routes');
const tdsRoutes = require('./routes/tds.routes');
const uploadsRoutes = require('./routes/uploads.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const experimentosRoutes = require('./routes/experimentos.routes');
const pourtrainerRoutes = require('./routes/pourtrainer.routes');

const app = express();

// Detrás de un proxy (Render, Railway, etc.) para que express-rate-limit
// identifique la IP real del cliente y no la del proxy.
app.set('trust proxy', 1);

// Cabeceras de seguridad HTTP estándar (HSTS, X-Content-Type-Options,
// X-Frame-Options, etc.)
app.use(helmet());

// CORS: en producción, restringido a los orígenes definidos en
// FRONTEND_ORIGIN (separados por coma). En desarrollo, si no se define
// nada, se permite cualquier origen para no trabar el trabajo local.
const allowedOrigins = (process.env.FRONTEND_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // apps nativas / Postman / curl sin header Origin
    if (allowedOrigins.length === 0) return callback(null, true); // dev: sin restricción
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origen no permitido por CORS'));
  },
}));

// Límite de tamaño de payload — evita solicitudes anormalmente grandes
// como vector de denegación de servicio.
app.use(express.json({ limit: '100kb' }));

// Rate limiting general: 300 solicitudes cada 15 minutos por IP.
const limiterGeneral = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
app.use('/api', limiterGeneral);

// Rate limiting estricto en login/registro: 10 intentos cada 15 minutos
// por IP — mitiga fuerza bruta de contraseñas sin afectar el uso normal.
const limiterAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Probá de nuevo en unos minutos.' },
});
app.use('/api/auth/login', limiterAuth);
app.use('/api/auth/register', limiterAuth);
app.use('/api/auth/forgot-password', limiterAuth);
app.use('/api/auth/reset-password', limiterAuth);

app.get('/api/health', (req, res) => res.json({ ok: true, version: '0.1' }));

app.use('/api/auth', authRoutes);
app.use('/api/extractions', extractionsRoutes);
app.use('/api/recipes', recipesRoutes);
app.use('/api/coffees', coffeesRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/tds', tdsRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/experimentos', experimentosRoutes);
app.use('/api/pour-trainer', pourtrainerRoutes);

// Manejador de errores: nunca se devuelve el stack trace, ni el detalle
// interno de una consulta, al cliente — solo un mensaje entendible. El
// detalle técnico completo queda en los logs del servidor (console.error).
app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'La imagen es demasiado grande (máximo 5MB).' });
  }
  // Errores conocidos de Prisma: se traducen a mensajes genéricos en vez
  // de dejar pasar el texto crudo de la consulta (que puede exponer
  // nombres de tablas/columnas). Esto es una red de seguridad general —
  // cada endpoint sensible ya valida esto antes de llegar acá, pero un
  // caso no contemplado nunca debería filtrar detalle interno igual.
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Ya existe un registro con ese dato — no se puede duplicar.' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'El registro que buscás no existe.' });
  }
  const esErrorCORS = err.message === 'Origen no permitido por CORS';
  const status = err.status || (esErrorCORS ? 403 : 500);
  const esErrorDePrisma = typeof err.code === 'string' && err.code.startsWith('P');
  // Para cualquier error no contemplado explícitamente (un bug, una
  // librería que falla, una excepción inesperada), nunca se manda el
  // mensaje crudo al cliente — podría filtrar rutas de archivos,
  // nombres de tablas, o detalles internos del código. El error
  // completo ya quedó en los logs del servidor (console.error de
  // arriba); acá solo se informa un mensaje genérico y seguro.
  const mensaje = esErrorCORS ? err.message
    : esErrorDePrisma ? 'No se pudo completar la operación.'
    : 'Ocurrió un error inesperado. Intentá de nuevo.';
  res.status(esErrorDePrisma ? 500 : status).json({ error: mensaje });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Coffee Lab API escuchando en el puerto ${PORT}`));
