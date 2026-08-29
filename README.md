# Coffee Lab — v0.1

Este repositorio marca el punto de partida oficial del proyecto: la
versión que existía hasta ahora era un prototipo de un solo archivo HTML
con datos guardados en el propio dispositivo (localStorage). A partir de
acá se construye el producto real.

```
coffee-lab-v0.1/
├── frontend/     → la app actual (v0.1), tal cual, sirve como referencia de diseño y flujo
├── backend/      → esqueleto de la API real (Node.js + Express + PostgreSQL vía Prisma)
└── ARCHITECTURE.md → auditoría de arquitectura y roadmap de construcción
```

Empezá leyendo **ARCHITECTURE.md** — ahí está el mapa completo de decisiones
(Frontend → API → Base de datos → Autenticación → Almacenamiento →
Análisis → Comunidad → Administración) y qué se conserva del v0.1, qué se
migra y qué se reconstruye.

## Cómo correr el backend en local (gratis)

1. Creá una base de datos Postgres gratuita en **[Neon](https://neon.tech)**
   (tier gratuito, no pide tarjeta) o en **[Supabase](https://supabase.com)**.
   Copiá el connection string.
2. Dentro de `backend/`:
   ```bash
   cp .env.example .env
   # completá DATABASE_URL con el connection string de Neon/Supabase
   # completá JWT_SECRET con cualquier string largo random
   npm install
   npx prisma migrate dev --name init
   npm run dev
   ```
3. La API queda escuchando en `http://localhost:4000`.

## Dónde alojar esto gratis cuando esté listo

- **Backend:** [Render](https://render.com) o [Railway](https://railway.app) —
  ambos tienen tier gratuito para un servicio Node pequeño.
- **Base de datos:** Neon o Supabase (tier gratuito, Postgres real).
- **Frontend:** Netlify o Vercel (como ya veníamos usando).

## Estado actual (v0.1)

- ✅ Backend real: autenticación (JWT + bcrypt), roles, PostgreSQL vía
  Prisma, motor de análisis de extracción con interpretación.
- ✅ **Extracciones**: guardado y listado 100% conectado a la API, con
  café y molienda como columnas reales del modelo (ya no van
  concatenadas en las notas).
- ✅ **Cambio de contraseña real**: cualquier usuario logueado puede
  cambiar su contraseña desde su Perfil (`PUT /api/auth/password`,
  valida la contraseña actual, hashea la nueva con bcrypt).
- ✅ **Recetas**: se listan y se crean contra `/api/recipes` — las
  recetas "de fábrica" (Ristretto, V60, etc., con foto) siguen siendo
  contenido curado fijo; lo que publican los usuarios ya es real.
- ✅ **Comunidad real**: el feed lista extracciones publicadas de
  verdad (`/api/community`), con comentarios funcionales. Se puede
  publicar la última extracción propia desde la vista de Comunidad.
- ✅ **Motor de estimación de TDS** (`backend/src/utils/tdsEstimator.js`):
  cuando no cargás un TDS medido, el sistema estima uno a partir de
  método, ratio, tiempo y tueste (opcional), y muestra el resultado como
  *"TDS estimado 9,6%, rango 9,3 a 9,9% · confianza: baja"* — siempre
  aclarando que es una aproximación estadística, nunca un reemplazo del
  refractómetro. Cada vez que cargás un TDS medido de verdad, el motor
  se recalibra solo (media incremental por método, guardada en la tabla
  `TdsCalibration`) — cuantas más mediciones reales entran, más se
  angosta el rango de confianza. El diseño es intencionalmente modular:
  toda la lógica vive detrás de `estimateTDS()` /
  `registrarMedicionReal()`, así que el día de mañana se puede
  reemplazar la heurística actual por un modelo de machine learning sin
  tocar el controlador, la ruta ni el frontend.
- ✅ **Preparado para refractómetro Bluetooth**: hay un botón (hoy
  deshabilitado, "próximamente") y una función
  `connectBluetoothRefractometer()` en el frontend que ya usa la Web
  Bluetooth API real del navegador. Falta un solo dato para activarlo
  del todo: el UUID de servicio/característica GATT del modelo de
  refractómetro específico que se quiera soportar (varía por
  fabricante) — se completa apenas se elija el hardware.
- ✅ **Fichas de café**: nueva sección dentro de "Cafés" que lista las
  fichas publicadas por la comunidad (`/api/coffees`) y un formulario
  real para agregar una (país, región, productor, variedad, proceso,
  altitud, tueste, notas sensoriales). La guía por origen (Etiopía,
  Colombia, etc.) sigue siendo contenido curado fijo, aparte.
- ✅ **Formularios reales** en vez de `prompt()`: "Nueva receta" y
  "Ficha de café" ahora son pantallas propias con todos los campos del
  modelo de datos.
- ✅ **Editar recetas**: cada receta muestra un botón de editar solo si
  sos el autor (comparando contra tu usuario logueado, no algo que se
  pueda falsear desde el cliente porque el backend también valida
  autoría en `PUT /api/recipes/:id`). El flujo completo "duplicar →
  editar → guardar como versión propia" ya funciona de punta a punta.
- ✅ **"Olvidé mi contraseña"**: flujo completo por email —
  `POST /api/auth/forgot-password` genera un token con 1 hora de vida y
  envía un link (`tu-frontend/?reset=TOKEN`); la app detecta ese
  parámetro solo al abrirse y muestra la pantalla para elegir una
  contraseña nueva, que valida el token contra
  `POST /api/auth/reset-password`. La respuesta es siempre genérica
  ("si el usuario existe...") para no revelar qué usuarios están
  registrados. **Mientras no configures `EMAIL_USER`/`EMAIL_PASS` en las
  variables de entorno, el link se imprime en los logs del servidor en
  vez de enviarse** — anotado como paso obligatorio antes de compartir
  el link públicamente (ver `.env.example`, incluye instrucciones para
  usar Gmail con una contraseña de aplicación).
- ✅ **Foto de perfil y fotos en publicaciones**: subida real de imágenes
  vía Cloudinary (plan gratuito) — tocás tu avatar en Perfil para
  cambiarlo, y podés adjuntar una foto de tu café al publicar una
  extracción en la comunidad. Validado por tipo de archivo real (no por
  extensión) y limitado a 5MB. **Requiere crear una cuenta gratuita en
  Cloudinary y completar `CLOUDINARY_CLOUD_NAME` /
  `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`** — mientras esas
  variables no estén, la subida de imágenes devuelve un error claro en
  vez de romperse (ver `.env.example`).
- ✅ **Registro con email obligatorio**: ya no se puede crear una cuenta
  sin email — es la única forma de entrar a la app, y sirve además para
  la recuperación de contraseña.
- ✅ **Notificaciones reales**: la campana ahora funciona — se genera
  una notificación cuando alguien comenta tu publicación o duplica una
  receta tuya, con contador de no leídas y un panel para verlas y
  marcarlas como leídas.
- ✅ **Panel de administrador: tránsito de accesos**: cada login queda
  registrado (usuario, IP, dispositivo, fecha) en la tabla
  `LoginEvent`. El panel de admin muestra usuarios "activos ahora"
  (con login en los últimos 15 minutos), accesos totales del día, y el
  detalle de los últimos 30 accesos.
- ✅ Logo del topbar agrandado.
- ✅ **Biblioteca científica reestructurada**: la sección "Ciencia" dejó
  de ser una lista de tarjetas sueltas y ahora sigue el formato
  Concepto → Explicación → Variables → Evidencia científica →
  Aplicación práctica en cada entrada (ácidos clorogénicos, reacción de
  Maillard, cinética de extracción, distribución de tamaño de
  partícula, CO2 y desgasificación).
- ⏳ Si cambiás `prisma/schema.prisma` en tu compu (como el campo
  `cafe`/`molienda`, y ahora los campos de estimación de TDS y la tabla
  `TdsCalibration`), acordate de correr de nuevo
  `npx prisma migrate dev --name <nombre-descriptivo>` para que tu base
  de Neon quede sincronizada.

### Para probar el frontend contra tu backend local

1. Dejá corriendo `npm run dev` en `backend/` (como ya hiciste).
2. Abrí `frontend/index.html` directamente en el navegador (doble clic).
3. Si el backend corre en otro puerto o ya lo desplegaste en Render,
   cambiá la constante `API_BASE` al principio del `<script>` del
   frontend.
