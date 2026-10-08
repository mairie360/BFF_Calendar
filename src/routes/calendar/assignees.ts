import { Router, Request, Response } from 'express';
import { apiErrorResponse, dateQueryParameter, registry } from '../../openapi-registry';
import { MAX_DATE_RANGE_DAYS, defaultDateRange, fetchKnownAssignees, parseDateRange } from './calendar_helpers';

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
    400: apiErrorResponse(`Invalid parameters: dates not in the YYYY-MM-DD format, from after to, or more than ${MAX_DATE_RANGE_DAYS} days apart`),
    401: apiErrorResponse('Missing or invalid session'),
    500: apiErrorResponse('Unexpected server error'),
    502: apiErrorResponse('Calendar API or Core API is unavailable or failed'),
    503: apiErrorResponse('Calendar API, Core API or JWT_SECRET is not configured'),
  },
});

// ========================================
// Implémentation
// ========================================

router.get('/', async (req: Request, res: Response) => {
  const defaults = defaultDateRange();
  const { from, to } = parseDateRange(req.query.from ?? defaults.from, req.query.to ?? defaults.to);

  const assignees = await fetchKnownAssignees(from, to, { req, declared: [400, 401] });
  return res.status(200).json(assignees);
});

export default router;
