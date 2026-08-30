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
- ✅ **Perfil público de usuario**: tocando el nombre de cualquiera (en
  la comunidad, en sus comentarios, o como autor de una receta) se abre
  su perfil con su foto, cuántas recetas publicó, cuántas extracciones
  compartió, y el listado de ambas — vía
  `GET /api/users/:username/perfil-publico` (público, no requiere
  login). No expone email ni rol, solo lo que ya era público.
- ✅ **Moderación de la comunidad**: el autor o un administrador pueden
  borrar tanto comentarios individuales (`DELETE
  /api/community/comentarios/:id`) como publicaciones enteras
  (`DELETE /api/community/:id`, que de paso borra sus comentarios en
  una transacción). Todo validado también del lado del servidor, no
  solo ocultando el botón en la pantalla.
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

## Informe de auditoría y hardening (esta ronda)

**Nada se borró ni se rompió** — todo lo listado abajo se agregó sobre
lo que ya funcionaba, sin tocar datos existentes.

### Errores encontrados y corregidos
- El ratio en vivo del formulario de registro mostraba **"1:0"** antes
  de completar dosis y agua, en vez de indicar que faltaban datos.
  Ahora muestra "1:—".
- El motor de análisis (`extractionAnalysis.js`) podía aceptar dosis o
  agua negativas (el chequeo `!dosisG` no detecta números negativos,
  solo cero/vacío) y no validaba que el TDS estuviera en un rango
  físicamente posible. Ahora rechaza esos casos explícitamente y
  devuelve "Datos insuficientes para calcular" en vez de un número sin
  sentido.
- El endpoint de crear extracción (`POST /api/extractions`) confiaba en
  que el frontend ya había validado los datos. Ahora valida en el
  servidor: dosis y agua > 0 y dentro de rangos realistas, tiempo y
  temperatura no negativos, TDS entre 0 y 30%.

### Seguridad reforzada
- **Auditoría de acciones administrativas**: nueva tabla
  `AdminAuditLog` que registra cambios de rol, eliminación de usuarios,
  y moderación de comunidad (cuándo un admin borra contenido ajeno) —
  quién lo hizo y qué hizo, nunca contraseñas ni tokens. Visible en el
  panel de administrador.
- Control de acceso horizontal (IDOR) revisado: un usuario solo puede
  ver/comparar sus propias extracciones (`listarMias`, `comparar` ya
  filtraban por `userId`); las recetas son intencionalmente públicas
  (es la función de la app), pero editarlas sigue exigiendo ser el
  autor o admin.
- No se encontró ningún endpoint que permita a un usuario cambiar su
  propio rol — el registro siempre crea cuentas con rol `usuario`.

### Lo que ya estaba bien y se mantiene igual
- Contraseñas con bcrypt, JWT con expiración, rate limiting en
  login/registro/recuperación, CORS restringido por entorno, Helmet,
  escape de XSS en todo el contenido de usuarios, whitelist de campos
  editables en recetas (ya corregida una ronda anterior).

### Riesgos que siguen pendientes (documentados, no ocultos)
- MFA para cuentas de administrador: no implementado.
- Bloqueo de cuenta tras intentos fallidos repetidos (hoy el rate
  limit es por IP, no por cuenta puntual).
- Auto-deploy de Render inestable — se viene forzando manualmente.
- Actualización de dependencias: no se hizo una revisión de
  vulnerabilidades conocidas (`npm audit`) en esta ronda.

## Mejoras estéticas (rueda de aromas y fotos de recetas)

- ✅ **Rueda de aromas rediseñada**: los degradados radiales le dan
  volumen a cada segmento (antes eran colores planos), y las etiquetas
  ahora siguen la curva del arco (`<textPath>` real sobre un path SVG),
  como una rueda de sabores profesional — antes el texto se cortaba en
  categorías con nombres largos ("Verde / Vegetal", "Agrio /
  Fermentado"). El color del texto se calcula automáticamente según el
  contraste de cada color de fondo. El segmento activo tiene un brillo
  sutil. De paso corregí una fuente del centro de la rueda que había
  quedado rota (referenciaba "Space Grotesk", una tipografía que ya no
  cargábamos desde el rediseño skater).
- ✅ **Tarjetas de receta rediseñadas**: la foto pasa a ser protagonista
  — ocupa todo el ancho arriba de la tarjeta (antes era un cuadradito
  chico de 64px al lado del texto), con un degradado oscuro abajo
  donde flota la etiqueta del método, y los botones de editar/duplicar
  ahora son íconos flotando sobre la foto en vez de ocupar espacio
  aparte.
- ✅ **Ilustraciones en vez de fotos de stock**: las 7 recetas base ya
  no usan fotos de Unsplash — tienen ilustraciones lineales minimalistas
  en SVG, dibujadas a mano en código (una taza para cada variante de
  espresso con distinto nivel de llenado, el cono del V60 con su
  espiral de vertido, la prensa francesa, el frasco de cold brew con
  hielo). No dependen de internet para cargar, y usan los mismos
  colores holográficos del resto de la app (magenta para espresso,
  cian para filtro, verde lima para cold brew).
- ✅ **Descripciones técnicas actualizadas con fuentes actuales**: cada
  una de las 7 recetas base se reescribió después de chequear
  estándares vigentes de la SCA y tendencias de competencias recientes
  (no de memoria) — el Golden Cup Standard oficial (55g/L ±10%, TDS
  1.15–1.35%, extracción 18–22%, calidad de agua incluida), la
  tendencia de shots cada vez más cortos en el Mundial de Baristas
  2025, la receta de V60 de James Hoffmann (la más referenciada hoy) y
  la variante de molienda extra gruesa que Tetsu Kasuya presentó en
  2026, y los rangos de ratio que la SCA recomienda para prensa
  francesa y cold brew (concentrado vs. listo para tomar).
- ✅ **Directorio de usuarios**: nueva pestaña "Usuarios" dentro de
  Comunidad (al lado de "Feed") que lista a todos los usuarios
  registrados, con su foto, cuántas recetas publicó y cuántas
  extracciones compartió cada uno — tocando a cualquiera se abre su
  perfil público. Vía `GET /api/users/directorio` (público, no expone
  email ni rol).

## Revisión de vulnerabilidades en dependencias

Verificado contra fuentes actuales (avisos de seguridad publicados),
no de memoria. Se encontraron y corrigieron **tres problemas reales**:

- **`multer` 1.4.5-lts.1 → 2.0.2**: versión vulnerable a denegación de
  servicio (CVE-2025-47935, CVE-2025-47944, CVE-2025-7338, severidad
  alta) — un archivo mal formado en `/api/uploads/*` podía tumbar el
  proceso. Nuestro uso (memoria, filtro de tipo, límite de tamaño) es
  compatible con la v2 sin cambios de código.
- **`express` 4.19.2 → 4.21.2**: 7 vulnerabilidades conocidas en
  dependencias internas (`path-to-regexp`, `body-parser`, `cookie`,
  entre otras), la más grave de severidad 7.5.
- **Verificación de JWT sin algoritmo fijo**: se agregó
  `algorithms: ['HS256']` explícito tanto al firmar como al verificar
  el token (`backend/src/utils/jwt.js`), para blindar contra ataques
  de "confusión de algoritmo" (una clase de vulnerabilidad JWT
  activamente reportada).

**Antes de actualizar en tu compu**, corré `npm install` en `backend/`
después de reemplazar el `package.json` — sin eso, seguís con las
versiones viejas instaladas aunque el archivo diga las nuevas.

## Notificaciones masivas (recetas nuevas y anuncios)

- ✅ **Aviso automático de recetas nuevas**: cuando alguien publica una
  receta (no una versión duplicada), todos los demás usuarios
  registrados reciben una notificación — `POST /api/recipes` ahora
  llama a `crearNotificacionMasiva()` en vez de a un solo usuario.
- ✅ **Anuncios de administrador**: nueva tarjeta en el panel de admin
  ("Anunciar novedad a todos los usuarios") para avisar de funciones
  nuevas o cambios importantes — le llega como notificación a todos
  los usuarios registrados. Vía `POST /api/notifications/anuncio`
  (protegido por rol administrador).
- El helper `crearNotificacionMasiva()` usa `createMany` de Prisma —
  una sola operación a la base de datos en vez de una por usuario,
  para que esto siga siendo rápido a medida que crezca la cantidad de
  usuarios registrados.

## Mapa mundial interactivo de orígenes

- ✅ **Mapa mundial en Cafés**: nueva sección con un mapa de puntos
  interactivo — cada punto representa un país productor con fichas
  cargadas por la comunidad (tamaño del punto según cuántas fichas
  hay), posicionado con una proyección simple a partir de coordenadas
  aproximadas. La tabla cubre **68 países** de todo el cinturón
  cafetero mundial (África, Medio Oriente, Asia, Centroamérica, el
  Caribe, Sudamérica y Oceanía) — no solo los 4-5 orígenes más
  conocidos. Tocar un punto muestra el origen y filtra la lista de
  fichas de la comunidad para ese país. Es 100% frontend — no necesita
  ninguna librería de mapas externa ni conexión a un servicio de
  mapas, y arranca siempre con los 4 orígenes de la guía curada
  visibles aunque todavía no haya fichas reales cargadas.

## Motor de consistencia e Insights (primera parte del roadmap grande)

Recibimos un documento muy ambicioso (rediseño completo en 3 modos,
laboratorio de experimentos, búsqueda global, historial causal, etc.).
Es demasiado grande para una sola ronda — se avisó explícitamente y se
construyó la parte de mayor valor real primero, siguiendo el propio
principio del documento de "registrar → comparar → detectar →
entender → mejorar":

- ✅ **Consistencia del barista** (`GET /api/extractions/consistencia`):
  se calcula con el coeficiente de variación (desvío/promedio) de
  dosis, ratio y tiempo entre tus últimas 20 extracciones — un puntaje
  de 0 a 100 basado en variables objetivas ya registradas, nunca un
  número arbitrario. Si hay menos de 3 extracciones, dice
  explícitamente "no hay suficientes datos" en vez de inventar un
  puntaje.
- ✅ **Insights basados en evidencia** (`GET /api/extractions/insights`):
  compara tu mejor extracción contra tu peor (la más y la menos
  cercana al 20% EY ideal) y muestra las diferencias reales en dosis,
  agua, tiempo, temperatura y molienda — con lenguaje de correlación
  ("coincide con"), nunca de causalidad comprobada. También calcula
  qué molienda aparece más seguido en tus extracciones balanceadas.
  Cada sección tiene su propio mensaje de "datos insuficientes" si
  corresponde — la app nunca inventa una conclusión sin evidencia
  real detrás.
- ✅ Nueva pantalla "Insights" en Explorar, con las tres secciones de
  arriba.

### Lo que queda pendiente de ese documento (para las próximas rondas)
- Los 3 modos de dashboard (Operación / Profesional / Laboratorio de UI).
- Comparación visual lado a lado de 2+ extracciones elegidas a mano
  (hoy el backend `/api/extractions/comparar` ya soporta esto, falta
  la pantalla).
- Parámetros planificados vs. ejecutados en el registro de extracción.

## Fichas de café con historial

- ✅ **Detalle de ficha de café**: tocar cualquier ficha en Cafés abre
  su detalle completo (origen, variedad, proceso, altitud, notas
  sensoriales, quién la agregó) más dos historiales reales:
  - **Tus extracciones con este café**: filtra tus propias extracciones
    privadas donde el campo "café" coincide por nombre con la ficha.
  - **Publicadas en la comunidad con este café**: filtra el feed
    público de comunidad por el mismo criterio — tocando a alguien te
    lleva a su perfil.
- La coincidencia es **por nombre de café** (normalizado, sin
  mayúsculas ni acentos) — hoy el registro de extracción usa un campo
  de texto libre para el café, no un enlace directo a una ficha
  puntual, así que el cruce es por similitud de texto, no por ID. Es
  100% frontend: no hizo falta ningún endpoint nuevo ni migración.

## Gráficos de perfil sensorial y rango ideal

Basado en la imagen de referencia que pasaste (radar + barras de rango).

- ✅ **Evaluación sensorial al registrar una extracción**: 4 sliders
  opcionales (Dulzor, Acidez, Cuerpo, Amargor, escala 1-10) — solo se
  guardan si tocás alguno, nunca obligatorio. Nuevos campos en
  `Extraction` (`dulzor`, `acidez`, `cuerpo`, `amargor`).
- ✅ **Radar de perfil de extracción** en Análisis: promedia tus
  últimas 7 evaluaciones sensoriales cargadas en un gráfico de 5 ejes
  (los 4 que cargás + "Balance", un valor derivado — no cargado por
  vos — que mide qué tan parejos están los otros cuatro entre sí).
  Solo aparece si cargaste al menos una evaluación sensorial.
- ✅ **Barras de rango ideal (Golden Cup)**: el EY de tu última
  extracción posicionado dentro del rango objetivo 18-22%, y (cuando
  el TDS fue estimado, no medido) el TDS dentro del rango de confianza
  de esa estimación puntual — nunca se presenta como un "rango ideal
  universal de TDS", porque ese rango varía según el método.

**Esta ronda requiere migración** (4 campos nuevos en `Extraction`).

## Laboratorio de experimentos

- ✅ **Módulo de experimentación completo**: nueva tabla `Experimento`
  (privada de cada usuario, no pública como las recetas) con hipótesis,
  variable a modificar, variables constantes, resultado esperado,
  resultado real y conclusión — exactamente la estructura que pedía el
  documento. Se accede desde Explorar → Laboratorio.
- ✅ Un experimento arranca "en curso"; pasa a "completado" solo cuando
  cargás resultado real **y** conclusión, nunca automáticamente.
- ✅ Podés borrar tus propios experimentos (o un administrador, el de
  cualquiera).

**Esta ronda sí requiere migración de base de datos** (tabla nueva).

## Búsqueda global

- ✅ **Buscador universal**: nuevo ícono de lupa en el topbar (al lado
  de la campana) que abre una búsqueda que cruza recetas, fichas de
  café, usuarios, técnicas, ciencia, papers, la guía de cafés por
  origen, y las categorías/notas de la rueda de aromas — todo desde un
  solo cuadro de texto, agrupado por tipo de resultado. Tocar cualquier
  resultado te lleva directo a esa sección (o al perfil de ese usuario,
  o a esa categoría de la rueda). Es 100% frontend: el contenido
  estático (técnicas, ciencia, papers, guía de cafés, aromas) ya vive
  en memoria: solo recetas, fichas de café y usuarios se piden frescos
  al servidor en el momento de buscar.

## Versionado visual de recetas (v1, v2, v3...)

- ✅ **Historial completo de versiones** (`GET /api/recipes/:id/historial`):
  sube hasta encontrar la versión raíz (v1) y baja juntando todos los
  descendientes, sin importar quién los haya duplicado — así se puede
  ver la evolución completa de una receta aunque distintas personas
  la hayan modificado.
- ✅ Nuevo botón "Ver historial" (ícono de reloj) en cada receta
  publicada, que abre una línea de tiempo con todas sus versiones.
- ✅ **Comparación entre dos versiones**: tocás cualquiera de las dos
  que quieras comparar y la app muestra las diferencias reales (dosis,
  agua, temperatura, tiempo, molienda, ratio) entre esa versión
  anterior y la posterior, más las notas de la versión más nueva.

## Borrar recetas + panel de administrador rediseñado

- ✅ **Borrar recetas**: nuevo endpoint `DELETE /api/recipes/:id` — el
  autor o cualquier administrador puede borrar una receta (ícono de
  tacho junto a editar/duplicar/historial). Si un admin borra una
  receta ajena, queda registrado en la Auditoría, igual que con
  comentarios y publicaciones.
- ✅ **Panel de administrador reorganizado en pestañas**: nada de lo
  que ya funcionaba se sacó — se redistribuyó en 5 pestañas (Resumen,
  Usuarios, Actividad, Auditoría, Herramientas) en vez de un scroll
  largo con 6 tarjetas apiladas. "Herramientas" agrupa el anuncio a
  todos los usuarios y la zona de riesgo, que antes quedaban sueltas
  al final.

### Para probar el frontend contra tu backend local

1. Dejá corriendo `npm run dev` en `backend/` (como ya hiciste).
2. Abrí `frontend/index.html` directamente en el navegador (doble clic).
3. Si el backend corre en otro puerto o ya lo desplegaste en Render,
   cambiá la constante `API_BASE` al principio del `<script>` del
   frontend.
