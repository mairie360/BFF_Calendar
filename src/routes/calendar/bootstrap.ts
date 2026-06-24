import { Router, Request, Response } from 'express';
import { registry, CalendarBootstrapResponseSchema } from '../../openapi-registry';

const router = Router();

// ========================================
// Enregistrement OpenAPI
// ========================================

registry.registerPath({
  method: 'get',
  path: '/calendar/bootstrap',
  tags: ['Calendar'],
  summary: 'Charge les données initiales du calendrier',
  description: 'Charge en une fois les événements de la période, les personnes assignables, les catégories et l\'utilisateur courant',
  responses: {
    200: {
      description: 'Données bootstrap chargées avec succès',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CalendarBootstrapResponse' },
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
