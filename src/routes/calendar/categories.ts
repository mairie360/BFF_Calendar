import { Router, Request, Response } from 'express';
import { apiErrorResponse, registry } from '../../openapi-registry';
import { getCalendarCategories } from './calendar_helpers';

const router = Router();

// ========================================
// Enregistrement OpenAPI
// ========================================

registry.registerPath({
  method: 'get',
  path: '/calendar/categories',
  // A static list: public, no session needed.
  security: [],
  tags: ['Calendar'],
  summary: 'Get the categories',
  description: 'Loads the available event categories',
  responses: {
    200: {
      description: 'Categories',
      content: {
        'application/json': {
          schema: {
            type: 'array',
            items: { $ref: '#/components/schemas/CalendarCategory' },
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
  return res.status(200).json(getCalendarCategories());
});

export default router;
