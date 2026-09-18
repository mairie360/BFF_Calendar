import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { JsonSchema, OpenApiContract } from './support/openapi-contract';
import { loadOrvalContract, resolveOrvalPackage } from './support/orval-contract';
import {
  calendarApiUrls, calendarResult, coreApiUrls, coreDirectory, directoryUsers, eventDetails, eventView, member, membersResult, postEventResult,
} from './support/calendar-fixtures';

// Les contrats des API amont sont reconstruits depuis les paquets @mairie360/*-api-openapi installés :
// monter la version dans package.json suffit à tester le BFF contre le nouveau contrat.

const PACKAGES = ['@mairie360/calendar-api-openapi', '@mairie360/core-api-openapi'] as const;

const calendarApi = loadOrvalContract('@mairie360/calendar-api-openapi');
const coreApi = loadOrvalContract('@mairie360/core-api-openapi');

/** Chemin d'une opération tel que le client généré le construit (helper `get*Url`), sans sa query string. */
const pathname = (url: string) => new URL(url, 'http://upstream').pathname;

// Opérations amont réellement appelées par le BFF (src/clients/calendarClient.ts, src/clients/coreDirectory.ts,
// src/routes/check_apis.ts), adressées par les helpers d'URL des clients générés.
const CONSUMED = [
  { contract: calendarApi, operationId: 'getCalendar', method: 'get', url: calendarApiUrls.getGetCalendarUrl({ start: '2026-09-01T00:00:00Z', end: '2026-09-30T23:59:59Z' }) },
  { contract: calendarApi, operationId: 'createEvent', method: 'post', url: calendarApiUrls.getCreateEventUrl() },
  { contract: calendarApi, operationId: 'getEvent', method: 'get', url: calendarApiUrls.getGetEventUrl(5) },
  { contract: calendarApi, operationId: 'patchEvent', method: 'patch', url: calendarApiUrls.getPatchEventUrl(5) },
  { contract: calendarApi, operationId: 'deleteEvent', method: 'delete', url: calendarApiUrls.getDeleteEventUrl(5) },
  { contract: calendarApi, operationId: 'addEventMember', method: 'post', url: calendarApiUrls.getAddEventMemberUrl(5) },
  { contract: calendarApi, operationId: 'updateEventValidation', method: 'patch', url: calendarApiUrls.getUpdateEventValidationUrl(5) },
  { contract: calendarApi, operationId: 'removeEventMember', method: 'delete', url: calendarApiUrls.getRemoveEventMemberUrl(5, 7) },
  { contract: calendarApi, operationId: 'health', method: 'get', url: calendarApiUrls.getHealthUrl() },
  { contract: coreApi, operationId: 'listDirectoryUsers', method: 'get', url: coreApiUrls.getListDirectoryUsersUrl({ ids: '1,7', group_ids: '1' }) },
  { contract: coreApi, operationId: 'health', method: 'get', url: coreApiUrls.getHealthUrl() },
] as const;

function responseSchema(contract: OpenApiContract, method: string, url: string, status: number): JsonSchema {
  const match = contract.match(method, pathname(url));
  if (!match) throw new Error(`${method} ${url} absent de ${contract.title}`);
  const { schema } = contract.responseSchema(match, status);
  if (!schema) throw new Error(`Pas de schéma JSON pour ${status} ${method} ${url}`);
  return schema;
}

describe('upstream contracts from the installed @mairie360 OpenAPI packages', () => {
  test.each(PACKAGES)('%s is the version pinned in package.json', (name) => {
    const { dependencies } = JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')) as { dependencies: Record<string, string> };
    expect(resolveOrvalPackage(name).version).toBe(dependencies[name]);
  });

  test.each(CONSUMED)('$contract.title routes $method $url to $operationId', ({ contract, operationId, method, url }) => {
    const { match, errors } = contract.validateRequest(method, new URL(url, 'http://upstream'));
    expect(errors).toEqual([]);
    expect((match?.operation as { operationId?: string } | undefined)?.operationId).toBe(operationId);
  });

  test('keeps request parameters, bodies and response models of the Calendar API operations', () => {
    const patch = calendarApi.match('PATCH', calendarApiUrls.getPatchEventUrl(5))!;
    expect(patch.operation.parameters).toEqual([
      { name: 'eventId', in: 'path', required: true, schema: { type: 'number' } },
    ]);
    expect(calendarApi.requestBodySchema(patch)).toEqual({ required: true, schema: { $ref: '#/components/schemas/PatchEventView' } });
    expect(calendarApi.schema('PostEventView')).toMatchObject({ required: ['events_end_time', 'events_start_time', 'name'] });
    expect(calendarApi.schema('EventValidationStatus')).toEqual({ type: 'string', enum: ['validated', 'refused', 'pending'] });
    // start et end de GET /api/v1/calendar sont des dates RFC 3339, comme le BFF les envoie.
    const calendar = calendarApi.match('GET', pathname(calendarApiUrls.getGetCalendarUrl({ start: '', end: '' })))!;
    expect(calendar.operation.parameters).toEqual([
      { name: 'start', in: 'query', required: true, schema: { type: 'string' } },
      { name: 'end', in: 'query', required: true, schema: { type: 'string' } },
    ]);
    // Catégorie, service, lieu et répétition font partie de l'événement.
    expect(Object.keys(calendarApi.schema('GetEventResultView').properties as Record<string, unknown>))
      .toEqual(expect.arrayContaining(['category', 'service', 'location', 'recurrence', 'approval_status', 'permissions']));
    expect(calendarApi.schema('EventRecurrence')).toMatchObject({ required: ['frequency', 'interval'] });
    expect(calendarApi.responseSchema(calendarApi.match('DELETE', calendarApiUrls.getDeleteEventUrl(5))!, 204)).toEqual({ documented: true, schema: undefined });
    // Les erreurs ne sont pas typées par orval : aucun statut hors 2XX n'est documenté.
    expect(calendarApi.responseSchema(calendarApi.match('GET', calendarApiUrls.getGetEventUrl(5))!, 404).documented).toBe(false);
  });
});

describe('upstream fixtures conform to the upstream contracts', () => {
  test.each([
    ['Calendar API getCalendar 200', calendarApi, 'get', calendarApiUrls.getGetCalendarUrl({ start: '2026-09-01T00:00:00Z', end: '2026-09-30T23:59:59Z' }), 200, calendarResult([eventView(1), eventView(2, { name: 'Conseil' })])],
    ['Calendar API createEvent 201', calendarApi, 'post', calendarApiUrls.getCreateEventUrl(), 201, postEventResult(12)],
    ['Calendar API getEvent 200', calendarApi, 'get', calendarApiUrls.getGetEventUrl(12), 200, eventDetails(12, { members: [member(1, 'pending')] })],
    ['Calendar API getEventMembers 200', calendarApi, 'get', calendarApiUrls.getGetEventMembersUrl(12), 200, membersResult([member(7, 'pending')])],
    ['Core API listDirectoryUsers 200', coreApi, 'get', coreApiUrls.getListDirectoryUsersUrl(), 200, coreDirectory([directoryUsers.admin, directoryUsers.alice])],
  ] as const)('%s', (_name, contract, method, url, status, body) => {
    expect(contract.validate(responseSchema(contract, method, url, status), body)).toEqual([]);
  });
});

describe('contract validator', () => {
  test('reports missing required properties, wrong enums, wrong types and minimum', () => {
    const invalid = { ...eventDetails(12), owner: -1, members: [{ id: 1, validation_status: 'Validated' }] } as Record<string, unknown>;
    delete invalid.events_start_time;
    expect(calendarApi.validate(responseSchema(calendarApi, 'get', calendarApiUrls.getGetEventUrl(12), 200), invalid)).toEqual(expect.arrayContaining([
      expect.stringContaining('$.events_start_time: propriété requise manquante'),
      expect.stringContaining('$.owner: -1 < minimum 0'),
      expect.stringContaining('$.members[0].validation_status: valeur "Validated" hors enum'),
    ]));
  });

  test('matches trailing-slash templates and validates path, query and body inputs', () => {
    expect(calendarApi.match('DELETE', calendarApiUrls.getRemoveEventMemberUrl(5, 7))).toMatchObject({
      template: '/api/v1/events/{eventId}/members/{memberId}/', pathParams: { eventId: '5', memberId: '7' },
    });
    expect(calendarApi.validateRequest('PATCH', new URL('http://api/api/v1/events/abc/')).errors)
      .toEqual([expect.stringContaining('path.eventId: type number attendu')]);
    expect(calendarApi.validateRequest('GET', new URL('http://api/api/v1/events/abc/')).errors)
      .toEqual([expect.stringContaining('path.eventId: type number attendu')]);
    expect(calendarApi.validateRequest('GET', new URL(pathname(calendarApiUrls.getGetCalendarUrl({ start: '', end: '' })), 'http://api')).errors)
      .toEqual(expect.arrayContaining([expect.stringContaining('paramètre query "start" requis manquant')]));
    const match = calendarApi.match('POST', calendarApiUrls.getCreateEventUrl())!;
    expect(calendarApi.validate(calendarApi.requestBodySchema(match).schema!, { name: 'Sans dates' }))
      .toEqual(expect.arrayContaining([expect.stringContaining('$.events_start_time: propriété requise manquante')]));
  });
});
