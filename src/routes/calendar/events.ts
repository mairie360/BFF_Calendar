import { Router, Request, Response } from 'express';
import { registry, CalendarEventSchema } from '../../openapi-registry';

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
          schema: { $ref: '#/components/schemas/CalendarEvent' },
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

// ========================================
// Implémentation
// ========================================

// GET /calendar/events
router.get('/', (req: Request, res: Response) => {
  const { from, to } = req.query;
  
  if (!from || !to) {
    return res.status(400).json({ error: 'Les paramètres from et to sont obligatoires' });
  }
  
  // TODO: Implémenter la logique
  res.status(501).json({ error: 'Not implemented' });
});

// POST /calendar/events
router.post('/', (req: Request, res: Response) => {
  // TODO: Implémenter la logique
  res.status(501).json({ error: 'Not implemented' });
});

// PATCH /calendar/events/:id
router.patch('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({ error: 'L\'ID est obligatoire' });
  }
  
  // TODO: Implémenter la logique
  res.status(501).json({ error: 'Not implemented' });
});

// DELETE /calendar/events/:id
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({ error: 'L\'ID est obligatoire' });
  }
  
  // TODO: Implémenter la logique
  res.status(501).json({ error: 'Not implemented' });
});

export default router;
