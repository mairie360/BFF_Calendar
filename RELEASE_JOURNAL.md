# Journal des releases — BFF_Calendar

<!-- release-journal-state {"dev": "f6bf247392ba486f87c4d2d800c861953a0a8249", "prod": "e07dbe025e811b4bd93c394af8c1b6987e9c8a2c", "prod_tag": "v1.0.0", "staging": "f6bf247392ba486f87c4d2d800c861953a0a8249", "updated": {"dev": "2026-10-20 17:57 UTC", "staging": "2026-10-20 18:12 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.0.0 | `e07dbe0` | — |
| staging | — | `f6bf247` | 2026-10-20 18:12 UTC |
| dev | — | `f6bf247` | 2026-10-20 17:57 UTC |

## Ajouté sur main depuis la dernière release prod (v1.0.0)

#### Nouveautés
- Le BFF exporte des traces et des métriques HTTP OpenTelemetry (span serveur nommé d'après la route, spans des handlers, appels amont avec `traceparent`) en OTLP vers `OTEL_EXPORTER_OTLP_ENDPOINT`. La télémétrie reste désactivée si cette variable n'est pas définie, ou si `OTEL_SDK_DISABLED=true`. Le nom du service vaut `bff-calendar` par défaut et se surcharge avec `OTEL_SERVICE_NAME`. `OTEL_RESOURCE_ATTRIBUTES` ajoute des attributs de ressource (par ex. `service.version`, `deployment.environment.name`). Seuls la méthode, le statut, la route paramétrée et l'hôte amont sortent du BFF : jamais d'URL, de query string, d'en-tête, d'identifiant ni d'IP. (MAIR-504, [#185](https://github.com/mairie360/BFF_Calendar/pull/185))

#### Technique
- 3 alignements des dépendances internes, sans changement de code applicatif :
  - `@mairie360/bffs-lib` passe de 2.4.0 à 2.5.0.
  - `@mairie360/calendar-api-openapi` passe à `0.0.0-dev-3b4668b`.
  - `@mairie360/core-api-openapi` passe à `0.0.0-staging.b900797`.
  - Les images des stacks de test (dev, sécurité, performance) sont mises à jour en conséquence, avec les fixtures adaptées au champ `role` de `DirectoryUser`.
  - (MAIR-568, MAIR-575, MAIR-600, [#211](https://github.com/mairie360/BFF_Calendar/pull/211), [#217](https://github.com/mairie360/BFF_Calendar/pull/217), [#220](https://github.com/mairie360/BFF_Calendar/pull/220))
- 4 changements de CI :
  - Le workflow `mairie360/CICD` passe de v4.2.1 à v4.3.2.
  - Les secrets `ANTHROPIC_API_KEY`, `RELEASE_APP_ID` et `RELEASE_APP_PK` sont transmis pour le journal des releases.
  - (MAIR-571, [#212](https://github.com/mairie360/BFF_Calendar/pull/212), [#214](https://github.com/mairie360/BFF_Calendar/pull/214), [#215](https://github.com/mairie360/BFF_Calendar/pull/215), [#218](https://github.com/mairie360/BFF_Calendar/pull/218))

## Différence dev → staging (en dev, pas encore en staging)

_Rien._

## Différence staging → prod (en staging, pas encore en prod)

#### Nouveautés
- Le BFF exporte des traces et des métriques HTTP OpenTelemetry (span serveur nommé d'après la route, spans des handlers, appels amont avec `traceparent`) en OTLP vers `OTEL_EXPORTER_OTLP_ENDPOINT`. La télémétrie reste désactivée si cette variable n'est pas définie, ou si `OTEL_SDK_DISABLED=true`. Le nom du service vaut `bff-calendar` par défaut et se surcharge avec `OTEL_SERVICE_NAME`. `OTEL_RESOURCE_ATTRIBUTES` ajoute des attributs de ressource (par ex. `service.version`, `deployment.environment.name`). Seuls la méthode, le statut, la route paramétrée et l'hôte amont sortent du BFF : jamais d'URL, de query string, d'en-tête, d'identifiant ni d'IP. (MAIR-504, [#185](https://github.com/mairie360/BFF_Calendar/pull/185))

#### Technique
- 3 alignements des dépendances internes, sans changement de code applicatif :
  - `@mairie360/bffs-lib` passe de 2.4.0 à 2.5.0.
  - `@mairie360/calendar-api-openapi` passe à `0.0.0-dev-3b4668b`.
  - `@mairie360/core-api-openapi` passe à `0.0.0-staging.b900797`.
  - Les images des stacks de test (dev, sécurité, performance) sont mises à jour en conséquence, avec les fixtures adaptées au champ `role` de `DirectoryUser`.
  - (MAIR-568, MAIR-575, MAIR-600, [#211](https://github.com/mairie360/BFF_Calendar/pull/211), [#217](https://github.com/mairie360/BFF_Calendar/pull/217), [#220](https://github.com/mairie360/BFF_Calendar/pull/220))
- 4 changements de CI :
  - Le workflow `mairie360/CICD` passe de v4.2.1 à v4.3.2.
  - Les secrets `ANTHROPIC_API_KEY`, `RELEASE_APP_ID` et `RELEASE_APP_PK` sont transmis pour le journal des releases.
  - (MAIR-571, [#212](https://github.com/mairie360/BFF_Calendar/pull/212), [#214](https://github.com/mairie360/BFF_Calendar/pull/214), [#215](https://github.com/mairie360/BFF_Calendar/pull/215), [#218](https://github.com/mairie360/BFF_Calendar/pull/218))

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-20 18:12 UTC | staging | — | `f6bf247` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39470053159) |
| 2026-10-20 17:57 UTC | dev | — | `f6bf247` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39470053159) |
| 2026-10-20 13:06 UTC | dev | — | `45c8598` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39427195215) |
| 2026-10-20 13:01 UTC | dev | — | `d1521e6` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39426441180) |
| 2026-10-19 20:11 UTC | dev | — | `31fb93c` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39316569192) |
<!-- release-journal-history:end -->
