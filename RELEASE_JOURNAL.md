# Journal des releases — BFF_Calendar

<!-- release-journal-state {"dev": "5933bd1390afa8e272610c8ab6a649b811d06fa4", "prod": "e07dbe025e811b4bd93c394af8c1b6987e9c8a2c", "prod_tag": "v1.0.0", "staging": "3012a41d23b1f2c2e52ac6a3e39ab97e9c346a00", "updated": {"dev": "2026-10-21 09:48 UTC", "staging": "2026-10-21 09:40 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.0.0 | `e07dbe0` | — |
| staging | — | `3012a41` | 2026-10-21 09:40 UTC |
| dev | — | `5933bd1` | 2026-10-21 09:48 UTC |

## Ajouté sur main depuis la dernière release prod (v1.0.0)

#### Nouveautés

- Télémétrie OpenTelemetry : le BFF exporte des traces et des métriques HTTP en OTLP vers `OTEL_EXPORTER_OTLP_ENDPOINT` quand cette variable est définie. Sans elle, rien n'est exporté. Seuls la méthode, le statut, la route paramétrée et l'hôte de l'upstream sortent du BFF (MAIR-504, [#185](https://github.com/mairie360/BFF_Calendar/pull/185)).

#### Technique

- Contrats et bibliothèque épinglés sur les versions prod : `@mairie360/calendar-api-openapi` 1.2.0, `@mairie360/core-api-openapi` 2.2.0, `@mairie360/bffs-lib` 2.5.0, et images de test `database` / `liquibase-migrations` 3.3.0, `calendar-api` 1.2.0, `core-api` 2.2.0 (MAIR-612, [#225](https://github.com/mairie360/BFF_Calendar/pull/225)). Les épinglages dev et staging intermédiaires (MAIR-575, [#217](https://github.com/mairie360/BFF_Calendar/pull/217) ; MAIR-600, [#220](https://github.com/mairie360/BFF_Calendar/pull/220)) sont remplacés.
- CI : `cicd.yml` ne se déclenche sur `push` que pour `main`. Un push sur `main` s'arrête après `release-dev`, et staging puis prod passent par les workflows manuels `promote-staging.yml` / `promote-prod.yml` (MAIR-494, [#222](https://github.com/mairie360/BFF_Calendar/pull/222) ; MAIR-612, [#225](https://github.com/mairie360/BFF_Calendar/pull/225)). Le `follow-redirects` du lockfile passe en 1.16.1 pour débloquer `npm audit` (#222).
- CI : les secrets `ANTHROPIC_API_KEY`, `RELEASE_APP_ID` et `RELEASE_APP_PK` sont transmis au workflow CICD pour l'étape de journal des releases (MAIR-571, [#214](https://github.com/mairie360/BFF_Calendar/pull/214)).
- Renovate a fait monter `cicd_version` de v4.2.1 à v4.4.3 (PRs [#212](https://github.com/mairie360/BFF_Calendar/pull/212), [#215](https://github.com/mairie360/BFF_Calendar/pull/215), [#218](https://github.com/mairie360/BFF_Calendar/pull/218)).
- Tests : les fixtures du contrat annuaire Core remplissent `role` (un seul rôle par utilisateur, MAIR-564) et les corps amont de project-api sont mis à jour (MAIR-568, [#211](https://github.com/mairie360/BFF_Calendar/pull/211)). Aucun changement de code source.
- Documentation : versions de CICD (v4.4.3) et de Node.js (24) corrigées dans `docs/en/technical.md` et `docs/fr/technical.md` (MAIR-612, [#227](https://github.com/mairie360/BFF_Calendar/pull/227)).

## Différence dev → staging (en dev, pas encore en staging)

#### Technique

- Documentation seule : `docs/en/technical.md` et `docs/fr/technical.md` citent désormais mairie360/CICD v4.4.3 au lieu de v4.4.0 (MAIR-612, [#227](https://github.com/mairie360/BFF_Calendar/pull/227)).

## Différence staging → prod (en staging, pas encore en prod)

#### Nouveautés

- Télémétrie OpenTelemetry : le BFF exporte des traces et des métriques HTTP en OTLP vers `OTEL_EXPORTER_OTLP_ENDPOINT` quand cette variable est définie. Sans elle, rien n'est exporté. Seuls la méthode, le statut, la route paramétrée et l'hôte de l'upstream sortent du BFF (MAIR-504, [#185](https://github.com/mairie360/BFF_Calendar/pull/185)).

#### Technique

- Contrats et bibliothèque épinglés sur les versions prod : `@mairie360/calendar-api-openapi` 1.2.0, `@mairie360/core-api-openapi` 2.2.0, `@mairie360/bffs-lib` 2.5.0, et images de test `database` / `liquibase-migrations` 3.3.0, `calendar-api` 1.2.0, `core-api` 2.2.0 (MAIR-612, [#225](https://github.com/mairie360/BFF_Calendar/pull/225)). Les épinglages dev et staging intermédiaires (MAIR-575, [#217](https://github.com/mairie360/BFF_Calendar/pull/217) ; MAIR-600, [#220](https://github.com/mairie360/BFF_Calendar/pull/220)) sont remplacés.
- CI : `cicd.yml` ne se déclenche sur `push` que pour `main`. Un push sur `main` s'arrête après `release-dev`, et staging puis prod passent par les workflows manuels `promote-staging.yml` / `promote-prod.yml` (MAIR-494, [#222](https://github.com/mairie360/BFF_Calendar/pull/222) ; MAIR-612, [#225](https://github.com/mairie360/BFF_Calendar/pull/225)). Le `follow-redirects` du lockfile passe en 1.16.1 pour débloquer `npm audit` (#222).
- CI : les secrets `ANTHROPIC_API_KEY`, `RELEASE_APP_ID` et `RELEASE_APP_PK` sont transmis au workflow CICD pour l'étape de journal des releases (MAIR-571, [#214](https://github.com/mairie360/BFF_Calendar/pull/214)).
- Renovate a fait monter `cicd_version` de v4.2.1 à v4.4.3 (PRs [#212](https://github.com/mairie360/BFF_Calendar/pull/212), [#215](https://github.com/mairie360/BFF_Calendar/pull/215), [#218](https://github.com/mairie360/BFF_Calendar/pull/218)).
- Tests : les fixtures du contrat annuaire Core remplissent `role` (un seul rôle par utilisateur, MAIR-564) et les corps amont de project-api sont mis à jour (MAIR-568, [#211](https://github.com/mairie360/BFF_Calendar/pull/211)). Aucun changement de code source.

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-21 09:48 UTC | dev | — | `5933bd1` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39579265417) |
| 2026-10-21 09:40 UTC | staging | — | `3012a41` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39577791944) |
| 2026-10-21 09:32 UTC | dev | — | `3012a41` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39577249901) |
| 2026-10-21 03:24 UTC | dev | — | `fc638de` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39538100950) |
| 2026-10-20 18:12 UTC | staging | — | `f6bf247` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39470053159) |
| 2026-10-20 17:57 UTC | dev | — | `f6bf247` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39470053159) |
| 2026-10-20 13:06 UTC | dev | — | `45c8598` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39427195215) |
| 2026-10-20 13:01 UTC | dev | — | `d1521e6` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39426441180) |
| 2026-10-19 20:11 UTC | dev | — | `31fb93c` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39316569192) |
<!-- release-journal-history:end -->
