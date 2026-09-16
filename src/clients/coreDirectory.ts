import { getCoreApi } from '@mairie360/core-api-openapi/endpoints/coreApi';
import type { DirectoryUser } from '@mairie360/core-api-openapi/model';
import axios, { type AxiosRequestConfig } from 'axios';
import { getAuthorizationHeader } from '../config/token';

// L'annuaire des agents (identité, rôles, groupes) vient de Core API, par les opérations de son contrat
// publié (@mairie360/core-api-openapi) : le BFF n'interroge plus les tables users, roles et groupes.
const coreApiAxios = axios.create({ timeout: 5_000, headers: { Accept: 'application/json' } });

const coreApi = getCoreApi(coreApiAxios);

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

/** URL relue à chaque appel : les variables d'environnement peuvent changer sans redémarrage. */
function coreOptions(incomingRequestToken?: string): AxiosRequestConfig {
  const url = new URL(normalizeBaseUrl(process.env.CORE_API_URL ?? 'localhost'));
  if (!url.port && process.env.CORE_API_PORT) url.port = process.env.CORE_API_PORT;
  const authorization = getAuthorizationHeader(incomingRequestToken);

  return {
    baseURL: url.toString().replace(/\/+$/, ''),
    ...(authorization ? { headers: { Authorization: authorization } } : {}),
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

/** Agents non archivés, éventuellement restreints à des groupes ou à des identifiants. */
export async function listCalendarDirectoryUsers(
  filters: { groupIds?: number[]; ids?: number[] } = {},
  incomingRequestToken?: string,
): Promise<CalendarDirectoryUser[]> {
  if (filters.ids?.length === 0) return [];

  const response = await coreApi.listDirectoryUsers(
    {
      ...(filters.groupIds?.length ? { group_ids: filters.groupIds.join(',') } : {}),
      ...(filters.ids?.length ? { ids: filters.ids.join(',') } : {}),
    },
    coreOptions(incomingRequestToken),
  );

  return response.data.users.map(toDirectoryUser);
}

/** Agent d'identifiant `userId`, ou `null` s'il est inconnu ou archivé. */
export async function getCalendarDirectoryUser(
  userId: number,
  incomingRequestToken?: string,
): Promise<CalendarDirectoryUser | null> {
  const [user] = await listCalendarDirectoryUsers({ ids: [userId] }, incomingRequestToken);
  return user ?? null;
}

export async function checkCoreApi(): Promise<void> {
  await coreApi.health({ ...coreOptions(), timeout: 5_000 });
}
