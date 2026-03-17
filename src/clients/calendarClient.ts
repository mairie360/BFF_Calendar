// src/clients/calendarClient.ts
import createClient from "openapi-fetch";
import type { paths } from "@mairie360/calendar-api-openapi"; 

const calendarClient = createClient<paths>({ 
    baseUrl: process.env.CALENDAR_API_URL 
});

export default calendarClient;