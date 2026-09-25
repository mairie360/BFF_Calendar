# BFF_Calendar — Documentation technique

[Présentation du module](module.md) · [English](../en/technical.md) · [README](../../README.md)

## Architecture et traitement des requêtes

Serveur Express 5.2.1 écrit en TypeScript. Les schémas Zod et leur registre OpenAPI décrivent les objets échangés; les routeurs adaptent les services amont aux besoins des interfaces.

`src/index.ts` monte `/calendar`. Les routeurs délèguent aux helpers pour les conversions et à `calendarAccessPolicy.ts` pour les règles de rôle, d’affectation et de validation. Le client Calendar utilise un chemin de base incluant `/api`; le dépôt SQL complète les réponses métier.

## Données et persistance

Calendar API fournit toutes les opérations sur les événements : l’événement, ses métadonnées (catégorie, service, lieu) et sa règle de répétition, ses membres et leur statut de validation, ainsi que les droits de l’appelant. Core API fournit l’annuaire (identité, rôles, groupes). Le BFF n’accède plus à la base. Les catégories et services comprennent des référentiels définis dans les helpers.

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
CALENDAR_API_BASE_PATH=http://localhost:3002
CORE_API_URL=localhost
CORE_API_PORT=3000
CALENDAR_API_URL=localhost
CALENDAR_API_PORT=3002
```

Compléter `CORE_API_URL` et `CORE_API_PORT` pour joindre l’annuaire de Core API. Ces variables et les éventuels secrets listés ci-dessous restent à fournir; l’exemple HTTP ne prépare pas de données.

En Docker, lancer d’abord le stack BFF User. `USER_BACKEND_NETWORK` raccorde Calendar à Core API et BFF User.

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
| `CALENDAR_API_BASE_PATH` | http://localhost:3002 | Racine de Calendar API (ses routes sont publiées sous `/api/v1` par le client généré). |
| `CORE_API_URL` / `CORE_API_PORT` | localhost / 3000 | Hôte et port utilisés par `/check_apis`. |
| `CALENDAR_API_URL` / `CALENDAR_API_PORT` | localhost / 3002 | Hôte et port de diagnostic; distincts du chemin du client. |
| `USER_BACKEND_NETWORK` | bff_user_backend | Réseau externe attendu par Docker Compose. |

## Routes et contrat de données

Inventaire extrait de `contracts/openapi.json`. Les paramètres entre accolades sont remplacés par des identifiants réels. Les types détaillés, champs requis, réponses et exemples éventuels sont définis dans ce contrat; les statuts du tableau sont ceux déclarés, sans prétendre lister toutes les erreurs de transport ou de validation.

| Méthode | Chemin | Corps déclaré | Statuts déclarés |
| --- | --- | --- | --- |
| GET | `/health` | — | 200 |
| GET | `/check_apis` | — | 200, 502 |
| GET | `/calendar/bootstrap` | `from`, `to` (optionnels) | 200, 400, 401, 500, 502 |
| GET | `/calendar/events` | `from`, `to` | 200, 400, 401, 500, 502 |
| POST | `/calendar/events` | application/json | 201, 400, 401, 403, 500, 502 |
| PATCH | `/calendar/events/{id}` | application/json | 200, 400, 401, 403, 404, 500, 502 |
| DELETE | `/calendar/events/{id}` | — | 204, 400, 401, 403, 404, 500, 502 |
| PATCH | `/calendar/events/{id}/approval` | application/json | 200, 400, 401, 403, 404, 500, 502 |
| GET | `/calendar/assignees` | `from`, `to` (optionnels) | 200, 400, 401, 500, 502 |
| GET | `/calendar/categories` | — | 200, 500 |
| GET | `/calendar/services` | — | 200, 500 |

## Session, permissions et erreurs

Les routes métier attendent l’autorisation de l’appelant. La politique d’accès résout son identité et ses rôles en base, puis limite les affectations et modifications; seul le créateur peut supprimer un événement, après validation de la session par Calendar API. Les statuts exposés `pending`, `approved`, `rejected` sont adaptés aux valeurs de validation du backend.

`from` et `to` doivent être des dates `YYYY-MM-DD` et les identifiants d’événement des entiers positifs, sinon le BFF répond 400 sans appeler Calendar API. Les erreurs utilisent le corps `ApiError` (`code`, `message`): les statuts 4xx amont sont conservés, les 5xx amont et pannes réseau deviennent 502, et aucun message d’erreur de Calendar API ou de la base n’est renvoyé au client.

## Synchronisation et vérifications

```bash
npm run contracts:generate
npm run contracts:check
npm test -- --runInBand
npm run lint
npm run build
```

Les tests de `tests/calendar.upstream-mocks.test.ts` exécutent le vrai client Calendar API contre des mocks HTTP locaux pilotés par les contrats Calendar API et Core API, reconstruits depuis les paquets `@mairie360/*-api-openapi` installés (types orval, versions épinglées dans `package.json`): chaque requête (chemin, paramètres, corps JSON) et chaque réponse de succès simulée est validée contre ces contrats. Monter la version d'un paquet suffit à tester le nouveau contrat; les statuts d'erreur ne sont pas typés par orval et sont simulés explicitement.

`contracts:generate` exporte le registre runtime dans `contracts/openapi.json` et régénère `contracts/bff.d.ts`. `contracts:check` échoue si le contrat ou les types sont périmés. Exécuter ensuite `npm run contracts:sync` dans chaque web service associé et livrer les modifications de contrat ensemble.

Le générateur de types est fixé à `openapi-typescript@7.10.1` dans `scripts/contracts.mjs` et s’exécute via npm. Pour une modification uniquement documentaire, vérifier les liens, l’exactitude des deux langues et `git diff --check`; ne pas régénérer les contrats sans modification de leur source.

## CI/CD et exécution Docker

Le job `contracts.yml` utilise Node.js 22, `actions/checkout@v7` et `actions/setup-node@v7`. Il s’exécute sur push, pull request et lancement manuel; il installe avec `npm ci`, contrôle les contrats et lance les tests dédiés.

`cicd.yml` appelle `mairie360/CICD/.github/workflows/BFFs-cicd.yml@v1.13.2`, avec `cicd_version: v1.13.2` et `node_version: "22"`. Les étapes réutilisables et les environnements GitHub déterminent les contrôles, publications et déploiements effectifs.

Le Dockerfile utilise encore `node:20-alpine` pour la construction et l’exécution; la commande de l’image est `["npx", "tsx", "dist/index.js"]`. Cette version est distincte du job de contrats Node.js 22.

`security_test.sh` et `performance_test.sh` testent l’image désignée par `IMAGE_REF`: en CI, l’image que `release-dev` vient de publier, soit l’artefact ensuite promu en staging puis en prod. Quand `IMAGE_REF` est vide (usage local), ils construisent d’abord `bff-calendar:local` depuis `development.Dockerfile`, ce qui demande `NODE_AUTH_TOKEN` et `./.npmrc`.

`security_test.sh` lance la stack OWASP ZAP de `docker-compose-security.yml`: ZAP rejoue chaque opération de `/openapi.json` avec un JWT admin statique (`sub=1`, HS256, `JWT_SECRET=b"secret"` dans tous les services) et remplit corps, requêtes et paramètres de chemin avec les exemples du contrat. `init-test.sql` crée les ressources que ces exemples désignent (utilisateurs 1 et 2, événement 101, et événement 102 pour la route DELETE, en juin 2030); garder exemples et seed alignés en ajoutant une route. Les corps d’événement refusent `<` et `>` dans `title`, `description`, `location` et `service`.

Avant un lancement Docker, vérifier les variables de service, les secrets de build et les réseaux dans les fichiers du dépôt. Une CI verte valide ses jobs; elle ne prouve pas la disponibilité des services métier dans un environnement distant.

## Diagnostic

En cas d’événements absents ou d’affectations refusées, contrôler l’utilisateur, ses groupes et la base partagée. Une erreur sur `calendar_event_metadata` impose de vérifier le schéma et les droits du compte SQL. `/check_apis` et le client métier utilisent des variables différentes.

## Repères dans le dépôt

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

Compléments historiques: [CONTRACT.md](../../CONTRACT.md). Les besoins proposés doivent rester distincts du comportement effectivement implémenté.
