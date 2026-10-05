import axios from "axios";

import { getCalendarAPIMairie360 } from "@mairie360/calendar-api-openapi/endpoints/calendarAPIMairie360";

// Dedicated axios instance for Calendar API. No baseURL here: every call passes the lib's asCaller /
// withoutSession options, which read CALENDAR_API_URL / CALENDAR_API_PORT at call time (no localhost
// default; the generated client adds `/api/v1`) and set the timeout. The instance only holds the headers.
const apiClientInstance = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
});

// Calendar API is only called through the operations of its published contract (@mairie360/calendar-api-openapi).
const calendarClient = getCalendarAPIMairie360(apiClientInstance);

export default calendarClient;
