# --- Étape 1 : Build ---
FROM node:24-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53 AS builder
WORKDIR /app
COPY package*.json ./

# Les identifiants GitHub Packages ne sont disponibles que pendant le npm ci.
RUN --mount=type=secret,id=npmrc,target=/app/.npmrc \
    --mount=type=secret,id=node_auth_token,env=NODE_AUTH_TOKEN \
    npm ci

COPY . .
RUN npm run build

RUN --mount=type=secret,id=npmrc,target=/app/.npmrc \
    --mount=type=secret,id=node_auth_token,env=NODE_AUTH_TOKEN \
    npm ci --omit=dev --ignore-scripts

# --- Stage 2: Runtime ---
FROM node:24-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53
ENV NODE_ENV=production
# The runtime only runs `node dist/index.js`: the package managers bundled with the base image (npm, npx,
# corepack, yarn) are removed, they are never used here and carry their own vulnerable dependencies.
RUN apk add --no-cache curl \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-*

WORKDIR /app
# Files are left owned by root: the node user cannot modify the code it runs.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

USER node

# Cap the heap at 180 MB to fit within a 256 MB Kubernetes memory limit.
ENV NODE_OPTIONS="--max-old-space-size=180"

EXPOSE 4002
# dist/index.js is a self-contained esbuild bundle (the @mairie360/*-openapi clients are inlined), run by
# plain node like the other BFFs: tsx is a development dependency only.
CMD ["node", "dist/index.js"]
