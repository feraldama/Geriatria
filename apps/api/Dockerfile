# Imagen del backend (Express + Prisma). Construir desde la RAÍZ del monorepo:
#   docker build -f apps/api/Dockerfile -t geriatria-api .
FROM node:20-alpine AS base
# Fijamos la versión de pnpm en lugar de dejar que corepack resuelva la última.
RUN corepack enable && corepack prepare pnpm@11.8.0 --activate
WORKDIR /app

# --- Dependencias (capa cacheable) ---
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/config/package.json packages/config/
COPY packages/schemas/package.json packages/schemas/
COPY apps/api/package.json apps/api/
COPY apps/api/scripts apps/api/scripts
RUN pnpm install --frozen-lockfile

# --- Build (schemas compartido + cliente Prisma + bundle de la API) ---
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @geriatria/schemas build \
  && pnpm --filter @geriatria/api exec prisma generate \
  && pnpm --filter @geriatria/api build

# --- Runtime ---
# Se copia el árbol completo del build. Adelgazar la imagen (instalación --prod
# o `pnpm deploy`) es delicado con el layout de enlaces simbólicos de pnpm y el
# cliente generado de Prisma; no se hace sin poder verificar el build de Docker.
FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app ./

# Corre sin privilegios: el usuario `node` viene en la imagen oficial.
RUN mkdir -p /data/storage && chown -R node:node /data/storage /app
USER node

WORKDIR /app/apps/api
EXPOSE 3027
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3027/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Las migraciones NO se aplican acá: van en el servicio `migrate` del compose,
# después del respaldo. Con reinicios en bucle o réplicas se solaparían.
CMD ["node", "dist/index.cjs"]
