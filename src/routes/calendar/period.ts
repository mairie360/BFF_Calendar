import { Router, Request, Response } from 'express';
import { apiErrorResponse, dateQueryParameter, registry } from '../../openapi-registry';
import { MAX_DATE_RANGE_DAYS, fetchCalendarPeriod, parseDateRange } from './calendar_helpers';

const router = Router();

registry.registerPath({
  method: 'get',
  path: '/calendar/period',
  tags: ['Calendar'],
  summary: 'Loads the events of a period only',
  description: 'The events of `from`..`to` with their members and rights, normalized: each event lists its `assigneeIds` and '
    + 'the people come once in `users`. Unlike the bootstrap, it reads neither the assignable people nor the current user, '
    + 'which the front keeps from the bootstrap: use it when the displayed period changes (MAIR-525).',
  parameters: [
    dateQueryParameter('from', true, 'Start date, YYYY-MM-DD'),
    dateQueryParameter('to', true, 'End date, YYYY-MM-DD'),
  ],
  responses: {
    200: {
      description: 'Events of the period and the people they reference',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/CalendarPeriodResponse' } } },
    },
    400: apiErrorResponse(`Invalid parameters: dates not in the YYYY-MM-DD format, from after to, or more than ${MAX_DATE_RANGE_DAYS} days apart`),
    401: apiErrorResponse('Missing or invalid session'),
    500: apiErrorResponse('Unexpected server error'),
    502: apiErrorResponse('Calendar API or Core API is unavailable or failed'),
    503: apiErrorResponse('Calendar API, Core API or JWT_SECRET is not configured'),
  },
});

router.get('/', async (req: Request, res: Response) => {
  const { from, to } = parseDateRange(req.query.from, req.query.to);

  // Only the upstream 400 and 401 are relayed: any other upstream failure is a 502.
  return res.status(200).json(await fetchCalendarPeriod(from, to, { req, declared: [400, 401] }));
});

export default router;
