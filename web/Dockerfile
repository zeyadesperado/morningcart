# MorningCart web — Vite + React, served by nginx which also reverse-proxies
# /api/ to the api service so cookies stay same-origin.
# Build context MUST be the monorepo root (npm workspaces + @morningcart/shared).
#   docker build -f web/Dockerfile -t morningcart-web .

# ── Stage 1: build the SPA ───────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Workspace manifests first for layer caching.
COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/package.json
COPY web/package.json ./web/package.json

RUN npm install

# Sources.
COPY shared/ ./shared/
COPY web/ ./web/

# Build the shared package (web imports it), then the web bundle -> web/dist.
RUN npm run build:shared
RUN cd web && npm run build

# ── Stage 2: serve with nginx ────────────────────────────────────────────────
FROM nginx:alpine
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/web/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
