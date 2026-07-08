import { Router, Request, Response } from 'express';
import { registry, CalendarAssigneeSchema } from '../../openapi-registry';
import { defaultDateRange, fetchKnownAssignees, handleUnknownError } from './calendar_helpers';

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

router.get('/', async (req: Request, res: Response) => {
  const defaults = defaultDateRange();
  const from = typeof req.query.from === 'string' ? req.query.from : defaults.from;
  const to = typeof req.query.to === 'string' ? req.query.to : defaults.to;

  try {
    const assignees = await fetchKnownAssignees(from, to);
    return res.status(200).json(assignees);
  } catch (error) {
    return handleUnknownError(res, error);
  }
});

export default router;
