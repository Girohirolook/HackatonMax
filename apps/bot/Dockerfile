# syntax=docker/dockerfile:1

# ---------- Stage 1: сборка workspace (bot + @app/database) ----------
FROM node:22-alpine AS build

WORKDIR /app

# pnpm берётся из поля packageManager корневого package.json
RUN corepack enable
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# Сначала только манифесты воркспейса — для кэширования слоя зависимостей
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/database/package.json packages/database/package.json
COPY apps/bot/package.json apps/bot/package.json

# bot... = bot + его workspace-зависимости (@app/database и их зависимости)
RUN pnpm install --filter bot... --frozen-lockfile

# Исходники
COPY packages/database packages/database
COPY apps/bot apps/bot

# 1) Prisma Client (схема: packages/database/prisma/schema.prisma;
#    DATABASE_URL на этапе generate не требуется)
# 2) Сборка @app/database (tsc -> dist)
# 3) Сборка bot (nest build -> apps/bot/dist/main.js)
RUN pnpm --filter @app/database prisma:generate \
 && pnpm --filter @app/database build \
 && pnpm --filter bot build

# ---------- Stage 2: рантайм ----------
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# openssl нужен Prisma Engine на alpine (linux-musl-openssl-3.0.x)
RUN apk add --no-cache openssl ca-certificates

COPY certs/russian-trusted-bundle.pem /usr/local/share/ca-certificates/russian-trusted-bundle.crt

RUN update-ca-certificates

ENV NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/russian-trusted-bundle.crt


# pnpm-схема symlink'ов сохраняется: копируем дерево целиком, чтобы
# резолвинг @app/database и сгенерированного @prisma/client работал
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# workspace-пакет @app/database (dist + package.json + prisma/schema + node_modules)
COPY --from=build /app/packages/database ./packages/database

# bot: dist + package.json + его node_modules (symlink'и в корневой store)
COPY --from=build /app/apps/bot/dist ./apps/bot/dist
COPY --from=build /app/apps/bot/package.json ./apps/bot/package.json
COPY --from=build /app/apps/bot/node_modules ./apps/bot/node_modules

# Entrypoint: prisma migrate deploy перед стартом приложения
COPY apps/bot/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -q --spider http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "apps/bot/dist/main.js"]
