# syntax=docker/dockerfile:1
# Una sola imagen: la API (Express) sirve también el front compilado.

# ── 1. Front ───────────────────────────────────────────────
FROM node:26-alpine AS web
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install --no-audit --no-fund; fi
COPY index.html vite.config.ts tsconfig.json tailwind.config.js postcss.config.js ./
COPY public ./public
COPY src ./src
RUN npm run build

# ── 2. API ─────────────────────────────────────────────────
FROM node:26-alpine AS api
WORKDIR /app/server
COPY server/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install --no-audit --no-fund; fi
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm run build && npm prune --omit=dev

# ── 3. Imagen final ────────────────────────────────────────
FROM node:26-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3001 \
    STATIC_DIR=/app/dist
WORKDIR /app/server
COPY --from=api /app/server/node_modules ./node_modules
COPY --from=api /app/server/dist ./dist
COPY server/package.json ./
COPY server/migrations ./migrations
COPY --from=web /app/dist /app/dist

USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Las migraciones corren al arrancar (con candado en la base, así que es seguro reiniciar o escalar).
CMD ["sh", "-c", "node dist/scripts/migrate.js && node dist/index.js"]
