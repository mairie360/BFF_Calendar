import { getAuthorizationHeader } from '../config/token';
import {
  CalendarDirectoryUser,
  CalendarEventAccess,
  EventValidationStatus,
  getCalendarDirectoryUser,
  listCalendarDirectoryUsers,
} from '../repositories/calendarAccessRepository';

export type CalendarApprovalStatus = 'pending' | 'approved' | 'rejected';

export class CalendarAccessError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'CalendarAccessError';
  }
}

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

function decodeJwtPayload(token: string): Record<string, unknown> {
  const encodedPayload = token.split('.')[1];
  if (!encodedPayload) {
    throw new CalendarAccessError('Jeton de session invalide.', 401, 'UNAUTHORIZED');
  }

  try {
    return JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as Record<string, unknown>;
  } catch {
    throw new CalendarAccessError('Jeton de session invalide.', 401, 'UNAUTHORIZED');
  }
}

export function currentUserIdFromAuthorization(incomingRequestToken?: string): number {
  const authorization = getAuthorizationHeader(incomingRequestToken);
  if (!authorization) {
    throw new CalendarAccessError('Authentification requise.', 401, 'UNAUTHORIZED');
  }

  const payload = decodeJwtPayload(authorization.replace(/^Bearer\s+/i, ''));
  const rawUserId = payload.sub ?? payload.user_id ?? payload.id;
  const userId = Number(rawUserId);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new CalendarAccessError('Identifiant utilisateur absent du jeton.', 401, 'UNAUTHORIZED');
  }

  return userId;
}

export async function getCurrentCalendarUser(
  incomingRequestToken?: string,
): Promise<CalendarDirectoryUser> {
  const userId = currentUserIdFromAuthorization(incomingRequestToken);
  const user = await getCalendarDirectoryUser(userId);

  if (!user) {
    throw new CalendarAccessError('Utilisateur introuvable.', 401, 'UNAUTHORIZED');
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
): Promise<CalendarDirectoryUser[]> {
  const scope = calendarAssigneeScope(currentUser);

  if (scope === 'all') {
    return listCalendarDirectoryUsers();
  }

  if (scope === 'self') {
    return [currentUser];
  }

  return listCalendarDirectoryUsers({ groupIds: currentUser.groupIds });
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
): Promise<number[]> {
  const assignableUsers = await listAssignableCalendarUsers(currentUser);
  const assignableIds = new Set(assignableUsers.map((user) => user.id));
  const requestedIds = requestedAssigneeIds.map(parseUserAssigneeId);

  if (requestedIds.some((userId) => userId === null)) {
    throw new CalendarAccessError(
      'Une personne assignée possède un identifiant invalide.',
      400,
      'INVALID_ASSIGNEE',
    );
  }

  const unauthorizedId = requestedIds.find((userId) => userId !== null && !assignableIds.has(userId));
  if (unauthorizedId !== undefined) {
    throw new CalendarAccessError(
      'Cette personne ne fait pas partie de votre périmètre d’assignation.',
      403,
      'ASSIGNEE_OUT_OF_SCOPE',
    );
  }

  return [...new Set([currentUser.id, ...requestedIds as number[]])];
}

function shareAGroup(firstUser: CalendarDirectoryUser, secondUser: CalendarDirectoryUser): boolean {
  const secondGroupIds = new Set(secondUser.groupIds);
  return firstUser.groupIds.some((groupId) => secondGroupIds.has(groupId));
}

export function eventRequiresResponsibleApproval(
  creator: CalendarDirectoryUser,
  members: CalendarDirectoryUser[],
): boolean {
  if (!hasCalendarRole(creator, 'User', 'Guest') || hasCalendarRole(creator, 'Admin', 'Maire', 'Responsable')) {
    return false;
  }

  return members.some((member) => hasCalendarRole(member, 'Responsable') && shareAGroup(creator, member));
}

export function calendarEventApprovalStatus(eventAccess: CalendarEventAccess): CalendarApprovalStatus {
  if (eventAccess.members.some((member) => member.validationStatus === 'refused')) {
    return 'rejected';
  }

  if (eventAccess.members.some((member) => member.validationStatus === 'pending')) {
    return 'pending';
  }

  return 'approved';
}

export async function canCurrentUserValidateEvent(
  currentUser: CalendarDirectoryUser,
  eventAccess: CalendarEventAccess,
): Promise<boolean> {
  if (!hasCalendarRole(currentUser, 'Responsable')) {
    return false;
  }

  if (!eventAccess.members.some((member) => member.id === currentUser.id)) {
    return false;
  }

  if (calendarEventApprovalStatus(eventAccess) !== 'pending' || eventAccess.createdById === null) {
    return false;
  }

  const creator = await getCalendarDirectoryUser(eventAccess.createdById);
  return Boolean(
    creator &&
    eventRequiresResponsibleApproval(creator, eventAccess.members) &&
    shareAGroup(currentUser, creator),
  );
}

export function canCurrentUserEditEvent(
  currentUser: CalendarDirectoryUser,
  eventAccess: CalendarEventAccess,
): boolean {
  const isAssigned = eventAccess.members.some((member) => member.id === currentUser.id);
  if (!isAssigned) {
    return false;
  }

  return (
    eventAccess.createdById === currentUser.id ||
    hasCalendarRole(currentUser, 'Responsable', 'Maire', 'Admin')
  );
}

export function assertCalendarEventAssigned(
  currentUser: CalendarDirectoryUser,
  eventAccess: CalendarEventAccess | null,
): asserts eventAccess is CalendarEventAccess {
  if (!eventAccess || !eventAccess.members.some((member) => member.id === currentUser.id)) {
    throw new CalendarAccessError(
      'Cet événement est réservé aux personnes assignées.',
      403,
      'EVENT_NOT_ASSIGNED',
    );
  }
}

export function apiValidationStatus(status: CalendarApprovalStatus): EventValidationStatus {
  const statusMap: Record<CalendarApprovalStatus, EventValidationStatus> = {
    pending: 'pending',
    approved: 'validated',
    rejected: 'refused',
  };

  return statusMap[status];
}
