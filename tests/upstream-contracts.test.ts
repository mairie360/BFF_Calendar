import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { JsonSchema, OpenApiContract } from './support/openapi-contract';
import { loadOrvalContract, resolveOrvalPackage } from './support/orval-contract';
import { calendarResult, eventDetails, eventView } from './support/calendar-fixtures';

// Les contrats des API amont sont reconstruits depuis les paquets @mairie360/*-api-openapi installés :
// monter la version dans package.json suffit à tester le BFF contre le nouveau contrat.

const PACKAGES = ['@mairie360/calendar-api-openapi', '@mairie360/core-api-openapi'] as const;

// Opérations amont réellement appelées par le BFF (src/clients/calendarClient.ts, src/routes/check_apis.ts).
const CONSUMED = [
  { pkg: '@mairie360/calendar-api-openapi', operationId: 'getCalendar', method: 'get', template: '/v1/calendar' },
  { pkg: '@mairie360/calendar-api-openapi', operationId: 'createEvent', method: 'post', template: '/v1/events/' },
  { pkg: '@mairie360/calendar-api-openapi', operationId: 'getEvent', method: 'get', template: '/v1/events/{eventId}/' },
  { pkg: '@mairie360/calendar-api-openapi', operationId: 'patchEvent', method: 'patch', template: '/v1/events/{eventId}/' },
  { pkg: '@mairie360/calendar-api-openapi', operationId: 'deleteEvent', method: 'delete', template: '/v1/events/{eventId}/' },
  { pkg: '@mairie360/calendar-api-openapi', operationId: 'addEventMember', method: 'post', template: '/v1/events/{eventId}/members/' },
  { pkg: '@mairie360/calendar-api-openapi', operationId: 'updateEventValidation', method: 'patch', template: '/v1/events/{eventId}/validation' },
  { pkg: '@mairie360/calendar-api-openapi', operationId: 'removeEventMember', method: 'delete', template: '/v1/events/{eventId}/members/{memberId}/' },
  { pkg: '@mairie360/calendar-api-openapi', operationId: 'health', method: 'get', template: '/health' },
  { pkg: '@mairie360/core-api-openapi', operationId: 'listDirectoryUsers', method: 'get', template: '/api/v1/user/' },
  { pkg: '@mairie360/core-api-openapi', operationId: 'health', method: 'get', template: '/health' },
] as const;

const calendarApi = loadOrvalContract('@mairie360/calendar-api-openapi');

function responseSchema(contract: OpenApiContract, method: string, pathname: string, status: number): JsonSchema {
  const match = contract.match(method, pathname);
  if (!match) throw new Error(`${method} ${pathname} absent de ${contract.title}`);
  const { schema } = contract.responseSchema(match, status);
  if (!schema) throw new Error(`Pas de schéma JSON pour ${status} ${method} ${pathname}`);
  return schema;
}

describe('upstream contracts from the installed @mairie360 OpenAPI packages', () => {
  test.each(PACKAGES)('%s is the version pinned in package.json', (name) => {
    const { dependencies } = JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')) as { dependencies: Record<string, string> };
    expect(resolveOrvalPackage(name).version).toBe(dependencies[name]);
  });

  test.each(CONSUMED)('$pkg declares $operationId as $method $template', ({ pkg, operationId, method, template }) => {
    const operation = loadOrvalContract(pkg).document.paths[template]?.[method] as { operationId?: string } | undefined;
    expect(operation?.operationId).toBe(operationId);
  });

  test('keeps request parameters, bodies and response models of the Calendar API operations', () => {
    const patch = calendarApi.match('PATCH', '/v1/events/5/')!;
    expect(patch.operation.parameters).toEqual([
      { name: 'eventId', in: 'path', required: true, schema: { type: 'number' } },
    ]);
    expect(calendarApi.requestBodySchema(patch)).toEqual({ required: true, schema: { $ref: '#/components/schemas/PatchEventView' } });
    expect(calendarApi.schema('PostEventView')).toMatchObject({ required: ['events_end_time', 'events_start_time', 'name'] });
    expect(calendarApi.schema('EventValidationStatus')).toEqual({ type: 'string', enum: ['validated', 'refused', 'pending'] });
    // Catégorie, service, lieu et répétition font partie de l'événement.
    expect(Object.keys(calendarApi.schema('GetEventResultView').properties as Record<string, unknown>))
      .toEqual(expect.arrayContaining(['category', 'service', 'location', 'recurrence', 'approval_status', 'permissions']));
    expect(calendarApi.schema('EventRecurrence')).toMatchObject({ required: ['frequency', 'interval'] });
    expect(calendarApi.responseSchema(calendarApi.match('DELETE', '/v1/events/5/')!, 204)).toEqual({ documented: true, schema: undefined });
    // Les erreurs ne sont pas typées par orval : aucun statut hors 2XX n'est documenté.
    expect(calendarApi.responseSchema(calendarApi.match('GET', '/v1/events/5/')!, 404).documented).toBe(false);
  });
});

describe('Calendar API fixtures conform to the Calendar API contract', () => {
  test.each([
    ['GET /v1/calendar 200', 'get', '/v1/calendar', 200, calendarResult([eventView(1), eventView(2, { name: 'Conseil' })])],
    ['POST /v1/events/ 201', 'post', '/v1/events/', 201, { event_id: 12 }],
    ['GET /v1/events/{eventId}/ 200', 'get', '/v1/events/12/', 200, eventDetails(12, { members: [{ id: 1, validation_status: 'pending' }] })],
    ['GET /v1/events/{eventId}/members/ 200', 'get', '/v1/events/12/members/', 200, { members: [{ id: 7, validation_status: 'pending' }] }],
  ] as const)('%s', (_name, method, pathname, status, body) => {
    expect(calendarApi.validate(responseSchema(calendarApi, method, pathname, status), body)).toEqual([]);
  });
});

describe('contract validator', () => {
  test('reports missing required properties, wrong enums, wrong types and minimum', () => {
    const invalid = { ...eventDetails(12), owner: -1, members: [{ id: 1, validation_status: 'Validated' }] } as Record<string, unknown>;
    delete invalid.events_start_time;
    expect(calendarApi.validate(responseSchema(calendarApi, 'get', '/v1/events/12/', 200), invalid)).toEqual(expect.arrayContaining([
      expect.stringContaining('$.events_start_time: propriété requise manquante'),
      expect.stringContaining('$.owner: -1 < minimum 0'),
      expect.stringContaining('$.members[0].validation_status: valeur "Validated" hors enum'),
    ]));
  });

  test('matches trailing-slash templates and validates path, query and body inputs', () => {
    expect(calendarApi.match('DELETE', '/v1/events/5/members/7/')).toMatchObject({
      template: '/v1/events/{eventId}/members/{memberId}/', pathParams: { eventId: '5', memberId: '7' },
    });
    expect(calendarApi.validateRequest('PATCH', new URL('http://api/v1/events/abc/')).errors)
      .toEqual([expect.stringContaining('path.eventId: type number attendu')]);
    expect(calendarApi.validateRequest('GET', new URL('http://api/v1/events/abc/')).errors)
      .toEqual([expect.stringContaining('path.eventId: type number attendu')]);
    const match = calendarApi.match('POST', '/v1/events/')!;
    expect(calendarApi.validate(calendarApi.requestBodySchema(match).schema!, { name: 'Sans dates' }))
      .toEqual(expect.arrayContaining([expect.stringContaining('$.events_start_time: propriété requise manquante')]));
  });
});
