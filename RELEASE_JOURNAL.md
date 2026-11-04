# Journal des releases — BFF_Calendar

<!-- release-journal-state {"dev": "6a4f3fe9b77da8f80e75e043fc7510262205f7a5", "prod": "3012a41d23b1f2c2e52ac6a3e39ab97e9c346a00", "prod_tag": "v1.1.0", "staging": "3012a41d23b1f2c2e52ac6a3e39ab97e9c346a00", "updated": {"dev": "2026-11-04 18:05 UTC", "prod": "2026-10-21 10:09 UTC", "staging": "2026-10-21 09:40 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.1.0 | `3012a41` | 2026-10-21 10:09 UTC |
| staging | — | `3012a41` | 2026-10-21 09:40 UTC |
| dev | — | `6a4f3fe` | 2026-11-04 18:05 UTC |

## Ajouté sur main depuis la dernière release prod (v1.1.0)

#### Changements de comportement
- Les sessions ne sont plus vérifiées avec le secret HS256 partagé mais avec la clé publique Ed25519 de Core (`JWT_PUBLIC_KEY`, EdDSA, `kid`, `iss`, `aud`). Un jeton HS256 est refusé en 401 sans appel amont dès que `JWT_SECRET` n'est pas défini, ce qui est le cas des stacks de test. Un appelant qui signe encore en HS256 est donc cassé. (MAIR-680, [#242](https://github.com/mairie360/BFF_Calendar/pull/242), [#243](https://github.com/mairie360/BFF_Calendar/pull/243))
- Le BFF refuse de démarrer sans `JWT_PUBLIC_KEY` ou si cette clé est mal formée (`assertStartupConfiguration()`). Les déploiements doivent fournir `JWT_PUBLIC_KEY`. (MAIR-680, [#242](https://github.com/mairie360/BFF_Calendar/pull/242))

#### Corrections
- Les journaux ne contiennent plus les valeurs reçues. Avant, le gestionnaire d'erreurs final journalisait l'erreur brute, y compris le jeton Bearer et les corps de requête et de réponse d'un 502. Maintenant seul le type d'erreur et son contexte (ids, statut) sont journalisés, et un échec de rollback de création d'événement est journalisé par id d'événement et statut. (MAIR-290, [#177](https://github.com/mairie360/BFF_Calendar/pull/177))

#### Technique
- Tests d'intégration sur stack réelle : `docker-compose-integration.yml`, `integration_test.sh` et la collection Postman rejouée par newman contre le BFF, qui bloque la promotion staging (MAIR-262, [#230](https://github.com/mairie360/BFF_Calendar/pull/230)). Images upstream et digests épinglés (MAIR-262, [#236](https://github.com/mairie360/BFF_Calendar/pull/236)).
- Pipelines : workflows sur mairie360/CICD v5.2.2 (MAIR-771, [#238](https://github.com/mairie360/BFF_Calendar/pull/238)), checklist RGPD des PR (MAIR-295, [#183](https://github.com/mairie360/BFF_Calendar/pull/183)), marqueur de logs (MAIR-290, [#177](https://github.com/mairie360/BFF_Calendar/pull/177)), simulation RGPD MAIR-497 en CI uniquement ([#241](https://github.com/mairie360/BFF_Calendar/pull/241)), Node 24.22.1 et image de dev lancée avec l'utilisateur `node` ([#231](https://github.com/mairie360/BFF_Calendar/pull/231)), docs ([#227](https://github.com/mairie360/BFF_Calendar/pull/227)).

## Différence dev → staging (en dev, pas encore en staging)

#### Changements de comportement
- Les sessions ne sont plus vérifiées avec le secret HS256 partagé mais avec la clé publique Ed25519 de Core (`JWT_PUBLIC_KEY`, EdDSA, `kid`, `iss`, `aud`). Un jeton HS256 est refusé en 401 sans appel amont dès que `JWT_SECRET` n'est pas défini, ce qui est le cas des stacks de test. Un appelant qui signe encore en HS256 est donc cassé. (MAIR-680, [#242](https://github.com/mairie360/BFF_Calendar/pull/242), [#243](https://github.com/mairie360/BFF_Calendar/pull/243))
- Le BFF refuse de démarrer sans `JWT_PUBLIC_KEY` ou si cette clé est mal formée (`assertStartupConfiguration()`). Les déploiements doivent fournir `JWT_PUBLIC_KEY`. (MAIR-680, [#242](https://github.com/mairie360/BFF_Calendar/pull/242))

#### Corrections
- Les journaux ne contiennent plus les valeurs reçues. Avant, le gestionnaire d'erreurs final journalisait l'erreur brute, y compris le jeton Bearer et les corps de requête et de réponse d'un 502. Maintenant seul le type d'erreur et son contexte (ids, statut) sont journalisés, et un échec de rollback de création d'événement est journalisé par id d'événement et statut. (MAIR-290, [#177](https://github.com/mairie360/BFF_Calendar/pull/177))

#### Technique
- Tests d'intégration sur stack réelle : `docker-compose-integration.yml`, `integration_test.sh` et la collection Postman rejouée par newman contre le BFF, qui bloque la promotion staging (MAIR-262, [#230](https://github.com/mairie360/BFF_Calendar/pull/230)). Images upstream et digests épinglés (MAIR-262, [#236](https://github.com/mairie360/BFF_Calendar/pull/236)).
- Pipelines : workflows sur mairie360/CICD v5.2.2 (MAIR-771, [#238](https://github.com/mairie360/BFF_Calendar/pull/238)), checklist RGPD des PR (MAIR-295, [#183](https://github.com/mairie360/BFF_Calendar/pull/183)), marqueur de logs (MAIR-290, [#177](https://github.com/mairie360/BFF_Calendar/pull/177)), simulation RGPD MAIR-497 en CI uniquement ([#241](https://github.com/mairie360/BFF_Calendar/pull/241)), Node 24.22.1 et image de dev lancée avec l'utilisateur `node` ([#231](https://github.com/mairie360/BFF_Calendar/pull/231)), docs ([#227](https://github.com/mairie360/BFF_Calendar/pull/227)).

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
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
