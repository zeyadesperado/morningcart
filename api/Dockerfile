# MorningCart API — Fastify + Prisma + Postgres (ESM, runs via tsx).
# Build context MUST be the monorepo root so npm workspaces resolve.
#   docker build -f api/Dockerfile -t morningcart-api .
FROM node:20-alpine

WORKDIR /app

# Workspace manifests first for better layer caching.
COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/package.json
COPY api/package.json ./api/package.json

# Install all workspaces (keep devDeps — tsx and prisma run at runtime).
RUN npm install

# Now the sources.
COPY shared/ ./shared/
COPY api/ ./api/

# Build @morningcart/shared to dist (api imports it), then generate the client.
RUN npm run build:shared
RUN cd api && npx prisma generate

# Entrypoint: migrate, optional seed, then serve.
COPY api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Runtime lives in the api workspace so prisma/ and src/ resolve relatively.
WORKDIR /app/api

EXPOSE 4000

ENTRYPOINT ["docker-entrypoint.sh"]
