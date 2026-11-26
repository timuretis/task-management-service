# Web image. Build from the repo root:
#   docker build -f apps/web/Dockerfile --build-arg VITE_API_URL=http://localhost:3000 .
# The root context is needed because npm workspaces share one package-lock.json.

# --- Build stage: Vite compiles the React app to static files.
FROM node:24-alpine AS build
WORKDIR /app
# Manifests first, so the npm ci layer is reused until dependencies change.
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
RUN npm ci --workspace web
COPY apps/web/ apps/web/
# Vite bakes VITE_ values into the JavaScript at build time (D24), so each environment
# needs its own build. Fail here rather than ship an app that cannot find its API.
ARG VITE_API_URL
RUN test -n "$VITE_API_URL" || (echo "ERROR: build with --build-arg VITE_API_URL=<api url>" >&2; exit 1)
RUN npm run build --workspace web

# --- Runtime stage: static files only, served by nginx as a non-root user on port 8080.
FROM nginxinc/nginx-unprivileged:1.29-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
