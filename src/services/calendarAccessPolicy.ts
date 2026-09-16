import {
  CalendarDirectoryUser,
  getCalendarDirectoryUser,
  listCalendarDirectoryUsers,
} from '../clients/coreDirectory';
import { getAuthorizationHeader } from '../config/token';

export type { CalendarDirectoryUser };

/** Statut de validation d'un événement, calculé par Calendar API à partir de ses membres. */
export type CalendarApprovalStatus = 'pending' | 'approved' | 'rejected';

/** Membres d'un événement, résolus dans l'annuaire, et droits calculés par Calendar API. */
export type CalendarEventAccess = {
  eventId: number;
  createdById: number | null;
  members: Array<CalendarDirectoryUser & { validationStatus: 'pending' | 'validated' | 'refused' }>;
  approvalStatus: CalendarApprovalStatus;
  permissions: { canEdit: boolean; canDelete: boolean; canValidate: boolean };
};

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
  const user = await getCalendarDirectoryUser(userId, incomingRequestToken);

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
  incomingRequestToken?: string,
): Promise<CalendarDirectoryUser[]> {
  const scope = calendarAssigneeScope(currentUser);

  if (scope === 'all') {
    return listCalendarDirectoryUsers({}, incomingRequestToken);
  }

  if (scope === 'self') {
    return [currentUser];
  }

  return listCalendarDirectoryUsers({ groupIds: currentUser.groupIds }, incomingRequestToken);
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
  incomingRequestToken?: string,
): Promise<number[]> {
  const assignableUsers = await listAssignableCalendarUsers(currentUser, incomingRequestToken);
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

// Les droits sur un événement (validation, modification, suppression) et son statut d'approbation sont
// calculés par Calendar API, qui les applique aussi côté serveur : le BFF relaie ses réponses.
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
