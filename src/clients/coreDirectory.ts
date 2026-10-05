import { getCoreAPIMairie360 } from '@mairie360/core-api-openapi/endpoints/coreAPIMairie360';
import type { DirectoryUser } from '@mairie360/core-api-openapi/model';
import { asCaller, callUpstream } from '@mairie360/bffs-lib';
import axios from 'axios';
import type { CallContext } from './callContext';

// The staff directory (identity, roles, groups) comes from Core API, through the operations of its
// published contract (@mairie360/core-api-openapi): the BFF never reads the users, roles or groups tables.
// No baseURL on the instance: each call passes the lib's asCaller / withoutSession options, which read
// CORE_API_URL / CORE_API_PORT at call time (no localhost default, 503 when missing).
const coreApiAxios = axios.create({ headers: { Accept: 'application/json' } });

export const coreApi = getCoreAPIMairie360(coreApiAxios);

export type CalendarDirectoryUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  groupIds: number[];
};

function toDirectoryUser(user: DirectoryUser): CalendarDirectoryUser {
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    roles: user.roles,
    groupIds: user.group_ids,
  };
}

/** Non-archived staff members, optionally restricted to some groups or ids. */
export async function listCalendarDirectoryUsers(
  filters: { groupIds?: number[]; ids?: number[] },
  context: CallContext,
): Promise<CalendarDirectoryUser[]> {
  if (filters.ids?.length === 0) return [];

  const params = {
    ...(filters.groupIds?.length ? { group_ids: filters.groupIds.join(',') } : {}),
    ...(filters.ids?.length ? { ids: filters.ids.join(',') } : {}),
  };
  const response = await callUpstream(
    'CORE_API',
    () => coreApi.listDirectoryUsers(params, asCaller('CORE_API', context.req)),
    { declared: context.declared, retry: true },
  );

  return response.data.users.map(toDirectoryUser);
}

/** Staff member `userId`, or `null` when unknown or archived. */
export async function getCalendarDirectoryUser(
  userId: number,
  context: CallContext,
): Promise<CalendarDirectoryUser | null> {
  const [user] = await listCalendarDirectoryUsers({ ids: [userId] }, context);
  return user ?? null;
}
