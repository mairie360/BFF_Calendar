import axios from "axios";

import { getCalendarAPIMairie360 } from "@mairie360/calendar-api-openapi/endpoints/calendarAPIMairie360";

/**
 * Calendar API root: every operation of its contract, `/health` included, is relative to it (the generated
 * client adds `/api/v1`). Read from `CALENDAR_API_BASE_PATH`, with no default: a missing value fails the
 * call (and the server start, see `src/index.ts`) instead of silently targeting localhost.
 */
export function calendarApiRootUrl(): string {
  const basePath = process.env.CALENDAR_API_BASE_PATH?.trim();
  if (!basePath) {
    throw new Error("CALENDAR_API_BASE_PATH is not set: the Calendar API URL must be configured explicitly.");
  }
  return basePath.replace(/\/+$/, "");
}

// Dedicated axios instance for Calendar API.
const apiClientInstance = axios.create({
  timeout: 5000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Resolves the Calendar API root on each call. The caller's session is passed per call, already
// normalised by the lib's `authorization(req)`; no default token is ever injected.
apiClientInstance.interceptors.request.use((config) => {
  config.baseURL = config.baseURL ?? calendarApiRootUrl();
  return config;
});

// Calendar API is only called through the operations of its published contract (@mairie360/calendar-api-openapi).
const calendarClient = getCalendarAPIMairie360(apiClientInstance);

export default calendarClient;
