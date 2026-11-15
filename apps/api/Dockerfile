# ==========================================
# Stage 1: Install all workspace dependencies
# ==========================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++ openssl
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

RUN npm ci

# ==========================================
# Stage 2: Generate Prisma Client & Build API
# ==========================================
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json .npmrc ./
COPY apps/api ./apps/api
COPY apps/web/package.json ./apps/web/

RUN npm run prisma:generate --workspace=@brewlite/api
RUN npm run build --workspace=@brewlite/api

# ==========================================
# Stage 3: Install production-only dependencies
# ==========================================
FROM node:20-alpine AS prod-deps
RUN apk add --no-cache libc6-compat python3 make g++ openssl
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

RUN npm ci --workspace=@brewlite/api --include-workspace-root=false --omit=dev && \
    mkdir -p /app/apps/api/node_modules

# ==========================================
# Stage 4: Lightweight Production Runner
# ==========================================
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
ENV PATH="/app/node_modules/.bin:$PATH"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy production dependencies + Prisma Client & Prisma CLI (for safe migrations)
COPY --from=prod-deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=prod-deps --chown=nestjs:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/prisma ./node_modules/prisma
RUN mkdir -p ./node_modules/.bin && \
    ln -sf ../prisma/build/index.js ./node_modules/.bin/prisma

# Copy compiled application & Prisma folder
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/prisma ./apps/api/prisma

WORKDIR /app/apps/api
USER nestjs

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:4000/health || exit 1

CMD ["sh", "-c", "if [ -f dist/main.js ]; then exec node dist/main.js; else exec node dist/src/main.js; fi"]