# Coffee Lab API (backend v0.1)

Node.js + Express + PostgreSQL (vía Prisma) + JWT. Pensado para arrancar
gratis: Neon/Supabase (base de datos) + Render/Railway (hosting del
servidor).

## 1. Base de datos gratuita

1. Creá una cuenta en **[neon.tech](https://neon.tech)** (no pide tarjeta).
2. Creá un proyecto nuevo → copiá el **connection string** que te da
   (empieza con `postgresql://...`).

## 2. Configurar el proyecto

```bash
cd backend
cp .env.example .env
```
Editá `.env` y pegá:
- `DATABASE_URL` → el connection string de Neon
- `JWT_SECRET` → un valor random largo. Para generarlo:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```

## 3. Instalar y crear las tablas

```bash
npm install
npx prisma migrate dev --name init
```
Esto lee `prisma/schema.prisma` y crea todas las tablas reales en tu
base de Neon (usuarios, extracciones, recetas, cafés, comunidad).

## 4. Correr en local

```bash
npm run dev
```
La API queda en `http://localhost:4000`. Probá que esté viva:
```bash
curl http://localhost:4000/api/health
```

## 5. Crear tu primer usuario administrador

No hay ninguna cuenta de muestra precargada (por seguridad). Registrá tu
usuario normal desde la API:
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"jeremias","password":"elegí-una-contraseña-segura"}'
```
Y despues, para que ese usuario sea administrador, entrá a
`npx prisma studio` (abre una interfaz visual de la base de datos en el
navegador), buscá tu usuario en la tabla `User` y cambiá el campo `role`
a `administrador` manualmente. Es el único momento en que se toca la
base a mano — de ahí en adelante, la gestión de roles se hace desde los
endpoints de `/api/users`.

## 6. Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/register` | Crear cuenta |
| POST | `/api/auth/login` | Iniciar sesión (devuelve JWT) |
| POST | `/api/extractions` | Guardar una extracción (calcula EY e interpreta) |
| GET | `/api/extractions` | Listar mis extracciones |
| GET/POST | `/api/recipes` | Listar / crear recetas |
| POST | `/api/recipes/:id/duplicar` | Duplicar una receta como nueva versión |
| GET/POST | `/api/coffees` | Listar / crear fichas de café |
| GET/POST | `/api/community` | Ver / publicar en el feed de comunidad |
| GET | `/api/users` | Listar usuarios (solo administrador) |

Todas las rutas que no sean de lectura pública requieren el header:
```
Authorization: Bearer <token que devuelve /api/auth/login>
```

## 7. Subirlo gratis a producción

1. Subí este backend a un repositorio de GitHub.
2. Entrá a [render.com](https://render.com) → "New Web Service" → conectá
   el repo → carpeta raíz `backend/` → build command `npm install &&
   npx prisma generate` → start command `npm start`.
3. En "Environment", cargá las mismas variables que tenés en tu `.env`
   local (`DATABASE_URL`, `JWT_SECRET`).
4. Render te da una URL pública (`https://coffee-lab-api.onrender.com`) —
   esa es la que el frontend va a usar para hacer sus `fetch()`.

Nota: el tier gratuito de Render "duerme" el servicio tras un rato sin
uso y tarda unos segundos en despertar en el primer pedido — normal y
esperable en un plan gratuito.
