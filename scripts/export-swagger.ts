import fs from 'fs';
import path from 'path';
import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { registry } from '../src/openapi-registry';

// Important : Il faut importer les routes pour qu'elles s'enregistrent dans le `registry`
function importAll(r: string[]) {
  r.forEach(file => {
    const fullPath = path.resolve(__dirname, '../src/routes', file);
    try {
      if (fs.statSync(fullPath).isDirectory()) {
        // Importer le fichier index.ts des dossiers
        require(path.join(fullPath, 'index'));
      } else if (file.endsWith('.ts') || file.endsWith('.js')) {
        require(fullPath);
      }
    } catch (e) {
      // Ignorer les erreurs pour les fichiers qui ne sont pas trouvés
    }
  });
}

const routeFiles = fs.readdirSync(path.join(__dirname, '../src/routes'));

// Ajouter aussi les fichiers directs qui ne sont pas dans des dossiers
const directRouteFiles = routeFiles.filter(
  file => (file.endsWith('.ts') || file.endsWith('.js')) && file !== 'calendar.ts'
);

importAll([...routeFiles, ...directRouteFiles]);

// Importer aussi calendar-routes.ts qui contient les imports
require(path.resolve(__dirname, '../src/routes/calendar-routes.ts'));

// Utiliser le générateur OpenAPI pour construire le document
const generator = new OpenApiGeneratorV31(registry.definitions);

const openApiDocument = generator.generateDocument({
  openapi: '3.1.0',
  info: {
    title: 'BFF Calendar API',
    version: '1.0.0',
    description:
      'API du Backend for Frontend (BFF) pour la gestion du calendrier municipal. Fournit les données et opérations pour le module calendrier du front. Cette spécification peut être utilisée avec Orval pour générer automatiquement les clients TypeScript côté front.',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Serveur local de développement',
    },
  ],
});

const outputPath = path.join(process.cwd(), 'openapi.json');
fs.writeFileSync(outputPath, JSON.stringify(openApiDocument, null, 2));

console.log('openapi.json a été généré avec succès !');
console.log(` Fichier sauvegardé : ${outputPath}`);