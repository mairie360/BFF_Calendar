import type { CallContext } from '../src/clients/callContext';
import { coreApi, idBatches, listCalendarDirectoryUsers, MAX_IDS_PARAMETER_LENGTH } from '../src/clients/coreDirectory';

// MAIR-1203: the period and the bootstrap of a busy month answered 400. The members of every event were resolved in a
// single `GET /api/v1/user/?ids=…`, and Core refuses an `ids` longer than 255 characters (about forty ids).
jest.mock('@mairie360/bffs-lib', () => ({
  ...jest.requireActual('@mairie360/bffs-lib'),
  asCaller: jest.fn(() => ({})),
  callUpstream: jest.fn((_service: string, call: () => unknown) => call()),
}));

const context = { req: {}, declared: [400, 401] } as unknown as CallContext;
const directoryUser = (id: number) => ({
  id,
  first_name: `First ${id}`,
  last_name: `Last ${id}`,
  email: `agent${id}@mairie.fr`,
  roles: ['User'],
  group_ids: [],
});

afterEach(() => jest.restoreAllMocks());

describe('MAIR-1203 idBatches', () => {
  it('keeps every batch within the length Core accepts, in order and without duplicates', () => {
    const ids = Array.from({ length: 200 }, (_, index) => 300001 + index);

    const batches = idBatches([...ids, ids[0]]);

    expect(batches.length).toBeGreaterThan(1);
    batches.forEach((batch) => expect(batch.length).toBeLessThanOrEqual(MAX_IDS_PARAMETER_LENGTH));
    expect(batches.join(',').split(',').map(Number)).toEqual(ids);
  });

  it('sends a short list in one batch', () => {
    expect(idBatches([3, 1, 2])).toEqual(['3,1,2']);
  });
});

describe('MAIR-1203 listCalendarDirectoryUsers', () => {
  it('resolves the members of a busy month in several Core calls, each within 255 characters', async () => {
    const ids = Array.from({ length: 120 }, (_, index) => 300001 + index);
    const listDirectoryUsers = jest.spyOn(coreApi, 'listDirectoryUsers').mockImplementation(async (params) => {
      const requested = String(params?.ids ?? '').split(',').map(Number);
      return { data: { users: requested.map(directoryUser) } } as never;
    });

    const users = await listCalendarDirectoryUsers({ ids }, context);

    expect(listDirectoryUsers.mock.calls.length).toBeGreaterThan(1);
    listDirectoryUsers.mock.calls.forEach(([params]) =>
      expect(String(params?.ids).length).toBeLessThanOrEqual(MAX_IDS_PARAMETER_LENGTH),
    );
    expect(users.map((user) => user.id)).toEqual(ids);
  });

  it('keeps the group filter on every batch and calls Core once for groups alone', async () => {
    const listDirectoryUsers = jest
      .spyOn(coreApi, 'listDirectoryUsers')
      .mockResolvedValue({ data: { users: [] } } as never);

    await listCalendarDirectoryUsers({ groupIds: [4, 5] }, context);
    await listCalendarDirectoryUsers({ groupIds: [4], ids: Array.from({ length: 60 }, (_, index) => 300001 + index) }, context);

    expect(listDirectoryUsers.mock.calls[0][0]).toEqual({ group_ids: '4,5' });
    listDirectoryUsers.mock.calls.slice(1).forEach(([params]) => expect(params?.group_ids).toBe('4'));
  });

  it('does not call Core for an empty id list', async () => {
    const listDirectoryUsers = jest.spyOn(coreApi, 'listDirectoryUsers');

    await expect(listCalendarDirectoryUsers({ ids: [] }, context)).resolves.toEqual([]);
    expect(listDirectoryUsers).not.toHaveBeenCalled();
  });
});
