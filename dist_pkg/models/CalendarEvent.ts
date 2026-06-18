/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CalendarAssignee } from './CalendarAssignee';
import type { CalendarRecurrence } from './CalendarRecurrence';
export type CalendarEvent = {
    /**
     * Identifiant stable. Optionnel en création, obligatoire en lecture.
     */
    id?: (string | number);
    /**
     * Titre de l'événement
     */
    title: string;
    /**
     * Date de début (format YYYY-MM-DD ou DD-MM-YYYY)
     */
    date: string;
    /**
     * Date de fin pour les événements multi-jours (format YYYY-MM-DD ou DD-MM-YYYY)
     */
    endDate?: string;
    /**
     * Catégorie: meeting (Réunion), activity (Animation), ceremony (Cérémonie), other (Autre)
     */
    category?: CalendarEvent.category;
    /**
     * Heure de début au format HH:mm
     */
    startTime?: string;
    /**
     * Heure de fin au format HH:mm
     */
    endTime?: string;
    /**
     * Lieu de l'événement
     */
    location?: string;
    /**
     * Description détaillée
     */
    description?: string;
    /**
     * Liste des identifiants des personnes assignées
     */
    assigneeIds?: Array<(string | number)>;
    /**
     * Objets complets des personnes assignées (optionnel, peut être reconstruit côté front)
     */
    assignees?: Array<CalendarAssignee>;
    recurrence?: CalendarRecurrence;
};
export namespace CalendarEvent {
    /**
     * Catégorie: meeting (Réunion), activity (Animation), ceremony (Cérémonie), other (Autre)
     */
    export enum category {
        MEETING = 'meeting',
        ACTIVITY = 'activity',
        CEREMONY = 'ceremony',
        OTHER = 'other',
    }
}

