# BFF_Calendar — Technical documentation

[Module overview](module.md) · [Français](../fr/technical.md) · [README](../../README.md)

## Architecture and request handling

Express 5.2.1 server written in TypeScript. Zod schemas and their OpenAPI registry describe exchanged objects; routers adapt upstream services to interface needs.

`src/index.ts` mounts `/calendar`. Routers delegate conversion to the helpers and role, assignment and approval rules to `calendarAccessPolicy.ts`. The Calendar client targets the Calendar API root given by `CALENDAR_API_URL` / `CALENDAR_API_PORT` (the generated client adds `/api/v1`), and the directory client Core API through `CORE_API_URL` / `CORE_API_PORT`. Both are read on every call, with no localhost default: a route that needs a missing one answers 503, and the server refuses to start without them.

## Data and persistence

Calendar API supplies every event operation: the events themselves, their metadata (category, service, location) and their recurrence rule, their members and their validation status, plus the rights of the caller. Core API supplies the directory (identity, roles, groups). The BFF has no database access. Categories and services include reference lists defined in the helpers.

Operation depends on consistent user identifiers between Core and Calendar. The BFF writes nothing to a database: every write goes through Calendar API. Dates and times exchanged with the interface are wall-clock values in the instance time zone (`CALENDAR_TIME_ZONE`, Europe/Paris by default); the BFF converts them to and from the UTC instants Calendar API stores.

## Installation and local startup

Use Node.js 22 to reproduce the contract job and npm with the committed lockfile. Other job and Docker versions are detailed below.

Private `@mairie360/*` dependencies require GitHub Packages access. Set `NODE_AUTH_TOKEN` in the environment to a token allowed to read these packages, as configured in `.npmrc`. Do not commit its value.

```bash
npm ci
```

Create `.env` in the repository root. Local HTTP configuration example to adapt to the running services:

```dotenv
PORT=4002
CORE_API_URL=localhost
CORE_API_PORT=3000
CALENDAR_API_URL=localhost
CALENDAR_API_PORT=3002
```

`CALENDAR_API_URL` and `CORE_API_URL` are required (scheme optional, `http` by default; the `_PORT` is used only when the URL has none). These variables and any secrets listed below still need to be supplied; the HTTP example prepares no data.

With Docker, start the BFF User stack first. `USER_BACKEND_NETWORK` connects Calendar to Core API and BFF User.

```bash
npm run start
```

`PORT` is optional; the `src/index.ts` fallback is `4002`.

Check the process, then open the interactive documentation:

```bash
curl --fail --silent --show-error http://localhost:4002/health
```

Swagger UI: `http://localhost:4002/docs`. JSON specification: `/openapi.json`, with `/swagger.json` as an alias. `/health` checks the process; `/check_apis` is a separate dependency diagnostic.

## Configuration

Values below are local examples or explicitly described behavior, not production credentials.

| Variable or precedence | Example / stated fallback | Purpose |
| --- | --- | --- |
| `PORT` | 4002 | Port used by this local example. |
| `CALENDAR_TIME_ZONE` | Europe/Paris (fallback) | IANA time zone of the instance: typed times are converted from it to UTC before reaching Calendar API, and back. |
| `CORE_API_URL` / `CORE_API_PORT` | localhost / 3000 (required, no fallback) | Core API (user directory and `/check_apis`). The server refuses to start without the URL; a call without it answers 503. |
| `CALENDAR_API_URL` / `CALENDAR_API_PORT` | localhost / 3002 (required, no fallback) | Calendar API root (its routes are published under `/api/v1` by the generated client), also probed by `/check_apis`. Replaces `CALENDAR_API_BASE_PATH`. |
| `USER_BACKEND_NETWORK` | bff_user_backend | External network expected by Docker Compose. |
| `TRUST_PROXY` | unset (no proxy trusted) | Express `trust proxy`: `true`, a hop count or trusted addresses/subnets, so that `req.ip` is the real client behind the ingress. |

## Routes and data contract

Inventory extracted from `contracts/openapi.json`. Replace brace parameters with real identifiers. Detailed types, required fields, responses and any examples are defined in that contract; table statuses are the declared statuses, not an exhaustive list of transport or validation errors.

| Method | Path | Declared body | Declared statuses |
| --- | --- | --- | --- |
| GET | `/health` | — | 200 |
| GET | `/check_apis` | — | 200, 502 |
| GET | `/calendar/bootstrap` | `from`, `to` (optional) | 200, 400, 401, 500, 502, 503 |
| GET | `/calendar/events` | `from`, `to` | 200, 400, 401, 500, 502, 503 |
| POST | `/calendar/events` | application/json | 201, 400, 401, 403, 500, 502, 503 |
| PATCH | `/calendar/events/{id}` | application/json | 200, 400, 401, 403, 404, 500, 502, 503 |
| DELETE | `/calendar/events/{id}` | — | 204, 400, 401, 403, 404, 500, 502, 503 |
| PATCH | `/calendar/events/{id}/approval` | application/json | 200, 400, 401, 403, 404, 500, 502, 503 |
| GET | `/calendar/assignees` | `from`, `to` (optional) | 200, 400, 401, 500, 502, 503 |
| GET | `/calendar/categories` | — | 200, 500 |
| GET | `/calendar/services` | — | 200, 500 |

## Session, permissions and errors

Business routes expect the caller’s authorization: `/calendar/bootstrap`, `/calendar/events*` and `/calendar/assignees` answer 401 before any upstream call unless the request carries `Authorization: Bearer <token>` (the only accepted credential: cookies and other schemes are ignored; the token is forwarded as is to Calendar API and Core API, which verify it), and are never cached (`Cache-Control: no-store`); `/calendar/categories` and `/calendar/services` stay public. The caller's id is the token's `sub`, read without verification only to select its directory entry, which Core API then returns for that same token. The access policy resolves identity and Core API roles, then limits assignments and edits, and every authorization (including the scope of new assignees) is checked before the first write; when assigning the members of a new event fails, the BFF deletes it (best effort). Only the creator can delete an event, after Calendar API has validated the session. Exposed `pending`, `approved`, `rejected` statuses are mapped to backend approval values.

`from` and `to` must be `YYYY-MM-DD` dates (Paris days, sent to Calendar API as UTC bounds), with `from` not after `to` and at most 1096 days (three years) apart, and event identifiers positive integers, otherwise the BFF answers 400 without calling Calendar API. Every error uses the envelope shared by all the BFFs (`@mairie360/bffs-lib`), the `ErrorResponse` schema of the contract: `{ "error": { "code", "message", "details" } }`, where `code` derives from the status (`BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `BAD_GATEWAY`, `INTERNAL_ERROR`...) and `details` lists the invalid fields of a rejected body (`{ "path": "body.title", "message" }`), empty otherwise. An upstream 4xx is kept only when the route declares that status in the contract (with a generic message), any other upstream status and network failures become 502, unknown routes answer a 404 envelope, an unparsable JSON body a 400 one, and an unexpected error a generic 500. Neither Calendar API, Core API nor database error messages are returned to the client.

## Synchronization and verification

```bash
npm run contracts:generate
npm run contracts:check
npm test -- --runInBand
npm run lint
npm run build
```

Tests in `tests/calendar.upstream-mocks.test.ts` run the real Calendar API client against local HTTP mocks driven by the Calendar API and Core API contracts, rebuilt from the installed `@mairie360/*-api-openapi` packages (orval types, versions pinned in `package.json`): every request (path, parameters, JSON body) and every mocked success response is validated against those contracts. Bumping a package is enough to test against its new contract; error statuses are not typed by orval and are simulated explicitly.

`contracts:generate` exports the runtime registry to `contracts/openapi.json` and regenerates `contracts/bff.d.ts`. `contracts:check` fails when the contract or types are stale. Then run `npm run contracts:sync` in each associated web service and deliver contract changes together.

The type generator is pinned to `openapi-typescript@7.10.1` in `scripts/contracts.mjs` and runs through npm. For documentation-only changes, check links, accuracy in both languages and `git diff --check`; do not regenerate contracts without changing their source.

## CI/CD and Docker execution

The `contracts.yml` job uses Node.js 22, `actions/checkout@v7` and `actions/setup-node@v7`. It runs on pushes, pull requests and manual dispatch; it installs with `npm ci`, checks contracts and runs the associated tests.

`cicd.yml` calls `mairie360/CICD/.github/workflows/BFFs-cicd.yml@v3.0.0`, with `cicd_version: v3.0.0` and `node_version: "22"`. Reusable steps and GitHub environments determine actual checks, publications and deployments.

The Dockerfile uses `node:24-alpine` for build and runtime and runs the esbuild bundle with `["node", "dist/index.js"]`, like the other BFFs (`tsx` is a development dependency only). That version is separate from the Node.js 22 contract job.

`security_test.sh` and `performance_test.sh` test the image named by `IMAGE_REF`: in CI, the image `release-dev` has just published, the same artifact that is then promoted to staging and prod. When `IMAGE_REF` is empty (local use), they first build `bff-calendar:local` from `development.Dockerfile`, which needs `NODE_AUTH_TOKEN` and `./.npmrc`.

`security_test.sh` runs the OWASP ZAP stack of `docker-compose-security.yml`: ZAP replays every operation of `/openapi.json` with a static admin JWT (`sub=1`, HS256, `JWT_SECRET=b"secret"` in every service) and fills bodies, queries and path parameters from the contract examples. `init-test.sql` seeds the resources those examples name (users 1 and 2, event 101, and event 102 for the DELETE route, in June 2030); keep examples and seed in sync when adding a route. Event bodies refuse `<` and `>` in `title`, `description`, `location` and `service`.

The ZAP stack carries the OpenAPI coverage gate of `mairie360/CICD` (`tests/zap/zap_hooks.py`), checked out as `cicd-repo/` by the CI job and cloned there by `security_test.sh` / `performance_test.sh` at the pinned `cicd_version` (`CICD_VERSION` overrides it). After the scan, the hook fails when an operation of the contract was never reached, or when an operation that requires `bearerAuth` only got 401/403; public operations (`/health`, `/check_apis`) declare `security: []` in their `registerPath`. A new public route needs `security: []`; a new authenticated one needs the seed its examples point to.

The k6 stack carries the other half of the gate (`tests/k6/coverage.js`): `load-test.js` holds one handler per operation of `contracts/openapi.json`, k6 aborts at init when one is missing and fails its `operations_uncovered` threshold when a handler does not send its request. **Adding a route means adding its handler in `load-test.js`.** Two scenarios share the handlers. `crud` (2 VUs) calls every handler once per iteration: user 2 creates an event assigned to its Responsable (user 3, same group 20 in `init-test.sql`) and a disposable one, deletes the disposable event, patches the kept one, user 3 approves it, and the kept event is deleted at the end. `reads` (ramp to 20 VUs) replays only the GET handlers on the June 2030 fixtures (event 110). Every operation has a `p(95)` threshold by family: 50 ms for `/health`, 150 ms for `/check_apis`, 400 ms for reads, 800 ms for event writes; `http_req_failed` must stay below 1 %.

Before running Docker, check service variables, build secrets and networks in the repository files. Green CI validates its jobs; it does not prove business-service availability in a remote environment.

## Troubleshooting

For missing events or rejected assignments, check the user and their group membership in Core API. `/check_apis` probes Core API and Calendar API with the same `CORE_API_URL` / `CALENDAR_API_URL` (and `_PORT`) as the business calls.

## Repository reference

- [src/index.ts](../../src/index.ts)
- [src/routes/calendar-routes.ts](../../src/routes/calendar-routes.ts)
- [src/routes/calendar/calendar_helpers.ts](../../src/routes/calendar/calendar_helpers.ts)
- [src/services/calendarAccessPolicy.ts](../../src/services/calendarAccessPolicy.ts)
- [src/clients/coreDirectory.ts](../../src/clients/coreDirectory.ts)
- [src/clients/calendarClient.ts](../../src/clients/calendarClient.ts)
- [contracts/openapi.json](../../contracts/openapi.json)
- [contracts/bff.d.ts](../../contracts/bff.d.ts)
- [scripts/contracts.mjs](../../scripts/contracts.mjs)
- [package.json](../../package.json)
- [.github/workflows/contracts.yml](../../.github/workflows/contracts.yml)
- [.github/workflows/cicd.yml](../../.github/workflows/cicd.yml)
- [Dockerfile](../../Dockerfile)
- [docker-compose.yml](../../docker-compose.yml)

Historical supplements: [CONTRACT.md](../../CONTRACT.md). Proposed requirements must remain distinct from implemented behavior.
