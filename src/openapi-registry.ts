import { OpenAPIRegistry, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { ErrorResponseSchema as LibErrorResponseSchema } from '@mairie360/bffs-lib';
import { z } from 'zod';

// Adds the .openapi() methods to Zod
extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// Bearer JWT read from the Authorization header (`authorization(req)` of @mairie360/bffs-lib) and
// forwarded upstream. The document requires it on every operation (`openapi.ts`); public operations
// opt out with `security: []`. The ZAP OpenAPI coverage gate reads this to tell which operations
// must be reached authenticated.
export const bearerAuth = registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

// ========================================
// Schemas - Recurrence
// ========================================

// A real calendar day, `YYYY-MM-DD` or `DD-MM-YYYY` / `DD/MM/YYYY` (MAIR-474): an unchecked value used to
// reach the time zone conversion and answer a 502 instead of a 400.
const CALENDAR_DATE = /^(?:(\d{4})-(\d{2})-(\d{2})|(\d{2})[-/](\d{2})[-/](\d{4}))$/;

export function isCalendarDate(value: string): boolean {
  const match = CALENDAR_DATE.exec(value);
  if (!match) return false;
  const [year, month, day] = (match[1] ? [match[1], match[2], match[3]] : [match[6], match[5], match[4]]).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return year >= 1000 && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

const CalendarDate = z.string().regex(CALENDAR_DATE).refine(isCalendarDate, 'Must be a real calendar day');
// `HH:mm`, 00:00 to 23:59.
const ClockTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const CalendarRecurrenceSchema = z.object({
  frequency: z.enum(['none', 'daily', 'weekly', 'monthly'])
    .openapi({ description: 'Frequency of the recurrence' }),
  interval: z.number().int().min(1).optional()
    .openapi({ description: 'Interval of the recurrence (1 by default)', example: 1 }),
  daysOfWeek: z.array(z.number().int().min(0).max(6).openapi({ example: 1 })).optional()
    .openapi({ description: 'Days of the week (0=Sunday, 6=Saturday). Used by weekly recurrences' }),
  endsOn: CalendarDate.optional()
    .openapi({ description: 'Inclusive end date (YYYY-MM-DD)', example: '2030-12-31' }),
}).openapi('CalendarRecurrence', { description: 'Recurrence rule of the event' });

// ========================================
// Schemas - Assignee
// ========================================

export const CalendarAssigneeSchema = z.object({
  id: z.string().or(z.number())
    .openapi({ description: 'Unique id of the person', example: 1 }),
  name: z.string()
    .openapi({ description: 'Displayable full name', example: 'Security Admin' }),
  email: z.string().email().optional()
    .openapi({ description: 'Email address', example: 'security-admin@mairie360.fr' }),
  role: z.string().optional()
    .openapi({ description: 'Job or business role', example: 'Admin' }),
  avatarUrl: z.string().url().optional()
    .openapi({ description: 'Profile picture URL', example: 'https://mairie360.fr/avatar.png' }),
}).openapi('CalendarAssignee');

// ========================================
// Schemas - Calendar event
// ========================================

// Stored texts are rendered by the fronts: `<` and `>` are refused.
const noMarkup = (schema: z.ZodString) => schema.regex(/^[^<>]*$/, 'Must not contain < or >');

export const CalendarEventSchema = z.object({
  id: z.string().or(z.number()).optional()
    .openapi({ description: 'Stable id. Optional on creation, always present on reads.' }),
  title: noMarkup(z.string())
    .openapi({ description: 'Title of the event', example: 'Scan event' }),
  date: CalendarDate
    .openapi({ description: 'Start date (YYYY-MM-DD or DD-MM-YYYY)', example: '2030-06-15' }),
  endDate: CalendarDate.optional()
    .openapi({ description: 'End date of a multi-day event (YYYY-MM-DD or DD-MM-YYYY)', example: '2030-06-15' }),
  category: z.enum(['meeting', 'activity', 'ceremony', 'other']).optional()
    .openapi({ description: 'Category: meeting, activity, ceremony or other' }),
  service: noMarkup(z.string()).optional().openapi({ description: 'Organising department', example: 'direction' }),
  startTime: ClockTime.optional()
    .openapi({ description: 'Start time as HH:mm', example: '09:00' }),
  endTime: ClockTime.optional()
    .openapi({ description: 'End time (HH:mm)', example: '10:00' }),
  location: noMarkup(z.string()).optional()
    .openapi({ description: 'Location of the event', example: 'Town hall' }),
  description: noMarkup(z.string()).optional()
    .openapi({ description: 'Detailed description' }),
  assigneeIds: z.array(z.string().or(z.number()).openapi({ example: 1 })).optional()
    .openapi({ description: 'Ids of the assigned people' }),
  assignees: z.array(CalendarAssigneeSchema).optional()
    .openapi({ description: 'Deprecated (MAIR-525): the people assigned, repeated in every event. Read `assigneeIds` and the `users` index of the answer instead; `/calendar/period` no longer sends it.' }),
  // No field-level description: it would publish an allOf, which generated requests (ZAP) fill as a string.
  recurrence: CalendarRecurrenceSchema.optional(),
  approvalStatus: z.enum(['pending', 'approved', 'rejected']).optional().openapi({ description: 'Approval status of the event' }),
  createdById: z.string().or(z.number()).optional()
    .openapi({ description: 'Id of the user who created the event', example: 1 }),
  canValidate: z.boolean().optional()
    .openapi({ description: 'Whether the current user can approve or reject this event' }),
  canEdit: z.boolean().optional()
    .openapi({ description: 'Whether the current user can edit this event' }),
  canDelete: z.boolean().optional()
    .openapi({ description: 'Whether the current user can delete this event' }),
  myParticipation: z.enum(['accepted', 'pending', 'declined']).optional()
    .openapi({ description: 'Answer of the current user to the invitation: pending until they answer, then accepted or declined. Absent when they are not assigned to the event.' }),
  canRespond: z.boolean().optional()
    .openapi({ description: 'Whether the current user can answer the invitation (they are assigned). Only on `GET /calendar/events/{id}` and the writes.' }),
  visibleToRoles: z.array(z.enum(['user', 'responsable', 'mayor'])).optional()
    .openapi({ description: 'Roles allowed to see the event' }),
}).openapi('CalendarEvent');

// ========================================
// Schemas - Category
// ========================================

export const CalendarCategorySchema = z.object({
  label: z.string()
    .openapi({ description: 'Displayed label (e.g. Réunion)' }),
  value: z.string()
    .openapi({ description: 'Valeur interne (ex: meeting)' }),
}).openapi('CalendarCategory');

// ========================================
// Schemas - Calendar department
// ========================================

export const CalendarServiceSchema = z.object({
  label: z.string()
    .openapi({ description: 'Displayed label (e.g. Direction générale)' }),
  value: z.string()
    .openapi({ description: 'Valeur interne (ex: direction)' }),
}).openapi('CalendarService');

// ========================================
// Schemas - Bootstrap response
// ========================================

/** People referenced by an answer, indexed by their public id (`user-<id>`), MAIR-525. */
export const CalendarUsersSchema = z.record(z.string(), CalendarAssigneeSchema)
  .openapi('CalendarUsers', { description: 'People referenced by the answer (event members, assignable people), indexed by their id (`user-<id>`): each one is sent once.' });

export const CalendarBootstrapResponseSchema = z.object({
  events: z.array(CalendarEventSchema)
    .openapi({ description: 'Events of the period' }),
  users: CalendarUsersSchema,
  assignees: z.array(CalendarAssigneeSchema)
    .openapi({ description: 'Assignable people' }),
  categories: z.array(CalendarCategorySchema)
    .openapi({ description: 'Categories' }),
  services: z.array(CalendarServiceSchema)
    .openapi({ description: 'Calendar departments' }),
  currentUser: z.object({
    id: z.string().or(z.number()),
    name: z.string(),
    email: z.string().email(),
    role: z.string().optional(),
    groupIds: z.array(z.number().int()),
  }).optional()
    .openapi({ description: 'Currently authenticated user (optional)' }),
  assigneeScope: z.enum(['all', 'groups', 'self']).optional()
    .openapi({ description: 'Scope of the assignable people' }),
}).openapi('CalendarBootstrapResponse');

export const CalendarPeriodResponseSchema = z.object({
  events: z.array(CalendarEventSchema.omit({ assignees: true }))
    .openapi({ description: 'Events of the period, each with its `assigneeIds` and no embedded people' }),
  users: CalendarUsersSchema,
}).openapi('CalendarPeriodResponse');

// ========================================
// Registration of the schemas in the registry
// ========================================

registry.register('CalendarRecurrence', CalendarRecurrenceSchema);
registry.register('CalendarAssignee', CalendarAssigneeSchema);
registry.register('CalendarEvent', CalendarEventSchema);
registry.register('CalendarCategory', CalendarCategorySchema);
registry.register('CalendarService', CalendarServiceSchema);
registry.register('CalendarBootstrapResponse', CalendarBootstrapResponseSchema);
registry.register('CalendarUsers', CalendarUsersSchema);
registry.register('CalendarPeriodResponse', CalendarPeriodResponseSchema);

// ========================================
// Schemas - Statistics
// ========================================

export const CalendarStatisticsSchema = z.object({
  monthCount: z.number().int().min(0)
    .openapi({ description: 'Number of events this month' }),
  weekCount: z.number().int().min(0)
    .openapi({ description: 'Number of events this week' }),
  todayCount: z.number().int().min(0)
    .openapi({ description: 'Number of events today' }),
}).openapi('CalendarStatistics');

registry.register('CalendarStatistics', CalendarStatisticsSchema);

// ========================================
// Schemas - Params
// ========================================

export const CalendarEventParamsSchema = z.object({
  eventId: z.string().or(z.number())
    .openapi({
      description: "Id of the event",
      example: "123",
    }),
}).openapi('CalendarEventParams');

registry.register('CalendarEventParams', CalendarEventParamsSchema);

// ========================================
// Schemas - Query
// ========================================

export const CalendarEventsQuerySchema = z.object({
  startDate: z.string().optional().openapi({
    description: 'Start date (YYYY-MM-DD)',
  }),

  endDate: z.string().optional().openapi({
    description: 'End date (YYYY-MM-DD)',
  }),

  assigneeId: z.string().optional().openapi({
    description: 'Filter on an assigned person',
  }),

  category: z.string().optional().openapi({
    description: 'Filter on a category',
  }),
}).openapi('CalendarEventsQuery');

registry.register('CalendarEventsQuery', CalendarEventsQuerySchema);

// ========================================
// Schemas - Event creation
// ========================================

export const CreateCalendarEventBodySchema = CalendarEventSchema.omit({
  id: true,
}).openapi('CreateCalendarEventBody');

registry.register(
  'CreateCalendarEventBody',
  CreateCalendarEventBodySchema,
);

// ========================================
// Schemas - Event update
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
// Schemas - Event approval
// ========================================

export const UpdateCalendarEventApprovalBodySchema = z.object({
  approvalStatus: z.enum(['pending', 'approved', 'rejected'])
    .openapi({ description: 'New approval status of the event' }),
}).openapi('UpdateCalendarEventApprovalBody');

registry.register(
  'UpdateCalendarEventApprovalBody',
  UpdateCalendarEventApprovalBodySchema,
);

// ========================================
// Schemas - Answer to an invitation
// ========================================

export const UpdateCalendarEventParticipationBodySchema = z.object({
  status: z.enum(['accepted', 'declined'])
    .openapi({ description: 'Answer of the current user: accepted (they take part) or declined', example: 'accepted' }),
}).strict().openapi('UpdateCalendarEventParticipationBody');

registry.register(
  'UpdateCalendarEventParticipationBody',
  UpdateCalendarEventParticipationBodySchema,
);

// ========================================
// Error envelope
// ========================================

// Body of every error answer, shared by every BFF (`@mairie360/bffs-lib`): `{ error: { code, message, details } }`.
// clone(): the lib builds its schemas on import, before extendZodWithOpenApi() above, and zod 4 only
// adds .openapi() to schemas created after the extension.
export const ErrorResponseSchema = registry.register('ErrorResponse', LibErrorResponseSchema.clone());

// ========================================
// OpenAPI fragments shared by the routes
// ========================================

/** Error response documented with the shared ErrorResponse body. */
export function apiErrorResponse(description: string) {
  return {
    description,
    content: { 'application/json': { schema: ErrorResponseSchema } },
  };
}

/** Date query parameter, as YYYY-MM-DD. */
export function dateQueryParameter(name: 'from' | 'to', required: boolean, description: string) {
  // The examples frame the events seeded by init-test.sql.
  const example = name === 'from' ? '2030-06-01' : '2030-06-30';
  return { name, in: 'query' as const, required, schema: { type: 'string' as const, format: 'date', example }, description };
}

/** Path parameter identifying an event (positive integer). */
// Event ids of the examples (101, 102) differ from every user id, so a scan reusing the path segment as
// an assignee id does not mistake a user for the event.
export const eventIdPathParameter = {
  name: 'id',
  in: 'path' as const,
  required: true,
  schema: { type: 'string' as const, pattern: '^[0-9]+$', example: '101' },
  description: 'Unique id of the event',
};

/** Same parameter for DELETE, with another seeded event: a replayed scan must not delete event 101. */
export const deletedEventIdPathParameter = {
  ...eventIdPathParameter,
  schema: { ...eventIdPathParameter.schema, example: '102' },
};
