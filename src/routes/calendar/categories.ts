import { Router, Request, Response } from 'express';
import { registry } from '../../openapi-registry';
import { getCalendarCategories } from './calendar_helpers';

const router = Router();

// ========================================
// Enregistrement OpenAPI
// ========================================

registry.registerPath({
  method: 'get',
  path: '/calendar/categories',
  tags: ['Calendar'],
  summary: 'Récupère le référentiel des catégories',
  description: 'Charge la liste des catégories d\'événements disponibles',
  responses: {
    200: {
      description: 'Liste des catégories',
      content: {
        'application/json': {
          schema: {
            type: 'array',
            items: { $ref: '#/components/schemas/CalendarCategory' },
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
  return res.status(200).json(getCalendarCategories());
});

export default router;
