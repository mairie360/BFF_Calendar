import { getCoreAPIMairie360 } from '@mairie360/core-api-openapi/endpoints/coreAPIMairie360';
import type { DirectoryUser } from '@mairie360/core-api-openapi/model';
import { authorization } from '@mairie360/bffs-lib';
import axios, { type AxiosRequestConfig } from 'axios';
import type { Request } from 'express';

/** The incoming request whose session is forwarded upstream (only its `Authorization` header is read). */
export type Caller = Pick<Request, 'headers'>;

// The staff directory (identity, roles, groups) comes from Core API, through the operations of its
// published contract (@mairie360/core-api-openapi): the BFF never reads the users, roles or groups tables.
const coreApiAxios = axios.create({ timeout: 5_000, headers: { Accept: 'application/json' } });

const coreApi = getCoreAPIMairie360(coreApiAxios);

export type CalendarDirectoryUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  groupIds: number[];
};

function normalizeBaseUrl(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `http://${value}`;
}

/**
 * Options of a Core API call, URL read on each call. With a caller, its session is forwarded (401 when it
 * has no Bearer token, before the call); without one (availability probe), no credential is sent.
 */
function coreOptions(caller?: Caller): AxiosRequestConfig {
  const headers = caller ? { Authorization: authorization(caller) } : undefined;
  const url = new URL(normalizeBaseUrl(process.env.CORE_API_URL ?? 'localhost'));
  if (!url.port && process.env.CORE_API_PORT) url.port = process.env.CORE_API_PORT;

  return {
    baseURL: url.toString().replace(/\/+$/, ''),
    ...(headers ? { headers } : {}),
  };
}

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
  caller: Caller,
): Promise<CalendarDirectoryUser[]> {
  if (filters.ids?.length === 0) return [];

  const response = await coreApi.listDirectoryUsers(
    {
      ...(filters.groupIds?.length ? { group_ids: filters.groupIds.join(',') } : {}),
      ...(filters.ids?.length ? { ids: filters.ids.join(',') } : {}),
    },
    coreOptions(caller),
  );

  return response.data.users.map(toDirectoryUser);
}

/** Staff member `userId`, or `null` when unknown or archived. */
export async function getCalendarDirectoryUser(
  userId: number,
  caller: Caller,
): Promise<CalendarDirectoryUser | null> {
  const [user] = await listCalendarDirectoryUsers({ ids: [userId] }, caller);
  return user ?? null;
}

export async function checkCoreApi(): Promise<void> {
  await coreApi.health({ ...coreOptions(), timeout: 5_000 });
}
