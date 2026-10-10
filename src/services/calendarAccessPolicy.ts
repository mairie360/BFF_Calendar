import { HttpError, sessionUserId } from '@mairie360/bffs-lib';
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

export async function getCurrentCalendarUser(context: CallContext): Promise<CalendarDirectoryUser> {
  const userId = currentUserId(context);
  const user = await getCalendarDirectoryUser(userId, context);

  if (!user) {
    throw new HttpError(401, 'Unknown user.');
  }

  return user;
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
): Promise<CalendarDirectoryUser[]> {
  const scope = calendarAssigneeScope(currentUser);

  if (scope === 'all') {
    return listCalendarDirectoryUsers({}, context);
  }

  if (scope === 'self') {
    return [currentUser];
  }

  return listCalendarDirectoryUsers({ groupIds: currentUser.groupIds }, context);
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
  const assignableUsers = await listAssignableCalendarUsers(currentUser, context);
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
