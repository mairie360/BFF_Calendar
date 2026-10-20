# Journal des releases — BFF_Calendar

<!-- release-journal-state {"dev": "45c8598d996d583f817170b206cb3648cb23ac40", "prod": "e07dbe025e811b4bd93c394af8c1b6987e9c8a2c", "prod_tag": "v1.0.0", "staging": "e07dbe025e811b4bd93c394af8c1b6987e9c8a2c", "updated": {"dev": "2026-10-20 13:06 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.0.0 | `e07dbe0` | — |
| staging | — | `e07dbe0` | — |
| dev | — | `45c8598` | 2026-10-20 13:06 UTC |

## Ajouté sur main depuis la dernière release prod (v1.0.0)

#### Nouveautés
- Le BFF émet maintenant des traces (span serveur nommé d'après la route, spans des handlers, appels amont portant `traceparent`) et des métriques HTTP en OTLP vers `OTEL_EXPORTER_OTLP_ENDPOINT`. Sans cette variable, la télémétrie reste désactivée. Seuls la méthode, le statut, la route paramétrée et l'hôte amont sortent du BFF, jamais une URL, une query string, un en-tête, un identifiant ou une IP. Le nom du service est `bff-calendar` par défaut. Il se surcharge par `OTEL_SERVICE_NAME`, avec des attributs supplémentaires via `OTEL_RESOURCE_ATTRIBUTES`. `OTEL_SDK_DISABLED=true` coupe la télémétrie. (MAIR-504, [#185](https://github.com/mairie360/BFF_Calendar/pull/185))

#### Technique
- Contrats OpenAPI des APIs alignés, sans changement du code source (seules les fixtures de test suivent le champ `role` désormais requis sur `DirectoryUser`) :
  - `@mairie360/calendar-api-openapi` passe de `0.0.0-dev-b14b0fb` à `0.0.0-dev-3b4668b`, en passant par `1.1.0`.
  - `@mairie360/core-api-openapi` passe de `0.0.0-dev-95531e2` à `0.0.0-dev-30d9bb5`, en passant par `2.1.0`.
  - `@mairie360/bffs-lib` passe de 2.4.0 à 2.5.0.
  - Les images des stacks de test (`calendar-api`, `core-api`, `database`, `liquibase-migrations`) sont mises à jour.
  (MAIR-568, [#211](https://github.com/mairie360/BFF_Calendar/pull/211) ; MAIR-575, [#217](https://github.com/mairie360/BFF_Calendar/pull/217))
- CI : workflow `mairie360/CICD` mis à jour de v4.2.1 à v4.3.2 en trois montées de version. Les secrets `ANTHROPIC_API_KEY`, `RELEASE_APP_ID` et `RELEASE_APP_PK` sont transmis pour l'étape de journal des releases. ([#212](https://github.com/mairie360/BFF_Calendar/pull/212), [#215](https://github.com/mairie360/BFF_Calendar/pull/215), MAIR-571 [#214](https://github.com/mairie360/BFF_Calendar/pull/214), [#218](https://github.com/mairie360/BFF_Calendar/pull/218))

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- Le BFF émet maintenant des traces (span serveur nommé d'après la route, spans des handlers, appels amont portant `traceparent`) et des métriques HTTP en OTLP vers `OTEL_EXPORTER_OTLP_ENDPOINT`. Sans cette variable, la télémétrie reste désactivée. Seuls la méthode, le statut, la route paramétrée et l'hôte amont sortent du BFF, jamais une URL, une query string, un en-tête, un identifiant ou une IP. Le nom du service est `bff-calendar` par défaut. Il se surcharge par `OTEL_SERVICE_NAME`, avec des attributs supplémentaires via `OTEL_RESOURCE_ATTRIBUTES`. `OTEL_SDK_DISABLED=true` coupe la télémétrie. (MAIR-504, [#185](https://github.com/mairie360/BFF_Calendar/pull/185))

#### Technique
- Contrats OpenAPI des APIs alignés, sans changement du code source (seules les fixtures de test suivent le champ `role` désormais requis sur `DirectoryUser`) :
  - `@mairie360/calendar-api-openapi` passe de `0.0.0-dev-b14b0fb` à `0.0.0-dev-3b4668b`, en passant par `1.1.0`.
  - `@mairie360/core-api-openapi` passe de `0.0.0-dev-95531e2` à `0.0.0-dev-30d9bb5`, en passant par `2.1.0`.
  - `@mairie360/bffs-lib` passe de 2.4.0 à 2.5.0.
  - Les images des stacks de test (`calendar-api`, `core-api`, `database`, `liquibase-migrations`) sont mises à jour.
  (MAIR-568, [#211](https://github.com/mairie360/BFF_Calendar/pull/211) ; MAIR-575, [#217](https://github.com/mairie360/BFF_Calendar/pull/217))
- CI : workflow `mairie360/CICD` mis à jour de v4.2.1 à v4.3.2 en trois montées de version. Les secrets `ANTHROPIC_API_KEY`, `RELEASE_APP_ID` et `RELEASE_APP_PK` sont transmis pour l'étape de journal des releases. ([#212](https://github.com/mairie360/BFF_Calendar/pull/212), [#215](https://github.com/mairie360/BFF_Calendar/pull/215), MAIR-571 [#214](https://github.com/mairie360/BFF_Calendar/pull/214), [#218](https://github.com/mairie360/BFF_Calendar/pull/218))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-20 13:06 UTC | dev | — | `45c8598` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39427195215) |
| 2026-10-20 13:01 UTC | dev | — | `d1521e6` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39426441180) |
| 2026-10-19 20:11 UTC | dev | — | `31fb93c` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39316569192) |
<!-- release-journal-history:end -->
