# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

BFF (Backend-for-Frontend) for the municipal **Calendar** module of Mairie360. It sits between the
`Calendars_Web_Service` frontend and two upstreams: **Calendar API** (events, their metadata and
recurrence, their members, their validation status and the caller's rights) and **Core API** (the user
directory: identity, roles, groups). The BFF has no database access; its job is to merge those sources
into frontend-shaped payloads and to keep assignment inside the caller's scope.

Runtime: Express 5 + TypeScript (CommonJS), `tsx` in development only. Node 22 is the reference version
(matches the contracts job). `npm run build` type-checks with `tsc --noEmit` then bundles `dist/index.js`
with esbuild (`scripts/build.mjs`), inlining the `@mairie360/*` clients, which are published as TypeScript;
the production image runs that bundle with plain `node dist/index.js`, like the other BFFs.

## Commands

```bash
npm run start            # dev server with reload (tsx watch src/index.ts), port 4002
npm test                 # jest (ts-jest); CI runs: npm test -- --runInBand
npx jest tests/calendar.upstream-mocks.test.ts   # single test file
npx jest -t "creates an event"           # single test by name
npm run lint             # eslint . --ext .ts  (flat config: eslint.config.cjs)
npm run lint:fix
npm run build            # tsc --noEmit then esbuild -> dist/index.js
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
and `/swagger.json`, and mounts three routers: `/health`, `/check_apis`, `/calendar`. Started directly, it exits at once when
`CALENDAR_API_BASE_PATH` is missing.

`/calendar` (`src/routes/calendar/index.ts`) fans out to sub-routers: `bootstrap`, `events`,
`assignees`, `categories`, `services`. `bootstrap`, `events` and `assignees` sit behind `requireSession`,
which answers 401 before any upstream call when the `Authorization` header carries no readable user id
(Calendar API still checks the signature); `categories` and `services` are static and public. Each
sub-route file does two things:
1. calls `registry.registerPath(...)` at module load to declare its OpenAPI operation, and
2. defines the Express handler, which validates input with a Zod schema then delegates.

Almost all real logic lives in **`src/routes/calendar/calendar_helpers.ts`** — mapping between the BFF
event shape and the Calendar API models, typed with the installed `@mairie360/calendar-api-openapi`
`model/` types (`PostEventView`, `PatchEventView`, `GetEventResultView`, `EventView`…, no casts: Calendar
API's PATCH names the dates `event_start_time` / `event_end_time`, unlike creation and reads which use
`events_*`), the `from`/`to` checks (`parseDateRange`: YYYY-MM-DD, ordered, at most
`MAX_DATE_RANGE_DAYS` = 1096 days because BFF_Message reads a three-year window), orchestrating
multi-call operations (authorize everything → create/patch → sync members → re-fetch; a create whose
member sync fails is deleted again), bounded upstream fan-out (`mapWithConcurrency`, 5 at a time; the
bootstrap reads each distinct event once then resolves all members with one directory call), and the
error helpers `badRequest`, `validationError` and
`calendarError(error, declared)`, which keeps only the upstream 4xx a route declares and turns any other
upstream failure into a 502. Routes throw them; `notFoundHandler` + `errorHandler()` from
`@mairie360/bffs-lib` close `src/index.ts` and answer every error in the shared envelope
`{ error: { code, message, details } }` (schema `ErrorResponse` in the contract).

### The layers behind the helpers

- **`src/clients/calendarClient.ts`** — Calendar API HTTP client: the generated
  `@mairie360/calendar-api-openapi` client on a dedicated axios instance whose interceptor resolves the
  root from `CALENDAR_API_BASE_PATH` on each call (no default: `calendarApiRootUrl()` throws when it is
  unset) and normalizes the caller's `Authorization` header. Outgoing URLs are not logged.
- **`src/clients/coreDirectory.ts`** — the directory through Core API's `GET /api/v1/user/`
  (`CORE_API_URL`/`CORE_API_PORT`), filtered by ids or groups.
- **`src/services/calendarAccessPolicy.ts`** — decodes the JWT payload (no signature check — Calendar
  API is trusted to have verified it), resolves the current user, computes `assigneeScope` (`all` for
  Admin/Maire, else `groups` or `self`) and relays the rights Calendar API returns with an event
  (`canEdit` / `canDelete` / `canValidate`, `approvalStatus`), which it also enforces server-side.
  Its refusals are thrown as the lib's `HttpError(status, message)`.
- **`src/services/calendarTimeZone.ts`** — users type wall-clock times in the instance time zone
  (`CALENDAR_TIME_ZONE`, default Europe/Paris from `@mairie360/bffs-lib`), Calendar API stores UTC
  instants: `wallClockToUtc` / `utcToWallClock` (Intl, DST-aware) convert every date/time crossing the
  boundary, and query days are sent as their UTC first/last second. The container time zone never matters.

### Writes

Every write goes through Calendar API (the BFF has no database). All authorization checks — edit rights,
assignee scope — run before the first upstream write, so a refused request modifies nothing.

### Approval model

`validation_status` per event-member is `pending | validated | refused` in Calendar API; the event's
`approval_status` (`pending | approved | rejected`) is relayed as `approvalStatus` by
`calendarEventApprovalStatus`. An event created by a plain User that assigns a Responsible from the
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

`eslint.config.cjs` is the lint config; `openapi-typescript` 7.10.1 is the type generator.

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
  `allowDeviation(pattern, reason)`. `CALENDAR_API_BASE_PATH` is set to the mock before the app is
  imported (the client reads it on each call). Expected times are Paris wall-clock values of the UTC
  fixtures (09:00Z is 11:00 in September).
- `tests/calendar_dates.test.ts` covers the time zone conversions, `parseDateRange`,
  `mapWithConcurrency` and the missing-URL failure, under a far-off container `TZ`.

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
(`init-test.sql`: users 1 Admin, 2 User, 3 Responsable, group 20, events 101/102/110) + `redis` + `calendar-api` + the BFF, which the compose files
never build: they run `IMAGE_REF` (the CI passes the `dev` image published by `release-dev`, so the
tested artifact is the one promoted to staging/prod). With `IMAGE_REF` empty, the scripts first build
`bff-calendar:local` from `development.Dockerfile` (`NODE_AUTH_TOKEN` + `./.npmrc` needed, same as
`npm ci`). Upstream image tags are overridable via `DB_IMAGE` / `LIQUIBASE_IMAGE` / `CALENDAR_API_IMAGE`.

- **k6** (`load-test.js`) mints HS256 JWTs (`JWT_SECRET=b"secret"`) for user 2 (User) and user 3
  (Responsable, in group 20 with user 2, seeded by `init-test.sql`) and has **one handler per
  operation** of `contracts/openapi.json` through `coverage.js` (a new route without a handler makes
  k6 abort at init). Scenario `crud` (2 VUs, `coverage.run()`, carries the gate): user 2 creates an
  event assigned to user 3 plus a disposable one, deletes the disposable one (DELETE runs before
  PATCH within a path), patches the kept one, user 3 approves it, `cleanup()` deletes it. Scenario
  `reads` (ramp to 20 VUs) replays the GET handlers on the June 2030 fixtures (event 110). Per-op
  `p(95)`: health 50 ms, check_apis 150 ms, reads 400 ms, writes 800 ms; `http_req_failed < 1%`.
- **ZAP** imports `/openapi.json`, replays every operation with a static long-lived JWT (header
  replacer), and fails on any alert not downgraded to `IGNORE` in `.zap/rules.tsv` (informational
  rules are pre-ignored there; add rule IDs as false positives appear).

- **ZAP OpenAPI coverage gate**: the scripts clone `mairie360/CICD` into `cicd-repo/` (gitignored) at
  the pinned `cicd_version` (`CICD_VERSION=<branch>` overrides it). ZAP runs its `zap_hooks.py` with
  `--hook`: every operation of the served spec must be reached, and non-public ones with a
  non-401/403 answer. The spec requires `bearerAuth` at the top level (`openapi.ts`); `/health` and
  `/check_apis` set `security: []` in `registerPath`.

CI: the reusable `BFFs-cicd.yml` `security_tests` / `performance_tests` jobs log in to GHCR and run
`./security_test.sh` / `./performance_test.sh` with `IMAGE_REF` set to the image `release-dev` pushed.

## Local run

Needs `.env` with `CALENDAR_API_BASE_PATH` (required), `CORE_API_URL/PORT`, `CALENDAR_API_URL/PORT`, and
optionally `CALENDAR_TIME_ZONE`. The BFF itself uses no database; the databases of the Compose files only
serve the upstream API images. With Docker Compose, start the BFF User stack first — it owns the
external `bff_user_backend` network.

## Pull request reviewers

Every PR requests a review from the whole team, minus its author: `CarolinHugo`, `LAURETbenjamin`, `MathTek` and `Quentintnrl` (`gh pr create … --reviewer CarolinHugo,LAURETbenjamin,MathTek`). `.github/CODEOWNERS` makes GitHub request them automatically as well.
