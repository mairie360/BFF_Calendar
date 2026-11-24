import { HttpError, parseRequest } from '@mairie360/bffs-lib';
import { Router, Request, Response } from 'express';
import {
  apiErrorResponse,
  dateQueryParameter,
  eventIdPathParameter,
  deletedEventIdPathParameter,
  registry,
  CreateCalendarEventBodySchema,
  UpdateCalendarEventApprovalBodySchema,
  UpdateCalendarEventParticipationBodySchema,
  UpdateCalendarEventBodySchema,
} from '../../openapi-registry';
import {
  createCalendarEvent,
  deleteCalendarEvent,
  fetchCalendarEvent,
  fetchCalendarEvents,
  MAX_DATE_RANGE_DAYS,
  parseDateRange,
  parseEventIdParam,
  patchCalendarEvent,
  updateCalendarEventApproval,
  updateCalendarEventParticipation,
} from './calendar_helpers';

const router = Router();

// ========================================
// Enregistrement OpenAPI
// ========================================

// GET /calendar/events
registry.registerPath({
  method: 'get',
  path: '/calendar/events',
  tags: ['Calendar'],
  summary: 'Get the events of a date range',
  description: 'Loads the events of the month, week or day view',
  parameters: [
    dateQueryParameter('from', true, 'Start date as YYYY-MM-DD'),
    dateQueryParameter('to', true, 'End date (YYYY-MM-DD)'),
  ],
  responses: {
    200: {
      description: 'Events',
      content: {
        'application/json': {
          schema: {
            type: 'array',
            items: { $ref: '#/components/schemas/CalendarEvent' },
          },
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

// POST /calendar/events
registry.registerPath({
  method: 'post',
  path: '/calendar/events',
  tags: ['Calendar'],
  summary: 'Create a new event',
  description: 'Creates a calendar event and returns it with its server id',
  request: {
    body: {
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CreateCalendarEventBody' },
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Event created',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CalendarEvent' },
        },
      },
    },
    400: apiErrorResponse('Invalid data'),
    401: apiErrorResponse('Missing or invalid session'),
    403: apiErrorResponse('Assignee outside the authorized scope, or refused by Calendar API'),
    500: apiErrorResponse('Unexpected server error'),
    429: apiErrorResponse('Calendar API rate limit reached: retry after the Retry-After header (seconds)'),
    502: apiErrorResponse('Calendar API or Core API is unavailable or failed'),
    503: apiErrorResponse('Calendar API, Core API or JWT_SECRET is not configured'),
  },
});

// GET /calendar/events/{id}
registry.registerPath({
  method: 'get',
  path: '/calendar/events/{id}',
  tags: ['Calendar'],
  summary: 'Reads one event with the caller\'s rights',
  description: 'The event with its description, members, approval status, creator and the caller\'s rights (`canEdit`, `canDelete`, `canValidate`), which the bootstrap and period lists do not carry (MAIR-557): the front reads it when an event is opened.',
  parameters: [
    eventIdPathParameter,
  ],
  responses: {
    200: {
      description: 'The event',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CalendarEvent' },
        },
      },
    },
    400: apiErrorResponse('Invalid id'),
    401: apiErrorResponse('Missing or invalid session'),
    403: apiErrorResponse('The caller is not assigned to this event'),
    404: apiErrorResponse('Event not found'),
    500: apiErrorResponse('Unexpected server error'),
    429: apiErrorResponse('Calendar API rate limit reached: retry after the Retry-After header (seconds)'),
    502: apiErrorResponse('Calendar API or Core API is unavailable or failed'),
    503: apiErrorResponse('Calendar API, Core API or JWT_SECRET is not configured'),
  },
});

// PATCH /calendar/events/{id}
registry.registerPath({
  method: 'patch',
  path: '/calendar/events/{id}',
  tags: ['Calendar'],
  summary: 'Update an existing event',
  description: 'Updates an event identified by its id',
  parameters: [
    eventIdPathParameter,
  ],
  request: {
    body: {
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/UpdateCalendarEventBody' },
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Event updated',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CalendarEvent' },
        },
      },
    },
    400: apiErrorResponse('Invalid data'),
    401: apiErrorResponse('Missing or invalid session'),
    403: apiErrorResponse('Action not allowed on this event'),
    404: apiErrorResponse('Event not found'),
    500: apiErrorResponse('Unexpected server error'),
    429: apiErrorResponse('Calendar API rate limit reached: retry after the Retry-After header (seconds)'),
    502: apiErrorResponse('Calendar API or Core API is unavailable or failed'),
    503: apiErrorResponse('Calendar API, Core API or JWT_SECRET is not configured'),
  },
});

// DELETE /calendar/events/{id}
registry.registerPath({
  method: 'delete',
  path: '/calendar/events/{id}',
  tags: ['Calendar'],
  summary: 'Delete an event',
  description: 'Deletes an event identified by its id',
  parameters: [
    deletedEventIdPathParameter,
  ],
  responses: {
    204: {
      description: 'Event deleted',
    },
    400: apiErrorResponse('Invalid id'),
    401: apiErrorResponse('Missing or invalid session'),
    403: apiErrorResponse('Only the creator can delete the event'),
    404: apiErrorResponse('Event not found'),
    500: apiErrorResponse('Unexpected server error'),
    429: apiErrorResponse('Calendar API rate limit reached: retry after the Retry-After header (seconds)'),
    502: apiErrorResponse('Calendar API or Core API is unavailable or failed'),
    503: apiErrorResponse('Calendar API, Core API or JWT_SECRET is not configured'),
  },
});

// PATCH /calendar/events/{id}/approval
registry.registerPath({
  method: 'patch',
  path: '/calendar/events/{id}/approval',
  tags: ['Calendar'],
  summary: 'Update the approval status of an event',
  description: 'Approves, rejects or puts back on hold an event identified by its id',
  parameters: [
    eventIdPathParameter,
  ],
  request: {
    body: {
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/UpdateCalendarEventApprovalBody' },
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Approval status updated',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CalendarEvent' },
        },
      },
    },
    400: apiErrorResponse('Invalid data'),
    401: apiErrorResponse('Missing or invalid session'),
    403: apiErrorResponse('Action not allowed on this event'),
    404: apiErrorResponse('Event not found'),
    500: apiErrorResponse('Unexpected server error'),
    429: apiErrorResponse('Calendar API rate limit reached: retry after the Retry-After header (seconds)'),
    502: apiErrorResponse('Calendar API or Core API is unavailable or failed'),
    503: apiErrorResponse('Calendar API, Core API or JWT_SECRET is not configured'),
  },
});

// PUT /calendar/events/{id}/participation
registry.registerPath({
  method: 'put',
  path: '/calendar/events/{id}/participation',
  tags: ['Calendar'],
  summary: 'Answer the invitation to an event',
  description: 'Records the current user\'s own answer to an event they are assigned to: accepted or declined. The answer can be changed at any time and never touches the approval. Returns the event read again, with `myParticipation` updated.',
  parameters: [
    eventIdPathParameter,
  ],
  request: {
    body: {
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/UpdateCalendarEventParticipationBody' },
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Answer recorded',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CalendarEvent' },
        },
      },
    },
    400: apiErrorResponse('Invalid data: unknown status or field, or an event id that is not a positive integer'),
    401: apiErrorResponse('Missing or invalid session'),
    403: apiErrorResponse('The current user is not assigned to this event'),
    404: apiErrorResponse('Event not found'),
    500: apiErrorResponse('Unexpected server error'),
    429: apiErrorResponse('Calendar API rate limit reached: retry after the Retry-After header (seconds)'),
    502: apiErrorResponse('Calendar API or Core API is unavailable or failed'),
    503: apiErrorResponse('Calendar API, Core API or JWT_SECRET is not configured'),
  },
});

// ========================================
// Implementation
// ========================================

/** Event id of the path: a positive integer, otherwise a 400 before any upstream call. */
function eventIdOf(req: Request): number {
  const eventId = parseEventIdParam(req.params.id as string | undefined);
  if (eventId === null) {
    throw new HttpError(400, 'The event id must be a positive integer.');
  }
  return eventId;
}

// Each route relays only the upstream 4xx its contract declares (`declared`): any other upstream failure is a 502.

// GET /calendar/events
router.get('/', async (req: Request, res: Response) => {
  if (req.query.from === undefined || req.query.to === undefined) {
    throw new HttpError(400, 'The from and to parameters are required.');
  }

  const { from, to } = parseDateRange(req.query.from, req.query.to);
  const events = await fetchCalendarEvents(from, to, { req, declared: [400, 401] });
  return res.status(200).json(events);
});

// POST /calendar/events
router.post('/', async (req: Request, res: Response) => {
  const body = parseRequest(CreateCalendarEventBodySchema, req.body, 'body');
  const event = await createCalendarEvent(body, { req, declared: [400, 401, 403] });
  return res.status(201).json(event);
});

// GET /calendar/events/:id
router.get('/:id', async (req: Request, res: Response) => {
  const eventId = eventIdOf(req);
  const event = await fetchCalendarEvent(eventId, { req, declared: [400, 401, 403, 404] });
  return res.status(200).json(event);
});

// PATCH /calendar/events/:id
router.patch('/:id', async (req: Request, res: Response) => {
  const eventId = eventIdOf(req);
  const body = parseRequest(UpdateCalendarEventBodySchema, req.body, 'body');
  const event = await patchCalendarEvent(eventId, body, { req, declared: [400, 401, 403, 404] });
  return res.status(200).json(event);
});

// PATCH /calendar/events/:id/approval
router.patch('/:id/approval', async (req: Request, res: Response) => {
  const eventId = eventIdOf(req);
  const { approvalStatus } = parseRequest(UpdateCalendarEventApprovalBodySchema, req.body, 'body');
  const event = await updateCalendarEventApproval(eventId, approvalStatus, { req, declared: [400, 401, 403, 404] });
  return res.status(200).json(event);
});

// PUT /calendar/events/:id/participation
router.put('/:id/participation', async (req: Request, res: Response) => {
  const eventId = eventIdOf(req);
  const { status } = parseRequest(UpdateCalendarEventParticipationBodySchema, req.body, 'body');
  const event = await updateCalendarEventParticipation(eventId, status, { req, declared: [400, 401, 403, 404] });
  return res.status(200).json(event);
});

// DELETE /calendar/events/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const eventId = eventIdOf(req);
  await deleteCalendarEvent(eventId, { req, declared: [400, 401, 403, 404] });
  return res.status(204).send();
});

export default router;
