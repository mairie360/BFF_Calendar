import axios, { AxiosError } from 'axios';
import type { Response } from 'express';
import { z } from 'zod';
import calendarApi from '../../clients/calendarClient';
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
  member_type: 'Group' | 'User' | 'Error';
  regular: boolean;
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
  owner?: CalendarMember;
  recurrence_id?: number | null;
};

type ApiCreateEventResult = {
  event_id: number;
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
  const prefix = member.member_type === 'Group' ? 'group' : 'user';

  return {
    id: `${prefix}-${member.id}`,
    name: member.member_type === 'Group' ? `Groupe ${member.id}` : `Utilisateur ${member.id}`,
    role: member.member_type,
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

export async function fetchCalendarEvents(from: string, to: string): Promise<BffCalendarEvent[]> {
  const response = await calendarApi.get<{ events: ApiEventListItem[] }>('/v1/calendar', {
    params: { start: from, end: to },
  });

  return response.data.events.map(mapEventListItemToBff);
}

export async function fetchCalendarEvent(eventId: number): Promise<BffCalendarEvent> {
  const response = await calendarApi.get<ApiEventDetails>(`/v1/events/${eventId}/`);
  return mapEventDetailsToBff(response.data);
}

export async function createCalendarEvent(event: BffCalendarEvent): Promise<BffCalendarEvent> {
  const response = await calendarApi.post<ApiCreateEventResult>('/v1/events/', mapEventToCreateBody(event));
  const eventId = response.data.event_id;

  await syncEventMembers(eventId, [], event.assigneeIds ?? []);

  return fetchCalendarEvent(eventId);
}

export async function patchCalendarEvent(eventId: number, event: BffCalendarEventPatch): Promise<BffCalendarEvent> {
  const current = await calendarApi.get<ApiEventDetails>(`/v1/events/${eventId}/`);
  const mergedEvent = {
    ...mapEventDetailsToBff(current.data),
    ...event,
  };

  await calendarApi.patch(`/v1/events/${eventId}/`, mapEventToPatchBody(mergedEvent), {
    params: { reccurent: mergedEvent.recurrence?.frequency !== undefined && mergedEvent.recurrence.frequency !== 'none' },
  });

  if (event.assigneeIds) {
    await syncEventMembers(
      eventId,
      current.data.members.map((member) => `${member.member_type === 'Group' ? 'group' : 'user'}-${member.id}`),
      event.assigneeIds,
    );
  }

  return fetchCalendarEvent(eventId);
}

export async function deleteCalendarEvent(eventId: number): Promise<void> {
  await calendarApi.delete(`/v1/events/${eventId}/`);
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
): Promise<BffCalendarEvent> {
  const event = await fetchCalendarEvent(eventId);
  return {
    ...event,
    approvalStatus,
  };
}

export async function fetchKnownAssignees(from: string, to: string): Promise<BffCalendarAssignee[]> {
  const events = await fetchCalendarEvents(from, to);
  const detailedEvents = await Promise.all(events.map((event) => fetchCalendarEvent(Number(event.id))));
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
): Promise<void> {
  const current = new Set(currentAssigneeIds.map(String));
  const next = new Set(nextAssigneeIds.map(String));

  await Promise.all(
    [...current]
      .filter((assigneeId) => !next.has(assigneeId))
      .map((assigneeId) => calendarApi.delete(`/v1/events/${eventId}/members/${parseNumericId(assigneeId)}/`)),
  );

  await Promise.all(
    [...next]
      .filter((assigneeId) => !current.has(assigneeId))
      .map(mapAssigneeIdToMember)
      .filter((member): member is CalendarMember => member !== null)
      .map((member) => calendarApi.post(`/v1/events/${eventId}/members/`, { member })),
  );
}
