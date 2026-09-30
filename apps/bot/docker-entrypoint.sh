#!/bin/sh
set -e

SCHEMA="packages/database/prisma/schema.prisma"
PRISMA_BIN="packages/database/node_modules/.bin/prisma"

# Применяем миграции Prisma перед стартом приложения.
# Если каталога migrations нет — пропускаем (таблицы должны быть
# созданы иным способом, см. README: pnpm db:migrate).
if [ -x "$PRISMA_BIN" ] && [ -d "packages/database/prisma/migrations" ]; then
  echo "==> prisma migrate deploy"
  "$PRISMA_BIN" migrate deploy --schema "$SCHEMA"
else
  echo "==> Миграции не найдены — пропускаем prisma migrate deploy"
fi

exec "$@"