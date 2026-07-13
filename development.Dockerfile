FROM node:20-alpine

# Define the build argument
ARG NODE_AUTH_TOKEN

# Installation de curl pour le healthcheck Docker
RUN apk add --no-cache curl

WORKDIR /app

# On copie les fichiers de définition en premier pour le cache Docker
COPY package*.json tsconfig.json .npmrc ./

# Installation complète (avec devDependencies pour ts-node-dev)
# Replace the placeholder in .npmrc with the actual token, then install
RUN sed -i "s|\${NODE_AUTH_TOKEN}|${NODE_AUTH_TOKEN}|g" .npmrc && \
    npm install

# On copie le reste du code source
COPY . .

CMD ["npm", "run", "start"]
