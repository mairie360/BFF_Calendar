import { HttpError, MemoryCache, callerKey, sessionUserId } from '@mairie360/bffs-lib';
import type { CallContext } from '../clients/callContext';
import {
  CalendarDirectoryUser,
  getCalendarDirectoryUser,
  listCalendarDirectoryUsers,
} from '../clients/coreDirectory';

export type { CalendarDirectoryUser };

/** Approval status of an event, computed by Calendar API from its members. */
export type CalendarApprovalStatus = 'pending' | 'approved' | 'rejected';

/** Members of an event, resolved in the directory, and the rights Calendar API computed for the caller. */
export type CalendarEventAccess = {
  eventId: number;
  createdById: number | null;
  members: Array<CalendarDirectoryUser & { validationStatus: 'pending' | 'validated' | 'refused' }>;
  approvalStatus: CalendarApprovalStatus;
  permissions: { canEdit: boolean; canDelete: boolean; canValidate: boolean };
};

function normalizedRole(role: string): string {
  return role.trim().toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function hasCalendarRole(user: CalendarDirectoryUser, ...roles: string[]): boolean {
  const acceptedRoles = new Set(roles.map(normalizedRole));
  return user.roles.some((role) => acceptedRoles.has(normalizedRole(role)));
}

export function primaryCalendarRole(user: CalendarDirectoryUser): string {
  const priority = ['Admin', 'Maire', 'Responsable', 'User', 'Guest'];
  return priority.find((role) => hasCalendarRole(user, role)) ?? user.roles[0] ?? 'Guest';
}

/**
 * Id of the caller, from the session token `requireSession` verified (signature, expiry). 401 when the request
 * did not go through it, so a route mounted without the check fails closed.
 */
export function currentUserId(context: CallContext): number {
  return sessionUserId(context.req);
}

/**
 * Short in-memory cache of the directory reads every page load repeats (MAIR-525): the caller's own entry and the
 * people they may assign. Keyed by caller, so an answer is never served to someone else. Reads use it; writes read
 * fresh data (they authorize with it) and clear it, and another replica sees a change once the TTL ends.
 */
export const DIRECTORY_CACHE_TTL_MS = 30_000;
const currentUserCache = new MemoryCache<CalendarDirectoryUser>({ ttlMs: DIRECTORY_CACHE_TTL_MS });
const assignableCache = new MemoryCache<CalendarDirectoryUser[]>({ ttlMs: DIRECTORY_CACHE_TTL_MS });

/** Drops every cached directory read: called after each write of the BFF (and between tests). */
export function clearDirectoryCache(): void {
  currentUserCache.clear();
  assignableCache.clear();
}

/** Options of a directory read: `fresh` skips the cache (writes authorize with fresh data). */
type DirectoryRead = { fresh?: boolean };

export async function getCurrentCalendarUser(context: CallContext, { fresh = false }: DirectoryRead = {}): Promise<CalendarDirectoryUser> {
  const userId = currentUserId(context);
  const load = async () => {
    const user = await getCalendarDirectoryUser(userId, context);
    if (!user) {
      throw new HttpError(401, 'Unknown user.');
    }
    return user;
  };

  return fresh ? load() : currentUserCache.getOrLoad(callerKey(userId, 'me'), load);
}

export function calendarAssigneeScope(user: CalendarDirectoryUser): 'all' | 'groups' | 'self' {
  if (hasCalendarRole(user, 'Admin', 'Maire')) {
    return 'all';
  }

  return user.groupIds.length > 0 ? 'groups' : 'self';
}

export async function listAssignableCalendarUsers(
  currentUser: CalendarDirectoryUser,
  context: CallContext,
  { fresh = false }: DirectoryRead = {},
): Promise<CalendarDirectoryUser[]> {
  const scope = calendarAssigneeScope(currentUser);

  if (scope === 'self') {
    return [currentUser];
  }

  const load = () => listCalendarDirectoryUsers(scope === 'all' ? {} : { groupIds: currentUser.groupIds }, context);
  if (fresh) return load();
  // The scope and the groups are part of the key: a role or group change read from Core is a new entry.
  return assignableCache.getOrLoad(callerKey(currentUser.id, 'assignable', scope, currentUser.groupIds.join(',')), load);
}

function parseUserAssigneeId(value: string | number): number | null {
  const text = String(value);
  if (text.startsWith('group-')) {
    return null;
  }

  // Anchored: "1 AND 1=2" or "x-12" must be refused, not read as the user of their last digits.
  const match = text.match(/^(?:user-)?(\d+)$/);
  if (!match) {
    return null;
  }

  const userId = Number(match[1]);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

export async function resolveAuthorizedAssigneeIds(
  currentUser: CalendarDirectoryUser,
  requestedAssigneeIds: Array<string | number>,
  context: CallContext,
): Promise<number[]> {
  // Fresh read: the assignment scope is enforced here, before any write.
  const assignableUsers = await listAssignableCalendarUsers(currentUser, context, { fresh: true });
  const assignableIds = new Set(assignableUsers.map((user) => user.id));
  const requestedIds = requestedAssigneeIds.map(parseUserAssigneeId);

  if (requestedIds.some((userId) => userId === null)) {
    throw new HttpError(400, 'An assignee has an invalid id.');
  }

  const unauthorizedId = requestedIds.find((userId) => userId !== null && !assignableIds.has(userId));
  if (unauthorizedId !== undefined) {
    throw new HttpError(403, 'This person is outside your assignment scope.');
  }

  return [...new Set([currentUser.id, ...requestedIds as number[]])];
}

// The rights on an event (validate, edit, delete) and its approval status are computed by Calendar API,
// which also enforces them server-side: the BFF relays its answers.
export function calendarEventApprovalStatus(eventAccess: CalendarEventAccess): CalendarApprovalStatus {
  return eventAccess.approvalStatus;
}

export function canCurrentUserValidateEvent(eventAccess: CalendarEventAccess): boolean {
  return eventAccess.permissions.canValidate;
}

export function canCurrentUserEditEvent(eventAccess: CalendarEventAccess): boolean {
  return eventAccess.permissions.canEdit;
}

export function canCurrentUserDeleteEvent(eventAccess: CalendarEventAccess): boolean {
  return eventAccess.permissions.canDelete;
}
