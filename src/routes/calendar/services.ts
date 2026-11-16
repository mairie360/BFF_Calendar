import { Router, Request, Response } from 'express';
import { apiErrorResponse, registry } from '../../openapi-registry';
import { getCalendarServices } from './calendar_helpers';

const router = Router();

// ========================================
// Enregistrement OpenAPI
// ========================================

registry.registerPath({
  method: 'get',
  path: '/calendar/services',
  // A static list: public, no session needed.
  security: [],
  tags: ['Calendar'],
  summary: 'Get the calendar departments',
  description: 'Loads the municipal departments that can qualify an event',
  responses: {
    200: {
      description: 'Calendar departments',
      content: {
        'application/json': {
          schema: {
            type: 'array',
            items: { $ref: '#/components/schemas/CalendarService' },
          },
        },
      },
    },
    500: apiErrorResponse('Unexpected server error'),
  },
});

// ========================================
// Implementation
// ========================================

router.get('/', (req: Request, res: Response) => {
  return res.status(200).json(getCalendarServices());
});

export default router;
