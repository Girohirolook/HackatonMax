-- =====================================================================
-- Тестовые данные: волонтёр (900000001) и организация (900000002)
-- Запуск: psql $DATABASE_URL -f scripts/seed-test-data.sql
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Профиль волонтёра (max_bridge_id = '900000001')
-- ---------------------------------------------------------------------
INSERT INTO "volunteers" (
  "user_id",
  "first_name",
  "last_name",
  "middle_name",
  "birth_date",
  "city",
  "address",
  "phone",
  "latitude",
  "longitude",
  "created_at",
  "updated_at"
)
SELECT
  u.id,
  'Иван',
  'Тестов',
  'Иванович',
  '2000-05-15'::timestamp,
  'Москва',
  'г Москва, ул Тверская, д 1',
  '+79991234567',
  55.757,
  37.614,
  NOW(),
  NOW()
FROM "users" u
WHERE u."max_bridge_id" = '900000001'
  AND u.role = 'volunteer'
ON CONFLICT ("user_id") DO UPDATE SET
  "first_name"  = EXCLUDED."first_name",
  "last_name"   = EXCLUDED."last_name",
  "middle_name" = EXCLUDED."middle_name",
  "birth_date"  = EXCLUDED."birth_date",
  "city"        = EXCLUDED."city",
  "address"     = EXCLUDED."address",
  "phone"       = EXCLUDED."phone",
  "latitude"    = EXCLUDED."latitude",
  "longitude"   = EXCLUDED."longitude",
  "updated_at"  = NOW();

-- ---------------------------------------------------------------------
-- 2. Профиль организации (max_bridge_id = '900000002')
-- ---------------------------------------------------------------------
INSERT INTO "organizations" (
  "user_id",
  "name",
  "description",
  "contacts",
  "social_media_link",
  "logo_url",
  "is_official",
  "documents_zip_filename",
  "city",
  "address",
  "latitude",
  "longitude",
  "created_at",
  "updated_at"
)
SELECT
  u.id,
  'Фонд "Добрые дела"',
  'Мы организуем волонтёрские мероприятия: субботники, помощь приютам, экологические акции.',
  'info@dobryedela.ru, +7 (495) 123-45-67',
  'https://vk.com/dobryedela',
  NULL,
  TRUE,
  NULL,
  'Москва',
  'г Москва, ул Пушкинская, д 10',
  55.760,
  37.610,
  NOW(),
  NOW()
FROM "users" u
WHERE u."max_bridge_id" = '900000002'
  AND u.role = 'organization_creator'
ON CONFLICT ("user_id") DO UPDATE SET
  "name"                    = EXCLUDED."name",
  "description"             = EXCLUDED."description",
  "contacts"                = EXCLUDED."contacts",
  "social_media_link"       = EXCLUDED."social_media_link",
  "is_official"             = EXCLUDED."is_official",
  "city"                    = EXCLUDED."city",
  "address"                 = EXCLUDED."address",
  "latitude"                = EXCLUDED."latitude",
  "longitude"               = EXCLUDED."longitude",
  "updated_at"              = NOW();

-- ---------------------------------------------------------------------
-- 3. Тестовые мероприятия от организации
--    (сначала удалим старые, чтобы не было дублей при повторных запусках)
-- ---------------------------------------------------------------------
DELETE FROM "events"
WHERE "organization_id" = (
  SELECT id FROM "organizations"
  WHERE "user_id" = (
    SELECT id FROM "users" WHERE "max_bridge_id" = '900000002' AND role = 'organization_creator'
  )
);

INSERT INTO "events" (
  "organization_id",
  "name",
  "description",
  "organizational_details",
  "criteria",
  "city",
  "address",
  "latitude",
  "longitude",
  "required_volunteers_count",
  "event_date",
  "end_time",
  "min_age",
  "created_at",
  "updated_at"
)
SELECT
  o.id,
  e.name,
  e.description,
  e.organizational_details,
  e.criteria,
  e.city,
  e.address,
  e.latitude,
  e.longitude,
  e.required_volunteers_count,
  e.event_date,
  e.end_time,
  e.min_age,
  NOW(),
  NOW()
FROM "organizations" o
CROSS JOIN (
  VALUES
    (
      'Субботник в парке Горького',
      'Уборка территории, посадка деревьев, покраска скамеек. Перчатки и инвентарь выдаём.',
      'Сбор у главного входа в 09:45. Форма одежды — удобная, закрытая обувь.',
      'Возраст от 14 лет. Дети до 16 лет — в сопровождении взрослого.',
      'Москва',
      'г Москва, ул Крымский Вал, д 9 (Парк Горького)',
      55.730::decimal,
      37.600::decimal,
      10,
      '2027-06-15 10:00:00'::timestamp,
      '2027-06-15 14:00:00'::timestamp,
      14
    ),
    (
      'Помощь в приюте для животных',
      'Выгул собак, уборка вольеров, социализация кошек. Очень нужна ваша помощь!',
      'Сбор у входа в приют в 10:50. Одежда, которую не жалко испачкать.',
      'Возраст от 18 лет. Без ограничений по полу.',
      'Москва',
      'г Москва, ул Южнопортовая, д 21',
      55.710::decimal,
      37.680::decimal,
      5,
      '2027-07-20 11:00:00'::timestamp,
      '2027-07-20 15:00:00'::timestamp,
      18
    ),
    (
      'Экологическая акция: очистка берега',
      'Сбор мусора на берегу Москвы-реки. Мешки и перчатки предоставляем.',
      'Сбор у парковки в 08:45. Возьмите с собой воду и перекус.',
      'Любой возраст. Дети до 14 лет — только со взрослыми.',
      'Москва',
      'г Москва, набережная Андрея Первозванного',
      55.740::decimal,
      37.650::decimal,
      15,
      '2027-08-10 09:00:00'::timestamp,
      '2027-08-10 13:00:00'::timestamp,
      NULL
    )
) AS e(name, description, organizational_details, criteria, city, address,
       latitude, longitude, required_volunteers_count, event_date, end_time, min_age)
WHERE o."user_id" = (
  SELECT id FROM "users" WHERE "max_bridge_id" = '900000002' AND role = 'organization_creator'
);

-- ---------------------------------------------------------------------
-- 4. Заявка волонтёра на одно мероприятие (статус pending)
-- ---------------------------------------------------------------------
DELETE FROM "volunteer_event_registrations"
WHERE "volunteer_id" = (
  SELECT id FROM "volunteers"
  WHERE "user_id" = (
    SELECT id FROM "users" WHERE "max_bridge_id" = '900000001' AND role = 'volunteer'
  )
)
AND "event_id" = (
  SELECT e.id FROM "events" e
  JOIN "organizations" o ON o.id = e."organization_id"
  JOIN "users" u ON u.id = o."user_id"
  WHERE u."max_bridge_id" = '900000002'
    AND e.name = 'Субботник в парке Горького'
);

INSERT INTO "volunteer_event_registrations" (
  "volunteer_id",
  "event_id",
  "status",
  "registered_at"
)
SELECT
  v.id,
  e.id,
  'pending',
  NOW()
FROM "volunteers" v
CROSS JOIN "events" e
WHERE v."user_id" = (
  SELECT id FROM "users" WHERE "max_bridge_id" = '900000001' AND role = 'volunteer'
)
  AND e."organization_id" = (
    SELECT id FROM "organizations"
    WHERE "user_id" = (
      SELECT id FROM "users" WHERE "max_bridge_id" = '900000002' AND role = 'organization_creator'
    )
  )
  AND e.name = 'Субботник в парке Горького';

COMMIT;

-- ---------------------------------------------------------------------
-- Итог
-- ---------------------------------------------------------------------
SELECT
  'Профиль волонтёра:' AS info,
  v."first_name" || ' ' || v."last_name" AS name,
  v.city,
  v.address
FROM "volunteers" v
JOIN "users" u ON u.id = v."user_id"
WHERE u."max_bridge_id" = '900000001'

UNION ALL

SELECT
  'Профиль организации:',
  o.name,
  o.city,
  o.address
FROM "organizations" o
JOIN "users" u ON u.id = o."user_id"
WHERE u."max_bridge_id" = '900000002'

UNION ALL

SELECT
  'Мероприятия организации: ' || COUNT(*)::text,
  '',
  '',
  ''
FROM "events" e
JOIN "organizations" o ON o.id = e."organization_id"
JOIN "users" u ON u.id = o."user_id"
WHERE u."max_bridge_id" = '900000002'

UNION ALL

SELECT
  'Заявок волонтёра: ' || COUNT(*)::text,
  '',
  '',
  ''
FROM "volunteer_event_registrations" r
JOIN "volunteers" v ON v.id = r."volunteer_id"
JOIN "users" u ON u.id = v."user_id"
WHERE u."max_bridge_id" = '900000001';