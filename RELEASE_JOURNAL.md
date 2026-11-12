# Journal des releases — BFF_Calendar

<!-- release-journal-state {"dev": "f13ee2ed62fb4a0d21bbad870fbe414a9eab9be9", "prod": "3012a41d23b1f2c2e52ac6a3e39ab97e9c346a00", "prod_tag": "v1.1.0", "staging": "3012a41d23b1f2c2e52ac6a3e39ab97e9c346a00", "updated": {"dev": "2026-11-12 13:16 UTC", "prod": "2026-10-21 10:09 UTC", "staging": "2026-10-21 09:40 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.1.0 | `3012a41` | 2026-10-21 10:09 UTC |
| staging | — | `3012a41` | 2026-10-21 09:40 UTC |
| dev | — | `f13ee2e` | 2026-11-12 13:16 UTC |

## Ajouté sur main depuis la dernière release prod (v1.1.0)

- fix(deps): MAIR-816 Release dev: align internal versions and deploy (#248) ([#248](https://github.com/mairie360/BFF_Calendar/pull/248))
- feat: MAIR-497 GDPR - Usage simulation and AI review of logs and database before prod ([#241](https://github.com/mairie360/BFF_Calendar/pull/241))
- fix: MAIR-680 [Audit 23/10] Toutes les APIs et BFFs : remplacer le secret JWT HS256 partagé par 12 services (A1) ([#243](https://github.com/mairie360/BFF_Calendar/pull/243))
- fix: MAIR-680 [Audit 23/10] Toutes les APIs et BFFs : remplacer le secret JWT HS256 partagé par 12 services (A1) ([#242](https://github.com/mairie360/BFF_Calendar/pull/242))
- ci: MAIR-771 APIs, BFFs, Database : monter CICD en v5.2.2 pour activer les contrôles RGPD (#238) ([#238](https://github.com/mairie360/BFF_Calendar/pull/238))
- chore(deps): pin dependencies (#236) ([#236](https://github.com/mairie360/BFF_Calendar/pull/236))
- ci: MAIR-295 Ajouter une checklist RGPD aux PR et des rappels d'échéances automatiques (#183) ([#183](https://github.com/mairie360/BFF_Calendar/pull/183))
- fix: MAIR-290 Détecter les données personnelles dans les journaux avec un test du marqueur (#177) ([#177](https://github.com/mairie360/BFF_Calendar/pull/177))
- fix(security): patch Node.js runtime and toolchain (#231) ([#231](https://github.com/mairie360/BFF_Calendar/pull/231))
- feat: MAIR-262 Tests d'intégration - Tests de fonctionnement des APIs, tests métier des BFFs et tests de régression (#230) ([#230](https://github.com/mairie360/BFF_Calendar/pull/230))
- docs: MAIR-612 Release prod: align internal versions and deploy (#227) ([#227](https://github.com/mairie360/BFF_Calendar/pull/227))

## Différence dev → staging (en dev, pas encore en staging)

- fix(deps): MAIR-816 Release dev: align internal versions and deploy (#248) ([#248](https://github.com/mairie360/BFF_Calendar/pull/248))
- feat: MAIR-497 GDPR - Usage simulation and AI review of logs and database before prod ([#241](https://github.com/mairie360/BFF_Calendar/pull/241))
- fix: MAIR-680 [Audit 23/10] Toutes les APIs et BFFs : remplacer le secret JWT HS256 partagé par 12 services (A1) ([#243](https://github.com/mairie360/BFF_Calendar/pull/243))
- fix: MAIR-680 [Audit 23/10] Toutes les APIs et BFFs : remplacer le secret JWT HS256 partagé par 12 services (A1) ([#242](https://github.com/mairie360/BFF_Calendar/pull/242))
- ci: MAIR-771 APIs, BFFs, Database : monter CICD en v5.2.2 pour activer les contrôles RGPD (#238) ([#238](https://github.com/mairie360/BFF_Calendar/pull/238))
- chore(deps): pin dependencies (#236) ([#236](https://github.com/mairie360/BFF_Calendar/pull/236))
- ci: MAIR-295 Ajouter une checklist RGPD aux PR et des rappels d'échéances automatiques (#183) ([#183](https://github.com/mairie360/BFF_Calendar/pull/183))
- fix: MAIR-290 Détecter les données personnelles dans les journaux avec un test du marqueur (#177) ([#177](https://github.com/mairie360/BFF_Calendar/pull/177))
- fix(security): patch Node.js runtime and toolchain (#231) ([#231](https://github.com/mairie360/BFF_Calendar/pull/231))
- feat: MAIR-262 Tests d'intégration - Tests de fonctionnement des APIs, tests métier des BFFs et tests de régression (#230) ([#230](https://github.com/mairie360/BFF_Calendar/pull/230))
- docs: MAIR-612 Release prod: align internal versions and deploy (#227) ([#227](https://github.com/mairie360/BFF_Calendar/pull/227))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

> Résumé Claude indisponible pour ce passage : listes brutes des commits.

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-11-12 13:16 UTC | dev | — | `f13ee2e` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/43225004881) |
| 2026-11-04 18:05 UTC | dev | — | `6a4f3fe` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/41882562798) |
| 2026-11-03 14:16 UTC | dev | — | `4b81807` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/41651664215) |
| 2026-11-03 14:02 UTC | dev | — | `3befe6b` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/41648167095) |
| 2026-11-03 00:00 UTC | dev | — | `20bafb6` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/41548488614) |
| 2026-11-02 18:09 UTC | dev | — | `3cd68fc` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/41495445060) |
| 2026-11-01 12:41 UTC | dev | — | `5591ab6` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/41307427149) |
| 2026-11-01 12:37 UTC | dev | — | `81a14a1` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/41306965608) |
| 2026-10-23 12:15 UTC | dev | — | `8cb6972` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39951483879) |
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
