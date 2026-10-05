import { HttpError, authorization, unverifiedSubject } from '@mairie360/bffs-lib';
import {
  type Caller,
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
 * Id of the caller, read from the `sub` of its session token **without verifying it**. It only selects
 * the caller's directory entry, which is then read from Core API with that same token: Core API verifies
 * the signature, so a forged `sub` gets the call refused. 401 when there is no Bearer token or no
 * readable `sub`.
 */
export function currentUserId(caller: Caller): number {
  const userId = unverifiedSubject(authorization(caller));
  if (userId === undefined) {
    throw new HttpError(401, 'The session token has no user id.');
  }
  return userId;
}

export async function getCurrentCalendarUser(caller: Caller): Promise<CalendarDirectoryUser> {
  const userId = currentUserId(caller);
  const user = await getCalendarDirectoryUser(userId, caller);

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
  caller: Caller,
): Promise<CalendarDirectoryUser[]> {
  const scope = calendarAssigneeScope(currentUser);

  if (scope === 'all') {
    return listCalendarDirectoryUsers({}, caller);
  }

  if (scope === 'self') {
    return [currentUser];
  }

  return listCalendarDirectoryUsers({ groupIds: currentUser.groupIds }, caller);
}

function parseUserAssigneeId(value: string | number): number | null {
  const text = String(value);
  if (text.startsWith('group-')) {
    return null;
  }

  const match = text.match(/(?:user-)?(\d+)$/);
  if (!match) {
    return null;
  }

  const userId = Number(match[1]);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

export async function resolveAuthorizedAssigneeIds(
  currentUser: CalendarDirectoryUser,
  requestedAssigneeIds: Array<string | number>,
  caller: Caller,
): Promise<number[]> {
  const assignableUsers = await listAssignableCalendarUsers(currentUser, caller);
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
