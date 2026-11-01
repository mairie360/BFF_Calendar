# Journal des releases — BFF_Calendar

<!-- release-journal-state {"dev": "81a14a1e933ef7c457157fd6480c7b7fd902b445", "prod": "3012a41d23b1f2c2e52ac6a3e39ab97e9c346a00", "prod_tag": "v1.1.0", "staging": "3012a41d23b1f2c2e52ac6a3e39ab97e9c346a00", "updated": {"dev": "2026-11-01 12:37 UTC", "prod": "2026-10-21 10:09 UTC", "staging": "2026-10-21 09:40 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.1.0 | `3012a41` | 2026-10-21 10:09 UTC |
| staging | — | `3012a41` | 2026-10-21 09:40 UTC |
| dev | — | `81a14a1` | 2026-11-01 12:37 UTC |

## Ajouté sur main depuis la dernière release prod (v1.1.0)

#### Corrections
- Journalisation des erreurs (MAIR-290) : la description de la PR annonce que le handler final ne journalise plus l'erreur brute (cause axios d'un 502 avec le Bearer et les corps de requête et de réponse) et que l'annulation d'une création d'événement est journalisée par identifiant et statut seulement. Ces changements ne figurent pas dans les fichiers du diff fourni (`app.ts` et `calendar_helpers.ts` absents), à vérifier. (MAIR-290, [#177](https://github.com/mairie360/BFF_Calendar/pull/177))

#### Technique
- Test du marqueur RGPD ajouté (`docker-compose-gdpr-marker.yml`, `gdpr-marker.yaml`, `gdpr_marker_test.sh`) : il cherche des valeurs injectées dans les journaux de tous les conteneurs ; le rapport et les fichiers associés sont ignorés par git. (MAIR-290, [#177](https://github.com/mairie360/BFF_Calendar/pull/177))
- Runtime Node.js épinglé en 24.22.1 par digest dans les Dockerfiles, la CI et la documentation ; le conteneur de développement tourne désormais sous l'utilisateur `node`. (MAIR-612, [#231](https://github.com/mairie360/BFF_Calendar/pull/231))
- Suite de tests d'intégration newman sur la stack réelle (`docker-compose-integration.yml`, `integration_test.sh`, `tests/postman/`), utilisée comme gate `integration_tests` de la promotion staging ; les workflows CICD passent en v4.5.0. (MAIR-262, [#230](https://github.com/mairie360/BFF_Calendar/pull/230))
- Documentation alignée sur CICD v4.4.3. (MAIR-612, [#227](https://github.com/mairie360/BFF_Calendar/pull/227))

## Différence dev → staging (en dev, pas encore en staging)

#### Corrections
- Journalisation des erreurs (MAIR-290) : la description de la PR annonce que le handler final ne journalise plus l'erreur brute (cause axios d'un 502 avec le Bearer et les corps de requête et de réponse) et que l'annulation d'une création d'événement est journalisée par identifiant et statut seulement. Ces changements ne figurent pas dans les fichiers du diff fourni (`app.ts` et `calendar_helpers.ts` absents), à vérifier. (MAIR-290, [#177](https://github.com/mairie360/BFF_Calendar/pull/177))

#### Technique
- Test du marqueur RGPD ajouté (`docker-compose-gdpr-marker.yml`, `gdpr-marker.yaml`, `gdpr_marker_test.sh`) : il cherche des valeurs injectées dans les journaux de tous les conteneurs ; le rapport et les fichiers associés sont ignorés par git. (MAIR-290, [#177](https://github.com/mairie360/BFF_Calendar/pull/177))
- Runtime Node.js épinglé en 24.22.1 par digest dans les Dockerfiles, la CI et la documentation ; le conteneur de développement tourne désormais sous l'utilisateur `node`. (MAIR-612, [#231](https://github.com/mairie360/BFF_Calendar/pull/231))
- Suite de tests d'intégration newman sur la stack réelle (`docker-compose-integration.yml`, `integration_test.sh`, `tests/postman/`), utilisée comme gate `integration_tests` de la promotion staging ; les workflows CICD passent en v4.5.0. (MAIR-262, [#230](https://github.com/mairie360/BFF_Calendar/pull/230))
- Documentation alignée sur CICD v4.4.3. (MAIR-612, [#227](https://github.com/mairie360/BFF_Calendar/pull/227))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
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
