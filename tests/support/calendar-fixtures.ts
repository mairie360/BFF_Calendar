import { getCalendarAPIMairie360 } from '@mairie360/calendar-api-openapi/endpoints/calendarAPIMairie360';
import {
  ApprovalStatus,
  EventCategory,
  type EventRecurrence,
  EventValidationStatus,
  type EventView,
  EventVisibility,
  type GetCalendarResultView,
  type GetEventResultView,
  type GetMembersResultView,
  type Member,
  type PostEventResultView,
  RecurrenceFrequency,
} from '@mairie360/calendar-api-openapi/model';
import { getCoreAPIMairie360 } from '@mairie360/core-api-openapi/endpoints/coreAPIMairie360';
import type { DirectoryUser, DirectoryUsersResultView } from '@mairie360/core-api-openapi/model';
import type { CalendarDirectoryUser } from '../../src/clients/coreDirectory';

// Réponses Calendar API et Core API typées par les modèles des paquets @mairie360/*-openapi installés : un champ
// ajouté, retiré ou renommé par un contrat fait échouer la compilation des tests. Elles sont en plus validées à
// l'exécution contre les contrats reconstruits (upstream-contracts.test.ts, mocks HTTP). Les champs non lus par le
// BFF sont présents parce que les modèles les exigent : ils doivent être ignorés.

/** Chemins des opérations amont, tels que les construisent les clients générés (helpers `get*Url`). */
export const calendarApiUrls = getCalendarAPIMairie360();
export const coreApiUrls = getCoreAPIMairie360();

/** Élément de `GET /api/v1/calendar` : `is_member` distingue les événements assignés des événements possédés. */
export function eventView(id: number, overrides: Partial<EventView> = {}): EventView {
  return {
    id,
    name: `Événement ${id}`,
    start: '2026-09-16T09:00:00Z',
    end: '2026-09-16T10:00:00Z',
    is_member: true,
    category: EventCategory.other,
    service: null,
    location: null,
    recurrence: null,
    ...overrides,
  };
}

export const calendarResult = (events: EventView[]): GetCalendarResultView => ({ events });

export function recurrence(overrides: Partial<EventRecurrence> = {}): EventRecurrence {
  return { frequency: RecurrenceFrequency.weekly, interval: 1, ...overrides };
}

export const member = (id: number, validation_status: EventValidationStatus = EventValidationStatus.validated): Member => ({ id, validation_status });

export const membersResult = (members: Member[]): GetMembersResultView => ({ members });

export const postEventResult = (event_id: number): PostEventResultView => ({ event_id });

/** Réponse de `GET /api/v1/events/{eventId}/` : métadonnées, membres, statut de validation et droits. */
export function eventDetails(id: number, overrides: Partial<GetEventResultView> = {}): GetEventResultView {
  return {
    id,
    name: `Événement ${id}`,
    description: `Description ${id}`,
    events_start_time: '2026-09-16T09:00:00Z',
    events_end_time: '2026-09-16T10:00:00Z',
    visibility: EventVisibility.Public,
    category: EventCategory.other,
    service: null,
    location: null,
    recurrence: null,
    owner: 1,
    created_by: 1,
    members: [member(1)],
    approval_status: ApprovalStatus.approved,
    permissions: { can_edit: true, can_delete: true, can_validate: false },
    ...overrides,
  };
}

export const directoryUsers = {
  admin: { id: 1, firstName: 'Admin', lastName: 'Mairie', email: 'admin@mairie.test', roles: ['Admin'], groupIds: [1] },
  alice: { id: 7, firstName: 'Alice', lastName: 'Martin', email: 'alice@mairie.test', roles: ['User'], groupIds: [1] },
  marie: { id: 3, firstName: 'Marie', lastName: 'Responsable', email: 'marie@mairie.test', roles: ['Responsable'], groupIds: [1] },
} satisfies Record<string, CalendarDirectoryUser>;

/** Fiche annuaire Core (DirectoryUser) d'un agent des tests. */
export function directoryUser(user: CalendarDirectoryUser): DirectoryUser {
  return { id: user.id, first_name: user.firstName, last_name: user.lastName, email: user.email, roles: user.roles, group_ids: user.groupIds };
}

/** Corps de `GET /api/v1/user/` (DirectoryUsersResultView). */
export function coreDirectory(users: CalendarDirectoryUser[]): DirectoryUsersResultView {
  return { users: users.map(directoryUser) };
}

/** JWT non signé : Calendar API (simulée) vérifie la signature, le BFF ne lit que `sub`. */
export function authorizationFor(userId: number): string {
  return `Bearer eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: String(userId) })).toString('base64url')}.signature`;
}
