# API image. Build from the repo root: docker build -f apps/api/Dockerfile .
# The root context is needed because npm workspaces share one package-lock.json.

# --- Build stage: dev dependencies and the TypeScript compiler.
FROM node:24-alpine AS build
WORKDIR /app
# Manifests first, so the npm ci layer is reused until dependencies change.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
RUN npm ci --workspace api
COPY apps/api/ apps/api/
RUN npm run build --workspace api

# --- Runtime stage: production dependencies and compiled code only.
FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
RUN npm ci --omit=dev --workspace api && npm cache clean --force
COPY --from=build /app/apps/api/dist apps/api/dist
# The migrate command runs from this same image (D26), so it needs the script and the SQL files.
COPY apps/api/scripts apps/api/scripts
COPY apps/api/migrations apps/api/migrations

WORKDIR /app/apps/api
# The official image ships an unprivileged "node" user; files stay root-owned, so the app cannot change them.
USER node
EXPOSE 3000
# /health also checks the database (D20), so "unhealthy" means the API cannot serve tasks.
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT:-3000}/health" || exit 1
CMD ["node", "dist/main.js"]
