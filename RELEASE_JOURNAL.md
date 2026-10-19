# Journal des releases — BFF_Calendar

<!-- release-journal-state {"dev": "31fb93c61bc5d3e748cf184301f9d660c3a93785", "prod": "e07dbe025e811b4bd93c394af8c1b6987e9c8a2c", "prod_tag": "v1.0.0", "staging": "e07dbe025e811b4bd93c394af8c1b6987e9c8a2c", "updated": {"dev": "2026-10-19 20:11 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.0.0 | `e07dbe0` | — |
| staging | — | `e07dbe0` | — |
| dev | — | `31fb93c` | 2026-10-19 20:11 UTC |

## Ajouté sur main depuis la dernière release prod (v1.0.0)

#### Nouveautés
- Le BFF exporte désormais ses traces (span serveur nommé d'après la route, appels vers les APIs amont portant `traceparent`) et ses métriques HTTP en OTLP vers `OTEL_EXPORTER_OTLP_ENDPOINT`, sous le nom de service `bff-calendar`. Sans cette variable, ou avec `OTEL_SDK_DISABLED=true`, rien n'est exporté. Seuls la méthode, le statut, la route paramétrée et l'hôte appelé sortent du BFF, jamais une URL, une query string, un en-tête, un identifiant ou une IP. `OTEL_SERVICE_NAME` et `OTEL_RESOURCE_ATTRIBUTES` permettent de remplacer le nom du service et d'ajouter `service.version` et `deployment.environment.name`. (MAIR-504, [#185](https://github.com/mairie360/BFF_Calendar/pull/185))

#### Technique
- Les dépendances de contrat passent sur leurs versions prod : `@mairie360/calendar-api-openapi` 1.1.0, `@mairie360/core-api-openapi` 2.1.0 et `@mairie360/bffs-lib` 2.5.0. Les images Docker Compose de test sont mises à jour et les fixtures adaptées (`role` sur `DirectoryUser`). Le code du BFF ne change pas. (MAIR-568, [#211](https://github.com/mairie360/BFF_Calendar/pull/211))
- CI : le workflow réutilisable `mairie360/CICD` passe de v4.2.1 à v4.3.1, et les secrets du journal des releases (`ANTHROPIC_API_KEY`, `RELEASE_APP_ID`, `RELEASE_APP_PK`) lui sont transmis. (MAIR-571, [#212](https://github.com/mairie360/BFF_Calendar/pull/212), [#215](https://github.com/mairie360/BFF_Calendar/pull/215), [#214](https://github.com/mairie360/BFF_Calendar/pull/214))

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- Le BFF exporte désormais ses traces (span serveur nommé d'après la route, appels vers les APIs amont portant `traceparent`) et ses métriques HTTP en OTLP vers `OTEL_EXPORTER_OTLP_ENDPOINT`, sous le nom de service `bff-calendar`. Sans cette variable, ou avec `OTEL_SDK_DISABLED=true`, rien n'est exporté. Seuls la méthode, le statut, la route paramétrée et l'hôte appelé sortent du BFF, jamais une URL, une query string, un en-tête, un identifiant ou une IP. `OTEL_SERVICE_NAME` et `OTEL_RESOURCE_ATTRIBUTES` permettent de remplacer le nom du service et d'ajouter `service.version` et `deployment.environment.name`. (MAIR-504, [#185](https://github.com/mairie360/BFF_Calendar/pull/185))

#### Technique
- Les dépendances de contrat passent sur leurs versions prod : `@mairie360/calendar-api-openapi` 1.1.0, `@mairie360/core-api-openapi` 2.1.0 et `@mairie360/bffs-lib` 2.5.0. Les images Docker Compose de test sont mises à jour et les fixtures adaptées (`role` sur `DirectoryUser`). Le code du BFF ne change pas. (MAIR-568, [#211](https://github.com/mairie360/BFF_Calendar/pull/211))
- CI : le workflow réutilisable `mairie360/CICD` passe de v4.2.1 à v4.3.1, et les secrets du journal des releases (`ANTHROPIC_API_KEY`, `RELEASE_APP_ID`, `RELEASE_APP_PK`) lui sont transmis. (MAIR-571, [#212](https://github.com/mairie360/BFF_Calendar/pull/212), [#215](https://github.com/mairie360/BFF_Calendar/pull/215), [#214](https://github.com/mairie360/BFF_Calendar/pull/214))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-19 20:11 UTC | dev | — | `31fb93c` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39316569192) |
<!-- release-journal-history:end -->
