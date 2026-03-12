import { Router } from 'express';
import axios from 'axios';
import { CheckApiResponse, CheckApiResponseSchema } from '../views/check_api_view';
import { registry } from '../openapi-registry';

const router = Router();

const CORE_FULL_URL = `http://${process.env.CORE_API_URL}:${process.env.CORE_API_PORT}`;
const CALENDAR_FULL_URL = `http://${process.env.CALENDAR_API_URL}:${process.env.CALENDAR_API_PORT}`;

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
      description: 'API Core injoignable',
    },
  },
});

router.get('/', async (_, res) => {
  try {
    const coreResponse = await axios.get(`${CORE_FULL_URL}/health`, { timeout: 5000 });
    console.log(coreResponse);
    const core_is_reachable = coreResponse.status === 200;
    
    const calendarResponse = await axios.get(`${CALENDAR_FULL_URL}/health`, { timeout: 5000 });
    console.log(calendarResponse);
    const calendar_is_reachable = calendarResponse.status === 200;
    const result: CheckApiResponse = {
      status: 'OK',
      core_api: core_is_reachable ? 'Connected' : 'Unreachable',
      calendar_api: calendar_is_reachable ? 'Connected' : 'Unreachable'
    };
    res.status(200).json(result);
  } catch (error) {
    res.status(502).json({
      status: 'Error',
      core_api: 'Unreachable',
      calendar_api: 'Unreachable',
      message: (error as Error).message
    });
  }
});

export default router;