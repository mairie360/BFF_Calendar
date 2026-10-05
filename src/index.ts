import { openApiDocument as openApiSpec } from './openapi';
import 'dotenv/config';
import { errorHandler, notFoundHandler, parseTrustProxy } from '@mairie360/bffs-lib';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import healthRouter from './routes/health';
import checkApis from './routes/check_apis';
import calendarRouter from './routes/calendar-routes';
import { calendarApiRootUrl } from './clients/calendarClient';

export const app = express();

export const PORT = Number(process.env.PORT ?? 4002);

// Behind the ingress, TRUST_PROXY makes req.ip the real client instead of the proxy (unset: no proxy trusted).
app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));

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
// Server start
// ========================================

if (require.main === module) {
  // Fail fast on a missing upstream URL rather than answering every request with an error.
  calendarApiRootUrl();
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`OpenAPI documentation available at http://localhost:${PORT}/docs`);
    console.log(`OpenAPI JSON spec available at http://localhost:${PORT}/openapi.json`);
  });
}
