# Journal des releases — BFF_Calendar

<!-- release-journal-state {"dev": "20bafb6578128390e0890d7c0b40a825a9c792c0", "prod": "3012a41d23b1f2c2e52ac6a3e39ab97e9c346a00", "prod_tag": "v1.1.0", "staging": "3012a41d23b1f2c2e52ac6a3e39ab97e9c346a00", "updated": {"dev": "2026-11-03 00:00 UTC", "prod": "2026-10-21 10:09 UTC", "staging": "2026-10-21 09:40 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.1.0 | `3012a41` | 2026-10-21 10:09 UTC |
| staging | — | `3012a41` | 2026-10-21 09:40 UTC |
| dev | — | `20bafb6` | 2026-11-03 00:00 UTC |

## Ajouté sur main depuis la dernière release prod (v1.1.0)

#### Nouveautés
- La promotion vers staging exécute désormais une porte `integration_tests` : la collection Postman `tests/postman/collection.json` rejoue le parcours événement et invitations contre les images publiées de Calendar API et Core API, et bloque la promotion en cas d'échec (MAIR-262, [#230](https://github.com/mairie360/BFF_Calendar/pull/230)).

#### Changements de comportement
- Le check « GDPR checklist » échoue sur une PR dont la section « Personal data » n'a pas exactement une réponse (No ou Yes), ou qui répond Yes sans la ligne `Inventory:` (MAIR-295, [#183](https://github.com/mairie360/BFF_Calendar/pull/183)).

#### Corrections
- Les journaux d'erreur ne reprennent plus les valeurs reçues. Avant : une erreur amont 502 journalisait l'erreur Axios complète, donc le Bearer token de l'appelant et les corps de requête et de réponse. Maintenant : seulement le type d'erreur et son contexte (MAIR-290, [#177](https://github.com/mairie360/BFF_Calendar/pull/177)).
- Échec de rollback d'une création d'événement : journalisé avec l'identifiant de l'événement et le statut seulement (MAIR-290, [#177](https://github.com/mairie360/BFF_Calendar/pull/177)).
- Date au mauvais format : d'après le scénario du test marqueur, la requête renvoie désormais 400 au lieu d'un 502. Le diff du code correspondant est tronqué dans la PR, à vérifier (MAIR-290, [#177](https://github.com/mairie360/BFF_Calendar/pull/177)).

#### Technique
- `cicd.yml`, `gdpr-pr.yml`, `promote-staging.yml` et `promote-prod.yml` appellent CICD v5.2.2, avec `ANTHROPIC_WORKSPACE_ID` transmis, et un test jest garde l'alignement des versions (MAIR-771, [#238](https://github.com/mairie360/BFF_Calendar/pull/238)).
- Images docker-compose et actions GitHub épinglées par digest par Renovate, sans effet fonctionnel (chore(deps), [#236](https://github.com/mairie360/BFF_Calendar/pull/236)).
- Node.js 24.22.1 pour le Dockerfile, le development.Dockerfile et la CI ; le conteneur de développement tourne sous l'utilisateur `node` (fix(security), [#231](https://github.com/mairie360/BFF_Calendar/pull/231)).
- Stack de test marqueur RGPD, `.dockerignore`, `.gitignore` et mise à jour de dépendances de test (MAIR-290, [#177](https://github.com/mairie360/BFF_Calendar/pull/177)).
- Documentation : versions CICD et Node.js mises à jour (MAIR-612, [#227](https://github.com/mairie360/BFF_Calendar/pull/227)).

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- La promotion vers staging exécute désormais une porte `integration_tests` : la collection Postman `tests/postman/collection.json` rejoue le parcours événement et invitations contre les images publiées de Calendar API et Core API, et bloque la promotion en cas d'échec (MAIR-262, [#230](https://github.com/mairie360/BFF_Calendar/pull/230)).

#### Changements de comportement
- Le check « GDPR checklist » échoue sur une PR dont la section « Personal data » n'a pas exactement une réponse (No ou Yes), ou qui répond Yes sans la ligne `Inventory:` (MAIR-295, [#183](https://github.com/mairie360/BFF_Calendar/pull/183)).

#### Corrections
- Les journaux d'erreur ne reprennent plus les valeurs reçues. Avant : une erreur amont 502 journalisait l'erreur Axios complète, donc le Bearer token de l'appelant et les corps de requête et de réponse. Maintenant : seulement le type d'erreur et son contexte (MAIR-290, [#177](https://github.com/mairie360/BFF_Calendar/pull/177)).
- Échec de rollback d'une création d'événement : journalisé avec l'identifiant de l'événement et le statut seulement (MAIR-290, [#177](https://github.com/mairie360/BFF_Calendar/pull/177)).
- Date au mauvais format : d'après le scénario du test marqueur, la requête renvoie désormais 400 au lieu d'un 502. Le diff du code correspondant est tronqué dans la PR, à vérifier (MAIR-290, [#177](https://github.com/mairie360/BFF_Calendar/pull/177)).

#### Technique
- `cicd.yml`, `gdpr-pr.yml`, `promote-staging.yml` et `promote-prod.yml` appellent CICD v5.2.2, avec `ANTHROPIC_WORKSPACE_ID` transmis, et un test jest garde l'alignement des versions (MAIR-771, [#238](https://github.com/mairie360/BFF_Calendar/pull/238)).
- Images docker-compose et actions GitHub épinglées par digest par Renovate, sans effet fonctionnel (chore(deps), [#236](https://github.com/mairie360/BFF_Calendar/pull/236)).
- Node.js 24.22.1 pour le Dockerfile, le development.Dockerfile et la CI ; le conteneur de développement tourne sous l'utilisateur `node` (fix(security), [#231](https://github.com/mairie360/BFF_Calendar/pull/231)).
- Stack de test marqueur RGPD, `.dockerignore`, `.gitignore` et mise à jour de dépendances de test (MAIR-290, [#177](https://github.com/mairie360/BFF_Calendar/pull/177)).
- Documentation : versions CICD et Node.js mises à jour (MAIR-612, [#227](https://github.com/mairie360/BFF_Calendar/pull/227)).

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
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
