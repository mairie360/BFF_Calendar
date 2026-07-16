import { Router, Request, Response } from 'express';
import {
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
  patchCalendarEvent,
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
    {
      name: 'from',
      in: 'query',
      required: true,
      schema: { type: 'string', format: 'date' },
      description: 'Date de début au format YYYY-MM-DD',
    },
    {
      name: 'to',
      in: 'query',
      required: true,
      schema: { type: 'string', format: 'date' },
      description: 'Date de fin au format YYYY-MM-DD',
    },
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
    400: {
      description: 'Paramètres invalides',
    },
    500: {
      description: 'Erreur serveur',
    },
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
          schema: { $ref: '#/components/schemas/UpdateCalendarEventBody' },
        },
      },
    },
    400: {
      description: 'Données invalides',
    },
    500: {
      description: 'Erreur serveur',
    },
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
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'Identifiant unique de l\'événement',
    },
  ],
  request: {
    body: {
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CalendarEvent' },
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
    400: {
      description: 'Données invalides',
    },
    404: {
      description: 'Événement non trouvé',
    },
    500: {
      description: 'Erreur serveur',
    },
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
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'Identifiant unique de l\'événement',
    },
  ],
  responses: {
    204: {
      description: 'Événement supprimé avec succès',
    },
    404: {
      description: 'Événement non trouvé',
    },
    500: {
      description: 'Erreur serveur',
    },
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
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'Identifiant unique de l\'événement',
    },
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
    400: {
      description: 'Données invalides',
    },
    404: {
      description: 'Événement non trouvé',
    },
    500: {
      description: 'Erreur serveur',
    },
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
    return res.status(400).json({ error: 'Les paramètres from et to sont obligatoires' });
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
  const { id } = req.params;
  const eventId = Number(id);
  
  if (!id || Number.isNaN(eventId)) {
    return res.status(400).json({ error: 'L\'ID est obligatoire' });
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
  const { id } = req.params;
  const eventId = Number(id);

  if (!id || Number.isNaN(eventId)) {
    return res.status(400).json({ error: 'L\'ID est obligatoire' });
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
  const { id } = req.params;
  const eventId = Number(id);
  
  if (!id || Number.isNaN(eventId)) {
    return res.status(400).json({ error: 'L\'ID est obligatoire' });
  }
  
  try {
    await deleteCalendarEvent(eventId, req.headers.authorization);
    return res.status(204).send();
  } catch (error) {
    return handleUnknownError(res, error);
  }
});

export default router;
