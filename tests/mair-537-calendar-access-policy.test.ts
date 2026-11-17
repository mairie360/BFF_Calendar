import type { CallContext } from '../src/clients/callContext';
import type { CalendarDirectoryUser } from '../src/clients/coreDirectory';
import {
  calendarAssigneeScope,
  clearDirectoryCache,
  getCurrentCalendarUser,
  hasCalendarRole,
  listAssignableCalendarUsers,
  primaryCalendarRole,
} from '../src/services/calendarAccessPolicy';
import { getCalendarDirectoryUser, listCalendarDirectoryUsers } from '../src/clients/coreDirectory';

// MAIR-537: unit tests of the access policy (it had none): the unknown-user 401, the assignee scope of each role
// (Maire included), the self scope, the per-caller cache and the accent-insensitive role comparison.
jest.mock('@mairie360/bffs-lib', () => ({
  ...jest.requireActual('@mairie360/bffs-lib'),
  sessionUserId: jest.fn(),
}));
jest.mock('../src/clients/coreDirectory', () => ({
  getCalendarDirectoryUser: jest.fn(),
  listCalendarDirectoryUsers: jest.fn(),
}));

import { sessionUserId } from '@mairie360/bffs-lib';

const user = (id: number, roles: string[], groupIds: number[] = []): CalendarDirectoryUser => ({ id, roles, groupIds } as CalendarDirectoryUser);
const context = { req: {}, declared: [] } as unknown as CallContext;

beforeEach(() => {
  jest.clearAllMocks();
  clearDirectoryCache();
  jest.mocked(sessionUserId).mockReturnValue(7);
});

describe('MAIR-537 getCurrentCalendarUser', () => {
  it('answers 401 "Unknown user." when the directory does not know the verified caller', async () => {
    jest.mocked(getCalendarDirectoryUser).mockResolvedValue(undefined as never);

    await expect(getCurrentCalendarUser(context)).rejects.toMatchObject({ status: 401, message: 'Unknown user.' });
  });

  it('reads the directory with the verified caller id and caches the answer per caller', async () => {
    jest.mocked(getCalendarDirectoryUser).mockResolvedValue(user(7, ['User']));

    await getCurrentCalendarUser(context);
    await getCurrentCalendarUser(context);
    expect(getCalendarDirectoryUser).toHaveBeenCalledTimes(1);
    expect(getCalendarDirectoryUser).toHaveBeenCalledWith(7, context);

    jest.mocked(sessionUserId).mockReturnValue(8);
    jest.mocked(getCalendarDirectoryUser).mockResolvedValue(user(8, ['User']));
    await expect(getCurrentCalendarUser(context)).resolves.toMatchObject({ id: 8 });
    expect(getCalendarDirectoryUser).toHaveBeenCalledTimes(2);
  });

  it('`fresh` skips the cache (writes authorize with fresh data) and clearDirectoryCache empties it', async () => {
    jest.mocked(getCalendarDirectoryUser).mockResolvedValue(user(7, ['User']));
    await getCurrentCalendarUser(context);

    await getCurrentCalendarUser(context, { fresh: true });
    expect(getCalendarDirectoryUser).toHaveBeenCalledTimes(2);

    clearDirectoryCache();
    await getCurrentCalendarUser(context);
    expect(getCalendarDirectoryUser).toHaveBeenCalledTimes(3);
  });

  it('fails closed with a 401 when the request did not go through the session check', async () => {
    const { HttpError } = jest.requireActual('@mairie360/bffs-lib');
    jest.mocked(sessionUserId).mockImplementation(() => { throw new HttpError(401, 'Invalid session'); });

    await expect(getCurrentCalendarUser(context)).rejects.toMatchObject({ status: 401 });
    expect(getCalendarDirectoryUser).not.toHaveBeenCalled();
  });
});

describe('MAIR-537 roles and assignee scope', () => {
  it('compares roles without case or accents, and picks the highest primary role', () => {
    expect(hasCalendarRole(user(1, ['  RESPONSABLE ']), 'Responsable')).toBe(true);
    expect(hasCalendarRole(user(1, ['Élève']), 'eleve')).toBe(true);
    expect(hasCalendarRole(user(1, ['User']), 'Admin', 'Maire')).toBe(false);
    expect(primaryCalendarRole(user(1, ['User', 'Maire', 'Guest']))).toBe('Maire');
    expect(primaryCalendarRole(user(1, ['Stagiaire']))).toBe('Stagiaire');
    expect(primaryCalendarRole(user(1, []))).toBe('Guest');
  });

  it.each([
    ['Admin', [], 'all'],
    ['Maire', [], 'all'],
    ['Maire', [3], 'all'],
    ['Responsable', [3], 'groups'],
    ['User', [3, 4], 'groups'],
    ['User', [], 'self'],
    ['Guest', [], 'self'],
  ] as const)('a %s with groups %j has the %s assignee scope', (role, groupIds, scope) => {
    expect(calendarAssigneeScope(user(1, [role], [...groupIds]))).toBe(scope);
  });
});

describe('MAIR-537 listAssignableCalendarUsers', () => {
  it('self scope: only the caller, without reading the directory', async () => {
    const me = user(7, ['User']);

    await expect(listAssignableCalendarUsers(me, context)).resolves.toEqual([me]);
    expect(listCalendarDirectoryUsers).not.toHaveBeenCalled();
  });

  it('Maire (all scope) reads the whole directory, a group member only their groups', async () => {
    jest.mocked(listCalendarDirectoryUsers).mockResolvedValue([user(1, ['User'])]);

    await listAssignableCalendarUsers(user(7, ['Maire']), context);
    expect(listCalendarDirectoryUsers).toHaveBeenLastCalledWith({}, context);

    await listAssignableCalendarUsers(user(8, ['Responsable'], [3, 4]), context);
    expect(listCalendarDirectoryUsers).toHaveBeenLastCalledWith({ groupIds: [3, 4] }, context);
  });

  it('caches per caller and scope, and `fresh` reads again', async () => {
    jest.mocked(listCalendarDirectoryUsers).mockResolvedValue([user(1, ['User'])]);
    const manager = user(8, ['Responsable'], [3]);

    await listAssignableCalendarUsers(manager, context);
    await listAssignableCalendarUsers(manager, context);
    expect(listCalendarDirectoryUsers).toHaveBeenCalledTimes(1);

    await listAssignableCalendarUsers(user(8, ['Responsable'], [3, 9]), context);
    expect(listCalendarDirectoryUsers).toHaveBeenCalledTimes(2);

    await listAssignableCalendarUsers(manager, context, { fresh: true });
    expect(listCalendarDirectoryUsers).toHaveBeenCalledTimes(3);
  });
});
