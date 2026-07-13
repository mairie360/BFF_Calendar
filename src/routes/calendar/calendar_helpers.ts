import axios, { AxiosError } from 'axios';
import type { AxiosRequestConfig } from 'axios';
import type { Response } from 'express';
import { z } from 'zod';
import calendarApi from '../../clients/calendarClient';
import { getAuthorizationHeader } from '../../config/token';
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

function combineDateTime(date: string, time?: string): string {
  return time ? `${date}T${time}:00` : date;
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
    recurrence_end_date: event.recurrence.endsOn ?? event.endDate ?? event.date,
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
  return {
    description: event.description ?? null,
    event_start_time: combineDateTime(event.date, event.startTime),
    event_end_time: combineDateTime(event.endDate ?? event.date, event.endTime),
    intervalle: event.recurrence?.interval ?? null,
    name: event.title,
    reccurence_end_date: event.recurrence?.endsOn ?? event.endDate ?? event.date,
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

  return (response.data.events as ApiEventListItem[]).map(mapEventListItemToBff);
}

export async function fetchCalendarEvent(
  eventId: number,
  incomingRequestToken?: string,
): Promise<BffCalendarEvent> {
  const response = await calendarApi.getEvent(eventId, authOptions(incomingRequestToken));
  return mapEventDetailsToBff(response.data as ApiEventDetails);
}

export async function createCalendarEvent(
  event: BffCalendarEvent,
  incomingRequestToken?: string,
): Promise<BffCalendarEvent> {
  const response = await calendarApi.createEvent(
    mapEventToCreateBody(event) as never,
    authOptions(incomingRequestToken),
  );
  const eventId = response.data.event_id;

  await syncEventMembers(eventId, [], event.assigneeIds ?? [], incomingRequestToken);

  return fetchCalendarEvent(eventId, incomingRequestToken);
}

export async function patchCalendarEvent(
  eventId: number,
  event: BffCalendarEventPatch,
  incomingRequestToken?: string,
): Promise<BffCalendarEvent> {
  const current = await calendarApi.getEvent(eventId, authOptions(incomingRequestToken));
  const mergedEvent = {
    ...mapEventDetailsToBff(current.data as ApiEventDetails),
    ...event,
  };

  await calendarApi.patchEvent(
    eventId,
    mapEventToPatchBody(mergedEvent) as never,
    { reccurent: mergedEvent.recurrence?.frequency !== undefined && mergedEvent.recurrence.frequency !== 'none' },
    authOptions(incomingRequestToken),
  );

  if (event.assigneeIds) {
    await syncEventMembers(
      eventId,
      (current.data as ApiEventDetails).members.map((member) => `${member.member_type === 'Group' ? 'group' : 'user'}-${member.id}`),
      event.assigneeIds,
      incomingRequestToken,
    );
  }

  return fetchCalendarEvent(eventId, incomingRequestToken);
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
  const event = await fetchCalendarEvent(eventId, incomingRequestToken);
  return {
    ...event,
    approvalStatus,
  };
}

export async function fetchKnownAssignees(
  from: string,
  to: string,
  incomingRequestToken?: string,
): Promise<BffCalendarAssignee[]> {
  const events = await fetchCalendarEvents(from, to, incomingRequestToken);
  const detailedEvents = await Promise.all(events.map((event) => fetchCalendarEvent(Number(event.id), incomingRequestToken)));
  const assigneesById = new Map<string | number, BffCalendarAssignee>();

  for (const event of detailedEvents) {
    for (const assignee of event.assignees ?? []) {
      assigneesById.set(assignee.id, assignee);
    }
  }

  return [...assigneesById.values()];
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
