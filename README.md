# BFF_Calendar

Provide the events, reference lists and access rules required by the municipal calendar. The BFF combines Calendar API data with assignment and approval information used by the web service.

Fournir les événements, référentiels et règles d’accès nécessaires au calendrier municipal. Le BFF regroupe les données de Calendar API et les informations d’affectation et de validation utilisées par le web service.

## Documentation

| Language / Langue | Module | Technical / Technique |
| --- | --- | --- |
| English | [Module overview](docs/en/module.md) | [Technical documentation](docs/en/technical.md) |
| Français | [Présentation du module](docs/fr/module.md) | [Documentation technique](docs/fr/technical.md) |

The sections below are a quick reference in English; the French version of the setup, the routes and the checks is in [docs/fr/technical.md](docs/fr/technical.md).

Les sections ci-dessous sont un aide-mémoire en anglais ; leur version française (installation, routes, vérifications) est dans [docs/fr/technical.md](docs/fr/technical.md).

## Quick start

Node.js 24 and read access to the GitHub Packages of `mairie360` (`NODE_AUTH_TOKEN`, `read:packages`) are needed for the private `@mairie360/*` packages.

```bash
export NODE_AUTH_TOKEN=<token with read:packages>
npm ci
# create .env with the variables below
npm run start
```

The BFF listens on port `4002`: `GET /health` checks the process, `GET /check_apis` its upstreams, `/docs` serves Swagger UI and `/openapi.json` the contract.

Configuration (local example, every upstream is required: there is no `localhost` default):

```dotenv
PORT=4002
CORE_API_URL=localhost
CORE_API_PORT=3000
CALENDAR_API_URL=localhost
CALENDAR_API_PORT=3002
```

## Routes

Generated contract: [`contracts/openapi.json`](contracts/openapi.json) (13 operations), published on every release as `@mairie360/bff-calendar-openapi` for the front.

| Method | Path | Summary |
| --- | --- | --- |
| `GET` | `/health` | Check the health of the BFF |
| `GET` | `/check_apis` | Checks that Core API and Calendar API are reachable |
| `GET` | `/calendar/bootstrap` | Load the initial data of the calendar |
| `GET` | `/calendar/events` | Get the events of a date range |
| `POST` | `/calendar/events` | Create a new event |
| `GET` | `/calendar/events/{id}` | Reads one event with the caller's rights |
| `PATCH` | `/calendar/events/{id}` | Update an existing event |
| `DELETE` | `/calendar/events/{id}` | Delete an event |
| `PATCH` | `/calendar/events/{id}/approval` | Update the approval status of an event |
| `GET` | `/calendar/period` | Loads the events of a period only |
| `GET` | `/calendar/assignees` | Get the assignable people |
| `GET` | `/calendar/categories` | Get the categories |
| `GET` | `/calendar/services` | Get the calendar departments |

## Upstream contracts

The BFF calls its upstreams through these published packages (never through a local checkout); bumping one of them is how an upstream change reaches this BFF:

- `@mairie360/calendar-api-openapi`
- `@mairie360/core-api-openapi`

## Commands

```bash
npm run lint                 # eslint
npm test                     # jest: unit, route and upstream-mock tests
npm run contracts:generate   # regenerate contracts/ after a route, schema or status change
npm run contracts:check      # CI gate: fails when contracts/ is stale
```

Docker stacks, one at a time (they need `NODE_AUTH_TOKEN` and pull access to `ghcr.io/mairie360`):

- `./integration_test.sh`: newman collection against the stack of `docker-compose-integration.yml`
- `./security_test.sh`: OWASP ZAP scan of `/openapi.json` (`docker-compose-security.yml`)
- `./performance_test.sh`: k6 load test (`docker-compose-performance.yml`)
- `./gdpr_marker_test.sh`: GDPR marker check (`docker-compose-gdpr-marker.yml`)
- `./gdpr_simulation_test.sh`: GDPR erasure simulation (`docker-compose-gdpr-simulation.yml`)

CI is the reusable `mairie360/CICD` workflow called by `.github/workflows/cicd.yml`.

## Contracts and background / Contrats et compléments

- [CONTRACT.md](CONTRACT.md)
- [contracts/openapi.json](contracts/openapi.json)
