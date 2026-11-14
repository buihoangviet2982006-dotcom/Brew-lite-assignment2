FROM node:20-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN npm ci

COPY apps/api apps/api

RUN npx prisma generate --schema=apps/api/prisma/schema.prisma \
  && npm run build:api

EXPOSE 4000

CMD ["sh", "-c", "npx prisma db push --skip-generate --schema=apps/api/prisma/schema.prisma && node apps/api/dist/src/main.js"]
