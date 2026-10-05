import { HttpError, addDays, asCaller, callUpstream, type UpstreamRequestOptions } from '@mairie360/bffs-lib';
import type {
  EventRecurrence,
  EventView,
  GetCalendarParams,
  GetEventResultView,
  PatchEventView,
  PostEventView,
  UpdateEventValidationView,
} from '@mairie360/calendar-api-openapi/model';
import type { z } from 'zod';
import calendarApi from '../../clients/calendarClient';
import type { CallContext } from '../../clients/callContext';
import { listCalendarDirectoryUsers } from '../../clients/coreDirectory';
import {
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
import { monthBounds, utcToWallClock, wallClockToUtc, zonedToday } from '../../services/calendarTimeZone';
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

/** Wall-clock date and time, in the instance time zone, of an instant returned by Calendar API. */
function splitDateTime(value: string): { date: string; time: string } {
  return utcToWallClock(value);
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

/** UTC instant of a date and an optional time typed in the instance time zone (midnight without time). */
function combineDateTime(date: string, time?: string): string {
  return wallClockToUtc(normalizeCalendarDate(date), time?.replace(/Z$/, '') || '00:00');
}

/** UTC bounds of a `YYYY-MM-DD` query day in the instance time zone: its first or its last second. */
function toApiDateTime(value: string, boundary: 'start' | 'end'): string {
  return wallClockToUtc(value, boundary === 'start' ? '00:00:00' : '23:59:59');
}

function mapRecurrenceToBff(recurrence?: EventRecurrence | null): BffCalendarRecurrence | undefined {
  if (!recurrence) return undefined;

  return {
    frequency: recurrence.frequency,
    interval: recurrence.interval,
    ...(recurrence.days_of_week?.length ? { daysOfWeek: recurrence.days_of_week } : {}),
    ...(recurrence.ends_on ? { endsOn: recurrence.ends_on } : {}),
  };
}

/** BFF recurrence to the Calendar API one (`none` and no recurrence both mean "does not repeat"). */
function mapRecurrenceToApi(recurrence?: BffCalendarRecurrence): EventRecurrence | null {
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

function mapEventListItemToBff(event: EventView): BffCalendarEvent {
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

function mapEventDetailsToBff(event: GetEventResultView): BffCalendarEvent {
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

/** Event members resolved in `directory`, with the rights Calendar API computed for the caller. */
function toEventAccess(event: GetEventResultView, directory: CalendarDirectoryUser[]): CalendarEventAccess {
  const statusById = new Map(event.members.map((member) => [member.id, member.validation_status]));

  return {
    eventId: event.id,
    createdById: event.created_by ?? null,
    members: directory
      .filter((user) => statusById.has(user.id))
      .map((user) => ({
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

/** Directory entries of the members of `events`, in one Core API call. */
function loadMembersDirectory(
  events: GetEventResultView[],
  context: CallContext,
): Promise<CalendarDirectoryUser[]> {
  const ids = [...new Set(events.flatMap((event) => event.members.map((member) => member.id)))];
  return listCalendarDirectoryUsers({ ids }, context);
}

/** Event read from Calendar API, with its members and the caller's rights. */
async function loadCalendarEvent(
  eventId: number,
  context: CallContext,
): Promise<{ event: GetEventResultView; access: CalendarEventAccess }> {
  const { data: event } = await calendarCall(context, (options) => calendarApi.getEvent(eventId, options), true);
  const directory = await loadMembersDirectory([event], context);

  return { event, access: toEventAccess(event, directory) };
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

/** Creation body for Calendar API. */
function mapEventToCreateBody(event: BffCalendarEvent): PostEventView {
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

/**
 * Update body for Calendar API. Its PATCH names the dates `event_start_time` / `event_end_time` (singular),
 * unlike creation and reads (`events_start_time` / `events_end_time`).
 */
function mapEventToPatchBody(event: BffCalendarEvent): PatchEventView {
  return {
    name: event.title,
    description: event.description ?? null,
    event_start_time: combineDateTime(event.date, event.startTime),
    event_end_time: combineDateTime(event.endDate ?? event.date, event.endTime),
    category: event.category ?? 'other',
    service: event.service ?? null,
    location: event.location ?? null,
    recurrence: mapRecurrenceToApi(event.recurrence),
  };
}

/**
 * A Calendar API call made with the caller's session (lib `asCaller`: 401 without a Bearer token, 503 when
 * CALENDAR_API_URL is missing), its failures mapped by the lib's `callUpstream`: the 4xx the route declares
 * are relayed, anything else becomes a 502. `retry` only for idempotent reads.
 */
function calendarCall<T>(
  context: CallContext,
  call: (options: UpstreamRequestOptions) => Promise<T>,
  retry = false,
): Promise<T> {
  return callUpstream('CALENDAR_API', () => call(asCaller('CALENDAR_API', context.req)), { declared: context.declared, retry });
}

const QUERY_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Longest `from`..`to` span a read accepts, in days. Three years (plus a leap day) because BFF_Message loads
 * its business references over [Jan 1 of last year, Dec 31 of next year]; lower it once that caller asks
 * for a shorter window.
 */
export const MAX_DATE_RANGE_DAYS = 3 * 365 + 1;

/** Upstream calls run at the same time when one request needs several of them (event details). */
const UPSTREAM_CONCURRENCY = 5;

/** Checks that a query parameter is a valid calendar date in the YYYY-MM-DD format. */
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

/** Event id path parameter: a positive integer, otherwise null. */
export function parseEventIdParam(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * Validated `from`..`to` range of a read: both `YYYY-MM-DD`, `from` not after `to`, and at most
 * MAX_DATE_RANGE_DAYS apart. Throws a 400 otherwise, before any upstream call.
 */
export function parseDateRange(from: unknown, to: unknown): { from: string; to: string } {
  if (!isQueryDate(from) || !isQueryDate(to)) {
    throw new HttpError(400, 'The from and to parameters must be YYYY-MM-DD dates.');
  }
  if (from > to) {
    throw new HttpError(400, 'The from date must not be after the to date.');
  }
  if (addDays(from, MAX_DATE_RANGE_DAYS) < to) {
    throw new HttpError(400, `The from and to dates must be at most ${MAX_DATE_RANGE_DAYS} days apart.`);
  }
  return { from, to };
}

/** `Promise.all` over `items` with at most `limit` calls of `task` in flight. */
export async function mapWithConcurrency<T, R>(items: readonly T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function listCalendarEventViews(from: string, to: string, context: CallContext): Promise<EventView[]> {
  // Calendar API returns the events owned by or assigned to the caller over the period, including those
  // whose recurrence rule overlaps it, and tells whether the caller is a member.
  const params: GetCalendarParams = { start: toApiDateTime(from, 'start'), end: toApiDateTime(to, 'end') };
  const { data } = await calendarCall(context, (options) => calendarApi.getCalendar(params, options), true);
  return data.events.filter((event) => event.is_member);
}

export async function fetchCalendarEvents(
  from: string,
  to: string,
  context: CallContext,
): Promise<BffCalendarEvent[]> {
  const events = await listCalendarEventViews(from, to, context);
  return events.map(mapEventListItemToBff);
}

export async function fetchCalendarEvent(
  eventId: number,
  context: CallContext,
): Promise<BffCalendarEvent> {
  const { event, access } = await loadCalendarEvent(eventId, context);

  return enrichCalendarEvent(mapEventDetailsToBff(event), access);
}

export async function createCalendarEvent(
  event: BffCalendarEvent,
  context: CallContext,
): Promise<BffCalendarEvent> {
  // Every authorization is checked before the first write: an assignee out of scope creates nothing.
  const currentUser = await getCurrentCalendarUser(context);
  const assigneeIds = await resolveAuthorizedAssigneeIds(
    currentUser,
    event.assigneeIds ?? [],
    context,
  );
  const response = await calendarCall(context, (options) => calendarApi.createEvent(mapEventToCreateBody(event), options));
  const eventId = response.data.event_id;

  try {
    // Calendar API recomputes the validation on every member change.
    await syncEventMembers(eventId, [], assigneeIds, context);
  } catch (error) {
    // Creation and member assignment are separate upstream calls: undo the creation (best effort) so a
    // failed request does not leave a half-assigned event behind, then report the original failure.
    await calendarCall(context, (options) => calendarApi.deleteEvent(eventId, options)).catch((rollbackError: unknown) => {
      console.error(`[BFF Calendar] Could not delete event ${eventId} after a failed member assignment`, rollbackError);
    });
    throw error;
  }

  return fetchCalendarEvent(eventId, context);
}

export async function patchCalendarEvent(
  eventId: number,
  event: BffCalendarEventPatch,
  context: CallContext,
): Promise<BffCalendarEvent> {
  const { event: current, access } = await loadCalendarEvent(eventId, context);
  if (!canCurrentUserEditEvent(access)) {
    throw new HttpError(403, 'Only the creator, or an assigned manager, mayor or administrator, can edit this event.');
  }

  // Every authorization is checked before the first write: an assignee out of scope modifies nothing.
  let assigneeIds: number[] | undefined;
  if (event.assigneeIds) {
    const currentUser = await getCurrentCalendarUser(context);
    assigneeIds = await resolveAuthorizedAssigneeIds(currentUser, event.assigneeIds, context);
  }

  const mergedEvent = { ...mapEventDetailsToBff(current), ...event };
  await calendarCall(context, (options) => calendarApi.patchEvent(eventId, mapEventToPatchBody(mergedEvent), options));

  if (assigneeIds) {
    await syncEventMembers(
      eventId,
      current.members.map((member) => member.id),
      assigneeIds,
      context,
    );
  }

  return fetchCalendarEvent(eventId, context);
}

export async function deleteCalendarEvent(eventId: number, context: CallContext): Promise<void> {
  const { access } = await loadCalendarEvent(eventId, context);

  if (!canCurrentUserDeleteEvent(access)) {
    throw new HttpError(403, 'Only the creator of the event can delete it.');
  }

  await calendarCall(context, (options) => calendarApi.deleteEvent(eventId, options));
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
  context: CallContext,
): Promise<BffCalendarEvent> {
  const { access } = await loadCalendarEvent(eventId, context);

  if (!canCurrentUserValidateEvent(access)) {
    throw new HttpError(403, 'Only an assigned manager of the group can approve this event.');
  }

  const body: UpdateEventValidationView = { status: approvalStatus };
  await calendarCall(context, (options) => calendarApi.updateEventValidation(eventId, body, options));

  return fetchCalendarEvent(eventId, context);
}

export async function fetchKnownAssignees(
  from: string,
  to: string,
  context: CallContext,
): Promise<BffCalendarAssignee[]> {
  await fetchCalendarEvents(from, to, context);
  const currentUser = await getCurrentCalendarUser(context);
  const users = await listAssignableCalendarUsers(currentUser, context);
  return users.map(mapDirectoryUserToAssignee);
}

export async function fetchCalendarBootstrap(
  from: string,
  to: string,
  context: CallContext,
): Promise<{
  events: BffCalendarEvent[];
  assignees: BffCalendarAssignee[];
  currentUser: { id: string; name: string; email: string; role: string; groupIds: number[] };
  assigneeScope: 'all' | 'groups' | 'self';
}> {
  const calendarEvents = await listCalendarEventViews(from, to, context);
  const currentUser = await getCurrentCalendarUser(context);

  // One detail call per distinct event, a bounded number at a time, then a single directory call for
  // the members of all of them (instead of a detail call plus a directory call per event, all at once).
  const eventIds = [...new Set(calendarEvents.map((event) => event.id))];
  const details = await mapWithConcurrency(eventIds, UPSTREAM_CONCURRENCY, async (eventId) => {
    const { data } = await calendarCall(context, (options) => calendarApi.getEvent(eventId, options), true);
    return data;
  });
  const directory = await loadMembersDirectory(details, context);
  const detailsById = new Map(details.map((event) => [event.id, event]));
  const events = calendarEvents.map((listed) => {
    const event = detailsById.get(listed.id)!;
    return enrichCalendarEvent(mapEventDetailsToBff(event), toEventAccess(event, directory));
  });
  const assignableUsers = await listAssignableCalendarUsers(currentUser, context);

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

/** Current month (first and last day) in the instance time zone, whatever the container time zone. */
export function defaultDateRange(now = new Date()): { from: string; to: string } {
  return monthBounds(zonedToday(now));
}

/** Aligns the event members: Calendar API recomputes the validation on every change. */
async function syncEventMembers(
  eventId: number,
  currentUserIds: number[],
  nextUserIds: number[],
  context: CallContext,
): Promise<void> {
  const current = new Set(currentUserIds);
  const next = new Set(nextUserIds);

  await mapWithConcurrency(
    [...current].filter((userId) => !next.has(userId)),
    UPSTREAM_CONCURRENCY,
    (userId) => calendarCall(context, (options) => calendarApi.removeEventMember(eventId, userId, options)),
  );

  await mapWithConcurrency(
    [...next].filter((userId) => !current.has(userId)),
    UPSTREAM_CONCURRENCY,
    (userId) => calendarCall(context, (options) => calendarApi.addEventMember(eventId, { user_id: userId }, options)),
  );
}
