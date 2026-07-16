FROM node:20-alpine

# Define the build argument
ARG NODE_AUTH_TOKEN

# Installation de curl pour le healthcheck Docker
RUN apk add --no-cache curl

WORKDIR /app

# On copie les fichiers de définition en premier pour le cache Docker
COPY package*.json tsconfig.json ./

# Installation complète (avec devDependencies pour ts-node-dev)
# Le fichier npmrc est monté comme secret ; le token n'est ni écrit dans
# une couche de l'image ni affiché dans les logs de build.
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm install

# On copie le reste du code source
COPY . .

CMD ["npm", "run", "start"]
