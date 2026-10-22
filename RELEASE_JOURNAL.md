# Journal des releases — BFF_Calendar

<!-- release-journal-state {"dev": "ac915911c58723624c4c0db77beaf98af88e3d21", "prod": "3012a41d23b1f2c2e52ac6a3e39ab97e9c346a00", "prod_tag": "v1.1.0", "staging": "3012a41d23b1f2c2e52ac6a3e39ab97e9c346a00", "updated": {"dev": "2026-10-22 09:08 UTC", "prod": "2026-10-21 10:09 UTC", "staging": "2026-10-21 09:40 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.1.0 | `3012a41` | 2026-10-21 10:09 UTC |
| staging | — | `3012a41` | 2026-10-21 09:40 UTC |
| dev | — | `ac91591` | 2026-10-22 09:08 UTC |

## Ajouté sur main depuis la dernière release prod (v1.1.0)

#### Technique

- Ajoute une stack d'intégration sur les vraies API Calendar et Core (`docker-compose-integration.yml`, `integration_test.sh`) : newman rejoue `tests/postman/collection.json` contre le BFF, et ce job devient le gate `integration_tests` de la promotion staging. La partie lue du diff (tronqué) ne montre aucun changement de route. (MAIR-262, [#230](https://github.com/mairie360/BFF_Calendar/pull/230))
- Passe `cicd.yml`, `promote-staging.yml` et `promote-prod.yml` de mairie360/CICD v4.4.3 à v4.5.0. (MAIR-262, [#230](https://github.com/mairie360/BFF_Calendar/pull/230))
- Aligne la documentation (en et fr) sur mairie360/CICD v4.4.3 au lieu de v4.4.0. (MAIR-612, [#227](https://github.com/mairie360/BFF_Calendar/pull/227))

## Différence dev → staging (en dev, pas encore en staging)

#### Technique

- Ajoute une stack d'intégration sur les vraies API Calendar et Core (`docker-compose-integration.yml`, `integration_test.sh`) : newman rejoue `tests/postman/collection.json` contre le BFF, et ce job devient le gate `integration_tests` de la promotion staging. La partie lue du diff (tronqué) ne montre aucun changement de route. (MAIR-262, [#230](https://github.com/mairie360/BFF_Calendar/pull/230))
- Passe `cicd.yml`, `promote-staging.yml` et `promote-prod.yml` de mairie360/CICD v4.4.3 à v4.5.0. (MAIR-262, [#230](https://github.com/mairie360/BFF_Calendar/pull/230))
- Aligne la documentation (en et fr) sur mairie360/CICD v4.4.3 au lieu de v4.4.0. (MAIR-612, [#227](https://github.com/mairie360/BFF_Calendar/pull/227))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-22 09:08 UTC | dev | — | `ac91591` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39752706549) |
| 2026-10-21 10:09 UTC | prod | v1.1.0 | `3012a41` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39579238799) |
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
