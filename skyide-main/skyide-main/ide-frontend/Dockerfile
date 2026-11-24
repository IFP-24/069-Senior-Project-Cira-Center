# SkyIDE frontend — Vite/React build served by nginx.
# Build context: ide-frontend/   →   docker compose builds this as the `frontend` service.

# ---- build stage ----
# Node 22 (NOT 18): package.json requires Node 22.x and Vite 7 needs Node 20+.
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Force a SAME-ORIGIN API base so the SPA calls "/api" (and "/api/v1"), which nginx
# proxies to the backend. This sidesteps CORS entirely and mirrors how prod will work.
# Without this, apiBase.js falls back to http://127.0.0.1:5055 when served from localhost.
ARG VITE_API_BASE_URL=/api
ARG VITE_API_V1_BASE_URL=/api/v1
RUN printf 'VITE_API_BASE_URL=%s\nVITE_API_V1_BASE_URL=%s\n' \
        "$VITE_API_BASE_URL" "$VITE_API_V1_BASE_URL" > .env.production \
    && npm run build

# ---- serve stage ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
# Use 127.0.0.1 (not localhost): nginx binds IPv4-only, but localhost resolves to
# ::1 first in the container, which would refuse the connection.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1/healthz >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
