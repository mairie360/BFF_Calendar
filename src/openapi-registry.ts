import { OpenAPIRegistry, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// On ajoute les méthodes .openapi() à Zod
extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// ========================================
// Schémas - Récurrence
// ========================================

export const CalendarRecurrenceSchema = z.object({
  frequency: z.enum(['none', 'daily', 'weekly', 'monthly'])
    .openapi({ description: 'Fréquence de récurrence' }),
  interval: z.number().int().min(1).optional()
    .openapi({ description: 'Intervalle de récurrence (par défaut 1)' }),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional()
    .openapi({ description: 'Jours de la semaine (0=dimanche, 6=samedi). Utilisé pour les récurrences hebdomadaires' }),
  endsOn: z.string().optional()
    .openapi({ description: 'Date de fin inclusive (format YYYY-MM-DD)' }),
}).openapi('CalendarRecurrence');

// ========================================
// Schémas - Assignee
// ========================================

export const CalendarAssigneeSchema = z.object({
  id: z.string().or(z.number())
    .openapi({ description: 'Identifiant unique de la personne' }),
  name: z.string()
    .openapi({ description: 'Nom complet affichable' }),
  email: z.string().email().optional()
    .openapi({ description: 'Adresse email' }),
  role: z.string().optional()
    .openapi({ description: 'Fonction ou rôle métier' }),
  avatarUrl: z.string().url().optional()
    .openapi({ description: 'URL de l\'image de profil' }),
}).openapi('CalendarAssignee');

// ========================================
// Schémas - Événement Calendrier
// ========================================

export const CalendarEventSchema = z.object({
  id: z.string().or(z.number()).optional()
    .openapi({ description: 'Identifiant stable. Optionnel en création, obligatoire en lecture.' }),
  title: z.string()
    .openapi({ description: 'Titre de l\'événement' }),
  date: z.string()
    .openapi({ description: 'Date de début (format YYYY-MM-DD ou DD-MM-YYYY)' }),
  endDate: z.string().optional()
    .openapi({ description: 'Date de fin pour les événements multi-jours (format YYYY-MM-DD ou DD-MM-YYYY)' }),
  category: z.enum(['meeting', 'activity', 'ceremony', 'other']).optional()
    .openapi({ description: 'Catégorie: meeting (Réunion), activity (Animation), ceremony (Cérémonie), other (Autre)' }),
  service: z.string().optional().openapi({ description: 'Service ou département organisateur' }),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional()
    .openapi({ description: 'Heure de début au format HH:mm' }),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional()
    .openapi({ description: 'Heure de fin au format HH:mm' }),
  location: z.string().optional()
    .openapi({ description: 'Lieu de l\'événement' }),
  description: z.string().optional()
    .openapi({ description: 'Description détaillée' }),
  assigneeIds: z.array(z.string().or(z.number())).optional()
    .openapi({ description: 'Liste des identifiants des personnes assignées' }),
  assignees: z.array(CalendarAssigneeSchema).optional()
    .openapi({ description: 'Objets complets des personnes assignées (optionnel, peut être reconstruit côté front)' }),
  recurrence: CalendarRecurrenceSchema.optional()
    .openapi({ description: 'Règle de récurrence de l\'événement' }),
  approvalStatus: z.enum(['pending', 'approved', 'rejected']).optional().openapi({ description: 'Statut d\'approbation de l\'événement' }),
  createdById: z.string().or(z.number()).optional()
    .openapi({ description: 'Identifiant de l\'utilisateur ayant créé l\'événement' }),
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
