# Imagen del backend (Express + Prisma). Construir desde la RAÍZ del monorepo:
#   docker build -f apps/api/Dockerfile -t geriatria-api .
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

# --- Dependencias (capa cacheable) ---
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/config/package.json packages/config/
COPY packages/schemas/package.json packages/schemas/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile

# --- Build (schemas compartido + cliente Prisma + bundle de la API) ---
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @geriatria/schemas build \
  && pnpm --filter @geriatria/api exec prisma generate \
  && pnpm --filter @geriatria/api build

# --- Runtime ---
FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app ./
WORKDIR /app/apps/api
EXPOSE 3027
# Aplica migraciones pendientes y levanta la API.
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/index.cjs"]
