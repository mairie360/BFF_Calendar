# BFF_Calendar — Présentation du module

[Documentation technique](technical.md) · [English](../en/module.md) · [README](../../README.md)

Fournir les événements, référentiels et règles d’accès nécessaires au calendrier municipal. Le BFF regroupe les données de Calendar API et les informations d’affectation et de validation utilisées par le web service.

## Public et utilité

Les agents qui organisent leurs événements, les responsables qui les valident et les équipes intégrant le calendrier.

Domaine fonctionnel: Calendrier.

## Fonctions disponibles

- Chargement initial des événements, personnes assignables, catégories et services.
- Création, modification et suppression des événements avec dates, lieu, affectations et récurrence.
- Approbation des événements selon les rôles et groupes de l’utilisateur.

## Parcours type

1. Charger le calendrier sur une période avec `/calendar/bootstrap`.
2. Créer ou modifier un événement et choisir les personnes autorisées.
3. Consulter l’état de validation et recharger la période après une mutation.

## Place dans Mairie360

Dépôts associés: [Calendars_Web_Service](https://github.com/mairie360/Calendars_Web_Service).

Ce dépôt contient le serveur BFF et son contrat. Les web services associés portent les écrans; le BFF adapte les données et les règles serveur nécessaires à ces écrans.

## Données et état actuel

Calendar API fournit les opérations sur les événements. `calendarAccessRepository.ts` accède directement à PostgreSQL pour l’annuaire, les affectations, certaines modifications et les métadonnées. La table `calendar_event_metadata`, créée par le BFF si nécessaire, référence `events.id` et stocke catégorie, service, lieu et récurrence. Les catégories et services comprennent des référentiels définis dans les helpers.

## Périmètre et limites

Le fonctionnement dépend d’identifiants utilisateurs cohérents entre Core et Calendar et du schéma SQL attendu. Le stack Docker utilise la base partagée du stack BFF User; démarrer celui-ci en premier. Les métadonnées et accès SQL restent une responsabilité actuelle du BFF.

## Pour développer ou exploiter ce module

Le [guide technique](technical.md) détaille architecture, configuration, routes, session, persistance, tests et CI/CD. Il décrit les sources de vérité et les étapes de synchronisation des contrats avec les dépôts associés.
