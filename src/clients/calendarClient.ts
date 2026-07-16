import axios from "axios";
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { getAuthorizationHeader } from "../config/token";

type CalendarApiClient = {
  getCalendar: (params: unknown, options?: AxiosRequestConfig) => Promise<AxiosResponse<{ events: unknown[] }>>;
  createEvent: (body: unknown, options?: AxiosRequestConfig) => Promise<AxiosResponse<{ event_id: number }>>;
  getEvent: (eventId: number, options?: AxiosRequestConfig) => Promise<AxiosResponse<unknown>>;
  deleteEvent: (eventId: number, options?: AxiosRequestConfig) => Promise<AxiosResponse<void>>;
  patchEvent: (
    eventId: number,
    body: unknown,
    params: { reccurent: boolean },
    options?: AxiosRequestConfig,
  ) => Promise<AxiosResponse<void>>;
  getEventMembers: (eventId: number, options?: AxiosRequestConfig) => Promise<AxiosResponse<{ members: unknown[] }>>;
  addEventMember: (
    eventId: number,
    body: { user_id: number },
    options?: AxiosRequestConfig,
  ) => Promise<AxiosResponse<{ user_id: number }>>;
  removeEventMember: (
    eventId: string,
    memberId: string,
    options?: AxiosRequestConfig,
  ) => Promise<AxiosResponse<void>>;
};

// The generated package currently contains duplicate type declarations, so a typed import breaks tsc.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getCalendarApi } = require("@mairie360/calendar-api-openapi/endpoints/calendarApi") as {
  getCalendarApi: (axiosInstance?: AxiosInstance) => CalendarApiClient;
};

// 1. Créer l'instance Axios dédiée au service distant
const apiClientInstance = axios.create({
  baseURL: process.env.CALENDAR_API_BASE_PATH || "http://localhost:3002/api",
  timeout: 5000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Intercepteur pour injecter automatiquement le token
apiClientInstance.interceptors.request.use(
  (config) => {
    const currentAuth = config.headers.Authorization;

    // Si aucun token n'est fourni par l'appel Orval, on met celui par défaut.
    const authHeader = getAuthorizationHeader(typeof currentAuth === "string" ? currentAuth : undefined);
    if (authHeader) {
      config.headers.Authorization = authHeader;
    }

    console.log("Requête sortante vers :", config.baseURL + "" + config.url);
    return config; // <-- TRÈS IMPORTANT : Si cette ligne manque, Axios bloque !
  },
  (error) => {
    return Promise.reject(error);
  },
);

// 2. Injecter l'instance dans le code généré par Orval
const calendarClient = getCalendarApi(apiClientInstance);

console.log("Calendar API Base Path:", process.env.CALENDAR_API_BASE_PATH);

export default calendarClient;
