import { Router, Request, Response } from 'express';
import { registry } from '../../openapi-registry';
import { getCalendarServices } from './calendar_helpers';

const router = Router();

// ========================================
// Enregistrement OpenAPI
// ========================================

registry.registerPath({
  method: 'get',
  path: '/calendar/services',
  tags: ['Calendar'],
  summary: 'Récupère le référentiel des services calendrier',
  description: 'Charge la liste des services municipaux utilisables pour qualifier les événements',
  responses: {
    200: {
      description: 'Liste des services calendrier',
      content: {
        'application/json': {
          schema: {
            type: 'array',
            items: { $ref: '#/components/schemas/CalendarService' },
          },
        },
      },
    },
    500: {
      description: 'Erreur serveur',
    },
  },
});

// ========================================
// Implémentation
// ========================================

router.get('/', (req: Request, res: Response) => {
  return res.status(200).json(getCalendarServices());
});

export default router;
