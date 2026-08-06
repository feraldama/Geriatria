# Imagen del frontend (Next.js). Construir desde la RAÍZ del monorepo:
#   docker build -f apps/web/Dockerfile -t geriatria-web .
FROM node:20-alpine AS base
# Fijamos la versión de pnpm en lugar de dejar que corepack resuelva la última.
RUN corepack enable && corepack prepare pnpm@11.8.0 --activate
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
# Igual que en la API: se copia el árbol del build. La salida `standalone` de
# Next reduciría mucho la imagen, pero con pnpm en monorepo depende de enlaces
# simbólicos y no se adopta sin poder verificar el build de Docker.
FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app ./
RUN chown -R node:node /app
USER node

WORKDIR /app/apps/web
EXPOSE 3028
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3028/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Next reenvía /api/v1 al backend usando API_INTERNAL_URL (se define en runtime).
CMD ["pnpm", "start"]
