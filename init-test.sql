-- Minimal seed for the isolated test stacks (performance / security) of BFF Calendar.
-- The test JWTs reference two users:
--   * sub = "1": Admin role. docker-compose-security.yml injects a static token for it
--     through the ZAP replacer, so every operation is scanned authenticated;
--   * sub = "2": User role only. load-test.js signs a token for it on the fly.

INSERT INTO users (id, first_name, last_name, email, password, status)
VALUES
    (1, 'Security', 'Admin', 'security-admin@mairie360.fr', 'dummy', 'active'),
    (2, 'Perf', 'Tester', 'perf-tester@mairie360.fr', 'dummy', 'active')
ON CONFLICT (id) DO NOTHING;

-- Core API >= 1.1.1 requires at least one role on the user for GET /user/me.
-- Core returns a single role: user 1 must only hold Admin.
DELETE FROM user_roles
WHERE user_id = 1 AND role_id <> (SELECT id FROM roles WHERE lower(name) = 'admin');

INSERT INTO user_roles (user_id, role_id)
SELECT 1, r.id FROM roles r WHERE lower(r.name) = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 2, r.id FROM roles r WHERE lower(r.name) = 'user'
ON CONFLICT DO NOTHING;

-- Scan fixtures: ZAP fills path parameters with the contract examples, so event 101 is read and
-- updated, and event 102 is the example of DELETE /calendar/events/{id}. Both are owned by user 1
-- and fall inside the from/to examples (June 2030).
INSERT INTO events (id, name, description, start_date, end_date, created_by, owner_id)
VALUES
    (101, 'Scan event', 'Event read and updated by the ZAP scan', '2030-06-15 09:00:00+00', '2030-06-15 10:00:00+00', 1, 1),
    (102, 'Scan deleted event', 'Event deleted by the ZAP scan', '2030-06-16 09:00:00+00', '2030-06-16 10:00:00+00', 1, 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO event_members (event_id, user_id, validation_status)
SELECT e.id, 1, 'validated' FROM events e
WHERE e.id IN (101, 102)
  AND NOT EXISTS (SELECT 1 FROM event_members m WHERE m.event_id = e.id AND m.user_id = 1);

-- Explicit ids do not advance the sequences: move them past the seeded rows so that the
-- rows created during the tests (users, events) do not collide.
SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT max(id) FROM users));
SELECT setval(pg_get_serial_sequence('events', 'id'), (SELECT max(id) FROM events));
