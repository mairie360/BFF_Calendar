# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

BFF (Backend-for-Frontend) for the municipal **Calendar** module of Mairie360. It sits between the
`Calendars_Web_Service` frontend and two upstreams: **Calendar API** (events, their metadata and
recurrence, their members, their validation status and the caller's rights) and **Core API** (the user
directory: identity, roles, groups). The BFF has no database access; its job is to merge those sources
into frontend-shaped payloads and to keep assignment inside the caller's scope.

Runtime: Express 5 + TypeScript (CommonJS), run under `tsx`. Node 22 is the reference version (matches CI).
`npm run build` type-checks with `tsc --noEmit` then bundles `dist/index.js` with esbuild
(`scripts/build.mjs`), inlining the `@mairie360/*` clients, which are published as TypeScript.

## Commands

```bash
npm run start            # dev server with reload (tsx watch src/index.ts), port 4002
npm test                 # jest (ts-jest); CI runs: npm test -- --runInBand
npx jest tests/calendar.upstream-mocks.test.ts   # single test file
npx jest -t "creates an event"           # single test by name
npm run lint             # eslint . --ext .ts  (flat config: eslint.config.cjs)
npm run lint:fix
npm run build            # tsc --noEmit puis esbuild -> dist/index.js
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

- **`src/clients/calendarClient.ts`** — Calendar API HTTP client: the generated
  `@mairie360/calendar-api-openapi` client on a dedicated axios instance (`CALENDAR_API_BASE_PATH`,
  default `http://localhost:3002/api`), with an interceptor injecting the `Authorization` header.
  `/health` is served outside `/api`, hence `calendarApiRootUrl()` for the availability probe.
- **`src/clients/coreDirectory.ts`** — the directory through Core API's `GET /api/v1/user/`
  (`CORE_API_URL`/`CORE_API_PORT`), filtered by ids or groups.
- **`src/services/calendarAccessPolicy.ts`** — decodes the JWT payload (no signature check — Calendar
  API is trusted to have verified it), resolves the current user, computes `assigneeScope` (`all` for
  Admin/Maire, else `groups` or `self`) and relays the rights Calendar API returns with an event
  (`canEdit` / `canDelete` / `canValidate`, `approvalStatus`), which it also enforces server-side.
  `CalendarAccessError(message, status, code)` is the typed error that `handleUnknownError` turns into
  a JSON body.

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

`supertest` against contract-driven HTTP mocks (no database, no jest.mock of the upstreams):

- `tests/calendar.upstream-mocks.test.ts` keeps the **real** axios client and serves Calendar API /
  Core API from local HTTP servers (`tests/support/contract-mock-server.ts`) that validate every
  request path, query, JSON body and every mocked response against a contract rebuilt at test time
  from the **installed** `@mairie360/calendar-api-openapi` / `core-api-openapi` packages
  (`tests/support/orval-contract.ts` parses their orval `endpoints/*.ts` + `model/*.ts` with the
  TypeScript compiler API; the packages ship no `openapi.json`). Bumping the dependency is enough to
  test against the new contract. Orval output loses error statuses (success is exposed as `2XX`),
  formats and integer-ness, and renames path params (`{eventId}`): any mocked error reply needs
  `outOfContract: true`. Known upstream contract bugs are accepted explicitly with
  `allowDeviation(pattern, reason)`. The app is imported after `CALENDAR_API_BASE_PATH` is set,
  because the client reads it at module load.

`jest.config.ts` lets ts-jest compile `node_modules/@mairie360/*` (orval ships raw ESM TypeScript).
Auth is a hand-built unsigned JWT (`Bearer <header>.<base64url {sub}>.<sig>`); see `authorizationFor(userId)`.

## Performance & security tests (isolated stacks)

Mirrors the `APIs_cicd.yml` pattern: two standalone Compose stacks, each driven by a shell script
that returns the tool's exit code.

```bash
./performance_test.sh    # docker-compose-performance.yml -> k6 (load-test.js)
./security_test.sh       # docker-compose-security.yml   -> OWASP ZAP (zap-api-scan)
```

Both stacks bring up `postgres` (`ghcr.io/mairie360/database`) + `liquibase-migrations` + a `seeder`
(`init-test.sql`, inserts user id 2) + `redis` + `calendar-api` + the BFF, which the compose files
never build: they run `IMAGE_REF` (the CI passes the `dev` image published by `release-dev`, so the
tested artifact is the one promoted to staging/prod). With `IMAGE_REF` empty, the scripts first build
`bff-calendar:local` from `development.Dockerfile` (`NODE_AUTH_TOKEN` + `./.npmrc` needed, same as
`npm ci`). Upstream image tags are overridable via `DB_IMAGE` / `LIQUIBASE_IMAGE` / `CALENDAR_API_IMAGE`.

- **k6** (`load-test.js`) mints an HS256 JWT (`JWT_SECRET=secret`, `sub=2`) and hits `/health` plus the
  authenticated `/calendar/*` reads. Thresholds: `http_req_failed < 1%`, health p95 < 50 ms,
  calendar p95 < 400 ms — tune per reference machine.
- **ZAP** imports `/openapi.json`, replays every operation with a static long-lived JWT (header
  replacer), and fails on any alert not downgraded to `IGNORE` in `.zap/rules.tsv` (informational
  rules are pre-ignored there; add rule IDs as false positives appear).

- **ZAP OpenAPI coverage gate**: the scripts clone `mairie360/CICD` into `cicd-repo/` (gitignored) at
  the pinned `cicd_version` (`CICD_VERSION=<branch>` overrides it). ZAP runs its `zap_hooks.py` with
  `--hook`: every operation of the served spec must be reached, and non-public ones with a
  non-401/403 answer. The spec requires `bearerAuth` at the top level (`openapi.ts`); `/health` and
  `/check_apis` set `security: []` in `registerPath`. The k6 side (`coverage.js`, one handler per
  operation in `load-test.js`) is not wired yet.

CI: the reusable `BFFs-cicd.yml` `security_tests` / `performance_tests` jobs log in to GHCR and run
`./security_test.sh` / `./performance_test.sh` with `IMAGE_REF` set to the image `release-dev` pushed.

## Local run

Needs `.env` with `CALENDAR_API_BASE_PATH`, `CORE_API_URL/PORT`, `CALENDAR_API_URL/PORT`, and
`DB_HOST/PORT/NAME/USER/PASSWORD` pointing at a DB that already has the Mairie360 shared schema
(`users`, `roles`, `group_members`, `events`, `event_members`, the `event_visibility` enum). With
Docker Compose, start the BFF User stack first — it owns the shared DB and the external
`bff_user_backend` network.
