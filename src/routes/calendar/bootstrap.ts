import { Router, Request, Response } from 'express';
import { registry, CalendarBootstrapResponseSchema } from '../../openapi-registry';
import {
  defaultDateRange,
  fetchCalendarEvents,
  fetchKnownAssignees,
  getCalendarCategories,
  getCalendarServices,
  handleUnknownError,
} from './calendar_helpers';

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

router.get('/', async (req: Request, res: Response) => {
  const defaults = defaultDateRange();
  const from = typeof req.query.from === 'string' ? req.query.from : defaults.from;
  const to = typeof req.query.to === 'string' ? req.query.to : defaults.to;

  try {
    const [events, assignees] = await Promise.all([
      fetchCalendarEvents(from, to, req.headers.authorization),
      fetchKnownAssignees(from, to, req.headers.authorization),
    ]);

    return res.status(200).json({
      events,
      assignees,
      categories: getCalendarCategories(),
      services: getCalendarServices(),
    });
  } catch (error) {
    return handleUnknownError(res, error);
  }
});

export default router;
