# Imagen del frontend (Next.js). Construir desde la RAÍZ del monorepo:
#   docker build -f apps/web/Dockerfile -t geriatria-web .
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

# --- Dependencias ---
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/config/package.json packages/config/
COPY packages/schemas/package.json packages/schemas/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

# --- Build ---
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @geriatria/schemas build \
  && pnpm --filter @geriatria/web build

# --- Runtime ---
FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app ./
WORKDIR /app/apps/web
EXPOSE 3028
# Next reenvía /api/v1 al backend usando API_INTERNAL_URL (se define en runtime).
CMD ["pnpm", "start"]
