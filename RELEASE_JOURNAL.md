# Journal des releases — BFF_Calendar

<!-- release-journal-state {"dev": "4b8180772a7134e284f83bf6f556693422fc33e3", "prod": "3012a41d23b1f2c2e52ac6a3e39ab97e9c346a00", "prod_tag": "v1.1.0", "staging": "3012a41d23b1f2c2e52ac6a3e39ab97e9c346a00", "updated": {"dev": "2026-11-03 14:16 UTC", "prod": "2026-10-21 10:09 UTC", "staging": "2026-10-21 09:40 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.1.0 | `3012a41` | 2026-10-21 10:09 UTC |
| staging | — | `3012a41` | 2026-10-21 09:40 UTC |
| dev | — | `4b81807` | 2026-11-03 14:16 UTC |

## Ajouté sur main depuis la dernière release prod (v1.1.0)

#### Changements de comportement
- Le BFF vérifie désormais les JWT de session avec la clé publique Ed25519 de Core (`JWT_PUBLIC_KEY`, EdDSA sous le `kid` de Core, `iss`, `aud`) au lieu du secret HS256 partagé. Un token HS256 signé avec l'ancien secret reçoit un 401 sans appel amont, et un token signé par une autre clé est refusé. Tant que `JWT_SECRET` est défini, HS256 reste accepté (transition). Les appelants qui émettent encore des tokens HS256 sont cassés. (MAIR-680, [#242](https://github.com/mairie360/BFF_Calendar/pull/242))
- Le démarrage échoue sans `JWT_PUBLIC_KEY` ou si cette clé est mal formée (`assertStartupConfiguration()`). Les déploiements doivent fournir la clé publique. (MAIR-680, [#242](https://github.com/mairie360/BFF_Calendar/pull/242))

#### Corrections
- Les journaux d'erreur ne contiennent plus les valeurs reçues. Avant, le handler d'erreur final journalisait l'erreur brute (la cause axios d'un 502 contenait le token Bearer, le corps de la requête et celui de la réponse). Maintenant, il ne décrit que le type d'erreur et son contexte (ids, statut). Un échec de rollback de création d'événement est journalisé par id d'événement et statut seulement. (MAIR-290, [#177](https://github.com/mairie360/BFF_Calendar/pull/177))

#### Technique
- Tests d'intégration sur stack réelle : `integration_test.sh`, `docker-compose-integration.yml`, collection Postman rejouée par newman avec `--bail`, et tests de non-régression ; les stacks de test utilisent les images dev de Calendar API et Core API. (MAIR-262, [#230](https://github.com/mairie360/BFF_Calendar/pull/230))
- Stack de marqueur RGPD (`gdpr_marker_test.sh`, `gdpr-marker.yaml`) qui cherche des valeurs de test dans les journaux de tous les conteneurs. (MAIR-290, [#177](https://github.com/mairie360/BFF_Calendar/pull/177))
- Pipeline CI : appel de mairie360/CICD monté en v5.2.2 (contrôles RGPD), `ANTHROPIC_WORKSPACE_ID` transmis, test jest de version. Checklist RGPD sur les PR (`gdpr-pr.yml`). (MAIR-771, [#238](https://github.com/mairie360/BFF_Calendar/pull/238) ; MAIR-295, [#183](https://github.com/mairie360/BFF_Calendar/pull/183))
- Images et actions épinglées par digest, Renovate compris. Node.js 24.22.1 pour le Dockerfile, le Dockerfile de développement (qui tourne désormais sous l'utilisateur `node`) et la CI. (MAIR-612 et sécurité, [#231](https://github.com/mairie360/BFF_Calendar/pull/231), [#236](https://github.com/mairie360/BFF_Calendar/pull/236))
- `stack_secrets.sh` refuse une paire de clés pré-exportée qui n'est pas une paire Ed25519 cohérente ; `performance_test.sh` écrit les tokens k6 dans un dossier privé. (MAIR-680, [#243](https://github.com/mairie360/BFF_Calendar/pull/243))
- Documentation technique mise à jour (versions CICD et Node.js). (MAIR-612, [#227](https://github.com/mairie360/BFF_Calendar/pull/227))

## Différence dev → staging (en dev, pas encore en staging)

#### Changements de comportement
- Le BFF vérifie désormais les JWT de session avec la clé publique Ed25519 de Core (`JWT_PUBLIC_KEY`, EdDSA sous le `kid` de Core, `iss`, `aud`) au lieu du secret HS256 partagé. Un token HS256 signé avec l'ancien secret reçoit un 401 sans appel amont, et un token signé par une autre clé est refusé. Tant que `JWT_SECRET` est défini, HS256 reste accepté (transition). Les appelants qui émettent encore des tokens HS256 sont cassés. (MAIR-680, [#242](https://github.com/mairie360/BFF_Calendar/pull/242))
- Le démarrage échoue sans `JWT_PUBLIC_KEY` ou si cette clé est mal formée (`assertStartupConfiguration()`). Les déploiements doivent fournir la clé publique. (MAIR-680, [#242](https://github.com/mairie360/BFF_Calendar/pull/242))

#### Corrections
- Les journaux d'erreur ne contiennent plus les valeurs reçues. Avant, le handler d'erreur final journalisait l'erreur brute (la cause axios d'un 502 contenait le token Bearer, le corps de la requête et celui de la réponse). Maintenant, il ne décrit que le type d'erreur et son contexte (ids, statut). Un échec de rollback de création d'événement est journalisé par id d'événement et statut seulement. (MAIR-290, [#177](https://github.com/mairie360/BFF_Calendar/pull/177))

#### Technique
- Tests d'intégration sur stack réelle : `integration_test.sh`, `docker-compose-integration.yml`, collection Postman rejouée par newman avec `--bail`, et tests de non-régression ; les stacks de test utilisent les images dev de Calendar API et Core API. (MAIR-262, [#230](https://github.com/mairie360/BFF_Calendar/pull/230))
- Stack de marqueur RGPD (`gdpr_marker_test.sh`, `gdpr-marker.yaml`) qui cherche des valeurs de test dans les journaux de tous les conteneurs. (MAIR-290, [#177](https://github.com/mairie360/BFF_Calendar/pull/177))
- Pipeline CI : appel de mairie360/CICD monté en v5.2.2 (contrôles RGPD), `ANTHROPIC_WORKSPACE_ID` transmis, test jest de version. Checklist RGPD sur les PR (`gdpr-pr.yml`). (MAIR-771, [#238](https://github.com/mairie360/BFF_Calendar/pull/238) ; MAIR-295, [#183](https://github.com/mairie360/BFF_Calendar/pull/183))
- Images et actions épinglées par digest, Renovate compris. Node.js 24.22.1 pour le Dockerfile, le Dockerfile de développement (qui tourne désormais sous l'utilisateur `node`) et la CI. (MAIR-612 et sécurité, [#231](https://github.com/mairie360/BFF_Calendar/pull/231), [#236](https://github.com/mairie360/BFF_Calendar/pull/236))
- `stack_secrets.sh` refuse une paire de clés pré-exportée qui n'est pas une paire Ed25519 cohérente ; `performance_test.sh` écrit les tokens k6 dans un dossier privé. (MAIR-680, [#243](https://github.com/mairie360/BFF_Calendar/pull/243))
- Documentation technique mise à jour (versions CICD et Node.js). (MAIR-612, [#227](https://github.com/mairie360/BFF_Calendar/pull/227))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
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
