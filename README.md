# Bff_Template_Repo

## 🏗️ Dépôt Modèle pour Backend for Frontend (BFF)

Ce dépôt sert de point de départ pour créer une application BFF (Backend for Frontend) destinée à interagir avec différents microservices.

---

## ✨ Fonctionnalités

- Serveur basé sur **Express.js**
- Développement en **TypeScript** pour une meilleure sécurité et expérience
- Gestion des variables d’environnement avec **dotenv**
- Route de vérification de santé (health check) intégrée
- Support **Docker** pour la conteneurisation
- Gestion basique des erreurs

---

## ⚠️ Important

Le BFF écoute sur le port `4002`. En développement Docker, `Calendar_API`
utilise la même base PostgreSQL que `BFF_user` afin que les identifiants du
JWT correspondent aux utilisateurs connus du calendrier.

Lancez donc le stack `BFF_user` avant celui-ci. Par défaut, le réseau partagé
attendu est `bff_user_backend` et la base est joignable sous le nom
`mairie360-db-bff-user`. Ces valeurs peuvent être adaptées avec
`USER_BACKEND_NETWORK` et `SHARED_DB_HOST`.

Le BFF initialise également la table `calendar_event_metadata` dans cette
base. Elle complète le contrat actuel de Calendar API avec les champs du
front qui ne sont pas encore stockés par ce service : catégorie, service,
lieu et configuration de récurrence. La ligne de métadonnées référence
`events.id` et est supprimée automatiquement avec l'événement.

## 🚀 Démarrage Rapide

```bash
# Construire l'image Docker
docker build -t bff-template .

# Lancer le stack après BFF_user
docker compose up -d --build
