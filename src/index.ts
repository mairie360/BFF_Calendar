import { openApiDocument as openApiSpec } from './openapi';
import 'dotenv/config';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import healthRouter from './routes/health';
import checkApis from './routes/check_apis';
import calendarRouter from './routes/calendar-routes';

export const app = express();

export const PORT = Number(process.env.PORT ?? 4002);

// Middleware pour parser les JSON
app.use(express.json());

// ========================================
// Génération de la spec OpenAPI
// ========================================

// Générer la spec OpenAPI à partir de la registry


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

// ========================================
// Routes métier
// ========================================

app.use('/health', healthRouter);
app.use('/check_apis', checkApis);
app.use('/calendar', calendarRouter);

// ========================================
// Démarrage du serveur
// ========================================

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
    console.log(`📚 Documentation OpenAPI disponible à http://localhost:${PORT}/docs`);
    console.log(`📋 Spec OpenAPI JSON disponible à http://localhost:${PORT}/openapi.json`);
  });
}
