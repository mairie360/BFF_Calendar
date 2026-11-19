import type { CalendarDirectoryUser } from '../src/clients/coreDirectory';
import { calendarAssigneeScope, primaryCalendarRole } from '../src/services/calendarAccessPolicy';

const user = (roles: string[], groupIds: number[] = []): CalendarDirectoryUser => ({ id: 1, roles, groupIds } as CalendarDirectoryUser);

// One role rule for every BFF (bffs-lib): Calendar used to compare names without the `role_` prefix, `_` or spaces,
// so "ROLE_ADMIN" or "Administrateur" were not administrators here while they were in BFF_Project.
describe('MAIR-689 Calendar recognises roles like every other BFF', () => {
  it.each([
    ['Admin', 'all'],
    ['Administrateur', 'all'],
    ['ROLE_ADMIN', 'all'],
    [' role-admin ', 'all'],
    ['Maire', 'all'],
    ['Mayor', 'all'],
    ['ROLE_MAIRE', 'all'],
    ['Responsable', 'groups'],
    ['ROLE_RESPONSABLE', 'groups'],
    ['Stagiaire', 'groups'],
    ['Super Admin', 'groups'],
  ])('role %p with a group has the %s assignee scope', (role, scope) => {
    expect(calendarAssigneeScope(user([role], [3]))).toBe(scope);
  });

  it.each([
    [['ROLE_ADMIN', 'User'], 'Admin'],
    [['Utilisateur', 'ROLE_RESPONSABLE'], 'Responsable'],
    [['Mayor', 'Guest'], 'Maire'],
    [['Stagiaire'], 'Stagiaire'],
    [[], 'Guest'],
  ])('the primary role of %j is %s', (roles, primary) => {
    expect(primaryCalendarRole(user(roles))).toBe(primary);
  });
});
