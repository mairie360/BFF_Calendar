# Journal des releases — BFF_Calendar

<!-- release-journal-state {"dev": "3012a41d23b1f2c2e52ac6a3e39ab97e9c346a00", "prod": "e07dbe025e811b4bd93c394af8c1b6987e9c8a2c", "prod_tag": "v1.0.0", "staging": "3012a41d23b1f2c2e52ac6a3e39ab97e9c346a00", "updated": {"dev": "2026-10-21 09:32 UTC", "staging": "2026-10-21 09:40 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.0.0 | `e07dbe0` | — |
| staging | — | `3012a41` | 2026-10-21 09:40 UTC |
| dev | — | `3012a41` | 2026-10-21 09:32 UTC |

## Ajouté sur main depuis la dernière release prod (v1.0.0)

#### Nouveautés
- Télémétrie OpenTelemetry : traces (span serveur nommé par route, spans des handlers, `traceparent` sur les appels amont) et métriques HTTP exportées en OTLP vers `OTEL_EXPORTER_OTLP_ENDPOINT`. Sans cette variable, rien n'est exporté. Seuls la méthode, le statut, la route paramétrée et l'hôte amont sortent du BFF : ni URL, query string, en-tête, identifiant ni IP. Variables associées : `OTEL_SERVICE_NAME`, `OTEL_RESOURCE_ATTRIBUTES`, `OTEL_SDK_DISABLED`. (MAIR-504, [#185](https://github.com/mairie360/BFF_Calendar/pull/185))

#### Technique
- Contrats OpenAPI alignés d'abord sur les builds dev, puis staging, puis prod : `@mairie360/calendar-api-openapi` 1.2.0 et `@mairie360/core-api-openapi` 2.2.0 en prod (MAIR-612, [#225](https://github.com/mairie360/BFF_Calendar/pull/225)) ; `@mairie360/bffs-lib` 2.4.0 → 2.5.0 et fixtures de test adaptées à core-api 2.1.0, où `role` devient requis sur `DirectoryUser`, sans changement du code BFF (MAIR-568, [#211](https://github.com/mairie360/BFF_Calendar/pull/211)). Les stacks de test (dev, sécurité, performance) suivent les mêmes versions, avec `database` et `liquibase-migrations` en 3.3.0 (MAIR-575, [#217](https://github.com/mairie360/BFF_Calendar/pull/217), MAIR-600, [#220](https://github.com/mairie360/BFF_Calendar/pull/220), MAIR-612, [#225](https://github.com/mairie360/BFF_Calendar/pull/225)).
- Pipeline : `cicd.yml` ne se déclenche plus que sur `push` vers `main` et s'arrête à `release-dev`. Staging et prod passent par les workflows manuels `promote-staging.yml` et `promote-prod.yml` (MAIR-494, [#222](https://github.com/mairie360/BFF_Calendar/pull/222)). Le workflow CICD passe en v4.4.3 (MAIR-612, [#225](https://github.com/mairie360/BFF_Calendar/pull/225)).
- Secrets `ANTHROPIC_API_KEY`, `RELEASE_APP_ID` et `RELEASE_APP_PK` transmis au workflow CICD pour le journal des releases (MAIR-571, [#214](https://github.com/mairie360/BFF_Calendar/pull/214)).
- Mises à jour Renovate de `mairie360/CICD` en v4.2.2, v4.3.1 puis v4.3.2 ([#212](https://github.com/mairie360/BFF_Calendar/pull/212), [#215](https://github.com/mairie360/BFF_Calendar/pull/215), [#218](https://github.com/mairie360/BFF_Calendar/pull/218)). `follow-redirects` passe en 1.16.1 dans le lockfile pour corriger les alertes `npm audit` (MAIR-494, [#222](https://github.com/mairie360/BFF_Calendar/pull/222)).
- Documentation : Node.js 24 pour le job de contrats, procédure de promotion dans `CLAUDE.md` et les docs FR/EN, et tests de la télémétrie dans `tests/telemetry.test.ts` (MAIR-504, [#185](https://github.com/mairie360/BFF_Calendar/pull/185)).

## Différence dev → staging (en dev, pas encore en staging)

_Rien._

## Différence staging → prod (en staging, pas encore en prod)

#### Nouveautés
- Télémétrie OpenTelemetry : traces (span serveur nommé par route, spans des handlers, `traceparent` sur les appels amont) et métriques HTTP exportées en OTLP vers `OTEL_EXPORTER_OTLP_ENDPOINT`. Sans cette variable, rien n'est exporté. Seuls la méthode, le statut, la route paramétrée et l'hôte amont sortent du BFF : ni URL, query string, en-tête, identifiant ni IP. Variables associées : `OTEL_SERVICE_NAME`, `OTEL_RESOURCE_ATTRIBUTES`, `OTEL_SDK_DISABLED`. (MAIR-504, [#185](https://github.com/mairie360/BFF_Calendar/pull/185))

#### Technique
- Contrats OpenAPI alignés d'abord sur les builds dev, puis staging, puis prod : `@mairie360/calendar-api-openapi` 1.2.0 et `@mairie360/core-api-openapi` 2.2.0 en prod (MAIR-612, [#225](https://github.com/mairie360/BFF_Calendar/pull/225)) ; `@mairie360/bffs-lib` 2.4.0 → 2.5.0 et fixtures de test adaptées à core-api 2.1.0, où `role` devient requis sur `DirectoryUser`, sans changement du code BFF (MAIR-568, [#211](https://github.com/mairie360/BFF_Calendar/pull/211)). Les stacks de test (dev, sécurité, performance) suivent les mêmes versions, avec `database` et `liquibase-migrations` en 3.3.0 (MAIR-575, [#217](https://github.com/mairie360/BFF_Calendar/pull/217), MAIR-600, [#220](https://github.com/mairie360/BFF_Calendar/pull/220), MAIR-612, [#225](https://github.com/mairie360/BFF_Calendar/pull/225)).
- Pipeline : `cicd.yml` ne se déclenche plus que sur `push` vers `main` et s'arrête à `release-dev`. Staging et prod passent par les workflows manuels `promote-staging.yml` et `promote-prod.yml` (MAIR-494, [#222](https://github.com/mairie360/BFF_Calendar/pull/222)). Le workflow CICD passe en v4.4.3 (MAIR-612, [#225](https://github.com/mairie360/BFF_Calendar/pull/225)).
- Secrets `ANTHROPIC_API_KEY`, `RELEASE_APP_ID` et `RELEASE_APP_PK` transmis au workflow CICD pour le journal des releases (MAIR-571, [#214](https://github.com/mairie360/BFF_Calendar/pull/214)).
- Mises à jour Renovate de `mairie360/CICD` en v4.2.2, v4.3.1 puis v4.3.2 ([#212](https://github.com/mairie360/BFF_Calendar/pull/212), [#215](https://github.com/mairie360/BFF_Calendar/pull/215), [#218](https://github.com/mairie360/BFF_Calendar/pull/218)). `follow-redirects` passe en 1.16.1 dans le lockfile pour corriger les alertes `npm audit` (MAIR-494, [#222](https://github.com/mairie360/BFF_Calendar/pull/222)).
- Documentation : Node.js 24 pour le job de contrats, procédure de promotion dans `CLAUDE.md` et les docs FR/EN, et tests de la télémétrie dans `tests/telemetry.test.ts` (MAIR-504, [#185](https://github.com/mairie360/BFF_Calendar/pull/185)).

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-21 09:40 UTC | staging | — | `3012a41` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39577791944) |
| 2026-10-21 09:32 UTC | dev | — | `3012a41` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39577249901) |
| 2026-10-21 03:24 UTC | dev | — | `fc638de` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39538100950) |
| 2026-10-20 18:12 UTC | staging | — | `f6bf247` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39470053159) |
| 2026-10-20 17:57 UTC | dev | — | `f6bf247` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39470053159) |
| 2026-10-20 13:06 UTC | dev | — | `45c8598` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39427195215) |
| 2026-10-20 13:01 UTC | dev | — | `d1521e6` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39426441180) |
| 2026-10-19 20:11 UTC | dev | — | `31fb93c` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39316569192) |
<!-- release-journal-history:end -->
