import axios, { AxiosError } from 'axios';
import type { AxiosRequestConfig } from 'axios';
import type { Response } from 'express';
import { z } from 'zod';
import calendarApi from '../../clients/calendarClient';
import { getAuthorizationHeader } from '../../config/token';
import {
  CalendarDirectoryUser,
  CalendarEventAccess,
  CalendarEventMetadata,
  filterAssignedCalendarEventIds,
  getCalendarDirectoryUser,
  getCalendarEventAccess,
  getCalendarEventMetadata,
  listAssignedRecurringCalendarEvents,
  setCalendarEventValidationStatus,
  updateCalendarEventDetails,
  upsertCalendarEventMetadata,
} from '../../repositories/calendarAccessRepository';
import {
  CalendarAccessError,
  apiValidationStatus,
  assertCalendarEventAssigned,
  calendarAssigneeScope,
  calendarEventApprovalStatus,
  canCurrentUserEditEvent,
  canCurrentUserValidateEvent,
  eventRequiresResponsibleApproval,
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

type CalendarMember = {
  id: number;
  member_type?: 'Group' | 'User' | 'Error';
  regular?: boolean;
};

type ApiEventListItem = {
  id: number;
  name: string;
  start: string;
  end: string;
};

type ApiEventDetails = {
  id: number;
  name?: string | null;
  description?: string | null;
  events_start_time: string;
  events_end_time: string;
  members: CalendarMember[];
  owner?: CalendarMember | number;
  recurrence_id?: number | null;
};

type ApiRecurrence = {
  description?: string | null;
  intervalle: number;
  name: string;
  owner_group_id?: number | null;
  recurrence_end_date: string;
  type_recurrence: 'Daily' | 'Weekly' | 'Monthly' | 'Error';
  visibility?: 'Public' | 'Private' | 'Error' | null;
};

type ApiCreateEventBody = {
  custom_description?: string | null;
  custom_name?: string | null;
  custom_visibility?: 'Public' | 'Private' | 'Error' | null;
  events_end_time: string;
  events_start_time: string;
  owner_group_id?: number | null;
  recurrence?: ApiRecurrence | null;
};

type ApiPatchEventBody = {
  description?: string | null;
  event_end_time: string;
  event_start_time: string;
  intervalle?: number | null;
  name?: string | null;
  reccurence_end_date: string;
  visibility?: 'Public' | 'Private' | 'Error' | null;
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

function parseNumericId(value: string | number | undefined): number | null {
  if (value === undefined) {
    return null;
  }

  const text = String(value);
  const match = text.match(/\d+$/);
  if (!match) {
    return null;
  }

  const id = Number(match[0]);
  return Number.isNaN(id) ? null : id;
}

function mapMemberToAssignee(member: CalendarMember): BffCalendarAssignee {
  const memberType = member.member_type ?? 'User';
  const prefix = memberType === 'Group' ? 'group' : 'user';

  return {
    id: `${prefix}-${member.id}`,
    name: memberType === 'Group' ? `Groupe ${member.id}` : `Utilisateur ${member.id}`,
    role: memberType,
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
    category: 'other',
    startTime: start.time,
    endTime: end.time,
  };
}

function mapEventDetailsToBff(event: ApiEventDetails): BffCalendarEvent {
  const start = splitDateTime(event.events_start_time);
  const end = splitDateTime(event.events_end_time);
  const assignees = event.members.map(mapMemberToAssignee);

  return {
    id: event.id,
    title: event.name ?? `Événement ${event.id}`,
    date: start.date,
    endDate: end.date !== start.date ? end.date : undefined,
    category: 'other',
    startTime: start.time,
    endTime: end.time,
    description: event.description ?? undefined,
    assigneeIds: assignees.map((assignee) => assignee.id),
    assignees,
  };
}

async function enrichCalendarEvent(
  event: BffCalendarEvent,
  currentUser: CalendarDirectoryUser,
  eventAccess: CalendarEventAccess,
): Promise<BffCalendarEvent> {
  const assignees = eventAccess.members.map(mapDirectoryUserToAssignee);
  const isCreator = eventAccess.createdById === currentUser.id;
  const metadata = await getCalendarEventMetadata(eventAccess.eventId);

  return {
    ...event,
    category: metadata?.category ?? event.category,
    service: metadata?.service ?? event.service,
    location: metadata?.location ?? event.location,
    recurrence: metadata?.recurrence ?? event.recurrence,
    assigneeIds: assignees.map((assignee) => assignee.id),
    assignees,
    approvalStatus: calendarEventApprovalStatus(eventAccess),
    createdById: eventAccess.createdById === null ? undefined : `user-${eventAccess.createdById}`,
    canValidate: await canCurrentUserValidateEvent(currentUser, eventAccess),
    canEdit: canCurrentUserEditEvent(currentUser, eventAccess),
    canDelete: isCreator,
  };
}

function mapEventToMetadata(event: BffCalendarEvent): CalendarEventMetadata {
  const recurrenceEndsOn = event.recurrence?.endsOn?.trim();

  return {
    category: event.category ?? 'other',
    service: event.service ?? null,
    location: event.location ?? null,
    recurrence: event.recurrence ? {
      frequency: event.recurrence.frequency,
      interval: event.recurrence.interval,
      daysOfWeek: event.recurrence.daysOfWeek,
      endsOn: recurrenceEndsOn ? normalizeCalendarDate(recurrenceEndsOn) : undefined,
    } : null,
  };
}

function mapRecurrenceToApi(event: BffCalendarEvent): ApiRecurrence | null {
  if (!event.recurrence || event.recurrence.frequency === 'none') {
    return null;
  }

  const typeMap: Record<Exclude<BffCalendarRecurrence['frequency'], 'none'>, ApiRecurrence['type_recurrence']> = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
  };

  return {
    description: event.description ?? null,
    intervalle: event.recurrence.interval ?? 1,
    name: event.title,
    recurrence_end_date: combineDateTime(event.recurrence.endsOn ?? event.endDate ?? event.date),
    type_recurrence: typeMap[event.recurrence.frequency],
    visibility: 'Public',
  };
}

function mapEventToCreateBody(event: BffCalendarEvent): ApiCreateEventBody {
  return {
    custom_description: event.description ?? null,
    custom_name: event.title,
    custom_visibility: 'Public',
    events_start_time: combineDateTime(event.date, event.startTime),
    events_end_time: combineDateTime(event.endDate ?? event.date, event.endTime),
    owner_group_id: null,
    recurrence: mapRecurrenceToApi(event),
  };
}

function mapEventToPatchBody(event: BffCalendarEvent): ApiPatchEventBody {
  const hasRecurrence = Boolean(event.recurrence && event.recurrence.frequency !== 'none');
  const recurrenceEndDate = event.recurrence?.endsOn?.trim() || event.endDate || event.date;

  return {
    description: event.description ?? null,
    event_start_time: combineDateTime(event.date, event.startTime),
    event_end_time: combineDateTime(event.endDate ?? event.date, event.endTime),
    intervalle: hasRecurrence ? event.recurrence?.interval ?? 1 : null,
    name: event.title,
    reccurence_end_date: combineDateTime(recurrenceEndDate),
    visibility: 'Public',
  };
}

function mapAssigneeIdToMember(assigneeId: string | number): CalendarMember | null {
  const id = parseNumericId(assigneeId);
  if (id === null) {
    return null;
  }

  const memberType = String(assigneeId).startsWith('group-') ? 'Group' : 'User';
  return { id, member_type: memberType, regular: true };
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

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status ?? 502;
    return res.status(status >= 500 ? 502 : status).json({
      code: status >= 500 ? 'BAD_GATEWAY' : 'UPSTREAM_ERROR',
      message: axiosError.message,
      details: axiosError.response?.data,
    });
  }

  return res.status(500).json({
    code: 'INTERNAL_SERVER_ERROR',
    message: error instanceof Error ? error.message : 'Unexpected error',
  });
}

export async function fetchCalendarEvents(
  from: string,
  to: string,
  incomingRequestToken?: string,
): Promise<BffCalendarEvent[]> {
  const response = await calendarApi.getCalendar(
    { start: toApiDateTime(from, 'start'), end: toApiDateTime(to, 'end') } as never,
    authOptions(incomingRequestToken),
  );
  const currentUser = await getCurrentCalendarUser(incomingRequestToken);
  const recurringEvents = await listAssignedRecurringCalendarEvents(currentUser.id, from, to);
  const eventsById = new Map<number, BffCalendarEvent>();

  for (const event of [
    ...(response.data.events as ApiEventListItem[]),
    ...recurringEvents,
  ]) {
    eventsById.set(event.id, mapEventListItemToBff(event));
  }

  const events = [...eventsById.values()];
  const assignedEventIds = await filterAssignedCalendarEventIds(
    events.map((event) => Number(event.id)).filter(Number.isInteger),
    currentUser.id,
  );

  return events.filter((event) => assignedEventIds.has(Number(event.id)));
}

export async function fetchCalendarEvent(
  eventId: number,
  incomingRequestToken?: string,
): Promise<BffCalendarEvent> {
  const response = await calendarApi.getEvent(eventId, authOptions(incomingRequestToken));
  const currentUser = await getCurrentCalendarUser(incomingRequestToken);
  const eventAccess = await getCalendarEventAccess(eventId);
  assertCalendarEventAssigned(currentUser, eventAccess);

  return enrichCalendarEvent(
    mapEventDetailsToBff(response.data as ApiEventDetails),
    currentUser,
    eventAccess,
  );
}

export async function createCalendarEvent(
  event: BffCalendarEvent,
  incomingRequestToken?: string,
): Promise<BffCalendarEvent> {
  // Le Core Calendar valide la signature du JWT avant toute lecture du
  // référentiel utilisateur effectuée par le BFF.
  await calendarApi.getCalendar(
    {
      start: combineDateTime(event.date, event.startTime),
      end: combineDateTime(event.endDate ?? event.date, event.endTime),
    } as never,
    authOptions(incomingRequestToken),
  );
  const currentUser = await getCurrentCalendarUser(incomingRequestToken);
  const assigneeIds = await resolveAuthorizedAssigneeIds(currentUser, event.assigneeIds ?? []);
  const response = await calendarApi.createEvent(
    mapEventToCreateBody(event) as never,
    authOptions(incomingRequestToken),
  );
  const eventId = response.data.event_id;

  await syncEventMembers(eventId, [], assigneeIds.map((userId) => `user-${userId}`), incomingRequestToken);
  await refreshCalendarEventValidation(eventId);
  await upsertCalendarEventMetadata(eventId, mapEventToMetadata(event));

  return fetchCalendarEvent(eventId, incomingRequestToken);
}

export async function patchCalendarEvent(
  eventId: number,
  event: BffCalendarEventPatch,
  incomingRequestToken?: string,
): Promise<BffCalendarEvent> {
  const current = await calendarApi.getEvent(eventId, authOptions(incomingRequestToken));
  const currentUser = await getCurrentCalendarUser(incomingRequestToken);
  const currentAccess = await getCalendarEventAccess(eventId);
  assertCalendarEventAssigned(currentUser, currentAccess);
  if (!canCurrentUserEditEvent(currentUser, currentAccess)) {
    throw new CalendarAccessError(
      'Seuls le créateur, un responsable, le maire ou un administrateur assigné peuvent modifier cet événement.',
      403,
      'EVENT_UPDATE_FORBIDDEN',
    );
  }
  const mergedEvent = {
    ...mapEventDetailsToBff(current.data as ApiEventDetails),
    ...event,
  };
  const apiPatchBody = mapEventToPatchBody(mergedEvent);

  await calendarApi.patchEvent(
    eventId,
    apiPatchBody as never,
    { reccurent: mergedEvent.recurrence?.frequency !== undefined && mergedEvent.recurrence.frequency !== 'none' },
    authOptions(incomingRequestToken),
  );

  // La version actuelle de Calendar API accepte le PATCH mais ne persiste
  // pas les champs de l'événement. Le BFF maintient donc l'écriture dans la
  // base partagée, après que Calendar API a validé le JWT et les droits.
  const eventUpdated = await updateCalendarEventDetails(eventId, {
    name: mergedEvent.title,
    description: mergedEvent.description ?? null,
    startDate: apiPatchBody.event_start_time,
    endDate: apiPatchBody.event_end_time,
    visibility: apiPatchBody.visibility === 'Private' ? 'private' : 'public',
  });

  if (!eventUpdated) {
    throw new CalendarAccessError('Événement introuvable.', 404, 'EVENT_NOT_FOUND');
  }

  await upsertCalendarEventMetadata(eventId, mapEventToMetadata(mergedEvent));

  if (event.assigneeIds) {
    const assigneeIds = await resolveAuthorizedAssigneeIds(currentUser, event.assigneeIds);
    await syncEventMembers(
      eventId,
      (current.data as ApiEventDetails).members.map((member) => `${member.member_type === 'Group' ? 'group' : 'user'}-${member.id}`),
      assigneeIds.map((userId) => `user-${userId}`),
      incomingRequestToken,
    );
    await refreshCalendarEventValidation(eventId);
  }

  const updatedAccess = await getCalendarEventAccess(eventId);
  assertCalendarEventAssigned(currentUser, updatedAccess);

  return enrichCalendarEvent(
    { ...mergedEvent, id: eventId },
    currentUser,
    updatedAccess,
  );
}

export async function deleteCalendarEvent(eventId: number, incomingRequestToken?: string): Promise<void> {
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
  await calendarApi.getEvent(eventId, authOptions(incomingRequestToken));
  const currentUser = await getCurrentCalendarUser(incomingRequestToken);
  const eventAccess = await getCalendarEventAccess(eventId);
  assertCalendarEventAssigned(currentUser, eventAccess);

  if (!await canCurrentUserValidateEvent(currentUser, eventAccess)) {
    throw new CalendarAccessError(
      'Seul un responsable assigné du groupe peut valider cet événement.',
      403,
      'EVENT_APPROVAL_FORBIDDEN',
    );
  }

  await setCalendarEventValidationStatus(eventId, apiValidationStatus(approvalStatus));
  return fetchCalendarEvent(eventId, incomingRequestToken);
}

export async function fetchKnownAssignees(
  from: string,
  to: string,
  incomingRequestToken?: string,
): Promise<BffCalendarAssignee[]> {
  await fetchCalendarEvents(from, to, incomingRequestToken);
  const currentUser = await getCurrentCalendarUser(incomingRequestToken);
  const users = await listAssignableCalendarUsers(currentUser);
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
  const assignableUsers = await listAssignableCalendarUsers(currentUser);

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

export function defaultDateRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

async function refreshCalendarEventValidation(eventId: number): Promise<void> {
  const eventAccess = await getCalendarEventAccess(eventId);
  if (!eventAccess || eventAccess.createdById === null) {
    return;
  }

  const creator = await getCalendarDirectoryUser(eventAccess.createdById);
  const requiresApproval = Boolean(
    creator && eventRequiresResponsibleApproval(creator, eventAccess.members),
  );

  await setCalendarEventValidationStatus(
    eventId,
    requiresApproval ? 'pending' : 'validated',
  );
}

async function syncEventMembers(
  eventId: number,
  currentAssigneeIds: Array<string | number>,
  nextAssigneeIds: Array<string | number>,
  incomingRequestToken?: string,
): Promise<void> {
  const current = new Set(currentAssigneeIds.map(String));
  const next = new Set(nextAssigneeIds.map(String));

  await Promise.all(
    [...current]
      .filter((assigneeId) => !next.has(assigneeId))
      .map((assigneeId) => calendarApi.removeEventMember(String(eventId), String(parseNumericId(assigneeId)), authOptions(incomingRequestToken))),
  );

  await Promise.all(
    [...next]
      .filter((assigneeId) => !current.has(assigneeId))
      .map(mapAssigneeIdToMember)
      .filter((member): member is CalendarMember => member !== null)
      .map((member) => calendarApi.addEventMember(eventId, { user_id: member.id }, authOptions(incomingRequestToken))),
  );
}
