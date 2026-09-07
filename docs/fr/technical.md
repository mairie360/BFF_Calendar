# BFF_Calendar — Documentation technique

[Présentation du module](module.md) · [English](../en/technical.md) · [README](../../README.md)

Documentation du code versionné au 7 septembre 2026, basée sur `7f5611b7ad3b`. Les commandes ci-dessous décrivent les vérifications à effectuer; elles ne certifient pas un déploiement distant.

## Architecture et traitement des requêtes

Serveur Express 5.2.1 écrit en TypeScript. Les schémas Zod et leur registre OpenAPI décrivent les objets échangés; les routeurs adaptent les services amont aux besoins des interfaces.

`src/index.ts` monte `/calendar`. Les routeurs délèguent aux helpers pour les conversions et à `calendarAccessPolicy.ts` pour les règles de rôle, d’affectation et de validation. Le client Calendar utilise un chemin de base incluant `/api`; le dépôt SQL complète les réponses métier.

## Données et persistance

Calendar API fournit les opérations sur les événements. `calendarAccessRepository.ts` accède directement à PostgreSQL pour l’annuaire, les affectations, certaines modifications et les métadonnées. La table `calendar_event_metadata`, créée par le BFF si nécessaire, référence `events.id` et stocke catégorie, service, lieu et récurrence. Les catégories et services comprennent des référentiels définis dans les helpers.

Le fonctionnement dépend d’identifiants utilisateurs cohérents entre Core et Calendar et du schéma SQL attendu. Le stack Docker utilise la base partagée du stack BFF User; démarrer celui-ci en premier. Les métadonnées et accès SQL restent une responsabilité actuelle du BFF.

## Installation et lancement local

Utiliser Node.js 22 pour reproduire le job de contrats et npm avec le fichier de verrouillage versionné. Les versions des autres jobs et de Docker sont précisées plus bas.

Les dépendances privées `@mairie360/*` nécessitent un accès GitHub Packages. Configurer `NODE_AUTH_TOKEN` dans l’environnement avec un jeton autorisé à lire ces packages, conformément à `.npmrc`. Ne pas enregistrer la valeur dans Git.

```bash
npm ci
```

Créer `.env` à la racine. Exemple de configuration HTTP locale à adapter aux services démarrés:

```dotenv
PORT=4002
CALENDAR_API_BASE_PATH=http://localhost:3002/api
CORE_API_URL=localhost
CORE_API_PORT=3000
CALENDAR_API_URL=localhost
CALENDAR_API_PORT=3002
```

Compléter `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` et `DB_PASSWORD` pour une base existante contenant les tables attendues par les dépôts SQL. Ces variables et les éventuels secrets listés ci-dessous restent à fournir; l’exemple HTTP ne prépare ni schéma ni données.

En Docker, lancer d’abord le stack BFF User. `USER_BACKEND_NETWORK` et `SHARED_DB_HOST` raccordent Calendar à sa base partagée.

```bash
npm run start
```

`PORT` est optionnel; le repli de `src/index.ts` est `4002`.

Vérifier le processus puis consulter la documentation interactive:

```bash
curl --fail --silent --show-error http://localhost:4002/health
```

Interface Swagger: `http://localhost:4002/docs`. Spécification JSON: `/openapi.json`, avec l’alias `/swagger.json`. `/health` vérifie le processus; `/check_apis` est un diagnostic distinct des dépendances.

## Configuration

Les valeurs ci-dessous sont des exemples locaux ou des comportements explicitement indiqués, pas des identifiants de production.

| Variable ou priorité | Exemple / repli indiqué | Rôle |
| --- | --- | --- |
| `PORT` | 4002 | Port de cet exemple local. |
| `CALENDAR_API_BASE_PATH` | http://localhost:3002/api | Adresse métier du client Calendar, avec `/api`. |
| `CORE_API_URL` / `CORE_API_PORT` | localhost / 3000 | Hôte et port utilisés par `/check_apis`. |
| `CALENDAR_API_URL` / `CALENDAR_API_PORT` | localhost / 3002 | Hôte et port de diagnostic; distincts du chemin du client. |
| `USER_BACKEND_NETWORK` | bff_user_backend | Réseau externe attendu par Docker Compose. |
| `SHARED_DB_HOST` | mairie360-db-bff-user | Hôte de base partagée dans Docker Compose. |
| `DB_HOST` / `DB_PORT` | localhost / 5432 | Connexion PostgreSQL des dépôts SQL. |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | — | Base, compte et secret à fournir pour le schéma partagé attendu. |

## Routes et contrat de données

Inventaire extrait de `contracts/openapi.json`. Les paramètres entre accolades sont remplacés par des identifiants réels. Les types détaillés, champs requis, réponses et exemples éventuels sont définis dans ce contrat; les statuts du tableau sont ceux déclarés, sans prétendre lister toutes les erreurs de transport ou de validation.

| Méthode | Chemin | Corps déclaré | Statuts déclarés |
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

## Session, permissions et erreurs

Les routes métier attendent l’autorisation de l’appelant. La politique d’accès résout son identité et ses rôles en base, puis limite les affectations et modifications. Les statuts exposés `pending`, `approved`, `rejected` sont adaptés aux valeurs de validation du backend.

## Synchronisation et vérifications

```bash
npm run contracts:generate
npm run contracts:check
npm test -- --runInBand
npm run lint
npm run build
```

`contracts:generate` exporte le registre runtime dans `contracts/openapi.json` et régénère `contracts/bff.d.ts`. `contracts:check` échoue si le contrat ou les types sont périmés. Exécuter ensuite `npm run contracts:sync` dans chaque web service associé et livrer les modifications de contrat ensemble.

Le générateur de types est fixé à `openapi-typescript@7.10.1` dans `scripts/contracts.mjs` et s’exécute via npm. Pour une modification uniquement documentaire, vérifier les liens, l’exactitude des deux langues et `git diff --check`; ne pas régénérer les contrats sans modification de leur source.

## CI/CD et exécution Docker

Le job `contracts.yml` utilise Node.js 22, `actions/checkout@v7` et `actions/setup-node@v7`. Il s’exécute sur push, pull request et lancement manuel; il installe avec `npm ci`, contrôle les contrats et lance les tests dédiés.

`cicd.yml` appelle `mairie360/CICD/.github/workflows/BFFs-cicd.yml@v1.13.2`, avec `cicd_version: v1.13.2` et `node_version: "22"`. Les étapes réutilisables et les environnements GitHub déterminent les contrôles, publications et déploiements effectifs.

Le Dockerfile utilise encore `node:20-alpine` pour la construction et l’exécution; la commande de l’image est `["npx", "tsx", "dist/index.js"]`. Cette version est distincte du job de contrats Node.js 22.

Avant un lancement Docker, vérifier les variables de service, les secrets de build et les réseaux dans les fichiers du dépôt. Une CI verte valide ses jobs; elle ne prouve pas la disponibilité des services métier dans un environnement distant.

## Diagnostic

En cas d’événements absents ou d’affectations refusées, contrôler l’utilisateur, ses groupes et la base partagée. Une erreur sur `calendar_event_metadata` impose de vérifier le schéma et les droits du compte SQL. `/check_apis` et le client métier utilisent des variables différentes.

## Repères dans le dépôt

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

Compléments historiques: [CONTRACT.md](../../CONTRACT.md). Les besoins proposés doivent rester distincts du comportement effectivement implémenté.
