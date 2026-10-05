import axios from "axios";

import { getCalendarAPIMairie360 } from "@mairie360/calendar-api-openapi/endpoints/calendarAPIMairie360";

// Dedicated axios instance for Calendar API. No baseURL here: every call passes the Calendar API root read
// from CALENDAR_API_URL / CALENDAR_API_PORT at call time (lib `baseUrl('CALENDAR_API')`, no localhost
// default; the generated client adds `/api/v1`). The instance only holds the timeout and headers.
const apiClientInstance = axios.create({
  timeout: 5000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Calendar API is only called through the operations of its published contract (@mairie360/calendar-api-openapi).
const calendarClient = getCalendarAPIMairie360(apiClientInstance);

export default calendarClient;
