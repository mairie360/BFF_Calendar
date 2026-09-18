import axios from "axios";
import { getAuthorizationHeader } from "../config/token";

import { getCalendarAPIMairie360 } from "@mairie360/calendar-api-openapi/endpoints/calendarAPIMairie360";

// 1. Créer l'instance Axios dédiée au service distant
const apiClientInstance = axios.create({
  // Les routes du contrat sont publiées sous /api/v1 par le client généré : l'adresse est la racine du service.
  baseURL: calendarApiRootUrl(),
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

// Calendar API n'est appelée que par les opérations de son contrat publié (@mairie360/calendar-api-openapi).
const calendarClient = getCalendarAPIMairie360(apiClientInstance);

export default calendarClient;

/** Racine de Calendar API : toutes les opérations du contrat, `/health` compris, y sont relatives. */
export function calendarApiRootUrl(): string {
  const basePath = process.env.CALENDAR_API_BASE_PATH || "http://localhost:3002";
  return basePath.replace(/\/+$/, "");
}
