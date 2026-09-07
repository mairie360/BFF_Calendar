# Contrat BFF / web service

Web services associés : **Calendars_Web_Service**. Le document [OpenAPI](contracts/openapi.json), les [types TypeScript](contracts/bff.d.ts), `/openapi.json` et `/swagger.json` proviennent tous de `src/openapi.ts`, qui importe les routes montées par l’application.

## Routes implémentées

Les chemins sont relatifs au BFF. Les proxies web conservent méthode, paramètres, contenu binaire, statuts et cookies. Les chemins `/api/auth/*` restent des adaptateurs de session vers BFF User ; les pages Next.js sont distinctes des routes de données.

| Méthode | Route | Réponse / schéma |
| --- | --- | --- |
| GET | `/health` | 200 OK |
| GET | `/check_apis` | 200 CheckApiResponse |
| GET | `/calendar/bootstrap` | 200 CalendarBootstrapResponse |
| GET | `/calendar/events` | 200 Liste des événements |
| POST | `/calendar/events` | 201 UpdateCalendarEventBody |
| PATCH | `/calendar/events/{id}` | 200 CalendarEvent |
| DELETE | `/calendar/events/{id}` | 204 Événement supprimé avec succès |
| PATCH | `/calendar/events/{id}/approval` | 200 CalendarEvent |
| GET | `/calendar/assignees` | 200 Liste des personnes assignables |
| GET | `/calendar/categories` | 200 Liste des catégories |
| GET | `/calendar/services` | 200 Liste des services calendrier |

## Mise à jour et validation

Après une modification des routes ou schémas, exécuter `npm run contracts:generate`, puis synchroniser chaque web service associé avec `npm run contracts:sync`. `npm run contracts:check` échoue si le contrat exporté ou les types générés sont périmés. Soumettre les branches associées dans la même livraison.

Le générateur de types est fixé à `openapi-typescript@7.10.1`. Il est exécuté via npm ; aucun jeton privé ne figure dans les contrats.
