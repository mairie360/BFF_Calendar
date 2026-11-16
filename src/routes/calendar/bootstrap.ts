import { Router, Request, Response } from 'express';
import { apiErrorResponse, dateQueryParameter, registry } from '../../openapi-registry';
import {
  defaultDateRange,
  fetchCalendarBootstrap,
  getCalendarCategories,
  getCalendarServices,
  MAX_DATE_RANGE_DAYS,
  parseDateRange,
} from './calendar_helpers';

const router = Router();

// ========================================
// Enregistrement OpenAPI
// ========================================

registry.registerPath({
  method: 'get',
  path: '/calendar/bootstrap',
  tags: ['Calendar'],
  summary: 'Load the initial data of the calendar',
  description: 'Loads at once the events of the period, the assignable people, the categories and the current user',
  parameters: [
    dateQueryParameter('from', false, 'Start date as YYYY-MM-DD (default: first day of the current month)'),
    dateQueryParameter('to', false, 'End date as YYYY-MM-DD (default: last day of the current month)'),
  ],
  responses: {
    200: {
      description: 'Bootstrap data loaded',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CalendarBootstrapResponse' },
        },
      },
    },
    400: apiErrorResponse(`Invalid parameters: dates not in the YYYY-MM-DD format, from after to, or more than ${MAX_DATE_RANGE_DAYS} days apart`),
    401: apiErrorResponse('Missing or invalid session'),
    500: apiErrorResponse('Unexpected server error'),
    429: apiErrorResponse('Calendar API rate limit reached: retry after the Retry-After header (seconds)'),
    502: apiErrorResponse('Calendar API or Core API is unavailable or failed'),
    503: apiErrorResponse('Calendar API, Core API or JWT_SECRET is not configured'),
  },
});

// ========================================
// Implementation
// ========================================

router.get('/', async (req: Request, res: Response) => {
  const defaults = defaultDateRange();
  const { from, to } = parseDateRange(req.query.from ?? defaults.from, req.query.to ?? defaults.to);

  // Only the upstream 400 and 401 are relayed: any other upstream failure is a 502.
  const { events, users, assignees, currentUser, assigneeScope } = await fetchCalendarBootstrap(from, to, { req, declared: [400, 401] });

  return res.status(200).json({
    events,
    users,
    assignees,
    categories: getCalendarCategories(),
    services: getCalendarServices(),
    currentUser,
    assigneeScope,
  });
});

export default router;
