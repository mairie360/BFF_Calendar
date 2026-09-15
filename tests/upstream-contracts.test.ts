import { OpenApiContract, type JsonSchema } from './support/openapi-contract';
import { calendarResult, eventDetails, eventView } from './support/calendar-fixtures';

// Copies des contrats amont, générées depuis les versions épinglées dans package.json (les API ne
// versionnent pas leur openapi.json) : dans le dépôt de l'API, au tag du client utilisé,
//   git checkout v0.5.1 && cargo open_api > tests/contracts/upstream/calendar_api.openapi.json   (Calendar_API)
//   git checkout v1.1.1 && cargo open_api > tests/contracts/upstream/core_api.openapi.json       (Core_API)
// À refaire à chaque montée de @mairie360/calendar-api-openapi ou @mairie360/core-api-openapi.

// Opérations amont réellement appelées par le BFF (src/clients/calendarClient.ts, src/routes/check_apis.ts).
const CONSUMED = [
  { contract: 'calendar_api', method: 'get', template: '/v1/calendar' },
  { contract: 'calendar_api', method: 'post', template: '/v1/events/' },
  { contract: 'calendar_api', method: 'get', template: '/v1/events/{event_id}/' },
  { contract: 'calendar_api', method: 'patch', template: '/v1/events/{event_id}/' },
  { contract: 'calendar_api', method: 'delete', template: '/v1/events/{event_id}/' },
  { contract: 'calendar_api', method: 'post', template: '/v1/events/{event_id}/members/' },
  { contract: 'calendar_api', method: 'delete', template: '/v1/events/{event_id}/members/{member_id}/' },
  { contract: 'calendar_api', method: 'get', template: '/health' },
  { contract: 'core_api', method: 'get', template: '/health' },
] as const;

const calendarApi = OpenApiContract.upstream('calendar_api');

function responseSchema(contract: OpenApiContract, method: string, pathname: string, status: number): JsonSchema {
  const match = contract.match(method, pathname);
  if (!match) throw new Error(`${method} ${pathname} absent de ${contract.title}`);
  const { schema } = contract.responseSchema(match, status);
  if (!schema) throw new Error(`Pas de schéma JSON pour ${status} ${method} ${pathname}`);
  return schema;
}

describe('upstream contract copies', () => {
  test.each(CONSUMED)('$contract declares $method $template', ({ contract, method, template }) => {
    expect(OpenApiContract.upstream(contract).document.paths[template]?.[method]).toBeDefined();
  });

});

describe('Calendar API fixtures conform to the Calendar API contract', () => {
  test.each([
    ['GET /v1/calendar 200', 'get', '/v1/calendar', 200, calendarResult([eventView(1), eventView(2, { name: 'Conseil' })])],
    ['POST /v1/events/ 201', 'post', '/v1/events/', 201, { event_id: 12 }],
    ['GET /v1/events/{event_id}/ 200', 'get', '/v1/events/12/', 200, eventDetails(12, { members: [{ id: 1, validation_status: 'pending' }] })],
    ['POST /v1/events/{event_id}/members/ 200', 'post', '/v1/events/12/members/', 200, { user_id: 7 }],
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
      template: '/v1/events/{event_id}/members/{member_id}/', pathParams: { event_id: '5', member_id: '7' },
    });
    expect(calendarApi.validateRequest('PATCH', new URL('http://api/v1/events/5/?reccurent=maybe')).errors)
      .toEqual([expect.stringContaining('query.reccurent: type boolean attendu')]);
    expect(calendarApi.validateRequest('GET', new URL('http://api/v1/events/abc/')).errors)
      .toEqual([expect.stringContaining('path.event_id: type integer attendu')]);
    const match = calendarApi.match('POST', '/v1/events/')!;
    expect(calendarApi.validate(calendarApi.requestBodySchema(match).schema!, { custom_name: 'Sans dates' }))
      .toEqual(expect.arrayContaining([expect.stringContaining('$.events_start_time: propriété requise manquante')]));
  });
});
