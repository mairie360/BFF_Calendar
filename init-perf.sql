-- Copied from Calendar_API (init-perf.sql of its main branch): keep both in step, and the id ranges at the
-- top of load-test.js. The BFF reads these rows through Calendar API and resolves their members through Core.
--
-- Volume seed of the performance stack (MAIR-474), run by the `seeder` service after
-- init-test.sql. Without it `GET /calendar` reads one event, so the cost of its range query
-- (visibility OR owner OR membership, OR an overlapping recurrence rule) is never measured.
--
-- - 2 000 agents (`User`, ids 300001..302000);
-- - 50 000 events over 2026 and 2027 (ids 100000 + g, g = 0..49999): event g is owned by agent
--   300001 + g % 2000, public when g % 50 = 25 (2 %, about 40 a month), private otherwise, with 3
--   members;
-- - 500 weekly recurrence rules, each carried by one private event (g % 100 = 0): a public series
--   would land in every calendar of the two years.
-- load-test.js derives the same ids to read as an agent its own calendar, events and members.
--
-- Fixed ids, ON CONFLICT DO NOTHING: the file is idempotent, like init-test.sql.

INSERT INTO users (id, first_name, last_name, email, password, status, is_archived)
SELECT n, 'Agent', 'Perf ' || n, 'perf.agent.' || n || '@mairie360.fr',
       '$argon2id$v=19$m=19456,t=2,p=1$/iKF9PbiDRDs4EKPjlIIhg$UKx9vfwwps250mEP/bYp63CXbEnQGULeUAhDq+az9Aw',
       'active', FALSE
FROM generate_series(300001, 302000) AS n
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT n, r.id FROM generate_series(300001, 302000) AS n CROSS JOIN roles r WHERE r.name = 'User'
ON CONFLICT DO NOTHING;

INSERT INTO recurrence_rules (id, type_recurrence, start_date, end_date, start_time, duration,
                              owner_id, visibility)
SELECT 100000 + r, 'weekly', TIMESTAMPTZ '2026-01-05 09:00:00+00' + (r % 7) * interval '1 day',
       TIMESTAMPTZ '2028-01-01 00:00:00+00', TIME '09:00', interval '1 hour',
       300001 + (40 * r) % 2000, 'private'
FROM generate_series(0, 499) AS r
ON CONFLICT (id) DO NOTHING;

-- Event g starts on day g % 730 of 2026-2027, at a time of day spread by g.
INSERT INTO events (id, name, start_date, end_date, created_by, visibility, owner_id, category,
                    approval_status, approval_decided_by, approval_decided_at, recurrence_id,
                    is_exception)
SELECT 100000 + g, 'Perf event ' || g, d, d + interval '1 hour' * (1 + g % 3),
       300001 + g % 2000,
       CASE WHEN g % 50 = 25 THEN 'public' ELSE 'private' END::event_visibility,
       300001 + g % 2000,
       (ARRAY['meeting', 'activity', 'ceremony', 'other'])[1 + g % 4],
       'validated', 1, d - interval '1 day',
       CASE WHEN g % 100 = 0 THEN 100000 + g / 100 END,
       CASE WHEN g % 100 = 0 THEN FALSE END
FROM (SELECT g, TIMESTAMPTZ '2026-01-01 07:00:00+00' + (g % 730) * interval '1 day'
                + (g % 11) * interval '1 hour' AS d
      FROM generate_series(0, 49999) AS g) s
ON CONFLICT (id) DO NOTHING;

INSERT INTO event_members (event_id, user_id, validation_status)
SELECT 100000 + g, 300001 + (g + 1 + 97 * k) % 2000, 'validated'
FROM generate_series(0, 49999) AS g CROSS JOIN generate_series(0, 2) AS k
WHERE NOT EXISTS (SELECT 1 FROM event_members WHERE event_id = 100000);

SELECT setval(pg_get_serial_sequence('users', 'id'), GREATEST((SELECT MAX(id) FROM users), 1));
SELECT setval(pg_get_serial_sequence('events', 'id'), GREATEST((SELECT MAX(id) FROM events), 1));
SELECT setval(pg_get_serial_sequence('recurrence_rules', 'id'), GREATEST((SELECT MAX(id) FROM recurrence_rules), 1));

ANALYZE users;
ANALYZE user_roles;
ANALYZE recurrence_rules;
ANALYZE events;
ANALYZE event_members;
