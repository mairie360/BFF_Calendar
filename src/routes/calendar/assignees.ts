import { Router, Request, Response } from 'express';
import { registry, CalendarAssigneeSchema } from '../../openapi-registry';

const router = Router();

// ========================================
// Enregistrement OpenAPI
// ========================================

registry.registerPath({
  method: 'get',
  path: '/calendar/assignees',
  tags: ['Calendar'],
  summary: 'Récupère le référentiel des personnes assignables',
  description: 'Charge la liste complète des personnes pouvant être assignées à un événement',
  responses: {
    200: {
      description: 'Liste des personnes assignables',
      content: {
        'application/json': {
          schema: {
            type: 'array',
            items: { $ref: '#/components/schemas/CalendarAssignee' },
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
