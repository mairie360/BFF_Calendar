/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CalendarRecurrence = {
    /**
     * Fréquence de récurrence
     */
    frequency: CalendarRecurrence.frequency;
    /**
     * Intervalle de récurrence (par défaut 1)
     */
    interval?: number;
    /**
     * Jours de la semaine (0=dimanche, 6=samedi). Utilisé pour les récurrences hebdomadaires
     */
    daysOfWeek?: Array<number>;
    /**
     * Date de fin inclusive (format YYYY-MM-DD)
     */
    endsOn?: string;
};
export namespace CalendarRecurrence {
    /**
     * Fréquence de récurrence
     */
    export enum frequency {
        NONE = 'none',
        DAILY = 'daily',
        WEEKLY = 'weekly',
        MONTHLY = 'monthly',
    }
}

