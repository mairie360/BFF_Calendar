import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { registry } from './openapi-registry';
import healthRouter from './routes/health';
import checkApis from './routes/check_apis';
import calendarRouter from './routes/calendar-routes';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

const PORT = process.env.PORT;

// Middleware pour parser les JSON
app.use(express.json());

// ========================================
// Génération de la spec OpenAPI
// ========================================

// Générer la spec OpenAPI à partir de la registry
const generator = new OpenApiGeneratorV31(registry.definitions);

const openApiSpec = generator.generateDocument({
  openapi: '3.1.0',
  info: {
    title: 'BFF Calendar API',
    version: '1.0.0',
    description: 'API du Backend for Frontend (BFF) pour la gestion du calendrier municipal. Fournit les données et opérations pour le module calendrier du front.',
  },
  servers: [
    {
      url: `http://localhost:${PORT}`,
      description: 'Serveur local',
    },
  ],
});

// ========================================
// Routes Swagger/OpenAPI
// ========================================

// Route pour l'interface visuelle
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

// Route pour l'extraction JSON (utilisée par Orval et autres outils)
app.get('/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(openApiSpec);
});

// Alias pour compatibility
app.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(openApiSpec);
});

if (!PORT) {
  console.error('Error: PORT environment variable is not set.');
  process.exit(1);
}

// ========================================
// Routes métier
// ========================================

app.use('/health', healthRouter);
app.use('/check_apis', checkApis);
app.use('/calendar', calendarRouter);

// ========================================
// Démarrage du serveur
// ========================================

app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
  console.log(`📚 Documentation OpenAPI disponible à http://localhost:${PORT}/docs`);
  console.log(`📋 Spec OpenAPI JSON disponible à http://localhost:${PORT}/openapi.json`);
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
