import { Router, Request, Response } from 'express';
import {
  apiErrorResponse,
  dateQueryParameter,
  eventIdPathParameter,
  deletedEventIdPathParameter,
  registry,
  CreateCalendarEventBodySchema,
  UpdateCalendarEventApprovalBodySchema,
  UpdateCalendarEventBodySchema,
} from '../../openapi-registry';
import {
  createCalendarEvent,
  deleteCalendarEvent,
  fetchCalendarEvents,
  MAX_DATE_RANGE_DAYS,
  parseDateRange,
  parseEventIdParam,
  patchCalendarEvent,
  badRequest,
  calendarError,
  updateCalendarEventApproval,
  validationError,
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
  summary: 'Récupère les événements sur une plage de dates',
  description: 'Charge les événements utiles à la vue mois/semaine/jour',
  parameters: [
    dateQueryParameter('from', true, 'Date de début au format YYYY-MM-DD'),
    dateQueryParameter('to', true, 'Date de fin au format YYYY-MM-DD'),
  ],
  responses: {
    200: {
      description: 'Liste des événements',
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
    502: apiErrorResponse('Calendar API or Core API is unavailable or failed'),
  },
});

// POST /calendar/events
registry.registerPath({
  method: 'post',
  path: '/calendar/events',
  tags: ['Calendar'],
  summary: 'Crée un nouvel événement',
  description: 'Crée un événement calendrier et retourne l\'objet enrichi avec son ID serveur',
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
      description: 'Événement créé avec succès',
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
    502: apiErrorResponse('Calendar API or Core API is unavailable or failed'),
  },
});

// PATCH /calendar/events/{id}
registry.registerPath({
  method: 'patch',
  path: '/calendar/events/{id}',
  tags: ['Calendar'],
  summary: 'Modifie un événement existant',
  description: 'Met à jour un événement identifié par son ID',
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
      description: 'Événement modifié avec succès',
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
    502: apiErrorResponse('Calendar API or Core API is unavailable or failed'),
  },
});

// DELETE /calendar/events/{id}
registry.registerPath({
  method: 'delete',
  path: '/calendar/events/{id}',
  tags: ['Calendar'],
  summary: 'Supprime un événement',
  description: 'Supprime un événement identifié par son ID',
  parameters: [
    deletedEventIdPathParameter,
  ],
  responses: {
    204: {
      description: 'Événement supprimé avec succès',
    },
    400: apiErrorResponse('Invalid id'),
    401: apiErrorResponse('Missing or invalid session'),
    403: apiErrorResponse('Only the creator can delete the event'),
    404: apiErrorResponse('Event not found'),
    500: apiErrorResponse('Unexpected server error'),
    502: apiErrorResponse('Calendar API or Core API is unavailable or failed'),
  },
});

// PATCH /calendar/events/{id}/approval
registry.registerPath({
  method: 'patch',
  path: '/calendar/events/{id}/approval',
  tags: ['Calendar'],
  summary: 'Met à jour le statut d’approbation d’un événement',
  description: 'Valide, refuse ou remet en attente un événement identifié par son ID',
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
      description: 'Statut d’approbation mis à jour',
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
    502: apiErrorResponse('Calendar API or Core API is unavailable or failed'),
  },
});

// ========================================
// Implémentation
// ========================================

// GET /calendar/events
router.get('/', async (req: Request, res: Response) => {
  const token = req.headers.authorization;

  if (req.query.from === undefined || req.query.to === undefined) {
    throw badRequest('The from and to parameters are required.');
  }

  const { from, to } = parseDateRange(req.query.from, req.query.to);

  try {
    const events = await fetchCalendarEvents(from, to, token);
    return res.status(200).json(events);
  } catch (error) {
    throw calendarError(error, [400, 401]);
  }
});

// POST /calendar/events
router.post('/', async (req: Request, res: Response) => {
  const bodyResult = CreateCalendarEventBodySchema.safeParse(req.body);

  if (!bodyResult.success) {
    throw validationError(bodyResult.error.issues);
  }

  try {
    const event = await createCalendarEvent(bodyResult.data, req.headers.authorization);
    return res.status(201).json(event);
  } catch (error) {
    throw calendarError(error, [400, 401, 403]);
  }
});

// PATCH /calendar/events/:id
router.patch('/:id', async (req: Request, res: Response) => {
  const eventId = parseEventIdParam(req.params.id);

  if (eventId === null) {
    throw badRequest('The event id must be a positive integer.');
  }

  const bodyResult = UpdateCalendarEventBodySchema.safeParse(req.body);
  
  if (!bodyResult.success) {
    throw validationError(bodyResult.error.issues);
  }

  try {
    const event = await patchCalendarEvent(eventId, bodyResult.data, req.headers.authorization);
    return res.status(200).json(event);
  } catch (error) {
    throw calendarError(error, [400, 401, 403, 404]);
  }
});

// PATCH /calendar/events/:id/approval
router.patch('/:id/approval', async (req: Request, res: Response) => {
  const eventId = parseEventIdParam(req.params.id);

  if (eventId === null) {
    throw badRequest('The event id must be a positive integer.');
  }

  const bodyResult = UpdateCalendarEventApprovalBodySchema.safeParse(req.body);

  if (!bodyResult.success) {
    throw validationError(bodyResult.error.issues);
  }

  try {
    const event = await updateCalendarEventApproval(eventId, bodyResult.data.approvalStatus, req.headers.authorization);
    return res.status(200).json(event);
  } catch (error) {
    throw calendarError(error, [400, 401, 403, 404]);
  }
});

// DELETE /calendar/events/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const eventId = parseEventIdParam(req.params.id);

  if (eventId === null) {
    throw badRequest('The event id must be a positive integer.');
  }
  
  try {
    await deleteCalendarEvent(eventId, req.headers.authorization);
    return res.status(204).send();
  } catch (error) {
    throw calendarError(error, [400, 401, 403, 404]);
  }
});

export default router;
