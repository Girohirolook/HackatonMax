# Волонтеррария — Мини-приложение для волонтёрской деятельности

## Назначение решения

**Волонтеррария** — мини-приложение в мессенджере **MAX**, объединяющее волонтёров и некоммерческие организации. Организации публикуют мероприятия (субботники, экологические акции, помощь приютам), а волонтёры находят их через поиск, подают заявки и получают уведомления о статусе прямо в чат MAX.

**Ключевые возможности:**
- **Организациям**: создание и управление мероприятиями, одобрение заявок, массовые рассылки волонтёрам, статистика заполняемости
- **Волонтёрам**: поиск мероприятий с фильтрами, запись, персональные рекомендации, история участий
- **MAX-бот**: автоматические уведомления об одобрении, диплинки на мероприятия, приветственное сообщение при старте

---

## Основной пользовательский сценарий

1. **Организатор** создаёт мероприятие «Субботник в парке Горького» на 15 июня, указывает адрес, время, критерии (от 14 лет).
2. **Волонтёр Иван** открывает мини-приложение через кнопку бота, видит персональные рекомендации на главной, находит субботник через поиск с фильтром «Москва» и «Со свободными местами».
3. Иван подаёт заявку — организатор получает уведомление и видит заявку в списке с номером телефона Ивана.
4. Организатор нажимает «Одобрить» — Ивану приходит сообщение в MAX с названием, датой, оргмоментами и кнопкой-диплинком на мероприятие.
5. За день до мероприятия организатор делает рассылку всем одобренным волонтёрам: «Сбор в 09:45 у главного входа».
6. После мероприятия Иван получает статус «Завершено» и видит статистику участий на главной.

---

## Состав и архитектура решения

```
┌─────────────────────────────────────────────────────────────┐
│                     Мессенджер MAX                          │
│   ┌──────────────┐              ┌─────────────────────┐    │
│   │ MAX Bot API  │              │   MAX WebApp SDK    │    │
│   └──────┬───────┘              └──────────┬──────────┘    │
└──────────┼────────────────────────────────┼─────────────────┘
           │ webhook (POST /bot/webhook)    │ initData + SDK
           │                                │
           ▼                                ▼
┌──────────────────────┐        ┌──────────────────────┐
│   bot (NestJS)       │◄──────►│    web (Vite+React)  │
│   REST API :3000     │  /api  │   nginx :12345→80    │
│   ├─ /api/auth/*     │        │   (SPA + проксиров.) │
│   ├─ /api/events/*   │        └──────────────────────┘
│   ├─ /api/dadata/*   │
│   └─ /bot/webhook    │
└──────────┬───────────┘
           │ Prisma
           ▼
┌──────────────────────┐        ┌──────────────────────┐
│  postgres (PostgreSQL │       │   Внешние сервисы    │
│        16-alpine)     │       │  ├─ DaData API       │
│  max_hack DB          │       │                      │
└──────────────────────┘        └──────────────────────┘
```

### Сервисы Docker Compose

| Сервис | Образ | Назначение |
|---|---|---|
| `web` | `maxhack-web:latest` (Vite + nginx) | Фронтенд-приложение, статика + проксирование API |
| `bot` | `maxhack-bot:latest` (NestJS) | REST API, MAX Bot webhook, бизнес-логика |
| `postgres` | `postgres:16-alpine` | PostgreSQL база данных `max_hack` |

---

## Быстрый старт

### Одна команда для запуска всех компонентов

```bash
docker compose up -d --build
```

Эта команда:
1. Соберёт образы `maxhack-web` и `maxhack-bot` из Dockerfile
2. Запустит PostgreSQL с healthcheck
3. Дождётся готовности БД и запустит `bot`
4. Запустит `web` (nginx с собранной Vite-сборкой)

После запуска приложение доступно через ваш reverse-proxy (nginx на хосте, см. раздел «Порты»).

---

## Параметры окружения

### `.env` — в корне проекта (рядом с `docker-compose.yml`)

Создайте файл `.env` с публичными параметрами:

```env
# Домен фронтенда (запекается в Vite-бандл при сборке образа web)
VITE_API_URL=""

# ============================================================
# База данных (используется сервисом postgres и сервисом bot)
# ============================================================
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=max_hack

```

Docker Compose автоматически читает этот файл — никаких дополнительных подключений не требуется.

### `apps/bot/.env` — секреты бэкенда

```env
# MAX Bot
BOT_TOKEN=your_bot_token_from_max
WEBHOOK_DOMAIN=""
WEBHOOK_SECRET=random_secret_string_32_chars

# WebApp URL (для диплинков и кнопок)
WEBAPP_URL=""

# DaData (подсказки адресов)
DADATA_API_KEY=your_dadata_api_key

# Порт бэкенда (используется внутри docker-сети)
PORT=3000

# DATABASE_URL (переопределяется в docker-compose.yml)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/max_hack?schema=public
```

### Сводная таблица переменных окружения

| Переменная | Где используется | Назначение |
|---|---|---|
| `VITE_API_URL` | `.env` → `web` (build-time) | Базовый URL API, запекается в JS-бандл |
| `BOT_TOKEN` | `apps/bot/.env` | Токен MAX-бота для API и валидации initData |
| `WEBHOOK_DOMAIN` | `apps/bot/.env` | Публичный домен для регистрации webhook |
| `WEBHOOK_SECRET` | `apps/bot/.env` | Секрет для проверки входящих webhook-запросов |
| `WEBAPP_URL` | `apps/bot/.env` | Fallback-URL для диплинков |
| `DADATA_API_KEY` | `apps/bot/.env` | API-ключ сервиса DaData |
| `PORT` | `apps/bot/.env` / `docker-compose.yml` | Порт, на котором слушает NestJS (внутри контейнера) |
| `DATABASE_URL` | `docker-compose.yml` | Строка подключения к PostgreSQL |
| `NODE_EXTRA_CA_CERTS` | `docker-compose.yml` | Путь к сертификату Минцифры (для работы с российскими TLS) |
| `POSTGRES_USER` | `docker-compose.yml` | Пользователь PostgreSQL |
| `POSTGRES_PASSWORD` | `docker-compose.yml` | Пароль PostgreSQL |
| `POSTGRES_DB` | `docker-compose.yml` | Имя базы данных |

---

## Сертификаты и HTTPS

Приложение работает по **двухуровневой схеме**: внутри Docker-контейнеров используется обычный HTTP, а внешнее шифрование терминируется **хостовым reverse-proxy** (nginx на сервере).

### Что хранится в проекте

В директории проекта лежит только **один** файл — публичный корневой сертификат Минцифры. Приватные ключи домена в проекте **не хранятся** и не должны попадать в репозиторий.

```
.
├── certs/
│   └── russian-trusted-bundle.pem   # Корневые сертификаты Минцифры (можно коммитить)
├── docker-compose.yml
└── ...
```

| Файл | Назначение | Используется где |
|---|---|---|
| `certs/russian-trusted-bundle.pem` | Корневые сертификаты Минцифры РФ. Нужны для доверия к российским сервисам (DaData, MAX API) | Монтируется в контейнер `bot` через переменную `NODE_EXTRA_CA_CERTS` |

> Приватный ключ домена (`privkey.pem`) и цепочка сертификатов (`fullchain.pem`) **не лежат в папке проекта**. Они размещаются в системной директории сервера и используются только хостовым nginx.

### Настройка ключей домена

Ключи домена размещаются **вне проекта** — как правило, в `/etc/letsencrypt/`, если используется Let's Encrypt / Certbot.

**1. Получите сертификат через Certbot:**

```bash
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.ru
```

После получения файлы окажутся здесь:

```
/etc/letsencrypt/live/your-domain.ru/
├── fullchain.pem    # Сертификат домена + цепочка
└── privkey.pem      # Приватный ключ домена
```

**2. Хостовой nginx ссылается на них напрямую** (файлы не копируются в проект):

```nginx
server {
    listen 80;
    server_name your-domain.ru;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.ru;

    ssl_certificate     /etc/letsencrypt/live/your-domain.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.ru/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://127.0.0.1:12345;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

**3. Активация:**

```bash
sudo ln -s /etc/nginx/sites-available/your-domain.ru.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Требования к сертификатам

Для корректной работы с платформой MAX:

- **Протокол** — только HTTPS (порт 443)
- **Сертификат** — выдан доверенным удостоверяющим центром или Минцифры
- **Шифрование** — минимум TLS 1.2
- **Ответ сервера** — не более 30 секунд

### Безопасность

- Приватный ключ домена (`privkey.pem`) **не коммитится** в репозиторий и не копируется в папку проекта — он остаётся в `/etc/letsencrypt/` с ограниченными правами доступа (`600`).
- В репозиторий попадает только публичный корневой бандл `certs/russian-trusted-bundle.pem` — он не содержит секретов.

---

## Используемые порты

| Сервис | Внутренний | Внешний | Описание |
|---|---|---|---|
| `web` (nginx) | `80` | `127.0.0.1:12345` | Статика + проксирование `/api/*` на `bot` |
| `bot` (NestJS) | `3000` | — (только внутри docker-сети) | REST API + webhook |
| `postgres` | `5432` | `127.0.0.1:5432` | БД, доступно только с хоста |

> Все порты проброшены только на `127.0.0.1` (loopback). Для внешнего доступа требуется **хостовой reverse-proxy** (nginx/Apache с SSL через Certbot) на портах 80/443.

---

## Зависимости

### Системные
- **Docker** ≥ 24.0
- **Docker Compose** ≥ 2.20
- **Node.js** ≥ 20 (только для локальной разработки, не нужен при запуске через Docker)

### Технологический стек

| Компонент | Технологии |
|---|---|
| Фронтенд | React 18, TypeScript, Vite, React Router, `@maxhub/max-ui` |
| Бэкенд | NestJS 10, TypeScript, Prisma ORM |
| База данных | PostgreSQL 16 |
| Инфраструктура | Docker, Docker Compose, nginx |

---

## Внешние сервисы и интеграции

| Сервис | Назначение | Как используется |
|---|---|---|
| **MAX Bot API** (`@maxhub/max-bot-api`) | Отправка сообщений пользователям MAX, регистрация webhook | Уведомления об одобрении, массовые рассылки, диплинки `https://max.ru/<bot>?startapp=event_<id>` |
| **MAX WebApp SDK** (`window.WebApp`) | Аутентификация через `initData`, запрос контакта телефона | Валидация HMAC-SHA256 подписи на бэкенде |
| **DaData Suggestions API** | Подсказки и нормализация адресов | `POST /api/dadata/suggest`, `POST /api/dadata/clean`. При сбое API возвращается `degraded: true` без ошибки |
| **Яндекс.Карты** | Открытие адреса на карте | Ссылки вида `https://yandex.ru/maps/?text=<адрес>` |

---

## Описание работы с данными

### База данных `max_hack`

Основные таблицы (Prisma-схема в `packages/database/prisma/schema.prisma`):

| Модель | Назначение |
|---|---|
| `users` | Базовая таблица пользователей (`max_bridge_id`, роль, `max_chat_id`) |
| `volunteers` | Профиль волонтёра: ФИО, дата рождения, адрес, телефон |
| `organizations` | Профиль организации: название, описание, контакты, статус `is_official` |
| `events` | Мероприятия: название, адрес, даты, `min_age`, `required_volunteers_count` |
| `volunteer_event_registrations` | Заявки волонтёров со статусами: `pending → approved → completed` / `rejected` |
| `broadcast_history` | История рассылок организации с количеством доставленных сообщений |
| `event_photos`, `event_documents` | Медиа-файлы мероприятий |

### Файловое хранилище

- Загруженные файлы (документы организаций) хранятся в volume `./uploads`

### Аутентификация

- Все API-запросы требуют поле `initData` в теле запроса
- Бэкенд валидирует HMAC-SHA256 подпись по `BOT_TOKEN` (алгоритм MAX WebApp)
- При невалидной подписи — `401 Unauthorized`

### Обработка ошибок

- Ошибки отображаются **глобальным toast-уведомлением** сверху экрана (исчезает через 4 секунды)
- Технические детали (stack trace, HTTP-коды, пути к файлам) очищаются в функции `cleanErrorMessage()`
- Пользователь видит только человекочитаемые сообщения: «Ошибка сети», «Требуется авторизация», «Неизвестная ошибка»

---

## Порядок работы с тестовыми данными

### Заполнение тестовыми данными

Создайте файл `scripts/seed-test-data.sql` со следующим содержимым (можно взять готовый из репозитория) и выполните:

```bash
# Скопировать скрипт в контейнер БД
docker cp scripts/seed-test-data.sql postgres:/tmp/seed.sql

# Выполнить
docker exec -i postgres psql -U postgres -d max_hack -f /tmp/seed.sql
```

### Что создаёт скрипт

| Сущность | `max_bridge_id` | Данные |
|---|---|---|
| **Волонтёр** | `900000001` | Иван Тестов Иванов, 2000 г.р., Москва, Тверская 1, +79991234567 |
| **Организация** | `900000002` | Фонд «Добрые дела», официальный статус |
| **Мероприятие 1** | — | Субботник в парке Горького, 15.06.2027, 10 мест |
| **Мероприятие 2** | — | Помощь в приюте для животных, 20.07.2027, 5 мест |
| **Мероприятие 3** | — | Экоакция на берегу, 10.08.2027, 15 мест |
| **Заявка** | — | Иван → субботник (статус `pending`) |

Скрипт идемпотентен (использует `ON CONFLICT DO UPDATE` и `DELETE` перед `INSERT`) — его можно запускать повторно.

### Очистка тестовых данных

```bash
docker exec -i postgres psql -U postgres -d max_hack -c "
  DELETE FROM broadcast_history;
  DELETE FROM volunteer_event_registrations;
  DELETE FROM event_photos;
  DELETE FROM event_documents;
  DELETE FROM events;
  DELETE FROM volunteers;
  DELETE FROM organizations;
  DELETE FROM users;
"
```

---

## Пошаговый сценарий проверки

### 1. Проверка здоровья сервисов

```bash
# Health-эндпоинт
curl http://localhost:3000/api/health
# → {"status":"ok"}

# Логи всех контейнеров
docker compose logs -f
```

### 2. Проверка webhook MAX

```bash
# Должен ответить (200 или 401 без валидной подписи)
curl -X POST http://localhost:3000/bot/webhook
```

### 3. Проверка DaData (подсказки адресов)

```bash
# initData — взять из DevTools MAX WebApp: window.WebApp.initData
INIT_DATA="your_init_data_here"

curl -X POST http://localhost:3000/api/dadata/suggest \
  -H "Content-Type: application/json" \
  -d "{\"initData\":\"$INIT_DATA\",\"query\":\"Москва Тверская\"}"
# → {"suggestions":[...], "degraded":false}
```

### 4. Сквозной сценарий: от регистрации до рассылки

1. **Регистрация волонтёра** → `POST /api/auth/register` с `initData` нового пользователя
2. **Создание мероприятия** → `POST /api/events/create` с `initData` организации
3. **Запись волонтёра** → `POST /api/events/register-for-event`
4. **Получение заявок** → `POST /api/events/applications` (только для организации)
5. **Одобрение** → `POST /api/events/application-action` с `action: "approve"`
6. **Рассылка** → `POST /api/events/broadcast` с текстом сообщения
7. **Проверка MAX**: волонтёр должен получить личное сообщение с кнопкой «Открыть мероприятие»

---

## Примеры ожидаемого поведения системы

### Успешные сценарии

| Действие | Ожидаемый результат |
|---|---|
| Новый пользователь открывает WebApp | Показывается экран регистрации с предзаполненными именем/фамилией из MAX |
| Организация создаёт мероприятие | Мероприятие появляется в «Мои мероприятия» и в поиске для всех пользователей |
| Волонтёр записывается на мероприятие | Заявка появляется у организатора со статусом «На рассмотрении» |
| Организатор одобряет заявку | Волонтёру приходит сообщение в MAX с кнопкой `open_app` |
| Организатор делает рассылку | Все одобренные волонтёры получают сообщение, запись сохраняется в истории |
| DaData недоступен | Адрес принимается как есть, `degraded: true`, toast не показывается |
| Ввод несуществующего адреса | Адрес сохраняется как введённая строка (без ошибки валидации) |

### Сценарии с ошибками

| Ситуация | Ожидаемое поведение |
|---|---|
| Невалидный `initData` | HTTP 401, toast «Требуется авторизация» сверху экрана |
| Волонтёр пытается создать мероприятие | HTTP 403, toast «Доступ запрещён» |
| Повторная запись на мероприятие | HTTP 400, toast «Вы уже записаны» |
| Все места заняты | HTTP 400, toast «Все места заняты» |
| Возраст волонтёра ниже `minAge` | HTTP 400, toast «Минимальный возраст: N лет» |
| Техническая ошибка сервера | Toast «Ошибка сервера. Попробуйте позже» (без stack trace) |

---

## Известные ограничения

1. **DaData** — бесплатный лимит 10 000 запросов/день; при превышении сервис переходит в degraded-режим
2. **Нет ролевой модели администратора** — только две роли: `volunteer` и `organization_creator`
3. **Статус `completed` не выставляется автоматически** — мероприятие считается завершённым, когда `endTime < now`
4. **Поиск мероприятий** ограничен 50 результатами (hardcoded в бэкенде)

---

## Порядок остановки и повторного запуска

### Остановка сервисов

```bash
# Остановить все контейнеры (данные сохраняются)
docker compose stop

# Остановить и удалить контейнеры (volume с БД сохраняется)
docker compose down

# Полная очистка с удалением volume (ВНИМАНИЕ: удалит БД!)
docker compose down -v
```

### Повторный запуск

```bash
# Быстрый старт без пересборки
docker compose up -d

# С пересборкой после изменений в коде
docker compose up -d --build

# Пересобрать только web (если менялся VITE_API_URL в .env)
docker compose up -d --build web

# Только один сервис
docker compose up -d --build bot
```

### Просмотр логов

```bash
# Все сервисы
docker compose logs -f

# Конкретный сервис
docker compose logs -f bot
docker compose logs -f web
docker compose logs -f postgres

# Последние 100 строк
docker compose logs --tail=100 bot
```

### Перезапуск БД (сброс к исходному состоянию)

```bash
docker compose down -v          # удалить volume с БД
docker compose up -d postgres   # поднять чистую БД
docker compose up -d bot        # Prisma автоматически применит миграции
docker cp scripts/seed-test-data.sql postgres:/tmp/seed.sql
docker exec -i postgres psql -U postgres -d max_hack -f /tmp/seed.sql  # залить тестовые данные
```

---

## Структура проекта

```
.
├── apps/
│   ├── web/                    # Vite + React SPA
│   │   ├── Dockerfile
│       ├── package.json        # перечень зависимостей
│   │   └── src/
│   │       ├── components/     # UI-компоненты (AddressInput)
│   │       ├── context/        # AuthContext, ToastContext
│   │       ├── lib/            # api.ts, useAutoRefresh
│   │       └── pages/          # страницы приложения
│   └── bot/                    # NestJS бэкенд
│       ├── Dockerfile
│       ├── .env                # секреты
│       ├── package.json        # перечень зависимостей
│       └── src/
│           ├── auth/           # регистрация, профиль, upload
│           ├── bot/            # MAX Bot адаптер
│           ├── dadata/         # подсказки адресов
│           ├── events/         # мероприятия, заявки, рассылки
│           └── prisma/         # PrismaService
├── packages/
│   └── database/               # Prisma-схема и клиент БД
│       └── package.json        # перечень зависимостей
├── scripts/
│   └── seed-test-data.sql      # тестовые данные
├── uploads/                    # volume для загруженных файлов
├── docker-compose.yml
├── package.json                # корневой манифест монорепозитория
├── pnpm-workspace.yaml         # описание рабочих пространств
├── pnpm-lock.yaml              # зафиксированные версии зависимостей
├── .env                        # VITE_API_URL
└── README.md
```

---

## Troubleshooting

| Проблема | Решение |
|---|---|
| `Error: Cannot find module '@app/database'` | Пересобрать образ бота: `docker compose build bot` |
| `webhook registration failed` | Проверить `WEBHOOK_DOMAIN` в `apps/bot/.env` — должен быть публично доступен из интернета |
| Чёрный экран при запуске WebApp | Проверить `VITE_API_URL` в `.env` и пересобрать web: `docker compose up -d --build web` |
| `401 Unauthorized` на все запросы | Проверить `BOT_TOKEN` — должен совпадать с токеном бота в MAX |
| DaData всегда `degraded: true` | Проверить `DADATA_API_KEY` и лимиты на https://dadata.ru |
| Бот не отвечает на сообщения | Проверить логи: `docker compose logs -f bot`, убедиться что webhook зарегистрирован |
| `null value in column "updated_at"` в SQL-сидах | При INSERT через чистый SQL нужно передавать `updated_at = NOW()` вручную — `@updatedAt` работает только через Prisma |

---