# Auditoría de arquitectura — Coffee Lab v0.1 → v1

## Resumen de decisiones (stack elegido para arrancar simple y gratis)

| Capa | v0.1 (hoy) | v1 (a construir) | Por qué |
|---|---|---|---|
| Frontend | HTML/CSS/JS en un solo archivo | Mismo código, migrado a consumir la API en vez de localStorage | Ya tiene el diseño y los flujos resueltos, no hay que rehacerlo — hay que rediseñar solo la capa de datos |
| API | No existe | Node.js + Express | Curva de entrada baja, mismo lenguaje (JS) que el frontend, enorme ecosistema, se aloja gratis en Render/Railway |
| Base de datos | localStorage (por dispositivo) | PostgreSQL | Es el motor relacional estándar de la industria; modela perfecto usuarios, recetas versionadas, extracciones y comunidad con relaciones reales |
| ORM | — | Prisma | Migraciones versionadas, tipado, evita SQL a mano en el 90% de los casos |
| Autenticación | Local, hash casero, expone credenciales en el HTML | JWT + bcrypt, validado del lado del servidor | Es el estándar razonable para un producto chico/mediano sin presupuesto de infraestructura |
| Almacenamiento de archivos (fotos de café, avatares) | No existe | Cloudinary o Supabase Storage (tier gratuito) | Evita guardar binarios en la propia base de datos |
| Análisis | No existe | Motor de cálculo + interpretación en el backend (`backend/src/utils/extractionAnalysis.js`) | Así el mismo cálculo es consistente sin importar qué cliente lo pida (app, futura versión de escritorio, etc.) |
| Comunidad | Datos de muestra hardcodeados | Tablas reales `CommunityPost` / `Comment` ligadas a `Extraction` y `User` | Solo tiene sentido con backend real detrás |
| Administración | Panel local, solo controla localStorage | Endpoints protegidos por rol `administrador` que operan sobre la base real | Roles se validan en el servidor, no en el cliente |

## 1. Frontend

**Se conserva:** todo el diseño visual, las pantallas y los flujos de
usuario ya construidos (extracción, recetas, ciencia, aromas y sabores,
papers, perfil, panel de admin). Es el activo más sólido del v0.1.

**Se migra:** las funciones que hoy llaman a `loadJSON`/`saveJSON`
(localStorage) para que en su lugar hagan `fetch()` contra la API. Es un
cambio acotado — la interfaz no cambia, cambia de dónde vienen los datos.

**Pendiente de decidir más adelante:** si conviene pasar a un framework
(React/Vue) cuando la lógica de estado crezca. Con backend real, se puede
posponer esa decisión sin bloquear nada.

## 2. API (Node.js + Express)

Estructura en `backend/src/`:
```
routes/        → define los endpoints HTTP
controllers/    → lógica de cada endpoint
middleware/    → autenticación (JWT) y control de roles
utils/         → hash de contraseñas, firma de tokens, motor de análisis
prisma/schema.prisma → modelo de datos completo
```

Endpoints ya esqueletados (ver `backend/src/routes/`):
- `POST /api/auth/register`, `POST /api/auth/login`
- `GET/POST /api/extractions` (asociadas al usuario logueado)
- `GET/POST/PUT /api/recipes` (con duplicado/versionado)
- `GET/POST /api/coffees` (ficha profesional del café)
- `GET/POST /api/community` (publicar extracción, comentar)
- `GET /api/users` (solo rol administrador)

## 3. Base de datos (PostgreSQL vía Prisma)

Modelo completo en `backend/prisma/schema.prisma`:
- `User` (roles: `usuario`, `barista`, `administrador`)
- `Extraction` — ratio, TDS, EY, tiempo, temperatura, dosis, rendimiento,
  método, asociada a `userId`
- `Recipe` — método, café, molienda, dosis, agua, temperatura, ratio,
  tiempo, pasos, notas, autor, versión y resultados; con `parentRecipeId`
  para soportar "duplicar y modificar"
- `Coffee` — ficha profesional: origen, país, región, productor, variedad,
  proceso, altitud, tueste, fecha, notas sensoriales
- `CommunityPost` / `Comment` — publicar una extracción, que otros la
  prueben, comparen y comenten

## 4. Autenticación y roles

- Contraseñas con `bcrypt` (nunca en texto plano, nunca en el cliente).
- Login devuelve un JWT firmado con `JWT_SECRET` (variable de entorno,
  nunca committeado).
- Middleware `requireRole('administrador')` protege los endpoints
  sensibles — la validación de rol ocurre en el servidor, no se puede
  falsear desde el cliente.
- **Ya no hay ninguna credencial de muestra visible en el código** — cada
  quien crea su cuenta real vía `/api/auth/register`.

## 5. Motor de análisis (el corazón de Coffee Lab)

En `backend/src/utils/extractionAnalysis.js`: a partir de dosis, agua y
TDS medido (o estimado), calcula el **EY (Extraction Yield)** con la
fórmula estándar de la industria, y lo **interpreta**:
- Subextracción, punto balanceado (Golden Cup, 18–22%) o sobreextracción.
- Una recomendación concreta de ajuste (molienda más fina/gruesa, subir o
  bajar dosis, ajustar tiempo) según el desvío detectado.

Esto es lo que hoy falta más: no alcanza con guardar números, hay que
devolver una lectura útil. El endpoint de extracciones ya llama a esta
función al guardar cada extracción.

Pendiente de sumar en el siguiente ciclo: historial comparativo entre
extracciones, gráficos de tendencia y detección automática de patrones
(ej. "en tus últimas 5 extracciones con este café, bajar el tiempo en
3-4s mejoró la relación dulzor/acidez").

## 6. Biblioteca científica (ciencia, técnicas, papers)

Próximo paso de contenido (no de arquitectura): reestructurar cada tema
como `Concepto → Explicación → Variables → Evidencia científica →
Aplicación práctica`, en vez de texto suelto. El modelo de datos para
esto se puede sumar como una tabla `Article` con esos campos — todavía no
está en el schema porque conviene definir primero el contenido real.

## 7. Seguridad

**Ya aplicado:**
- ✅ Contraseñas hasheadas con bcrypt (12 rounds), nunca en texto plano ni
  visibles en el cliente.
- ✅ **Corregida una vulnerabilidad real de asignación masiva**: el
  endpoint de editar recetas (`PUT /api/recipes/:id`) guardaba
  `req.body` completo sin filtrar — cualquiera podía intentar mandar
  campos como `authorId` para apropiarse de una receta ajena. Ahora usa
  una whitelist explícita de campos editables.
- ✅ **Escape de HTML en todo el frontend** (`esc()`): antes, el
  contenido escrito por otros usuarios (recetas, comentarios de
  comunidad, fichas de café, nombres de usuario) se insertaba tal cual
  en el DOM — cualquiera podía publicar una receta o comentario con
  `<script>` o un manejador de evento y ejecutar código en el
  navegador de otro usuario (XSS almacenado). Ahora todo ese contenido
  pasa por escape antes de mostrarse.
- ✅ **Rate limiting**: 10 intentos cada 15 minutos por IP en
  login/registro (mitiga fuerza bruta de contraseñas), y 300 pedidos
  cada 15 minutos por IP en el resto de la API.
- ✅ **Helmet**: cabeceras HTTP de seguridad estándar (HSTS,
  X-Content-Type-Options, X-Frame-Options, etc.) en todas las
  respuestas.
- ✅ **CORS restringido por entorno**: en desarrollo local queda
  abierto para no trabar el trabajo; en producción, `FRONTEND_ORIGIN`
  (variable de entorno) define exactamente qué dominios pueden llamar
  a la API — cualquier otro origen es rechazado.
- ✅ **Límite de tamaño de payload** (100kb) para evitar solicitudes
  anormalmente grandes como vector de denegación de servicio.
- ✅ El servidor **no arranca** si `JWT_SECRET` no está definido o es
  demasiado corto (mínimo 32 caracteres) — falla rápido y explícito en
  vez de correr con una clave débil.
- ✅ Contraseñas: mínimo subido de 6 a 8 caracteres. Tokens JWT: vida
  útil bajada de 30 a 7 días (menor ventana de exposición si un token
  se filtra).
- ✅ Los mensajes de error nunca exponen el stack trace al cliente,
  solo un mensaje — el detalle completo queda en los logs del
  servidor.

**Pendiente antes de un uso realmente público y a gran escala:**
- ⏳ Completar `FRONTEND_ORIGIN` con el dominio real apenas se
  despliegue el frontend (hoy, si queda vacío, la API acepta cualquier
  origen — aceptable solo en desarrollo).
- ⏳ Generar un `JWT_SECRET` nuevo y distinto para producción (nunca
  reusar el de desarrollo local).
- ⏳ Verificación de email al registrarse (hoy cualquier username/email
  se acepta sin confirmar que existe).
- ⏳ Bloqueo temporal de cuenta tras varios intentos fallidos de login
  seguidos (hoy el rate limit es por IP, no por cuenta puntual).
- ⏳ Logs de auditoría para acciones de administrador (quién cambió un
  rol o borró una cuenta, y cuándo).
- ⏳ Content Security Policy (CSP) explícita además de los defaults de
  Helmet, una vez que el frontend tenga su dominio final definido.

## Próximos pasos sugeridos (en orden)

1. Levantar el backend en local contra una base Neon/Supabase gratuita.
2. Migrar el frontend para que consuma `/api/auth` y `/api/extractions`
   primero (el corazón de la app).
3. Migrar recetas y cafés.
4. Sumar comunidad real.
5. Recién ahí, reconstruir la biblioteca científica con el formato
   Concepto → Evidencia → Aplicación.
