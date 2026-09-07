# BFF_Calendar — Module overview

[Technical documentation](technical.md) · [Français](../fr/module.md) · [README](../../README.md)

Provide the events, reference lists and access rules required by the municipal calendar. The BFF combines Calendar API data with assignment and approval information used by the web service.

## Audience and value

Staff organizing events, managers approving them and teams integrating the calendar.

Business domain: Calendar.

## Available capabilities

- Initial loading of events, assignable people, categories and services.
- Create, edit and delete events with dates, location, assignments and recurrence.
- Approve events according to the user’s roles and groups.

## Typical workflow

1. Load a date range through `/calendar/bootstrap`.
2. Create or update an event and choose authorized assignees.
3. Inspect approval status and reload the date range after a mutation.

## Role within Mairie360

Associated repositories: [Calendars_Web_Service](https://github.com/mairie360/Calendars_Web_Service).

This repository contains the BFF server and its contract. Associated web services own the screens; the BFF adapts data and server rules needed by those screens.

## Data and current state

Calendar API supplies event operations. `calendarAccessRepository.ts` accesses PostgreSQL directly for the directory, assignments, some updates and metadata. The `calendar_event_metadata` table, created by the BFF when needed, references `events.id` and stores category, service, location and recurrence. Categories and services include reference lists defined in the helpers.

## Scope and limitations

Operation depends on consistent user identifiers between Core and Calendar and the expected SQL schema. The Docker stack uses the database shared with BFF User; start that stack first. Metadata and direct SQL access remain current BFF responsibilities.

## Developing or operating this module

The [technical guide](technical.md) covers architecture, configuration, routes, session handling, persistence, tests and CI/CD. It describes sources of truth and contract synchronization with associated repositories.
