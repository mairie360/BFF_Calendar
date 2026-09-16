import { Router, Request, Response } from 'express';
import { apiErrorResponse, dateQueryParameter, registry } from '../../openapi-registry';
import { defaultDateRange, fetchKnownAssignees, handleUnknownError, isQueryDate, sendBadRequest } from './calendar_helpers';

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
  parameters: [
    dateQueryParameter('from', false, 'Date de début au format YYYY-MM-DD (défaut : premier jour du mois courant)'),
    dateQueryParameter('to', false, 'Date de fin au format YYYY-MM-DD (défaut : dernier jour du mois courant)'),
  ],
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
    400: apiErrorResponse('Paramètres invalides'),
    401: apiErrorResponse('Session invalide'),
    500: apiErrorResponse('Erreur serveur'),
    502: apiErrorResponse('Calendar API indisponible'),
  },
});

// ========================================
// Implémentation
// ========================================

router.get('/', async (req: Request, res: Response) => {
  const defaults = defaultDateRange();
  const from = typeof req.query.from === 'string' ? req.query.from : defaults.from;
  const to = typeof req.query.to === 'string' ? req.query.to : defaults.to;

  if (!isQueryDate(from) || !isQueryDate(to)) {
    return sendBadRequest(res, 'Les paramètres from et to doivent être des dates au format YYYY-MM-DD.');
  }

  try {
    const assignees = await fetchKnownAssignees(from, to, req.headers.authorization);
    return res.status(200).json(assignees);
  } catch (error) {
    return handleUnknownError(res, error);
  }
});

export default router;
