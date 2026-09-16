import type { CalendarDirectoryUser } from '../../src/clients/coreDirectory';

// Réponses Calendar API et Core API conformes aux contrats des paquets @mairie360/*-openapi installés
// (validées dans upstream-contracts.test.ts). Les champs non lus par le BFF sont volontairement présents.

type ValidationStatus = 'pending' | 'validated' | 'refused';

type Recurrence = {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  days_of_week?: number[];
  ends_on?: string;
};

/** Élément de `GET /v1/calendar` : `is_member` distingue les événements assignés des événements possédés. */
export function eventView(id: number, overrides: Partial<{
  name: string; start: string; end: string; is_member: boolean;
  category: string; service: string | null; location: string | null; recurrence: Recurrence | null;
}> = {}) {
  return {
    id,
    name: `Événement ${id}`,
    start: '2026-09-16T09:00:00Z',
    end: '2026-09-16T10:00:00Z',
    is_member: true,
    category: 'other',
    service: null,
    location: null,
    recurrence: null,
    ...overrides,
  };
}

export function calendarResult(events: Array<ReturnType<typeof eventView>>) {
  return { events };
}

/** Réponse de `GET /v1/events/{eventId}/` : métadonnées, membres, statut de validation et droits. */
export function eventDetails(id: number, overrides: Partial<{
  name: string; description: string | null; events_start_time: string; events_end_time: string;
  category: string; service: string | null; location: string | null; recurrence: Recurrence | null;
  owner: number | null; created_by: number | null;
  members: Array<{ id: number; validation_status: ValidationStatus }>;
  approval_status: 'pending' | 'approved' | 'rejected';
  permissions: { can_edit: boolean; can_delete: boolean; can_validate: boolean };
}> = {}) {
  return {
    id,
    name: `Événement ${id}`,
    description: `Description ${id}`,
    events_start_time: '2026-09-16T09:00:00Z',
    events_end_time: '2026-09-16T10:00:00Z',
    visibility: 'Public',
    category: 'other',
    service: null,
    location: null,
    recurrence: null,
    owner: 1,
    created_by: 1,
    members: [{ id: 1, validation_status: 'validated' as ValidationStatus }],
    approval_status: 'approved' as const,
    permissions: { can_edit: true, can_delete: true, can_validate: false },
    ...overrides,
  };
}

export const directoryUsers = {
  admin: { id: 1, firstName: 'Admin', lastName: 'Mairie', email: 'admin@mairie.test', roles: ['Admin'], groupIds: [1] },
  alice: { id: 7, firstName: 'Alice', lastName: 'Martin', email: 'alice@mairie.test', roles: ['User'], groupIds: [1] },
  marie: { id: 3, firstName: 'Marie', lastName: 'Responsable', email: 'marie@mairie.test', roles: ['Responsable'], groupIds: [1] },
} satisfies Record<string, CalendarDirectoryUser>;

/** Corps de `GET /api/v1/user/` (DirectoryUsersResultView). */
export function coreDirectory(users: CalendarDirectoryUser[]) {
  return {
    users: users.map((user) => ({
      id: user.id,
      first_name: user.firstName,
      last_name: user.lastName,
      email: user.email,
      roles: user.roles,
      group_ids: user.groupIds,
    })),
  };
}

/** JWT non signé : Calendar API (simulée) vérifie la signature, le BFF ne lit que `sub`. */
export function authorizationFor(userId: number): string {
  return `Bearer eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: String(userId) })).toString('base64url')}.signature`;
}
