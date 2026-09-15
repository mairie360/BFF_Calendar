import type { CalendarDirectoryUser, CalendarEventAccess, EventValidationStatus } from '../../src/repositories/calendarAccessRepository';

// Réponses Calendar API conformes au contrat du paquet @mairie360/calendar-api-openapi installé
// (validées dans upstream-contracts.test.ts) et utilisateurs de l'annuaire PostgreSQL.

export function eventView(id: number, overrides: Partial<{ name: string; start: string; end: string }> = {}) {
  return { id, name: `Événement ${id}`, start: '2026-09-16T09:00:00Z', end: '2026-09-16T10:00:00Z', ...overrides };
}

export function calendarResult(events: Array<ReturnType<typeof eventView>>) {
  return { events };
}

export function eventDetails(id: number, overrides: Partial<{
  name: string; description: string | null; events_start_time: string; events_end_time: string;
  owner: number; members: Array<{ id: number; validation_status: EventValidationStatus }>;
}> = {}) {
  return {
    id,
    name: `Événement ${id}`,
    description: `Description ${id}`,
    events_start_time: '2026-09-16T09:00:00Z',
    events_end_time: '2026-09-16T10:00:00Z',
    owner: 1,
    members: [{ id: 1, validation_status: 'validated' as EventValidationStatus }],
    recurrence_id: null,
    visibility: 'Public',
    ...overrides,
  };
}

export const directoryUsers = {
  admin: { id: 1, firstName: 'Admin', lastName: 'Mairie', email: 'admin@mairie.test', roles: ['Admin'], groupIds: [1] },
  alice: { id: 7, firstName: 'Alice', lastName: 'Martin', email: 'alice@mairie.test', roles: ['User'], groupIds: [1] },
  marie: { id: 3, firstName: 'Marie', lastName: 'Responsable', email: 'marie@mairie.test', roles: ['Responsable'], groupIds: [1] },
} satisfies Record<string, CalendarDirectoryUser>;

export function access(eventId: number, createdById: number, members: Array<[CalendarDirectoryUser, EventValidationStatus]>): CalendarEventAccess {
  return { eventId, createdById, members: members.map(([user, validationStatus]) => ({ ...user, validationStatus })) };
}

/** JWT non signé : Calendar API (simulée) vérifie la signature, le BFF ne lit que `sub`. */
export function authorizationFor(userId: number): string {
  return `Bearer eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: String(userId) })).toString('base64url')}.signature`;
}
