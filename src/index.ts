import { openApiDocument as openApiSpec } from './openapi';
import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import healthRouter from './routes/health';
import checkApis from './routes/check_apis';
import calendarRouter from './routes/calendar-routes';

export const app = express();

export const PORT = Number(process.env.PORT ?? 4002);

// Ne pas divulguer la stack technique (repéré par les scans ZAP)
app.disable('x-powered-by');

// En-têtes de sécurité minimaux (couvre les alertes ZAP 10021 / 90004 / etc.)
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  next();
});

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
// Fallback JSON (404 + erreurs non gérées)
// ========================================

// Réponse JSON systématique sur route inconnue (évite le 404 HTML par défaut
// d'Express, signalé par ZAP en « Unexpected Content-Type »).
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found' });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status = typeof (err as { status?: number })?.status === 'number'
    ? (err as { status: number }).status
    : 500;
  res.status(status).json({ error: status === 500 ? 'Internal Server Error' : 'Request Error' });
});

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
