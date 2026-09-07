# BFF_Calendar — Technical documentation

[Module overview](module.md) · [Français](../fr/technical.md) · [README](../../README.md)

## Architecture and request handling

Express 5.2.1 server written in TypeScript. Zod schemas and their OpenAPI registry describe exchanged objects; routers adapt upstream services to interface needs.

`src/index.ts` mounts `/calendar`. Routers delegate conversion to the helpers and role, assignment and approval rules to `calendarAccessPolicy.ts`. The Calendar client uses a base path including `/api`; the SQL repository supplements business responses.

## Data and persistence

Calendar API supplies event operations. `calendarAccessRepository.ts` accesses PostgreSQL directly for the directory, assignments, some updates and metadata. The `calendar_event_metadata` table, created by the BFF when needed, references `events.id` and stores category, service, location and recurrence. Categories and services include reference lists defined in the helpers.

Operation depends on consistent user identifiers between Core and Calendar and the expected SQL schema. The Docker stack uses the database shared with BFF User; start that stack first. Metadata and direct SQL access remain current BFF responsibilities.

## Installation and local startup

Use Node.js 22 to reproduce the contract job and npm with the committed lockfile. Other job and Docker versions are detailed below.

Private `@mairie360/*` dependencies require GitHub Packages access. Set `NODE_AUTH_TOKEN` in the environment to a token allowed to read these packages, as configured in `.npmrc`. Do not commit its value.

```bash
npm ci
```

Create `.env` in the repository root. Local HTTP configuration example to adapt to the running services:

```dotenv
PORT=4002
CALENDAR_API_BASE_PATH=http://localhost:3002/api
CORE_API_URL=localhost
CORE_API_PORT=3000
CALENDAR_API_URL=localhost
CALENDAR_API_PORT=3002
```

Also set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` and `DB_PASSWORD` for an existing database containing the tables expected by the SQL repositories. These variables and any secrets listed below still need to be supplied; the HTTP example prepares neither schema nor data.

With Docker, start the BFF User stack first. `USER_BACKEND_NETWORK` and `SHARED_DB_HOST` connect Calendar to its shared database.

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
| `CALENDAR_API_BASE_PATH` | http://localhost:3002/api | Calendar business client base address, including `/api`. |
| `CORE_API_URL` / `CORE_API_PORT` | localhost / 3000 | Host and port used by `/check_apis`. |
| `CALENDAR_API_URL` / `CALENDAR_API_PORT` | localhost / 3002 | Diagnostic host and port; separate from the client base path. |
| `USER_BACKEND_NETWORK` | bff_user_backend | External network expected by Docker Compose. |
| `SHARED_DB_HOST` | mairie360-db-bff-user | Shared database host in Docker Compose. |
| `DB_HOST` / `DB_PORT` | localhost / 5432 | SQL repository PostgreSQL connection. |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | — | Database, account and secret to supply for the expected shared schema. |

## Routes and data contract

Inventory extracted from `contracts/openapi.json`. Replace brace parameters with real identifiers. Detailed types, required fields, responses and any examples are defined in that contract; table statuses are the declared statuses, not an exhaustive list of transport or validation errors.

| Method | Path | Declared body | Declared statuses |
| --- | --- | --- | --- |
| GET | `/health` | — | 200 |
| GET | `/check_apis` | — | 200, 502 |
| GET | `/calendar/bootstrap` | — | 200, 500 |
| GET | `/calendar/events` | — | 200, 400, 500 |
| POST | `/calendar/events` | application/json | 201, 400, 500 |
| PATCH | `/calendar/events/{id}` | application/json | 200, 400, 404, 500 |
| DELETE | `/calendar/events/{id}` | — | 204, 404, 500 |
| PATCH | `/calendar/events/{id}/approval` | application/json | 200, 400, 404, 500 |
| GET | `/calendar/assignees` | — | 200, 500 |
| GET | `/calendar/categories` | — | 200, 500 |
| GET | `/calendar/services` | — | 200, 500 |

## Session, permissions and errors

Business routes expect the caller’s authorization. The access policy resolves identity and database roles, then limits assignments and edits. Exposed `pending`, `approved`, `rejected` statuses are mapped to backend approval values.

## Synchronization and verification

```bash
npm run contracts:generate
npm run contracts:check
npm test -- --runInBand
npm run lint
npm run build
```

`contracts:generate` exports the runtime registry to `contracts/openapi.json` and regenerates `contracts/bff.d.ts`. `contracts:check` fails when the contract or types are stale. Then run `npm run contracts:sync` in each associated web service and deliver contract changes together.

The type generator is pinned to `openapi-typescript@7.10.1` in `scripts/contracts.mjs` and runs through npm. For documentation-only changes, check links, accuracy in both languages and `git diff --check`; do not regenerate contracts without changing their source.

## CI/CD and Docker execution

The `contracts.yml` job uses Node.js 22, `actions/checkout@v7` and `actions/setup-node@v7`. It runs on pushes, pull requests and manual dispatch; it installs with `npm ci`, checks contracts and runs the associated tests.

`cicd.yml` calls `mairie360/CICD/.github/workflows/BFFs-cicd.yml@v1.13.2`, with `cicd_version: v1.13.2` and `node_version: "22"`. Reusable steps and GitHub environments determine actual checks, publications and deployments.

The Dockerfile currently uses `node:20-alpine` for build and runtime; the image command is `["npx", "tsx", "dist/index.js"]`. That version is separate from the Node.js 22 contract job.

Before running Docker, check service variables, build secrets and networks in the repository files. Green CI validates its jobs; it does not prove business-service availability in a remote environment.

## Troubleshooting

For missing events or rejected assignments, check the user, group membership and shared database. A `calendar_event_metadata` error requires checking the schema and SQL account permissions. `/check_apis` and the business client use different variables.

## Repository reference

- [src/index.ts](../../src/index.ts)
- [src/routes/calendar-routes.ts](../../src/routes/calendar-routes.ts)
- [src/routes/calendar/calendar_helpers.ts](../../src/routes/calendar/calendar_helpers.ts)
- [src/services/calendarAccessPolicy.ts](../../src/services/calendarAccessPolicy.ts)
- [src/repositories/calendarAccessRepository.ts](../../src/repositories/calendarAccessRepository.ts)
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
