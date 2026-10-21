# Journal des releases — BFF_Calendar

<!-- release-journal-state {"dev": "fc638de906fb4152b8733cc64e00d8bb39fb3ca8", "prod": "e07dbe025e811b4bd93c394af8c1b6987e9c8a2c", "prod_tag": "v1.0.0", "staging": "f6bf247392ba486f87c4d2d800c861953a0a8249", "updated": {"dev": "2026-10-21 03:24 UTC", "staging": "2026-10-20 18:12 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.0.0 | `e07dbe0` | — |
| staging | — | `f6bf247` | 2026-10-20 18:12 UTC |
| dev | — | `fc638de` | 2026-10-21 03:24 UTC |

## Ajouté sur main depuis la dernière release prod (v1.0.0)

#### Nouveautés
- Télémétrie OpenTelemetry : traces et métriques HTTP exportées en OTLP vers `OTEL_EXPORTER_OTLP_ENDPOINT` lorsque cette variable est définie ; sans elle, rien n'est exporté. Seuls la méthode, le statut, la route paramétrée et l'hôte appelé sortent du BFF, jamais une URL, une query string, un en-tête, un identifiant ou une IP. (MAIR-504, [#185](https://github.com/mairie360/BFF_Calendar/pull/185))
- Workflows manuels `promote-staging.yml` et `promote-prod.yml` pour promouvoir un commit de `main` vers staging puis prod. (MAIR-494, [#222](https://github.com/mairie360/BFF_Calendar/pull/222))

#### Changements de comportement
- Un push sur `main` ne libère plus que la dev : `cicd.yml` s'arrête à `release-dev`. Staging et prod ne partent plus automatiquement. Le staging refuse un commit sans image `dev-<sha>` ni run vert sur `main`, et lance les tests ZAP et k6 sur cette image ; la prod refuse un commit sans `staging-<sha>`. (MAIR-494, [#222](https://github.com/mairie360/BFF_Calendar/pull/222))
- Le client du contrat `@mairie360/calendar-api-openapi` passe de la version prod 1.1.0 à un build dev `0.0.0-dev-3b4668b`, et `@mairie360/core-api-openapi` de 2.1.0 à `0.0.0-staging.b900797` (les pins suivent les builds dev puis staging). (MAIR-568, [#211](https://github.com/mairie360/BFF_Calendar/pull/211), MAIR-575, [#217](https://github.com/mairie360/BFF_Calendar/pull/217), MAIR-600, [#220](https://github.com/mairie360/BFF_Calendar/pull/220))

#### Technique
- Contrats OpenAPI : `@mairie360/bffs-lib` passe en 2.5.0 ; les fixtures de test de l'annuaire Core fournissent désormais `role` (un seul rôle par utilisateur). Aucun changement de code métier. (MAIR-568, [#211](https://github.com/mairie360/BFF_Calendar/pull/211))
- CI : `cicd.yml` suit mairie360/CICD v4.2.1 → v4.3.2 (mises à jour Renovate) ; les secrets `ANTHROPIC_API_KEY`, `RELEASE_APP_ID` et `RELEASE_APP_PK` sont transmis au workflow réutilisable pour le journal des releases. (MAIR-571, [#214](https://github.com/mairie360/BFF_Calendar/pull/214), [#215](https://github.com/mairie360/BFF_Calendar/pull/215), [#218](https://github.com/mairie360/BFF_Calendar/pull/218))
- CI et docs : le job de contrats et le Dockerfile passent en Node.js 24 ; la documentation technique est mise à jour en conséquence. Les stacks Docker de test pointent sur les images core-api et calendar-api de dev puis de staging. (MAIR-568, [#211](https://github.com/mairie360/BFF_Calendar/pull/211), [#212](https://github.com/mairie360/BFF_Calendar/pull/212))

## Différence dev → staging (en dev, pas encore en staging)

#### Changements de comportement
- Un push sur `main` ne libère plus que la dev : `cicd.yml` s'arrête à `release-dev`. Staging et prod passent désormais par les workflows manuels `promote-staging.yml` et `promote-prod.yml` (`gh workflow run promote-staging.yml -R mairie360/BFF_Calendar [-f sha=SHA]`). Le staging refuse un commit sans image `dev-<sha>` ni run vert sur `main`, et lance les tests ZAP et k6 sur cette image. (MAIR-494, [#222](https://github.com/mairie360/BFF_Calendar/pull/222))

#### Technique
- CI : `cicd.yml` passe à mairie360/CICD v4.4.0, et `renovate.json` couvre les trois workflows ; la mise à jour de `follow-redirects` en 1.16.1 (GHSA-q3jh-wrc6-jgq8, GHSA-8r9p-f939-6h3c) débloque `npm audit` selon la description de la PR, le lockfile n'apparaissant pas dans le diff fourni. (MAIR-494, [#222](https://github.com/mairie360/BFF_Calendar/pull/222))

## Différence staging → prod (en staging, pas encore en prod)

#### Changements de comportement
- Le client du contrat `@mairie360/calendar-api-openapi` repasse sur le build dev `0.0.0-dev-3b4668b` (1.1.0 en prod) : à surveiller avant la mise en prod. `@mairie360/core-api-openapi` passe à `0.0.0-staging.b900797`. (MAIR-575, [#217](https://github.com/mairie360/BFF_Calendar/pull/217), MAIR-600, [#220](https://github.com/mairie360/BFF_Calendar/pull/220))

#### Nouveautés
- Télémétrie OpenTelemetry : traces et métriques HTTP exportées en OTLP vers `OTEL_EXPORTER_OTLP_ENDPOINT` lorsque cette variable est définie ; sans elle, rien n'est exporté. Seuls la méthode, le statut, la route paramétrée et l'hôte appelé sortent du BFF. (MAIR-504, [#185](https://github.com/mairie360/BFF_Calendar/pull/185))

#### Technique
- Contrats OpenAPI : `@mairie360/bffs-lib` passe en 2.5.0 ; les fixtures de l'annuaire Core fournissent désormais `role`. Aucun changement de code métier. (MAIR-568, [#211](https://github.com/mairie360/BFF_Calendar/pull/211))
- CI : `cicd.yml` suit mairie360/CICD de v4.2.1 à v4.3.2 (mises à jour Renovate) ; les secrets du journal des releases (`ANTHROPIC_API_KEY`, `RELEASE_APP_ID`, `RELEASE_APP_PK`) sont transmis au workflow réutilisable. (MAIR-571, [#214](https://github.com/mairie360/BFF_Calendar/pull/214), [#215](https://github.com/mairie360/BFF_Calendar/pull/215), [#218](https://github.com/mairie360/BFF_Calendar/pull/218))
- Le job de contrats et le Dockerfile passent en Node.js 24 ; les stacks Docker de test et la documentation sont alignés sur les images de dev puis de staging. (MAIR-568, [#211](https://github.com/mairie360/BFF_Calendar/pull/211), [#212](https://github.com/mairie360/BFF_Calendar/pull/212), MAIR-600, [#220](https://github.com/mairie360/BFF_Calendar/pull/220))
- CI : `npm audit` bloquant limité aux dépendances de production dans mairie360/CICD v4.2.2. (MAIR-568, [#212](https://github.com/mairie360/BFF_Calendar/pull/212))

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-21 03:24 UTC | dev | — | `fc638de` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39538100950) |
| 2026-10-20 18:12 UTC | staging | — | `f6bf247` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39470053159) |
| 2026-10-20 17:57 UTC | dev | — | `f6bf247` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39470053159) |
| 2026-10-20 13:06 UTC | dev | — | `45c8598` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39427195215) |
| 2026-10-20 13:01 UTC | dev | — | `d1521e6` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39426441180) |
| 2026-10-19 20:11 UTC | dev | — | `31fb93c` | [run](https://github.com/mairie360/BFF_Calendar/actions/runs/39316569192) |
<!-- release-journal-history:end -->
