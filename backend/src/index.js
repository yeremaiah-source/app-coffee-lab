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

const authRoutes = require('./routes/auth.routes');
const extractionsRoutes = require('./routes/extractions.routes');
const recipesRoutes = require('./routes/recipes.routes');
const coffeesRoutes = require('./routes/coffees.routes');
const communityRoutes = require('./routes/community.routes');
const usersRoutes = require('./routes/users.routes');
const tdsRoutes = require('./routes/tds.routes');

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

// Manejador de errores: nunca se devuelve el stack trace al cliente,
// solo un mensaje. El detalle completo queda en los logs del servidor.
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || (err.message === 'Origen no permitido por CORS' ? 403 : 500);
  res.status(status).json({ error: err.message || 'Error interno' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Coffee Lab API escuchando en el puerto ${PORT}`));
