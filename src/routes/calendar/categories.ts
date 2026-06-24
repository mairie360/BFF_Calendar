import { Router, Request, Response } from 'express';
import { registry, CalendarCategorySchema } from '../../openapi-registry';

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
  // TODO: Implémenter la logique
  res.status(501).json({ error: 'Not implemented' });
});

export default router;
