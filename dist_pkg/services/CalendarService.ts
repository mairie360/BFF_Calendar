/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CalendarAssignee } from '../models/CalendarAssignee';
import type { CalendarBootstrapResponse } from '../models/CalendarBootstrapResponse';
import type { CalendarCategory } from '../models/CalendarCategory';
import type { CalendarEvent } from '../models/CalendarEvent';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CalendarService {
    /**
     * Charge les données initiales du calendrier
     * Charge en une fois les événements de la période, les personnes assignables, les catégories et l'utilisateur courant
     * @returns CalendarBootstrapResponse Données bootstrap chargées avec succès
     * @throws ApiError
     */
    public static getCalendarBootstrap(): CancelablePromise<CalendarBootstrapResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/calendar/bootstrap',
            errors: {
                500: `Erreur serveur`,
            },
        });
    }
    /**
     * Récupère les événements sur une plage de dates
     * Charge les événements utiles à la vue mois/semaine/jour
     * @param from Date de début au format YYYY-MM-DD
     * @param to Date de fin au format YYYY-MM-DD
     * @returns CalendarEvent Liste des événements
     * @throws ApiError
     */
    public static getCalendarEvents(
        from: string,
        to: string,
    ): CancelablePromise<Array<CalendarEvent>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/calendar/events',
            query: {
                'from': from,
                'to': to,
            },
            errors: {
                400: `Paramètres invalides`,
                500: `Erreur serveur`,
            },
        });
    }
    /**
     * Crée un nouvel événement
     * Crée un événement calendrier et retourne l'objet enrichi avec son ID serveur
     * @param requestBody
     * @returns CalendarEvent Événement créé avec succès
     * @throws ApiError
     */
    public static postCalendarEvents(
        requestBody?: CalendarEvent,
    ): CancelablePromise<CalendarEvent> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/calendar/events',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Données invalides`,
                500: `Erreur serveur`,
            },
        });
    }
    /**
     * Modifie un événement existant
     * Met à jour un événement identifié par son ID
     * @param id Identifiant unique de l'événement
     * @param requestBody
     * @returns CalendarEvent Événement modifié avec succès
     * @throws ApiError
     */
    public static patchCalendarEvents(
        id: string,
        requestBody?: CalendarEvent,
    ): CancelablePromise<CalendarEvent> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/calendar/events/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Données invalides`,
                404: `Événement non trouvé`,
                500: `Erreur serveur`,
            },
        });
    }
    /**
     * Supprime un événement
     * Supprime un événement identifié par son ID
     * @param id Identifiant unique de l'événement
     * @returns void
     * @throws ApiError
     */
    public static deleteCalendarEvents(
        id: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/calendar/events/{id}',
            path: {
                'id': id,
            },
            errors: {
                404: `Événement non trouvé`,
                500: `Erreur serveur`,
            },
        });
    }
    /**
     * Récupère le référentiel des personnes assignables
     * Charge la liste complète des personnes pouvant être assignées à un événement
     * @returns CalendarAssignee Liste des personnes assignables
     * @throws ApiError
     */
    public static getCalendarAssignees(): CancelablePromise<Array<CalendarAssignee>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/calendar/assignees',
            errors: {
                500: `Erreur serveur`,
            },
        });
    }
    /**
     * Récupère le référentiel des catégories
     * Charge la liste des catégories d'événements disponibles
     * @returns CalendarCategory Liste des catégories
     * @throws ApiError
     */
    public static getCalendarCategories(): CancelablePromise<Array<CalendarCategory>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/calendar/categories',
            errors: {
                500: `Erreur serveur`,
            },
        });
    }
}
