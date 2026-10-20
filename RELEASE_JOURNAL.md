# Journal des releases — BFF_Calendar

<!-- release-journal-state {"dev": "d1521e638b73a7c7a3c7df501ea17fa533dc49a3", "prod": "e07dbe025e811b4bd93c394af8c1b6987e9c8a2c", "prod_tag": "v1.0.0", "staging": "e07dbe025e811b4bd93c394af8c1b6987e9c8a2c", "updated": {"dev": "2026-10-20 13:01 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.0.0 | `e07dbe0` | — |
| staging | — | `e07dbe0` | — |
| dev | — | `d1521e6` | 2026-10-20 13:01 UTC |

## Ajouté sur main depuis la dernière release prod (v1.0.0)

#### Nouveautés
- Le BFF exporte en OTLP ses traces (span serveur nommé d'après la route, spans des handlers, appels à l'API amont avec `traceparent`) et ses métriques HTTP vers `OTEL_EXPORTER_OTLP_ENDPOINT`, sous le nom de service `bff-calendar`. Seuls la méthode, le statut, la route paramétrée et l'hôte appelé sont exportés. Aucune URL, query string, en-tête, identifiant ou IP ne sort du BFF. La télémétrie reste désactivée tant que `OTEL_EXPORTER_OTLP_ENDPOINT` n'est pas défini ou si `OTEL_SDK_DISABLED=true`. `OTEL_SERVICE_NAME` et `OTEL_RESOURCE_ATTRIBUTES` (par ex. `service.version`, `deployment.environment.name`) sont documentés. (MAIR-504, [#185](https://github.com/mairie360/BFF_Calendar/pull/185))

#### Technique
- Les contrats OpenAPI passent à leurs versions prod : `@mairie360/calendar-api-openapi` 1.1.0 et `@mairie360/core-api-openapi` 2.1.0. `@mairie360/bffs-lib` passe à 2.5.0. Les images de test (database, liquibase, calendar-api, core-api) sont mises à jour et les fixtures adaptées. Le code du BFF ne change pas. (MAIR-568, [#211](https://github.com/mairie360/BFF_Calendar/pull/211))
- CI : le workflow `mairie360/CICD` est mis à jour en trois étapes, de v4.2.1 à v4.3.2. Les secrets `ANTHROPIC_API_KEY`, `RELEASE_APP_ID` et `RELEASE_APP_PK` sont transmis pour l'étape du journal des releases. (MAIR-571, [#212](https://github.com/mairie360/BFF_Calendar/pull/212), [#215](https://github.com/mairie360/BFF_Calendar/pull/215), [#214](https://github.com/mairie360/BFF_Calendar/pull/214), [#218](https://github.com/mairie360/BFF_Calendar/pull/218))

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- Le BFF exporte en OTLP ses traces (span serveur nommé d'après la route, spans des handlers, appels à l'API amont avec `traceparent`) et ses métriques HTTP vers `OTEL_EXPORTER_OTLP_ENDPOINT`, sous le nom de service `bff-calendar`. Seuls la méthode, le statut, la route paramétrée et l'hôte appelé sont exportés. Aucune URL, query string, en-tête, identifiant ou IP ne sort du BFF. La télémétrie reste désactivée tant que `OTEL_EXPORTER_OTLP_ENDPOINT` n'est pas défini ou si `OTEL_SDK_DISABLED=true`. `OTEL_SERVICE_NAME` et `OTEL_RESOURCE_ATTRIBUTES` (par ex. `service.version`, `deployment.environment.name`) sont documentés. (MAIR-504, [#185](https://github.com/mairie360/BFF_Calendar/pull/185))

#### Technique
- Les contrats OpenAPI passent à leurs versions prod : `@mairie360/calendar-api-openapi` 1.1.0 et `@mairie360/core-api-openapi` 2.1.0. `@mairie360/bffs-lib` passe à 2.5.0. Les images de test (database, liquibase, calendar-api, core-api) sont mises à jour et les fixtures adaptées. Le code du BFF ne change pas. (MAIR-568, [#211](https://github.com/mairie360/BFF_Calendar/pull/211))
- CI : le workflow `mairie360/CICD` est mis à jour en trois étapes, de v4.2.1 à v4.3.2. Les secrets `ANTHROPIC_API_KEY`, `RELEASE_APP_ID` et `RELEASE_APP_PK` sont transmis pour l'étape du journal des releases. (MAIR-571, [#212](https://github.com/mairie360/BFF_Calendar/pull/212), [#215](https://github.com/mairie360/BFF_Calendar/pull/215), [#214](https://github.com/mairie360/BFF_Calendar/pull/214), [#218](https://github.com/mairie360/BFF_Calendar/pull/218))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-20 13:01 UTC | dev | — | `d1521e6` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39426441180) |
| 2026-10-19 20:11 UTC | dev | — | `31fb93c` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39316569192) |
<!-- release-journal-history:end -->
