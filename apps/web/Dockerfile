# syntax=docker/dockerfile:1

# ---------- Stage 1: сборка статики Vite ----------
FROM node:22-alpine AS build

WORKDIR /app

# pnpm берётся из поля packageManager корневого package.json
RUN corepack enable

# Сначала только манифесты воркспейса — для кэширования слоя с зависимостями
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json

# Ставим только зависимости web-приложения (без bot и database)
RUN pnpm install --filter web --frozen-lockfile

# Исходники web-приложения
COPY apps/web/ apps/web/

# VITE_* переменные запекаются в бандл на этапе сборки
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm --filter web build

# ---------- Stage 2: раздача статики ----------
FROM nginx:1.27-alpine

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -q --spider http://127.0.0.1/healthz || exit 1


CMD ["nginx", "-g", "daemon off;"]