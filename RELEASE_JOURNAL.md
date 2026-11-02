# Journal des releases — BFF_Calendar

<!-- release-journal-state {"dev": "3cd68fc2671b59f448f8b8c039f6f24f43642df0", "prod": "3012a41d23b1f2c2e52ac6a3e39ab97e9c346a00", "prod_tag": "v1.1.0", "staging": "3012a41d23b1f2c2e52ac6a3e39ab97e9c346a00", "updated": {"dev": "2026-11-02 18:09 UTC", "prod": "2026-10-21 10:09 UTC", "staging": "2026-10-21 09:40 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.1.0 | `3012a41` | 2026-10-21 10:09 UTC |
| staging | — | `3012a41` | 2026-10-21 09:40 UTC |
| dev | — | `3cd68fc` | 2026-11-02 18:09 UTC |

## Ajouté sur main depuis la dernière release prod (v1.1.0)

#### Corrections
- Journaux : l'erreur finale du BFF n'est plus journalisée brute. Avant, la `cause` d'un 502 amont (erreur axios : Bearer de l'appelant, corps de requête et de réponse) était écrite dans les logs ; maintenant les erreurs sont décrites par leur type et leur contexte, sans valeurs. (MAIR-290, [#177](https://github.com/mairie360/BFF_Calendar/pull/177))
- Journaux : l'échec d'un rollback de création d'événement n'est plus journalisé avec ses valeurs ; seuls l'id de l'événement et le statut sont écrits. (MAIR-290, [#177](https://github.com/mairie360/BFF_Calendar/pull/177))

#### Technique
- Ajout d'un test de marqueur RGPD (`gdpr-marker.yaml`, `docker-compose-gdpr-marker.yml`, `gdpr_marker_test.sh`) qui cherche des valeurs fictives dans les logs de tous les conteneurs de la stack. (MAIR-290, [#177](https://github.com/mairie360/BFF_Calendar/pull/177))
- Nouveau workflow `gdpr-pr.yml` : la PR doit répondre à la section « Données personnelles » de sa description, et la check « GDPR checklist » échoue sinon. (MAIR-295, [#183](https://github.com/mairie360/BFF_Calendar/pull/183))
- Tests d'intégration sur stack réelle (newman, collection Postman, `integration_test.sh`), et CI/CD passée à mairie360/CICD v4.5.0 dans les workflows de promotion. (MAIR-262, [#230](https://github.com/mairie360/BFF_Calendar/pull/230))
- Runtime Node.js passé en 24.22.1 (CI, Dockerfiles, documentation), images de base épinglées par digest ; le `development.Dockerfile` exécute désormais l'application sous l'utilisateur `node`. (MAIR-612 / sécurité, [#231](https://github.com/mairie360/BFF_Calendar/pull/231))
- Épinglage par digest des actions GitHub et des images Docker des fichiers `docker-compose*.yml` (renovate). (renovate, [#236](https://github.com/mairie360/BFF_Calendar/pull/236))
- Documentation FR/EN alignée sur mairie360/CICD v4.4.3. (MAIR-612, [#227](https://github.com/mairie360/BFF_Calendar/pull/227))

## Différence dev → staging (en dev, pas encore en staging)

#### Corrections
- Journaux : l'erreur finale du BFF n'est plus journalisée brute. Avant, la `cause` d'un 502 amont (erreur axios : Bearer de l'appelant, corps de requête et de réponse) était écrite dans les logs ; maintenant les erreurs sont décrites par leur type et leur contexte, sans valeurs. (MAIR-290, [#177](https://github.com/mairie360/BFF_Calendar/pull/177))
- Journaux : l'échec d'un rollback de création d'événement n'est plus journalisé avec ses valeurs ; seuls l'id de l'événement et le statut sont écrits. (MAIR-290, [#177](https://github.com/mairie360/BFF_Calendar/pull/177))

#### Technique
- Ajout d'un test de marqueur RGPD (`gdpr-marker.yaml`, `docker-compose-gdpr-marker.yml`, `gdpr_marker_test.sh`) qui cherche des valeurs fictives dans les logs de tous les conteneurs de la stack. (MAIR-290, [#177](https://github.com/mairie360/BFF_Calendar/pull/177))
- Nouveau workflow `gdpr-pr.yml` : la PR doit répondre à la section « Données personnelles » de sa description, et la check « GDPR checklist » échoue sinon. (MAIR-295, [#183](https://github.com/mairie360/BFF_Calendar/pull/183))
- Tests d'intégration sur stack réelle (newman, collection Postman, `integration_test.sh`), et CI/CD passée à mairie360/CICD v4.5.0 dans les workflows de promotion. (MAIR-262, [#230](https://github.com/mairie360/BFF_Calendar/pull/230))
- Runtime Node.js passé en 24.22.1 (CI, Dockerfiles, documentation), images de base épinglées par digest ; le `development.Dockerfile` exécute désormais l'application sous l'utilisateur `node`. (MAIR-612 / sécurité, [#231](https://github.com/mairie360/BFF_Calendar/pull/231))
- Épinglage par digest des actions GitHub et des images Docker des fichiers `docker-compose*.yml` (renovate). (renovate, [#236](https://github.com/mairie360/BFF_Calendar/pull/236))
- Documentation FR/EN alignée sur mairie360/CICD v4.4.3. (MAIR-612, [#227](https://github.com/mairie360/BFF_Calendar/pull/227))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
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
