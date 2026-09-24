import { OpenAPIRegistry, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// On ajoute les méthodes .openapi() à Zod
extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// Bearer JWT read from the Authorization header (`getAuthorizationHeader`, src/config/token.ts) and
// forwarded upstream. The document requires it on every operation (`openapi.ts`); public operations
// opt out with `security: []`. The ZAP OpenAPI coverage gate reads this to tell which operations
// must be reached authenticated.
export const bearerAuth = registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

// ========================================
// Schémas - Récurrence
// ========================================

export const CalendarRecurrenceSchema = z.object({
  frequency: z.enum(['none', 'daily', 'weekly', 'monthly'])
    .openapi({ description: 'Fréquence de récurrence' }),
  interval: z.number().int().min(1).optional()
    .openapi({ description: 'Intervalle de récurrence (par défaut 1)', example: 1 }),
  daysOfWeek: z.array(z.number().int().min(0).max(6).openapi({ example: 1 })).optional()
    .openapi({ description: 'Jours de la semaine (0=dimanche, 6=samedi). Utilisé pour les récurrences hebdomadaires' }),
  endsOn: z.string().optional()
    .openapi({ description: 'Date de fin inclusive (format YYYY-MM-DD)', example: '2030-12-31' }),
}).openapi('CalendarRecurrence', { description: 'Recurrence rule of the event' });

// ========================================
// Schémas - Assignee
// ========================================

export const CalendarAssigneeSchema = z.object({
  id: z.string().or(z.number())
    .openapi({ description: 'Identifiant unique de la personne', example: 1 }),
  name: z.string()
    .openapi({ description: 'Nom complet affichable', example: 'Security Admin' }),
  email: z.string().email().optional()
    .openapi({ description: 'Adresse email', example: 'security-admin@mairie360.fr' }),
  role: z.string().optional()
    .openapi({ description: 'Fonction ou rôle métier', example: 'Admin' }),
  avatarUrl: z.string().url().optional()
    .openapi({ description: 'URL de l\'image de profil', example: 'https://mairie360.fr/avatar.png' }),
}).openapi('CalendarAssignee');

// ========================================
// Schémas - Événement Calendrier
// ========================================

// Stored texts are rendered by the fronts: `<` and `>` are refused.
const noMarkup = (schema: z.ZodString) => schema.regex(/^[^<>]*$/, 'Must not contain < or >');

export const CalendarEventSchema = z.object({
  id: z.string().or(z.number()).optional()
    .openapi({ description: 'Identifiant stable. Optionnel en création, obligatoire en lecture.' }),
  title: noMarkup(z.string())
    .openapi({ description: 'Titre de l\'événement', example: 'Scan event' }),
  date: z.string()
    .openapi({ description: 'Date de début (format YYYY-MM-DD ou DD-MM-YYYY)', example: '2030-06-15' }),
  endDate: z.string().optional()
    .openapi({ description: 'Date de fin pour les événements multi-jours (format YYYY-MM-DD ou DD-MM-YYYY)', example: '2030-06-15' }),
  category: z.enum(['meeting', 'activity', 'ceremony', 'other']).optional()
    .openapi({ description: 'Catégorie: meeting (Réunion), activity (Animation), ceremony (Cérémonie), other (Autre)' }),
  service: noMarkup(z.string()).optional().openapi({ description: 'Service ou département organisateur', example: 'direction' }),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional()
    .openapi({ description: 'Heure de début au format HH:mm', example: '09:00' }),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional()
    .openapi({ description: 'Heure de fin au format HH:mm', example: '10:00' }),
  location: noMarkup(z.string()).optional()
    .openapi({ description: 'Lieu de l\'événement', example: 'Town hall' }),
  description: noMarkup(z.string()).optional()
    .openapi({ description: 'Description détaillée' }),
  assigneeIds: z.array(z.string().or(z.number()).openapi({ example: 1 })).optional()
    .openapi({ description: 'Liste des identifiants des personnes assignées' }),
  assignees: z.array(CalendarAssigneeSchema).optional()
    .openapi({ description: 'Objets complets des personnes assignées (optionnel, peut être reconstruit côté front)' }),
  // No field-level description: it would publish an allOf, which generated requests (ZAP) fill as a string.
  recurrence: CalendarRecurrenceSchema.optional(),
  approvalStatus: z.enum(['pending', 'approved', 'rejected']).optional().openapi({ description: 'Statut d\'approbation de l\'événement' }),
  createdById: z.string().or(z.number()).optional()
    .openapi({ description: 'Identifiant de l\'utilisateur ayant créé l\'événement', example: 1 }),
  canValidate: z.boolean().optional()
    .openapi({ description: 'Indique si l’utilisateur courant peut valider ou refuser cet événement' }),
  canEdit: z.boolean().optional()
    .openapi({ description: 'Indique si l’utilisateur courant peut modifier cet événement' }),
  canDelete: z.boolean().optional()
    .openapi({ description: 'Indique si l’utilisateur courant peut supprimer cet événement' }),
  visibleToRoles: z.array(z.enum(['user', 'responsable', 'mayor'])).optional()
    .openapi({ description: 'Liste des rôles pouvant voir l\'événement' }),
}).openapi('CalendarEvent');

// ========================================
// Schémas - Catégorie
// ========================================

export const CalendarCategorySchema = z.object({
  label: z.string()
    .openapi({ description: 'Libellé affiché (ex: Réunion)' }),
  value: z.string()
    .openapi({ description: 'Valeur interne (ex: meeting)' }),
}).openapi('CalendarCategory');

// ========================================
// Schémas - Service calendrier
// ========================================

export const CalendarServiceSchema = z.object({
  label: z.string()
    .openapi({ description: 'Libellé affiché (ex: Direction générale)' }),
  value: z.string()
    .openapi({ description: 'Valeur interne (ex: direction)' }),
}).openapi('CalendarService');

// ========================================
// Schémas - Bootstrap Response
// ========================================

export const CalendarBootstrapResponseSchema = z.object({
  events: z.array(CalendarEventSchema)
    .openapi({ description: 'Liste des événements de la période' }),
  assignees: z.array(CalendarAssigneeSchema)
    .openapi({ description: 'Référentiel des personnes assignables' }),
  categories: z.array(CalendarCategorySchema)
    .openapi({ description: 'Référentiel des catégories' }),
  services: z.array(CalendarServiceSchema)
    .openapi({ description: 'Référentiel des services calendrier' }),
  currentUser: z.object({
    id: z.string().or(z.number()),
    name: z.string(),
    email: z.string().email(),
    role: z.string().optional(),
    groupIds: z.array(z.number().int()),
  }).optional()
    .openapi({ description: 'Utilisateur actuellement authentifié (optionnel)' }),
  assigneeScope: z.enum(['all', 'groups', 'self']).optional()
    .openapi({ description: 'Périmètre du référentiel des personnes assignables' }),
}).openapi('CalendarBootstrapResponse');

// ========================================
// Enregistrement des schémas dans le registre
// ========================================

registry.register('CalendarRecurrence', CalendarRecurrenceSchema);
registry.register('CalendarAssignee', CalendarAssigneeSchema);
registry.register('CalendarEvent', CalendarEventSchema);
registry.register('CalendarCategory', CalendarCategorySchema);
registry.register('CalendarService', CalendarServiceSchema);
registry.register('CalendarBootstrapResponse', CalendarBootstrapResponseSchema);

// ========================================
// Schémas - Statistics
// ========================================

export const CalendarStatisticsSchema = z.object({
  monthCount: z.number().int().min(0)
    .openapi({ description: 'Nombre d\'événements ce mois' }),
  weekCount: z.number().int().min(0)
    .openapi({ description: 'Nombre d\'événements cette semaine' }),
  todayCount: z.number().int().min(0)
    .openapi({ description: 'Nombre d\'événements aujourd\'hui' }),
}).openapi('CalendarStatistics');

registry.register('CalendarStatistics', CalendarStatisticsSchema);

// ========================================
// Schémas - Params
// ========================================

export const CalendarEventParamsSchema = z.object({
  eventId: z.string().or(z.number())
    .openapi({
      description: "Identifiant de l'événement",
      example: "123",
    }),
}).openapi('CalendarEventParams');

registry.register('CalendarEventParams', CalendarEventParamsSchema);

// ========================================
// Schémas - Query
// ========================================

export const CalendarEventsQuerySchema = z.object({
  startDate: z.string().optional().openapi({
    description: 'Date de début (YYYY-MM-DD)',
  }),

  endDate: z.string().optional().openapi({
    description: 'Date de fin (YYYY-MM-DD)',
  }),

  assigneeId: z.string().optional().openapi({
    description: 'Filtre sur une personne assignée',
  }),

  category: z.string().optional().openapi({
    description: 'Filtre sur une catégorie',
  }),
}).openapi('CalendarEventsQuery');

registry.register('CalendarEventsQuery', CalendarEventsQuerySchema);

// ========================================
// Schémas - Création d'événement
// ========================================

export const CreateCalendarEventBodySchema = CalendarEventSchema.omit({
  id: true,
}).openapi('CreateCalendarEventBody');

registry.register(
  'CreateCalendarEventBody',
  CreateCalendarEventBodySchema,
);

// ========================================
// Schémas - Modification d'événement
// ========================================

export const UpdateCalendarEventBodySchema =
  CreateCalendarEventBodySchema.partial().openapi(
    'UpdateCalendarEventBody',
  );

registry.register(
  'UpdateCalendarEventBody',
  UpdateCalendarEventBodySchema,
);

// ========================================
// Schémas - Approbation d'événement
// ========================================

export const UpdateCalendarEventApprovalBodySchema = z.object({
  approvalStatus: z.enum(['pending', 'approved', 'rejected'])
    .openapi({ description: 'Nouveau statut d\'approbation de l\'événement' }),
}).openapi('UpdateCalendarEventApprovalBody');

registry.register(
  'UpdateCalendarEventApprovalBody',
  UpdateCalendarEventApprovalBodySchema,
);

// ========================================
// Schémas - Erreur API
// ========================================

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
}).openapi('ApiError');

registry.register('ApiError', ApiErrorSchema);

// ========================================
// Fragments OpenAPI partagés par les routes
// ========================================

/** Réponse d'erreur documentée avec le corps ApiError. */
export function apiErrorResponse(description: string) {
  return {
    description,
    content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
  };
}

/** Paramètre de requête date au format YYYY-MM-DD. */
export function dateQueryParameter(name: 'from' | 'to', required: boolean, description: string) {
  // The examples frame the events seeded by init-test.sql.
  const example = name === 'from' ? '2030-06-01' : '2030-06-30';
  return { name, in: 'query' as const, required, schema: { type: 'string' as const, format: 'date', example }, description };
}

/** Paramètre de chemin identifiant un événement (entier positif). */
// Event ids of the examples (101, 102) differ from every user id, so a scan reusing the path segment as
// an assignee id does not mistake a user for the event.
export const eventIdPathParameter = {
  name: 'id',
  in: 'path' as const,
  required: true,
  schema: { type: 'string' as const, pattern: '^[0-9]+$', example: '101' },
  description: 'Identifiant unique de l\'événement',
};

/** Same parameter for DELETE, with another seeded event: a replayed scan must not delete event 101. */
export const deletedEventIdPathParameter = {
  ...eventIdPathParameter,
  schema: { ...eventIdPathParameter.schema, example: '102' },
};
