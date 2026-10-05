import { Router, Request, Response } from 'express';
import { apiErrorResponse, dateQueryParameter, registry } from '../../openapi-registry';
import {
  defaultDateRange,
  fetchCalendarBootstrap,
  getCalendarCategories,
  getCalendarServices,
  MAX_DATE_RANGE_DAYS,
  parseDateRange,
  calendarError,
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
  parameters: [
    dateQueryParameter('from', false, 'Date de début au format YYYY-MM-DD (défaut : premier jour du mois courant)'),
    dateQueryParameter('to', false, 'Date de fin au format YYYY-MM-DD (défaut : dernier jour du mois courant)'),
  ],
  responses: {
    200: {
      description: 'Données bootstrap chargées avec succès',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CalendarBootstrapResponse' },
        },
      },
    },
    400: apiErrorResponse(`Invalid parameters: dates not in the YYYY-MM-DD format, from after to, or more than ${MAX_DATE_RANGE_DAYS} days apart`),
    401: apiErrorResponse('Missing or invalid session'),
    500: apiErrorResponse('Unexpected server error'),
    502: apiErrorResponse('Calendar API or Core API is unavailable or failed'),
  },
});

// ========================================
// Implémentation
// ========================================

router.get('/', async (req: Request, res: Response) => {
  const defaults = defaultDateRange();
  const { from, to } = parseDateRange(req.query.from ?? defaults.from, req.query.to ?? defaults.to);

  try {
    const { events, assignees, currentUser, assigneeScope } = await fetchCalendarBootstrap(
      from,
      to,
      req,
    );

    return res.status(200).json({
      events,
      assignees,
      categories: getCalendarCategories(),
      services: getCalendarServices(),
      currentUser,
      assigneeScope,
    });
  } catch (error) {
    throw calendarError(error, [400, 401]);
  }
});

export default router;
