import { Router } from 'express';
import axios from 'axios';
import { CheckApiResponse, CheckApiResponseSchema } from '../views/check_api_view';
import { registry } from '../openapi-registry';

const router = Router();

registry.registerPath({
  method: 'get',
  path: '/check_apis',
  tags: ['Connectivity'],
  summary: "Vérifie la connexion avec l'API Core et Calendar (Rust)",
  responses: {
    200: {
      description: 'Connexion réussie',
      content: {
        'application/json': {
          schema: CheckApiResponseSchema,
        },
      },
    },
    502: {
      description: 'API Core ou Calendar injoignable',
      content: {
        'application/json': {
          schema: CheckApiResponseSchema,
        },
      },
    },
  },
});

async function isReachable(service: 'CORE_API' | 'CALENDAR_API'): Promise<boolean> {
  const host = process.env[`${service}_URL`];
  const port = process.env[`${service}_PORT`];
  if (!host || !port) {
    return false;
  }

  try {
    const response = await axios.get(`http://${host}:${port}/health`, { timeout: 5000 });
    return response.status === 200;
  } catch {
    return false;
  }
}

router.get('/', async (_, res) => {
  // Les deux API sont sondées indépendamment : une panne de l'une ne masque pas l'état de l'autre.
  const [coreReachable, calendarReachable] = await Promise.all([isReachable('CORE_API'), isReachable('CALENDAR_API')]);
  const result: CheckApiResponse = {
    status: coreReachable && calendarReachable ? 'OK' : 'Error',
    core_api: coreReachable ? 'Connected' : 'Unreachable',
    calendar_api: calendarReachable ? 'Connected' : 'Unreachable',
  };

  res.status(coreReachable && calendarReachable ? 200 : 502).json(result);
});

export default router;
