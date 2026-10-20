# Journal des releases — BFF_Calendar

<!-- release-journal-state {"dev": "f6bf247392ba486f87c4d2d800c861953a0a8249", "prod": "e07dbe025e811b4bd93c394af8c1b6987e9c8a2c", "prod_tag": "v1.0.0", "staging": "e07dbe025e811b4bd93c394af8c1b6987e9c8a2c", "updated": {"dev": "2026-10-20 17:57 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.0.0 | `e07dbe0` | — |
| staging | — | `e07dbe0` | — |
| dev | — | `f6bf247` | 2026-10-20 17:57 UTC |

## Ajouté sur main depuis la dernière release prod (v1.0.0)

#### Nouveautés
- Le BFF exporte désormais des traces (span serveur nommé d'après la route, appels amont portant `traceparent`) et des métriques HTTP en OTLP vers `OTEL_EXPORTER_OTLP_ENDPOINT`. Sans cette variable, la télémétrie reste désactivée. Seuls la méthode, le statut, la route paramétrée et l'hôte amont sont exportés, jamais d'URL, de query string, d'en-tête, d'identifiant ou d'IP. Variables associées : `OTEL_SERVICE_NAME` (défaut `bff-calendar`), `OTEL_RESOURCE_ATTRIBUTES`, et `OTEL_SDK_DISABLED=true` pour couper la télémétrie. (MAIR-504, [#185](https://github.com/mairie360/BFF_Calendar/pull/185))

#### Technique
- Trois alignements de dépendances internes, sans changement de code :
  - `@mairie360/bffs-lib` passe de 2.4.0 à 2.5.0.
  - `@mairie360/core-api-openapi` passe à `0.0.0-staging.b900797`.
  - `@mairie360/calendar-api-openapi` passe à `0.0.0-dev-3b4668b`.
  - Les images des stacks docker-compose de test sont mises à jour, et les fixtures de tests remplissent `role` sur `DirectoryUser`.
  (MAIR-568, MAIR-575, MAIR-600, [#211](https://github.com/mairie360/BFF_Calendar/pull/211), [#217](https://github.com/mairie360/BFF_Calendar/pull/217), [#220](https://github.com/mairie360/BFF_Calendar/pull/220))
- CI : le workflow `mairie360/CICD` passe de v4.2.1 à v4.3.2 (trois mises à jour Renovate). Les secrets `ANTHROPIC_API_KEY`, `RELEASE_APP_ID` et `RELEASE_APP_PK` sont désormais transmis pour l'étape de journal des releases. (MAIR-571, [#212](https://github.com/mairie360/BFF_Calendar/pull/212), [#215](https://github.com/mairie360/BFF_Calendar/pull/215), [#214](https://github.com/mairie360/BFF_Calendar/pull/214), [#218](https://github.com/mairie360/BFF_Calendar/pull/218))

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- Le BFF exporte désormais des traces (span serveur nommé d'après la route, appels amont portant `traceparent`) et des métriques HTTP en OTLP vers `OTEL_EXPORTER_OTLP_ENDPOINT`. Sans cette variable, la télémétrie reste désactivée. Seuls la méthode, le statut, la route paramétrée et l'hôte amont sont exportés, jamais d'URL, de query string, d'en-tête, d'identifiant ou d'IP. Variables associées : `OTEL_SERVICE_NAME` (défaut `bff-calendar`), `OTEL_RESOURCE_ATTRIBUTES`, et `OTEL_SDK_DISABLED=true` pour couper la télémétrie. (MAIR-504, [#185](https://github.com/mairie360/BFF_Calendar/pull/185))

#### Technique
- Trois alignements de dépendances internes, sans changement de code :
  - `@mairie360/bffs-lib` passe de 2.4.0 à 2.5.0.
  - `@mairie360/core-api-openapi` passe à `0.0.0-staging.b900797`.
  - `@mairie360/calendar-api-openapi` passe à `0.0.0-dev-3b4668b`.
  - Les images des stacks docker-compose de test sont mises à jour, et les fixtures de tests remplissent `role` sur `DirectoryUser`.
  (MAIR-568, MAIR-575, MAIR-600, [#211](https://github.com/mairie360/BFF_Calendar/pull/211), [#217](https://github.com/mairie360/BFF_Calendar/pull/217), [#220](https://github.com/mairie360/BFF_Calendar/pull/220))
- CI : le workflow `mairie360/CICD` passe de v4.2.1 à v4.3.2 (trois mises à jour Renovate). Les secrets `ANTHROPIC_API_KEY`, `RELEASE_APP_ID` et `RELEASE_APP_PK` sont désormais transmis pour l'étape de journal des releases. (MAIR-571, [#212](https://github.com/mairie360/BFF_Calendar/pull/212), [#215](https://github.com/mairie360/BFF_Calendar/pull/215), [#214](https://github.com/mairie360/BFF_Calendar/pull/214), [#218](https://github.com/mairie360/BFF_Calendar/pull/218))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-20 17:57 UTC | dev | — | `f6bf247` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39470053159) |
| 2026-10-20 13:06 UTC | dev | — | `45c8598` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39427195215) |
| 2026-10-20 13:01 UTC | dev | — | `d1521e6` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39426441180) |
| 2026-10-19 20:11 UTC | dev | — | `31fb93c` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39316569192) |
<!-- release-journal-history:end -->
