import axios, { AxiosError } from 'axios';
import type { AxiosRequestConfig } from 'axios';
import type { Response } from 'express';
import { z } from 'zod';
import calendarApi from '../../clients/calendarClient';
import { getAuthorizationHeader } from '../../config/token';
import { listCalendarDirectoryUsers } from '../../clients/coreDirectory';
import {
  CalendarAccessError,
  CalendarDirectoryUser,
  CalendarEventAccess,
  calendarAssigneeScope,
  calendarEventApprovalStatus,
  canCurrentUserDeleteEvent,
  canCurrentUserEditEvent,
  canCurrentUserValidateEvent,
  getCurrentCalendarUser,
  listAssignableCalendarUsers,
  primaryCalendarRole,
  resolveAuthorizedAssigneeIds,
} from '../../services/calendarAccessPolicy';
import {
  CalendarAssigneeSchema,
  CalendarCategorySchema,
  CalendarEventSchema,
  CalendarRecurrenceSchema,
  CalendarServiceSchema,
} from '../../openapi-registry';

export type BffCalendarAssignee = z.infer<typeof CalendarAssigneeSchema>;
export type BffCalendarCategory = z.infer<typeof CalendarCategorySchema>;
export type BffCalendarEvent = z.infer<typeof CalendarEventSchema>;
export type BffCalendarRecurrence = z.infer<typeof CalendarRecurrenceSchema>;
export type BffCalendarService = z.infer<typeof CalendarServiceSchema>;
export type BffCalendarEventPatch = Partial<BffCalendarEvent>;

type ApiRecurrence = {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  days_of_week?: number[] | null;
  ends_on?: string | null;
};

type ApiEventListItem = {
  id: number;
  name: string;
  start: string;
  end: string;
  is_member: boolean;
  category?: BffCalendarEvent['category'];
  service?: string | null;
  location?: string | null;
  recurrence?: ApiRecurrence | null;
};

type ApiEventMember = {
  id: number;
  validation_status: 'pending' | 'validated' | 'refused';
};

type ApiEventDetails = {
  id: number;
  name: string;
  description?: string | null;
  events_start_time: string;
  events_end_time: string;
  category?: BffCalendarEvent['category'];
  service?: string | null;
  location?: string | null;
  recurrence?: ApiRecurrence | null;
  owner?: number | null;
  created_by?: number | null;
  members: ApiEventMember[];
  approval_status: 'pending' | 'approved' | 'rejected';
  permissions: { can_edit: boolean; can_delete: boolean; can_validate: boolean };
};

type ApiEventBody = {
  name: string;
  description?: string | null;
  events_start_time: string;
  events_end_time: string;
  category?: BffCalendarEvent['category'];
  service?: string | null;
  location?: string | null;
  recurrence?: ApiRecurrence | null;
};

const categories: BffCalendarCategory[] = [
  { label: 'Réunion', value: 'meeting' },
  { label: 'Animation', value: 'activity' },
  { label: 'Cérémonie', value: 'ceremony' },
  { label: 'Autre', value: 'other' },
];

const services: BffCalendarService[] = [
  { label: 'Direction générale', value: 'direction' },
  { label: 'Communication', value: 'communication' },
  { label: 'Culture', value: 'culture' },
  { label: 'Logistique', value: 'logistique' },
  { label: 'Accueil', value: 'accueil' },
  { label: 'Sécurité', value: 'securite' },
];

function splitDateTime(value: string): { date: string; time?: string } {
  const date = value.slice(0, 10);
  const timeMatch = value.match(/T(\d{2}:\d{2})/);
  return { date, time: timeMatch?.[1] };
}

function normalizeCalendarDate(date: string): string {
  const normalizedDate = date.trim();
  const frenchDateMatch = normalizedDate.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);

  if (frenchDateMatch) {
    const [, day, month, year] = frenchDateMatch;
    return `${year}-${month}-${day}`;
  }

  return normalizedDate.slice(0, 10);
}

function combineDateTime(date: string, time?: string): string {
  const normalizedDate = normalizeCalendarDate(date);

  if (!time) {
    return `${normalizedDate}T00:00:00Z`;
  }

  const normalizedTime = time.length === 5 ? `${time}:00` : time;
  return `${normalizedDate}T${normalizedTime.replace(/Z$/, '')}Z`;
}

function toApiDateTime(value: string, boundary: 'start' | 'end'): string {
  if (value.includes('T')) {
    return value;
  }

  return boundary === 'start' ? `${value}T00:00:00Z` : `${value}T23:59:59Z`;
}

function mapRecurrenceToBff(recurrence?: ApiRecurrence | null): BffCalendarRecurrence | undefined {
  if (!recurrence) return undefined;

  return {
    frequency: recurrence.frequency,
    interval: recurrence.interval,
    ...(recurrence.days_of_week?.length ? { daysOfWeek: recurrence.days_of_week } : {}),
    ...(recurrence.ends_on ? { endsOn: recurrence.ends_on } : {}),
  };
}

/** Récurrence du BFF vers celle de Calendar API (`none` et absence signifient « pas de répétition »). */
function mapRecurrenceToApi(recurrence?: BffCalendarRecurrence): ApiRecurrence | null {
  if (!recurrence || recurrence.frequency === 'none') return null;

  const endsOn = recurrence.endsOn?.trim();
  return {
    frequency: recurrence.frequency,
    interval: recurrence.interval ?? 1,
    ...(recurrence.daysOfWeek?.length ? { days_of_week: recurrence.daysOfWeek } : {}),
    ...(endsOn ? { ends_on: normalizeCalendarDate(endsOn) } : {}),
  };
}

function mapDirectoryUserToAssignee(user: CalendarDirectoryUser): BffCalendarAssignee {
  return {
    id: `user-${user.id}`,
    name: `${user.firstName} ${user.lastName}`.trim(),
    email: user.email,
    role: primaryCalendarRole(user),
  };
}

function mapEventListItemToBff(event: ApiEventListItem): BffCalendarEvent {
  const start = splitDateTime(event.start);
  const end = splitDateTime(event.end);

  return {
    id: event.id,
    title: event.name,
    date: start.date,
    endDate: end.date !== start.date ? end.date : undefined,
    category: event.category ?? 'other',
    service: event.service ?? undefined,
    location: event.location ?? undefined,
    recurrence: mapRecurrenceToBff(event.recurrence),
    startTime: start.time,
    endTime: end.time,
  };
}

function mapEventDetailsToBff(event: ApiEventDetails): BffCalendarEvent {
  const start = splitDateTime(event.events_start_time);
  const end = splitDateTime(event.events_end_time);

  return {
    id: event.id,
    title: event.name,
    date: start.date,
    endDate: end.date !== start.date ? end.date : undefined,
    category: event.category ?? 'other',
    service: event.service ?? undefined,
    location: event.location ?? undefined,
    recurrence: mapRecurrenceToBff(event.recurrence),
    startTime: start.time,
    endTime: end.time,
    description: event.description ?? undefined,
  };
}

/** Membres de l'événement résolus dans l'annuaire, avec les droits calculés par Calendar API. */
async function toEventAccess(
  event: ApiEventDetails,
  incomingRequestToken?: string,
): Promise<CalendarEventAccess> {
  const directory = await listCalendarDirectoryUsers(
    { ids: event.members.map((member) => member.id) },
    incomingRequestToken,
  );
  const statusById = new Map(event.members.map((member) => [member.id, member.validation_status]));

  return {
    eventId: event.id,
    createdById: event.created_by ?? null,
    members: directory.map((user) => ({
      ...user,
      validationStatus: statusById.get(user.id) ?? 'pending',
    })),
    approvalStatus: event.approval_status,
    permissions: {
      canEdit: event.permissions.can_edit,
      canDelete: event.permissions.can_delete,
      canValidate: event.permissions.can_validate,
    },
  };
}

/** Événement lu dans Calendar API, avec ses membres et les droits de l'appelant. */
async function loadCalendarEvent(
  eventId: number,
  incomingRequestToken?: string,
): Promise<{ event: ApiEventDetails; access: CalendarEventAccess }> {
  const response = await calendarApi.getEvent(eventId, authOptions(incomingRequestToken));
  const event = response.data as ApiEventDetails;

  return { event, access: await toEventAccess(event, incomingRequestToken) };
}

function enrichCalendarEvent(
  event: BffCalendarEvent,
  eventAccess: CalendarEventAccess,
): BffCalendarEvent {
  const assignees = eventAccess.members.map(mapDirectoryUserToAssignee);

  return {
    ...event,
    assigneeIds: assignees.map((assignee) => assignee.id),
    assignees,
    approvalStatus: calendarEventApprovalStatus(eventAccess),
    createdById: eventAccess.createdById === null ? undefined : `user-${eventAccess.createdById}`,
    canValidate: canCurrentUserValidateEvent(eventAccess),
    canEdit: canCurrentUserEditEvent(eventAccess),
    canDelete: canCurrentUserDeleteEvent(eventAccess),
  };
}

/** Corps d'écriture d'un événement pour Calendar API. */
function mapEventToApiBody(event: BffCalendarEvent): ApiEventBody {
  return {
    name: event.title,
    description: event.description ?? null,
    events_start_time: combineDateTime(event.date, event.startTime),
    events_end_time: combineDateTime(event.endDate ?? event.date, event.endTime),
    category: event.category ?? 'other',
    service: event.service ?? null,
    location: event.location ?? null,
    recurrence: mapRecurrenceToApi(event.recurrence),
  };
}

function authOptions(incomingRequestToken?: string): AxiosRequestConfig {
  const authHeader = getAuthorizationHeader(incomingRequestToken);

  if (!authHeader) {
    return {};
  }

  return {
    headers: {
      Authorization: authHeader,
    },
  };
}

const QUERY_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Vérifie qu'un paramètre de requête est une date calendaire valide au format YYYY-MM-DD. */
export function isQueryDate(value: unknown): value is string {
  const match = typeof value === 'string' ? QUERY_DATE_PATTERN.exec(value) : null;
  if (!match) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return date.getUTCFullYear() === Number(match[1])
    && date.getUTCMonth() + 1 === Number(match[2])
    && date.getUTCDate() === Number(match[3]);
}

/** Identifiant d'événement de chemin : entier positif, sinon null. */
export function parseEventIdParam(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function sendBadRequest(res: Response, message: string): Response {
  return res.status(400).json({ code: 'BAD_REQUEST', message });
}

export function sendValidationError(res: Response, details: unknown): Response {
  return res.status(400).json({
    code: 'BAD_REQUEST',
    message: 'Validation failed',
    details,
  });
}

export function handleUnknownError(res: Response, error: unknown): Response {
  if (error instanceof CalendarAccessError) {
    return res.status(error.status).json({
      code: error.code,
      message: error.message,
    });
  }

  // Les messages et corps d'erreur amont (Calendar API, PostgreSQL) ne sont jamais renvoyés au client.
  if (axios.isAxiosError(error)) {
    const status = (error as AxiosError).response?.status;
    if (status === undefined || status >= 500) {
      return res.status(502).json({ code: 'BAD_GATEWAY', message: 'Le service Calendar est indisponible.' });
    }

    return res.status(status).json({
      code: status === 401 ? 'UNAUTHORIZED' : status === 404 ? 'NOT_FOUND' : 'UPSTREAM_ERROR',
      message: status === 401
        ? 'Session invalide.'
        : status === 404 ? 'Ressource introuvable.' : 'La requête a été refusée par le service Calendar.',
    });
  }

  console.error('[BFF Calendar] Erreur inattendue', error);
  return res.status(500).json({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Erreur interne du serveur.',
  });
}

export async function fetchCalendarEvents(
  from: string,
  to: string,
  incomingRequestToken?: string,
): Promise<BffCalendarEvent[]> {
  // Calendar API renvoie les événements possédés ou assignés de la période, y compris ceux dont la
  // règle de répétition la chevauche, et indique l'appartenance de l'appelant.
  const response = await calendarApi.getCalendar(
    { start: toApiDateTime(from, 'start'), end: toApiDateTime(to, 'end') } as never,
    authOptions(incomingRequestToken),
  );

  return (response.data.events as ApiEventListItem[])
    .filter((event) => event.is_member)
    .map(mapEventListItemToBff);
}

export async function fetchCalendarEvent(
  eventId: number,
  incomingRequestToken?: string,
): Promise<BffCalendarEvent> {
  const { event, access } = await loadCalendarEvent(eventId, incomingRequestToken);

  return enrichCalendarEvent(mapEventDetailsToBff(event), access);
}

export async function createCalendarEvent(
  event: BffCalendarEvent,
  incomingRequestToken?: string,
): Promise<BffCalendarEvent> {
  const currentUser = await getCurrentCalendarUser(incomingRequestToken);
  const assigneeIds = await resolveAuthorizedAssigneeIds(
    currentUser,
    event.assigneeIds ?? [],
    incomingRequestToken,
  );
  const response = await calendarApi.createEvent(
    mapEventToApiBody(event) as never,
    authOptions(incomingRequestToken),
  );
  const eventId = response.data.event_id;

  // Calendar API recalcule la validation à chaque changement de membres.
  await syncEventMembers(eventId, [], assigneeIds, incomingRequestToken);

  return fetchCalendarEvent(eventId, incomingRequestToken);
}

export async function patchCalendarEvent(
  eventId: number,
  event: BffCalendarEventPatch,
  incomingRequestToken?: string,
): Promise<BffCalendarEvent> {
  const { event: current, access } = await loadCalendarEvent(eventId, incomingRequestToken);
  if (!canCurrentUserEditEvent(access)) {
    throw new CalendarAccessError(
      'Seuls le créateur, un responsable, le maire ou un administrateur assigné peuvent modifier cet événement.',
      403,
      'EVENT_UPDATE_FORBIDDEN',
    );
  }

  const mergedEvent = { ...mapEventDetailsToBff(current), ...event };
  await calendarApi.patchEvent(
    eventId,
    mapEventToApiBody(mergedEvent) as never,
    authOptions(incomingRequestToken),
  );

  if (event.assigneeIds) {
    const currentUser = await getCurrentCalendarUser(incomingRequestToken);
    const assigneeIds = await resolveAuthorizedAssigneeIds(
      currentUser,
      event.assigneeIds,
      incomingRequestToken,
    );
    await syncEventMembers(
      eventId,
      current.members.map((member) => member.id),
      assigneeIds,
      incomingRequestToken,
    );
  }

  return fetchCalendarEvent(eventId, incomingRequestToken);
}

export async function deleteCalendarEvent(eventId: number, incomingRequestToken?: string): Promise<void> {
  const { access } = await loadCalendarEvent(eventId, incomingRequestToken);

  if (!canCurrentUserDeleteEvent(access)) {
    throw new CalendarAccessError(
      'Seul le créateur de l’événement peut le supprimer.',
      403,
      'EVENT_DELETE_FORBIDDEN',
    );
  }

  await calendarApi.deleteEvent(eventId, authOptions(incomingRequestToken));
}

export function getCalendarCategories(): BffCalendarCategory[] {
  return categories;
}

export function getCalendarServices(): BffCalendarService[] {
  return services;
}

export async function updateCalendarEventApproval(
  eventId: number,
  approvalStatus: NonNullable<BffCalendarEvent['approvalStatus']>,
  incomingRequestToken?: string,
): Promise<BffCalendarEvent> {
  const { access } = await loadCalendarEvent(eventId, incomingRequestToken);

  if (!canCurrentUserValidateEvent(access)) {
    throw new CalendarAccessError(
      'Seul un responsable assigné du groupe peut valider cet événement.',
      403,
      'EVENT_APPROVAL_FORBIDDEN',
    );
  }

  await calendarApi.updateEventValidation(
    eventId,
    { status: approvalStatus } as never,
    authOptions(incomingRequestToken),
  );

  return fetchCalendarEvent(eventId, incomingRequestToken);
}

export async function fetchKnownAssignees(
  from: string,
  to: string,
  incomingRequestToken?: string,
): Promise<BffCalendarAssignee[]> {
  await fetchCalendarEvents(from, to, incomingRequestToken);
  const currentUser = await getCurrentCalendarUser(incomingRequestToken);
  const users = await listAssignableCalendarUsers(currentUser, incomingRequestToken);
  return users.map(mapDirectoryUserToAssignee);
}

export async function fetchCalendarBootstrap(
  from: string,
  to: string,
  incomingRequestToken?: string,
): Promise<{
  events: BffCalendarEvent[];
  assignees: BffCalendarAssignee[];
  currentUser: { id: string; name: string; email: string; role: string; groupIds: number[] };
  assigneeScope: 'all' | 'groups' | 'self';
}> {
  const calendarEvents = await fetchCalendarEvents(from, to, incomingRequestToken);
  const currentUser = await getCurrentCalendarUser(incomingRequestToken);
  const events = await Promise.all(
    calendarEvents.map((event) => fetchCalendarEvent(Number(event.id), incomingRequestToken)),
  );
  const assignableUsers = await listAssignableCalendarUsers(currentUser, incomingRequestToken);

  return {
    events,
    assignees: assignableUsers.map(mapDirectoryUserToAssignee),
    currentUser: {
      id: `user-${currentUser.id}`,
      name: `${currentUser.firstName} ${currentUser.lastName}`.trim(),
      email: currentUser.email,
      role: primaryCalendarRole(currentUser),
      groupIds: currentUser.groupIds,
    },
    assigneeScope: calendarAssigneeScope(currentUser),
  };
}

function formatLocalDate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function defaultDateRange(now = new Date()): { from: string; to: string } {
  // Dates locales : toISOString() décalerait d'un jour sur un fuseau en avance sur UTC (ex. Europe/Paris).
  return {
    from: formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: formatLocalDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

/** Aligne les membres de l'événement : Calendar API recalcule la validation à chaque changement. */
async function syncEventMembers(
  eventId: number,
  currentUserIds: number[],
  nextUserIds: number[],
  incomingRequestToken?: string,
): Promise<void> {
  const current = new Set(currentUserIds);
  const next = new Set(nextUserIds);

  await Promise.all(
    [...current]
      .filter((userId) => !next.has(userId))
      .map((userId) => calendarApi.removeEventMember(eventId, userId, authOptions(incomingRequestToken))),
  );

  await Promise.all(
    [...next]
      .filter((userId) => !current.has(userId))
      .map((userId) => calendarApi.addEventMember(
        eventId,
        { user_id: userId },
        authOptions(incomingRequestToken),
      )),
  );
}
