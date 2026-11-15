# ==========================================
# Stage 1: Install workspace dependencies
# ==========================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

RUN npm ci

# ==========================================
# Stage 2: Build Next.js Standalone Application
# ==========================================
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json .npmrc ./
COPY apps/web ./apps/web
COPY apps/api/package.json ./apps/api/

ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_APP_NAME=BrewLite
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build --workspace=@brewlite/web

# ==========================================
# Stage 3: Lightweight Production Runner
# ==========================================
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/menu || exit 1

CMD ["sh", "-c", "if [ -f apps/web/server.js ]; then exec node apps/web/server.js; else exec node server.js; fi"]