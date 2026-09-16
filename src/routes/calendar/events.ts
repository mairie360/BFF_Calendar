import { Router, Request, Response } from 'express';
import {
  apiErrorResponse,
  dateQueryParameter,
  eventIdPathParameter,
  registry,
  CreateCalendarEventBodySchema,
  UpdateCalendarEventApprovalBodySchema,
  UpdateCalendarEventBodySchema,
} from '../../openapi-registry';
import {
  createCalendarEvent,
  deleteCalendarEvent,
  fetchCalendarEvents,
  handleUnknownError,
  isQueryDate,
  parseEventIdParam,
  patchCalendarEvent,
  sendBadRequest,
  sendValidationError,
  updateCalendarEventApproval,
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
    400: apiErrorResponse('Paramètres invalides'),
    401: apiErrorResponse('Session invalide'),
    500: apiErrorResponse('Erreur serveur'),
    502: apiErrorResponse('Calendar API indisponible'),
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
    400: apiErrorResponse('Données invalides'),
    401: apiErrorResponse('Session invalide'),
    403: apiErrorResponse('Personne assignée hors du périmètre autorisé'),
    500: apiErrorResponse('Erreur serveur'),
    502: apiErrorResponse('Calendar API indisponible'),
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
    400: apiErrorResponse('Données invalides'),
    401: apiErrorResponse('Session invalide'),
    403: apiErrorResponse('Action non autorisée sur cet événement'),
    404: apiErrorResponse('Événement non trouvé'),
    500: apiErrorResponse('Erreur serveur'),
    502: apiErrorResponse('Calendar API indisponible'),
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
    eventIdPathParameter,
  ],
  responses: {
    204: {
      description: 'Événement supprimé avec succès',
    },
    400: apiErrorResponse('Identifiant invalide'),
    401: apiErrorResponse('Session invalide'),
    403: apiErrorResponse('Seul le créateur peut supprimer l’événement'),
    404: apiErrorResponse('Événement non trouvé'),
    500: apiErrorResponse('Erreur serveur'),
    502: apiErrorResponse('Calendar API indisponible'),
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
    400: apiErrorResponse('Données invalides'),
    401: apiErrorResponse('Session invalide'),
    403: apiErrorResponse('Action non autorisée sur cet événement'),
    404: apiErrorResponse('Événement non trouvé'),
    500: apiErrorResponse('Erreur serveur'),
    502: apiErrorResponse('Calendar API indisponible'),
  },
});

// ========================================
// Implémentation
// ========================================

// GET /calendar/events
router.get('/', async (req: Request, res: Response) => {
  const from = typeof req.query.from === 'string' ? req.query.from : undefined;
  const to = typeof req.query.to === 'string' ? req.query.to : undefined;
  const token = req.headers.authorization;
  
  if (!from || !to) {
    return sendBadRequest(res, 'Les paramètres from et to sont obligatoires.');
  }

  if (!isQueryDate(from) || !isQueryDate(to)) {
    return sendBadRequest(res, 'Les paramètres from et to doivent être des dates au format YYYY-MM-DD.');
  }
  
  try {
    const events = await fetchCalendarEvents(from, to, token);
    return res.status(200).json(events);
  } catch (error) {
    return handleUnknownError(res, error);
  }
});

// POST /calendar/events
router.post('/', async (req: Request, res: Response) => {
  const bodyResult = CreateCalendarEventBodySchema.safeParse(req.body);

  if (!bodyResult.success) {
    return sendValidationError(res, bodyResult.error.issues);
  }

  try {
    const event = await createCalendarEvent(bodyResult.data, req.headers.authorization);
    return res.status(201).json(event);
  } catch (error) {
    return handleUnknownError(res, error);
  }
});

// PATCH /calendar/events/:id
router.patch('/:id', async (req: Request, res: Response) => {
  const eventId = parseEventIdParam(req.params.id);

  if (eventId === null) {
    return sendBadRequest(res, 'L\'identifiant de l\'événement doit être un entier positif.');
  }

  const bodyResult = UpdateCalendarEventBodySchema.safeParse(req.body);
  
  if (!bodyResult.success) {
    return sendValidationError(res, bodyResult.error.issues);
  }

  try {
    const event = await patchCalendarEvent(eventId, bodyResult.data, req.headers.authorization);
    return res.status(200).json(event);
  } catch (error) {
    return handleUnknownError(res, error);
  }
});

// PATCH /calendar/events/:id/approval
router.patch('/:id/approval', async (req: Request, res: Response) => {
  const eventId = parseEventIdParam(req.params.id);

  if (eventId === null) {
    return sendBadRequest(res, 'L\'identifiant de l\'événement doit être un entier positif.');
  }

  const bodyResult = UpdateCalendarEventApprovalBodySchema.safeParse(req.body);

  if (!bodyResult.success) {
    return sendValidationError(res, bodyResult.error.issues);
  }

  try {
    const event = await updateCalendarEventApproval(eventId, bodyResult.data.approvalStatus, req.headers.authorization);
    return res.status(200).json(event);
  } catch (error) {
    return handleUnknownError(res, error);
  }
});

// DELETE /calendar/events/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const eventId = parseEventIdParam(req.params.id);

  if (eventId === null) {
    return sendBadRequest(res, 'L\'identifiant de l\'événement doit être un entier positif.');
  }
  
  try {
    await deleteCalendarEvent(eventId, req.headers.authorization);
    return res.status(204).send();
  } catch (error) {
    return handleUnknownError(res, error);
  }
});

export default router;
