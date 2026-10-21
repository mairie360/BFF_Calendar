# Journal des releases — BFF_Calendar

<!-- release-journal-state {"dev": "3012a41d23b1f2c2e52ac6a3e39ab97e9c346a00", "prod": "e07dbe025e811b4bd93c394af8c1b6987e9c8a2c", "prod_tag": "v1.0.0", "staging": "f6bf247392ba486f87c4d2d800c861953a0a8249", "updated": {"dev": "2026-10-21 09:32 UTC", "staging": "2026-10-20 18:12 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.0.0 | `e07dbe0` | — |
| staging | — | `f6bf247` | 2026-10-20 18:12 UTC |
| dev | — | `3012a41` | 2026-10-21 09:32 UTC |

## Ajouté sur main depuis la dernière release prod (v1.0.0)

#### Nouveautés

- Le BFF exporte désormais des traces et des métriques HTTP en OTLP vers le collecteur défini par `OTEL_EXPORTER_OTLP_ENDPOINT`. Sans cette variable, la télémétrie reste désactivée. Seuls la méthode, le statut, la route paramétrée et l'hôte amont sortent du BFF, jamais une URL, une query string, un en-tête, un identifiant ou une IP. (MAIR-504, [#185](https://github.com/mairie360/BFF_Calendar/pull/185))

#### Technique

- Contrats `@mairie360/calendar-api-openapi` et `@mairie360/core-api-openapi` passés de builds `0.0.0-dev` / `staging` aux releases prod (1.2.0 et 2.2.0), `@mairie360/bffs-lib` en 2.5.0, `follow-redirects` 1.16.1 dans le lockfile pour débloquer `npm audit`, et images des stacks de test alignées (MAIR-568, MAIR-575, MAIR-600, MAIR-612, [#211](https://github.com/mairie360/BFF_Calendar/pull/211), [#217](https://github.com/mairie360/BFF_Calendar/pull/217), [#220](https://github.com/mairie360/BFF_Calendar/pull/220), [#225](https://github.com/mairie360/BFF_Calendar/pull/225)).
- CI/CD : `cicd.yml` pointe sur mairie360/CICD v4.4.3 et ne se déclenche sur `push` que pour `main`; la promotion staging et prod devient manuelle via `promote-staging.yml` et `promote-prod.yml` (MAIR-494, MAIR-612, [#222](https://github.com/mairie360/BFF_Calendar/pull/222), [#225](https://github.com/mairie360/BFF_Calendar/pull/225)). Les versions intermédiaires de CICD (v4.2.2 à v4.3.2) et le transfert des secrets du journal de release (MAIR-571) sont passés par les PR Renovate et [#214](https://github.com/mairie360/BFF_Calendar/pull/214).

## Différence dev → staging (en dev, pas encore en staging)

#### Technique

- Contrats amont épinglés sur les builds prod (`@mairie360/calendar-api-openapi` 1.2.0, `@mairie360/core-api-openapi` 2.2.0) et images des stacks de test mises à jour (calendar-api 1.2.0, core-api 2.2.0, database et liquibase 3.3.0) (MAIR-612, [#225](https://github.com/mairie360/BFF_Calendar/pull/225)).
- CI/CD : `cicd.yml` sur mairie360/CICD v4.4.3, déclenché sur `push` uniquement pour `main`; promotion staging et prod séparée dans `promote-staging.yml` et `promote-prod.yml` (MAIR-494, [#222](https://github.com/mairie360/BFF_Calendar/pull/222)).

## Différence staging → prod (en staging, pas encore en prod)

#### Nouveautés

- Le BFF exporte désormais des traces et des métriques HTTP en OTLP vers le collecteur défini par `OTEL_EXPORTER_OTLP_ENDPOINT`. Sans cette variable, la télémétrie reste désactivée. Seuls la méthode, le statut, la route paramétrée et l'hôte amont sortent du BFF. (MAIR-504, [#185](https://github.com/mairie360/BFF_Calendar/pull/185))

#### Technique

- Contrats amont `@mairie360/core-api-openapi` passé à 2.1.0 et `@mairie360/calendar-api-openapi` à 1.1.0, `@mairie360/bffs-lib` en 2.5.0, et fixtures de test adaptées au rôle unique de `DirectoryUser` (MAIR-568, [#211](https://github.com/mairie360/BFF_Calendar/pull/211)). Les versions intermédiaires du contrat core-api (builds staging) ont été remplacées à cette occasion (MAIR-600, [#220](https://github.com/mairie360/BFF_Calendar/pull/220)).
- CI/CD : `cicd.yml` passe de v4.2.1 à v4.3.2 via Renovate, et transmet les secrets du journal de release (MAIR-571, [#214](https://github.com/mairie360/BFF_Calendar/pull/214), [#215](https://github.com/mairie360/BFF_Calendar/pull/215), [#218](https://github.com/mairie360/BFF_Calendar/pull/218)).

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-21 09:32 UTC | dev | — | `3012a41` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39577249901) |
| 2026-10-21 03:24 UTC | dev | — | `fc638de` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39538100950) |
| 2026-10-20 18:12 UTC | staging | — | `f6bf247` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39470053159) |
| 2026-10-20 17:57 UTC | dev | — | `f6bf247` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39470053159) |
| 2026-10-20 13:06 UTC | dev | — | `45c8598` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39427195215) |
| 2026-10-20 13:01 UTC | dev | — | `d1521e6` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39426441180) |
| 2026-10-19 20:11 UTC | dev | — | `31fb93c` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39316569192) |
<!-- release-journal-history:end -->
