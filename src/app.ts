import 'dotenv/config';
import { apiOnlyHeaders, errorHandler, notFoundHandler, parseTrustProxy, securityHeaders } from '@mairie360/bffs-lib';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from './openapi';
import healthRouter from './routes/health';
import checkApis from './routes/check_apis';
import calendarRouter from './routes/calendar-routes';

export const app = express();

// Behind the ingress, TRUST_PROXY makes req.ip the real client instead of the proxy (unset: no proxy trusted).
app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));
// Shared security headers (helmet, X-Powered-By removed) on every response, then the stricter API-only
// headers everywhere but /docs; both before body parsing, so they also cover body-parse errors.
app.use(securityHeaders);
app.use(apiOnlyHeaders());

app.use(express.json());

// Interactive documentation, and the JSON spec: /openapi.json is the target of the ZAP scan
// (docker-compose-security.yml), /swagger.json is an alias kept for compatibility.
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.get(['/openapi.json', '/swagger.json'], (_req, res) => res.json(openApiDocument));

app.use('/health', healthRouter);
app.use('/check_apis', checkApis);
// Session-bound sub-routers (noStore + requireBearer) are mounted in src/routes/calendar/index.ts.
app.use('/calendar', calendarRouter);

// Unknown routes and every error end in the shared envelope `{ error: { code, message, details } }`
// (@mairie360/bffs-lib): the status of the error is kept (400 for an unparsable body, 401, 403, 404,
// 502, 503...) and anything unexpected becomes a 500 without leaking its message.
app.use(notFoundHandler);
// The 5xx are logged by the handler's default report: never pass it a report that logs the error as is,
// whose upstream `cause` holds the caller's Bearer token and the request and response bodies (MAIR-290).
app.use(errorHandler());

export default app;
