# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

BFF (Backend-for-Frontend) for the municipal **Calendar** module of Mairie360. It sits between the
`Calendars_Web_Service` frontend and two upstreams: **Calendar API** (Rust service, event CRUD) and a
shared **PostgreSQL** database (user directory, group membership, roles, event-member assignments,
validation status). The BFF's job is to merge those sources into frontend-shaped payloads and to
enforce assignment / approval / edit rules that the upstreams do not.

Runtime: Express 5 + TypeScript (CommonJS), run under `tsx`. Node 22 is the reference version (matches CI).

## Commands

```bash
npm run start            # dev server with reload (tsx watch src/index.ts), port 4002
npm test                 # jest (ts-jest); CI runs: npm test -- --runInBand
npx jest tests/calendar.test.ts          # single test file
npx jest -t "creates an event"           # single test by name
npm run lint             # eslint . --ext .ts  (flat config: eslint.config.cjs)
npm run lint:fix
npm run build            # tsc -> dist/
npm run contracts:generate   # regenerate contracts/openapi.json + contracts/bff.d.ts from the live registry
npm run contracts:check      # fails if the committed contract or generated types are stale
```

`contracts:check` and `npm test -- --runInBand` are the two gates in `.github/workflows/contracts.yml`.
Run `contracts:generate` and commit the result whenever you change routes or Zod schemas.

Private `@mairie360/*` packages come from GitHub Packages: `npm ci` needs `NODE_AUTH_TOKEN` in the
environment (see `.npmrc`).

## Architecture

### Request flow

`src/index.ts` builds the Express app, mounts Swagger UI at `/docs`, serves the spec at `/openapi.json`
and `/swagger.json`, and mounts three routers: `/health`, `/check_apis`, `/calendar`.

`/calendar` (`src/routes/calendar/index.ts`) fans out to sub-routers: `bootstrap`, `events`,
`assignees`, `categories`, `services`. Each sub-route file does two things:
1. calls `registry.registerPath(...)` at module load to declare its OpenAPI operation, and
2. defines the Express handler, which validates input with a Zod schema then delegates.

Almost all real logic lives in **`src/routes/calendar/calendar_helpers.ts`** — mapping between the BFF
event shape and the Calendar API shapes (`ApiCreateEventBody`, `ApiPatchEventBody`, `ApiRecurrence`,
date/time normalization), orchestrating multi-call operations (create event → sync members → refresh
validation → upsert metadata → re-fetch), and the `handleUnknownError` / `sendValidationError`
response helpers.

### The three layers behind the helpers

- **`src/clients/calendarClient.ts`** — Calendar API HTTP client. Wraps the generated
  `@mairie360/calendar-api-openapi` client with a dedicated axios instance (`CALENDAR_API_BASE_PATH`,
  default `http://localhost:3002/api`). An interceptor injects the `Authorization` header. The generated
  package has duplicate type declarations, so it is `require`d untyped and re-typed locally as
  `CalendarApiClient` — hence the `as never` casts at call sites.
- **`src/repositories/calendarAccessRepository.ts`** — direct `pg` Pool access to the shared DB:
  user directory (`users`/`roles`/`group_members`), event membership & `validation_status`
  (`event_members`), event detail writes (`events`), and the BFF-owned `calendar_event_metadata`
  table. That table (category / service / location / recurrence) is **created lazily by the BFF** via
  `ensureCalendarEventMetadataStorage()` — it is not in a migration.
- **`src/services/calendarAccessPolicy.ts`** — pure-ish rules: decodes the JWT payload (no signature
  check — Calendar API is trusted to have verified it), resolves the current user, computes
  `assigneeScope` (`all` for Admin/Maire, else `groups` or `self`), and the `canEdit` / `canValidate` /
  `requiresResponsibleApproval` predicates. `CalendarAccessError(message, status, code)` is the typed
  error that `handleUnknownError` turns into a JSON body.

### Why some writes go straight to SQL

Calendar API currently accepts `PATCH` but does not persist event fields, and does not model
assignment/approval. So `patchCalendarEvent` calls Calendar API first (to validate JWT + permissions),
then writes the actual field changes through `updateCalendarEventDetails` and member/validation state
through the repository. Keep this ordering: upstream call for auth, then SQL for persistence.

### Approval model

`validation_status` per event-member is `pending | validated | refused` in the DB; the BFF exposes it
as `approvalStatus` `pending | approved | rejected` (mapped by `apiValidationStatus` /
`calendarEventApprovalStatus`). An event created by a plain User that assigns a Responsible from the
same group starts `pending`; only an assigned Responsible sharing a group with the creator can approve.

## OpenAPI / contract pipeline

Single source of truth: the Zod schemas in **`src/openapi-registry.ts`** plus the `registry.registerPath`
calls scattered in the route files. `src/openapi.ts` imports the route modules (for their side-effect
registrations) and generates the document with `@asteasolutions/zod-to-openapi`.

- `scripts/export-swagger.ts` serializes that document to `contracts/openapi.json` (and `openapi.json`).
- `scripts/contracts.mjs` runs `openapi-typescript@7.10.1` (pinned, via `npm exec`) to produce
  `contracts/bff.d.ts`, and in `--check` mode diffs both artifacts.
- `contracts/` is the versioned contract consumed by `Calendars_Web_Service`; ship BFF and web-service
  contract changes together.

Ignore `orval.config.ts`, `next.config.js`, `.eslintrc.js`, and the `swagger-ui-react` /
`openapi-typescript-codegen` deps — they are leftovers from an earlier setup and are not part of the
active pipeline (`eslint.config.cjs` is the live lint config; `openapi-typescript` 7.10.1 is the live
type generator).

## Tests

`tests/*.test.ts` use `supertest` against a freshly-assembled Express app and `jest.mock` both
`calendarClient` and `calendarAccessRepository` — there is no DB or Calendar API in tests. Auth is a
hand-built unsigned JWT (`Bearer <header>.<base64url {sub}>.<sig>`); see `authorizationFor(userId)` in
`tests/calendar.test.ts`. When adding a helper that hits the client or repository, extend those mocks.

## Performance & security tests (isolated stacks)

Mirrors the `APIs_cicd.yml` pattern: two standalone Compose stacks, each driven by a shell script
that returns the tool's exit code.

```bash
./performance_test.sh    # docker-compose-performance.yml -> k6 (load-test.js)
./security_test.sh       # docker-compose-security.yml   -> OWASP ZAP (zap-api-scan)
```

Both stacks bring up `postgres` (`ghcr.io/mairie360/database`) + `liquibase-migrations` + a `seeder`
(`init-test.sql`, inserts user id 2) + `redis` + `calendar-api` + the BFF (built from
`development.Dockerfile`, run as `npx tsx src/index.ts`). Image tags are overridable via
`DB_IMAGE` / `LIQUIBASE_IMAGE` / `CALENDAR_API_IMAGE` / `TARGET_IMAGE`; `NODE_AUTH_TOKEN` must be in the
environment for the BFF image build (same as `npm ci`).

- **k6** (`load-test.js`) mints an HS256 JWT (`JWT_SECRET=secret`, `sub=2`) and hits `/health` plus the
  authenticated `/calendar/*` reads. Thresholds: `http_req_failed < 1%`, health p95 < 50 ms,
  calendar p95 < 400 ms — tune per reference machine.
- **ZAP** imports `/openapi.json`, replays every operation with a static long-lived JWT (header
  replacer), and fails on any alert not downgraded to `IGNORE` in `.zap/rules.tsv` (informational
  rules are pre-ignored there; add rule IDs as false positives appear).

CI: the reusable `BFFs-cicd.yml` currently runs `docker compose -f docker-compose.test.yml ...` inline.
To use these stacks, point its `security_tests` / `performance_tests` jobs at `./security_test.sh` /
`./performance_test.sh` (with `NODE_AUTH_TOKEN` in `env:`), exactly like `APIs_cicd.yml`.

## Local run

Needs `.env` with `CALENDAR_API_BASE_PATH`, `CORE_API_URL/PORT`, `CALENDAR_API_URL/PORT`, and
`DB_HOST/PORT/NAME/USER/PASSWORD` pointing at a DB that already has the Mairie360 shared schema
(`users`, `roles`, `group_members`, `events`, `event_members`, the `event_visibility` enum). With
Docker Compose, start the BFF User stack first — it owns the shared DB and the external
`bff_user_backend` network.
