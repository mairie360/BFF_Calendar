# Journal des releases — BFF_Calendar

<!-- release-journal-state {"dev": "3befe6bbc7679c7fccbe67072eac5555b07b030d", "prod": "3012a41d23b1f2c2e52ac6a3e39ab97e9c346a00", "prod_tag": "v1.1.0", "staging": "3012a41d23b1f2c2e52ac6a3e39ab97e9c346a00", "updated": {"dev": "2026-11-03 14:02 UTC", "prod": "2026-10-21 10:09 UTC", "staging": "2026-10-21 09:40 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.1.0 | `3012a41` | 2026-10-21 10:09 UTC |
| staging | — | `3012a41` | 2026-10-21 09:40 UTC |
| dev | — | `3befe6b` | 2026-11-03 14:02 UTC |

## Ajouté sur main depuis la dernière release prod (v1.1.0)

#### Changements de comportement
- Les tokens de session sont désormais vérifiés avec la clé publique Ed25519 de Core (`JWT_PUBLIC_KEY`, EdDSA sous le `kid` de Core, contrôle de `iss` et `aud`). Un token HS256, y compris celui signé avec l’ancien secret partagé, reçoit 401 avant tout appel amont. HS256 n’est accepté que tant que `JWT_SECRET` est défini (transition). (MAIR-680, [#242](https://github.com/mairie360/BFF_Calendar/pull/242))
- Le BFF refuse de démarrer sans `JWT_PUBLIC_KEY` ou avec une clé mal formée (`assertStartupConfiguration()`). (MAIR-680, [#242](https://github.com/mairie360/BFF_Calendar/pull/242))

#### Corrections
- Journaux : avant, l’erreur finale journalisait la valeur reçue (dont le Bearer et les corps de requête et de réponse amont, via la `cause` d’un 502). Maintenant, les erreurs sont décrites par leur type et leur contexte. Un échec de rollback de création d’événement est journalisé avec l’identifiant de l’événement et le statut seulement. (MAIR-290, [#177](https://github.com/mairie360/BFF_Calendar/pull/177))

#### Technique
- Authentification : `@mairie360/bffs-lib` passe en 2.7.0. Les tests d’intégration et de performance signent les tokens avec une paire Ed25519 par run (`stack_secrets.sh`, `performance_test.sh`), et Calendar API et Core API passent aux images `dev-9c9da5b` et `dev-3b40c2a`. (MAIR-680, [#242](https://github.com/mairie360/BFF_Calendar/pull/242))
- CI/CD : passage de mairie360/CICD de v4.5.0 à v5.2.2 (`cicd.yml`, `promote-staging.yml`, `promote-prod.yml`) et de v4.12.1 à v5.2.2 (`gdpr-pr.yml`). `ANTHROPIC_WORKSPACE_ID` est transmis, un test vérifie que les workflows pointent la même version. (MAIR-771, [#238](https://github.com/mairie360/BFF_Calendar/pull/238))
- Contrôle RGPD : nouveau workflow `gdpr-pr.yml` qui vérifie la section « Données personnelles » des PR, et stack de test du marqueur RGPD (`gdpr-marker.yaml`, `docker-compose-gdpr-marker.yml`, `gdpr_marker_test.sh`). (MAIR-295, [#183](https://github.com/mairie360/BFF_Calendar/pull/183) ; MAIR-290, [#177](https://github.com/mairie360/BFF_Calendar/pull/177))
- Tests d’intégration : stack `docker-compose-integration.yml`, `integration_test.sh` et collection Postman rejouée par newman, utilisés comme porte `integration_tests` de la promotion staging. (MAIR-262, [#230](https://github.com/mairie360/BFF_Calendar/pull/230))
- Images et runtime : Node.js 24.22.1 pour le Dockerfile, le `development.Dockerfile` (qui tourne désormais sous l’utilisateur `node`, en dev seulement) et les jobs ; images et actions épinglées par digest (renovate, [#236](https://github.com/mairie360/BFF_Calendar/pull/236)) ; correctifs de sécurité Node (MAIR-612 et [#231](https://github.com/mairie360/BFF_Calendar/pull/231)). Documentation alignée (MAIR-612, [#227](https://github.com/mairie360/BFF_Calendar/pull/227)).

## Différence dev → staging (en dev, pas encore en staging)

#### Changements de comportement
- Les tokens de session sont désormais vérifiés avec la clé publique Ed25519 de Core (`JWT_PUBLIC_KEY`, EdDSA sous le `kid` de Core, contrôle de `iss` et `aud`). Un token HS256, y compris celui signé avec l’ancien secret partagé, reçoit 401 avant tout appel amont. HS256 n’est accepté que tant que `JWT_SECRET` est défini (transition). (MAIR-680, [#242](https://github.com/mairie360/BFF_Calendar/pull/242))
- Le BFF refuse de démarrer sans `JWT_PUBLIC_KEY` ou avec une clé mal formée (`assertStartupConfiguration()`). (MAIR-680, [#242](https://github.com/mairie360/BFF_Calendar/pull/242))

#### Corrections
- Journaux : avant, l’erreur finale journalisait la valeur reçue (dont le Bearer et les corps de requête et de réponse amont, via la `cause` d’un 502). Maintenant, les erreurs sont décrites par leur type et leur contexte. Un échec de rollback de création d’événement est journalisé avec l’identifiant de l’événement et le statut seulement. (MAIR-290, [#177](https://github.com/mairie360/BFF_Calendar/pull/177))

#### Technique
- Authentification : `@mairie360/bffs-lib` passe en 2.7.0. Les tests d’intégration et de performance signent les tokens avec une paire Ed25519 par run (`stack_secrets.sh`, `performance_test.sh`), et Calendar API et Core API passent aux images `dev-9c9da5b` et `dev-3b40c2a`. (MAIR-680, [#242](https://github.com/mairie360/BFF_Calendar/pull/242))
- CI/CD : passage de mairie360/CICD de v4.5.0 à v5.2.2 (`cicd.yml`, `promote-staging.yml`, `promote-prod.yml`) et de v4.12.1 à v5.2.2 (`gdpr-pr.yml`). `ANTHROPIC_WORKSPACE_ID` est transmis, un test vérifie que les workflows pointent la même version. (MAIR-771, [#238](https://github.com/mairie360/BFF_Calendar/pull/238))
- Contrôle RGPD : nouveau workflow `gdpr-pr.yml` qui vérifie la section « Données personnelles » des PR, et stack de test du marqueur RGPD (`gdpr-marker.yaml`, `docker-compose-gdpr-marker.yml`, `gdpr_marker_test.sh`). (MAIR-295, [#183](https://github.com/mairie360/BFF_Calendar/pull/183) ; MAIR-290, [#177](https://github.com/mairie360/BFF_Calendar/pull/177))
- Tests d’intégration : stack `docker-compose-integration.yml`, `integration_test.sh` et collection Postman rejouée par newman, utilisés comme porte `integration_tests` de la promotion staging. (MAIR-262, [#230](https://github.com/mairie360/BFF_Calendar/pull/230))
- Images et runtime : Node.js 24.22.1 pour le Dockerfile, le `development.Dockerfile` (qui tourne désormais sous l’utilisateur `node`, en dev seulement) et les jobs ; images et actions épinglées par digest (renovate, [#236](https://github.com/mairie360/BFF_Calendar/pull/236)) ; correctifs de sécurité Node (MAIR-612 et [#231](https://github.com/mairie360/BFF_Calendar/pull/231)). Documentation alignée (MAIR-612, [#227](https://github.com/mairie360/BFF_Calendar/pull/227)).

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
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
