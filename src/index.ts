import { openApiDocument as openApiSpec } from './openapi';
import 'dotenv/config';
import { errorHandler, notFoundHandler } from '@mairie360/bffs-lib';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import healthRouter from './routes/health';
import checkApis from './routes/check_apis';
import calendarRouter from './routes/calendar-routes';

export const app = express();

export const PORT = Number(process.env.PORT ?? 4002);

// Security headers (CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, CORP…) and
// removal of X-Powered-By, same configuration as the other BFFs. upgrade-insecure-requests is
// dropped because the BFF is served over HTTP behind the reverse proxy.
app.use(helmet({ contentSecurityPolicy: { useDefaults: true, directives: { 'upgrade-insecure-requests': null } } }));

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
// Error envelope (unknown routes + every error)
// ========================================

// Unknown routes and every error end in the shared envelope `{ error: { code, message, details } }`
// (@mairie360/bffs-lib): the status of the error is kept (400 for an unparsable body, 401, 403, 404,
// 502...) and anything unexpected becomes a 500 without leaking its message.
app.use(notFoundHandler);
app.use(errorHandler({ onError: (error) => console.error('[BFF Calendar] Unexpected error', error) }));

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
