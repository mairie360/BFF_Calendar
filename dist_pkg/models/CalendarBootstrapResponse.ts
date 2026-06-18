/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CalendarAssignee } from './CalendarAssignee';
import type { CalendarCategory } from './CalendarCategory';
import type { CalendarEvent } from './CalendarEvent';
export type CalendarBootstrapResponse = {
    /**
     * Liste des événements de la période
     */
    events: Array<CalendarEvent>;
    /**
     * Référentiel des personnes assignables
     */
    assignees: Array<CalendarAssignee>;
    /**
     * Référentiel des catégories
     */
    categories: Array<CalendarCategory>;
    /**
     * Utilisateur actuellement authentifié (optionnel)
     */
    currentUser?: {
        name: string;
        email: string;
        role?: string;
    };
};

