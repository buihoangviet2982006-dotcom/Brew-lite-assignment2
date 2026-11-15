FROM node:20-slim

WORKDIR /app

# Cài đặt OpenSSL và curl phục vụ Prisma engine & healthcheck
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

# Copy package manifests từ root và các workspace
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

# Cài đặt dependencies
RUN npm ci

# Copy toàn bộ mã nguồn của apps/api
COPY apps/api apps/api

# Sinh Prisma Client và build ứng dụng NestJS
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma \
  && npm run build:api

EXPOSE 4000

# Chạy migrate/push DB và khởi động server NestJS
CMD ["sh", "-c", "npx prisma db push --skip-generate --schema=apps/api/prisma/schema.prisma && node apps/api/dist/src/main.js"]
