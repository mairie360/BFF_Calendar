import path from 'node:path';
import type { Express } from 'express';
import request from 'supertest';

// Tous les services amont (Calendar API et l'annuaire de Core API) sont servis par de vrais serveurs locaux
// pilotés par les contrats reconstruits depuis leurs paquets @mairie360/*-openapi installés
// (tests/support/orval-contract.ts) : le BFF n'a plus d'accès direct à PostgreSQL. Les corps simulés sont typés par
// les modèles générés et les chemins attendus viennent des helpers d'URL des clients générés.

import { ContractMockServer, unreachableUrl } from './support/contract-mock-server';
import { OpenApiContract } from './support/openapi-contract';
import { loadOrvalContract } from './support/orval-contract';
import type { EventView, GetEventResultView } from '@mairie360/calendar-api-openapi/model';
import type { ListDirectoryUsersParams } from '@mairie360/core-api-openapi/model';
import {
  authorizationFor, calendarApiUrls, calendarResult, coreApiUrls, coreDirectory, directoryUsers, eventDetails, eventView, postEventResult,
} from './support/calendar-fixtures';

const { admin, alice, marie } = directoryUsers;

const calendarApi = new ContractMockServer('CALENDAR_API', loadOrvalContract('@mairie360/calendar-api-openapi'));
const coreApi = new ContractMockServer('CORE_API', loadOrvalContract('@mairie360/core-api-openapi'));
const mocks = [calendarApi, coreApi];
// Gabarits des contrats amont (clés des mocks) ; les chemins concrets attendus viennent des helpers d'URL.
const CALENDAR = {
  calendar: '/api/v1/calendar',
  events: '/api/v1/events/',
  event: '/api/v1/events/{eventId}/',
  validation: '/api/v1/events/{eventId}/validation',
  members: '/api/v1/events/{eventId}/members/',
  member: '/api/v1/events/{eventId}/members/{memberId}/',
  health: '/health',
} as const;
const CORE = { directory: '/api/v1/user/', health: '/health' } as const;
const bffContract = OpenApiContract.load(path.join(__dirname, '..', 'contracts', 'openapi.json'));

let app: Express;

beforeAll(async () => {
  await Promise.all(mocks.map((mock) => mock.start()));
  // calendarClient lit CALENDAR_API_BASE_PATH au chargement : l'application est importée après.
  process.env.CALENDAR_API_BASE_PATH = calendarApi.url;
  ({ app } = await import('../src/index'));
});
afterAll(async () => { await Promise.all(mocks.map((mock) => mock.stop())); });

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  for (const mock of mocks) mock.reset();
  for (const [service, mock] of [['CORE_API', coreApi], ['CALENDAR_API', calendarApi]] as const) {
    const url = new URL(mock.url);
    process.env[`${service}_URL`] = url.hostname;
    process.env[`${service}_PORT`] = url.port;
  }

  // Annuaire Core : la sélection par identifiants et par groupes est appliquée comme par Core API.
  const users = [admin, alice, marie];
  coreApi.on('get', CORE.directory, ({ url }) => {
    const params = Object.fromEntries(url.searchParams) as Pick<ListDirectoryUsersParams, 'ids' | 'group_ids'>;
    const ids = params.ids?.split(',').map(Number);
    const groupIds = params.group_ids?.split(',').map(Number);
    return {
      body: coreDirectory(users.filter((user) => (
        (!ids || ids.includes(user.id))
        && (!groupIds || user.groupIds.some((groupId) => groupIds.includes(groupId)))
      ))),
    };
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  expect(mocks.flatMap((mock) => mock.violations)).toEqual([]);
});

function mockCalendarApi({ list = [], details = [], createdId = 42 }: { list?: EventView[]; details?: GetEventResultView[]; createdId?: number } = {}) {
  calendarApi.on('get', CALENDAR.calendar, { body: calendarResult(list) });
  calendarApi.on('get', CALENDAR.event, ({ pathParams }) => {
    const found = details.find((event) => event.id === Number(pathParams.eventId));
    // 404 renvoyé par l'API réelle (GetEventError::UnknownEvent) ; les erreurs ne sont pas typées par orval.
    return found ? { body: found } : { status: 404, raw: 'Unknown event.', contentType: 'text/plain', outOfContract: true };
  });
  calendarApi.on('post', CALENDAR.events, { status: 201, body: postEventResult(createdId) });
  calendarApi.on('patch', CALENDAR.event, { status: 204 });
  calendarApi.on('patch', CALENDAR.validation, { status: 204 });
  calendarApi.on('delete', CALENDAR.event, { status: 204 });
  calendarApi.on('post', CALENDAR.members, ({ body }) => ({ body: { user_id: (body as { user_id: number }).user_id } }));
  calendarApi.on('delete', CALENDAR.member, { status: 204 });
}

function expectBffContract(method: string, pathname: string, response: request.Response) {
  const match = bffContract.match(method, pathname);
  expect(match?.template).toBeDefined();
  const { documented, schema } = bffContract.responseSchema(match!, response.status);
  expect({ status: response.status, documented }).toEqual({ status: response.status, documented: true });
  if (schema) expect(bffContract.validate(schema, response.body)).toEqual([]);
}

/** Appels reçus par Calendar API, sous la forme `MÉTHODE chemin` (chemin tel que le construit le client généré). */
const upstreamSequence = () => calendarApi.requests.map((call) => `${call.method} ${call.url.pathname}`);
const called = (method: string, url: string) => `${method} ${url}`;
const calendarListed = called('GET', CALENDAR.calendar);

describe('Calendar BFF with contract-driven Calendar API and Core API mocks', () => {
  describe('reads', () => {
    test('GET /calendar/events maps Calendar API events, keeps assigned ones only and carries their metadata', async () => {
      mockCalendarApi({ list: [
        eventView(1, { start: '2026-09-16T09:00:00Z', end: '2026-09-16T10:30:00Z', category: 'meeting', location: 'Salle 1' }),
        // Possédé mais non assigné : Calendar API le renvoie avec is_member à faux, le BFF l'écarte.
        eventView(2, { name: 'Non assigné', is_member: false }),
        eventView(3, {
          name: 'Permanence',
          start: '2026-09-20T18:00:00Z',
          end: '2026-09-21T01:00:00Z',
          recurrence: { frequency: 'weekly', interval: 1, days_of_week: [1], ends_on: '2026-12-31' },
        }),
      ] });

      const response = await request(app).get('/calendar/events?from=2026-09-01&to=2026-09-30').set('Authorization', authorizationFor(admin.id));

      expect(response.status).toBe(200);
      expectBffContract('get', '/calendar/events', response);
      expect(response.body).toEqual([
        { id: 1, title: 'Événement 1', date: '2026-09-16', category: 'meeting', location: 'Salle 1', startTime: '09:00', endTime: '10:30' },
        {
          id: 3, title: 'Permanence', date: '2026-09-20', endDate: '2026-09-21', category: 'other',
          startTime: '18:00', endTime: '01:00',
          recurrence: { frequency: 'weekly', interval: 1, daysOfWeek: [1], endsOn: '2026-12-31' },
        },
      ]);
      const [calendar] = calendarApi.calls(CALENDAR.calendar);
      expect(`${calendar.url.pathname}${calendar.url.search}`).toBe(calendarApiUrls.getGetCalendarUrl({ start: '2026-09-01T00:00:00Z', end: '2026-09-30T23:59:59Z' }));
      expect(calendar.headers.authorization).toBe(authorizationFor(admin.id));
      // La liste suffit : plus d'appel à l'annuaire ni de requête supplémentaire par événement.
      expect(upstreamSequence()).toEqual([calendarListed]);
    });

    test.each([
      ['a missing to', '/calendar/events?from=2026-09-01'],
      ['an impossible date', '/calendar/events?from=2026-02-30&to=2026-03-01'],
      ['a DD-MM-YYYY date', '/calendar/events?from=01-09-2026&to=30-09-2026'],
      ['a bootstrap date that is not YYYY-MM-DD', '/calendar/bootstrap?from=septembre'],
      ['an assignees date that is not YYYY-MM-DD', '/calendar/assignees?to=2026-9-30'],
    ])('rejects %s with a documented 400 before calling Calendar API', async (_label, url) => {
      mockCalendarApi();

      const response = await request(app).get(url).set('Authorization', authorizationFor(admin.id));

      expect(response.status).toBe(400);
      expectBffContract('get', url.split('?')[0], response);
      expect(response.body).toEqual({ code: 'BAD_REQUEST', message: expect.stringContaining('from et to') });
      expect(calendarApi.requests).toHaveLength(0);
    });

    test('GET /calendar/bootstrap loads event details for the declared from/to range', async () => {
      mockCalendarApi({
        list: [eventView(5), eventView(6)],
        details: [
          eventDetails(5, {
            name: 'Conseil municipal', category: 'ceremony', service: 'direction', location: 'Salle du conseil',
            members: [{ id: admin.id, validation_status: 'validated' }, { id: alice.id, validation_status: 'validated' }],
          }),
          eventDetails(6, { description: null }),
        ],
      });

      const response = await request(app).get('/calendar/bootstrap?from=2026-09-01&to=2026-09-30').set('Authorization', authorizationFor(admin.id));

      expect(response.status).toBe(200);
      expectBffContract('get', '/calendar/bootstrap', response);
      expect(bffContract.match('get', '/calendar/bootstrap')?.operation.parameters?.map((parameter) => parameter.name)).toEqual(['from', 'to']);
      expect(upstreamSequence()).toEqual([calendarListed, called('GET', calendarApiUrls.getGetEventUrl(5)), called('GET', calendarApiUrls.getGetEventUrl(6))]);
      expect(response.body.events[0]).toEqual({
        id: 5, title: 'Conseil municipal', date: '2026-09-16', category: 'ceremony', service: 'direction', location: 'Salle du conseil',
        startTime: '09:00', endTime: '10:00', description: 'Description 5',
        assigneeIds: ['user-1', 'user-7'],
        assignees: [
          { id: 'user-1', name: 'Admin Mairie', email: 'admin@mairie.test', role: 'Admin' },
          { id: 'user-7', name: 'Alice Martin', email: 'alice@mairie.test', role: 'User' },
        ],
        approvalStatus: 'approved', createdById: 'user-1', canValidate: false, canEdit: true, canDelete: true,
      });
      expect(response.body.events[1]).not.toHaveProperty('description');
      expect(response.body).toMatchObject({
        currentUser: { id: 'user-1', name: 'Admin Mairie', email: 'admin@mairie.test', role: 'Admin', groupIds: [1] },
        assigneeScope: 'all',
      });
      expect(response.body.assignees).toHaveLength(3);
    });

    test('GET /calendar/bootstrap without from/to uses the current local month', async () => {
      mockCalendarApi();
      const now = new Date();
      const pad = (value: number) => `${value}`.padStart(2, '0');
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const month = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;

      const response = await request(app).get('/calendar/bootstrap').set('Authorization', authorizationFor(admin.id));

      expect(response.status).toBe(200);
      const [calendar] = calendarApi.calls(CALENDAR.calendar);
      expect(`${calendar.url.pathname}${calendar.url.search}`)
        .toBe(calendarApiUrls.getGetCalendarUrl({ start: `${month}-01T00:00:00Z`, end: `${month}-${pad(lastDay)}T23:59:59Z` }));
    });

    test('GET /calendar/assignees checks the session with Calendar API then returns the group scope', async () => {
      mockCalendarApi();

      const response = await request(app).get('/calendar/assignees?from=2026-09-01&to=2026-09-30').set('Authorization', authorizationFor(alice.id));

      expect(response.status).toBe(200);
      expectBffContract('get', '/calendar/assignees', response);
      expect(upstreamSequence()).toEqual([calendarListed]);
      // Alice n'est ni Admin ni Maire : l'annuaire est restreint à ses groupes.
      expect(coreApi.calls(CORE.directory).map((call) => call.url.searchParams.get('group_ids'))).toContain('1');
      expect(response.body.map((assignee: { id: string }) => assignee.id)).toEqual(['user-1', 'user-7', 'user-3']);
    });
  });

  describe('writes', () => {
    test('POST /calendar/events sends contract-valid bodies to Calendar API and returns the created event', async () => {
      mockCalendarApi({ createdId: 42, details: [eventDetails(42, {
        name: 'Atelier',
        events_start_time: '2026-09-20T14:00:00Z',
        events_end_time: '2026-09-20T16:00:00Z',
        category: 'activity',
        location: 'Salle 2',
        recurrence: { frequency: 'weekly', interval: 2, ends_on: '2026-12-31' },
        created_by: alice.id,
        members: [{ id: alice.id, validation_status: 'pending' }, { id: marie.id, validation_status: 'pending' }],
        approval_status: 'pending',
        permissions: { can_edit: true, can_delete: true, can_validate: false },
      })] });

      const response = await request(app).post('/calendar/events').set('Authorization', authorizationFor(alice.id)).send({
        title: 'Atelier', date: '20-09-2026', startTime: '14:00', endTime: '16:00', category: 'activity', location: 'Salle 2',
        assigneeIds: ['user-3'], recurrence: { frequency: 'weekly', interval: 2, endsOn: '2026-12-31' },
      });

      expect(response.status).toBe(201);
      expectBffContract('post', '/calendar/events', response);
      expect(upstreamSequence()[0]).toBe(called('POST', calendarApiUrls.getCreateEventUrl()));
      expect(upstreamSequence().slice(-1)).toEqual([called('GET', calendarApiUrls.getGetEventUrl(42))]);
      // Catégorie, service, lieu et récurrence sont portés par l'événement : plus de table annexe.
      expect(calendarApi.calls(CALENDAR.events, 'POST')[0].body).toEqual({
        name: 'Atelier', description: null,
        events_start_time: '2026-09-20T14:00:00Z', events_end_time: '2026-09-20T16:00:00Z',
        category: 'activity', service: null, location: 'Salle 2',
        recurrence: { frequency: 'weekly', interval: 2, ends_on: '2026-12-31' },
      });
      expect(calendarApi.calls(CALENDAR.members, 'POST').map((call) => [call.url.pathname, call.body]))
        .toEqual(expect.arrayContaining([[calendarApiUrls.getAddEventMemberUrl(42), { user_id: alice.id }], [calendarApiUrls.getAddEventMemberUrl(42), { user_id: marie.id }]]));
      expect(response.body).toMatchObject({
        id: 42, title: 'Atelier', approvalStatus: 'pending', canDelete: true,
        recurrence: { frequency: 'weekly', interval: 2, endsOn: '2026-12-31' },
      });
    });

    test('POST /calendar/events rejects an invalid body before calling Calendar API', async () => {
      mockCalendarApi();

      const response = await request(app).post('/calendar/events').set('Authorization', authorizationFor(admin.id)).send({ date: '2026-09-20' });

      expect(response.status).toBe(400);
      expectBffContract('post', '/calendar/events', response);
      expect(calendarApi.requests).toHaveLength(0);
    });

    test('POST /calendar/events refuses an assignee outside the user scope without creating the event', async () => {
      mockCalendarApi();

      const response = await request(app).post('/calendar/events').set('Authorization', authorizationFor(alice.id))
        .send({ title: 'Atelier', date: '2026-09-20', assigneeIds: ['user-99'] });

      expect(response.status).toBe(403);
      expectBffContract('post', '/calendar/events', response);
      expect(response.body).toEqual({ code: 'ASSIGNEE_OUT_OF_SCOPE', message: expect.any(String) });
      expect(calendarApi.requests).toHaveLength(0);
    });

    test('PATCH /calendar/events/:id patches Calendar API then synchronizes members', async () => {
      mockCalendarApi({ details: [eventDetails(5, { members: [{ id: admin.id, validation_status: 'validated' }, { id: alice.id, validation_status: 'validated' }] })] });

      const response = await request(app).patch('/calendar/events/5').set('Authorization', authorizationFor(admin.id))
        .send({ title: 'Conseil municipal', startTime: '18:30', endTime: '20:00', assigneeIds: ['user-3'] });

      expect(response.status).toBe(200);
      expectBffContract('patch', '/calendar/events/5', response);
      const [patch] = calendarApi.calls(CALENDAR.event, 'PATCH');
      expect(patch.body).toEqual({
        name: 'Conseil municipal', description: 'Description 5',
        events_start_time: '2026-09-16T18:30:00Z', events_end_time: '2026-09-16T20:00:00Z',
        category: 'other', service: null, location: null, recurrence: null,
      });
      expect(calendarApi.calls(CALENDAR.member, 'DELETE').map((call) => call.url.pathname))
        .toEqual([calendarApiUrls.getRemoveEventMemberUrl(5, alice.id)]);
      expect(calendarApi.calls(CALENDAR.members, 'POST').map((call) => call.body)).toEqual([{ user_id: marie.id }]);
    });

    test('PATCH /calendar/events/:id forbids a user Calendar API does not allow to edit', async () => {
      mockCalendarApi({ details: [eventDetails(5, {
        created_by: admin.id,
        members: [{ id: admin.id, validation_status: 'validated' }, { id: alice.id, validation_status: 'validated' }],
        permissions: { can_edit: false, can_delete: false, can_validate: false },
      })] });

      const response = await request(app).patch('/calendar/events/5').set('Authorization', authorizationFor(alice.id)).send({ title: 'Renommé' });

      expect(response.status).toBe(403);
      expectBffContract('patch', '/calendar/events/5', response);
      expect(response.body.code).toBe('EVENT_UPDATE_FORBIDDEN');
      expect(upstreamSequence()).toEqual([called('GET', calendarApiUrls.getGetEventUrl(5))]);
    });

    test.each(['abc', '1.5', '0', '-3'])('rejects the event id %s with 400 before calling Calendar API', async (id) => {
      mockCalendarApi();

      const responses = await Promise.all([
        request(app).patch(`/calendar/events/${id}`).set('Authorization', authorizationFor(admin.id)).send({ title: 'x' }),
        request(app).patch(`/calendar/events/${id}/approval`).set('Authorization', authorizationFor(admin.id)).send({ approvalStatus: 'approved' }),
        request(app).delete(`/calendar/events/${id}`).set('Authorization', authorizationFor(admin.id)),
      ]);

      expect(responses.map((response) => response.status)).toEqual([400, 400, 400]);
      expect(responses[0].body).toEqual({ code: 'BAD_REQUEST', message: expect.stringContaining('entier positif') });
      expect(calendarApi.requests).toHaveLength(0);
    });

    test('PATCH /calendar/events/:id/approval lets the assigned responsible approve a pending event', async () => {
      mockCalendarApi({ details: [eventDetails(8, {
        created_by: alice.id,
        members: [{ id: alice.id, validation_status: 'pending' }, { id: marie.id, validation_status: 'pending' }],
        approval_status: 'pending',
        permissions: { can_edit: true, can_delete: false, can_validate: true },
      })] });

      const response = await request(app).patch('/calendar/events/8/approval').set('Authorization', authorizationFor(marie.id)).send({ approvalStatus: 'approved' });

      expect(response.status).toBe(200);
      expectBffContract('patch', '/calendar/events/8/approval', response);
      expect(calendarApi.calls(CALENDAR.validation, 'PATCH')[0].body).toEqual({ status: 'approved' });
      expect(upstreamSequence()).toEqual([called('GET', calendarApiUrls.getGetEventUrl(8)), called('PATCH', calendarApiUrls.getUpdateEventValidationUrl(8)), called('GET', calendarApiUrls.getGetEventUrl(8))]);
    });

    test('DELETE /calendar/events/:id lets the creator delete after Calendar API validated the session', async () => {
      mockCalendarApi({ details: [eventDetails(5)] });

      const response = await request(app).delete('/calendar/events/5').set('Authorization', authorizationFor(admin.id));

      expect(response.status).toBe(204);
      expectBffContract('delete', '/calendar/events/5', response);
      expect(upstreamSequence()).toEqual([called('GET', calendarApiUrls.getGetEventUrl(5)), called('DELETE', calendarApiUrls.getDeleteEventUrl(5))]);
      expect(calendarApi.calls(CALENDAR.event, 'DELETE')[0].headers.authorization).toBe(authorizationFor(admin.id));
    });

    test('DELETE /calendar/events/:id forbids an assigned responsible who did not create the event', async () => {
      mockCalendarApi({ details: [eventDetails(5, {
        created_by: alice.id,
        members: [{ id: alice.id, validation_status: 'validated' }, { id: marie.id, validation_status: 'validated' }],
        permissions: { can_edit: true, can_delete: false, can_validate: false },
      })] });

      const response = await request(app).delete('/calendar/events/5').set('Authorization', authorizationFor(marie.id));

      expect(response.status).toBe(403);
      expectBffContract('delete', '/calendar/events/5', response);
      expect(response.body.code).toBe('EVENT_DELETE_FORBIDDEN');
      expect(calendarApi.calls(CALENDAR.event, 'DELETE')).toHaveLength(0);
    });

    test('DELETE /calendar/events/:id returns 404 for an event unknown to Calendar API without deleting', async () => {
      mockCalendarApi();

      const response = await request(app).delete('/calendar/events/404').set('Authorization', authorizationFor(admin.id));

      expect(response.status).toBe(404);
      expectBffContract('delete', '/calendar/events/404', response);
      expect(response.body).toEqual({ code: 'NOT_FOUND', message: 'Ressource introuvable.' });
      expect(upstreamSequence()).toEqual([called('GET', calendarApiUrls.getGetEventUrl(404))]);
    });
  });

  describe('upstream failures', () => {
    test('propagates a Calendar API JWT rejection as 401 without reading the directory', async () => {
      mockCalendarApi();
      // 401 produit par le JwtMiddleware de mairie360_api_lib (erreurs non typées par orval).
      calendarApi.on('get', CALENDAR.calendar, { status: 401, raw: 'Unauthorized', contentType: 'text/plain', outOfContract: true });

      const response = await request(app).get('/calendar/bootstrap?from=2026-09-01&to=2026-09-30').set('Authorization', authorizationFor(admin.id));

      expect(response.status).toBe(401);
      expectBffContract('get', '/calendar/bootstrap', response);
      expect(response.body).toEqual({ code: 'UNAUTHORIZED', message: 'Session invalide.' });
      expect(coreApi.requests).toHaveLength(0);
    });

    test('forwards no Authorization header when the request has none, and relays the resulting 401', async () => {
      mockCalendarApi();
      calendarApi.on('get', CALENDAR.calendar, { status: 401, raw: 'Unauthorized', contentType: 'text/plain', outOfContract: true });

      const response = await request(app).get('/calendar/events?from=2026-09-01&to=2026-09-30');

      expect(response.status).toBe(401);
      expect(calendarApi.calls(CALENDAR.calendar)[0].headers.authorization).toBeUndefined();
    });

    test('maps a Calendar API 400 to 400 without leaking the upstream body', async () => {
      mockCalendarApi();
      calendarApi.on('get', CALENDAR.calendar, { status: 400, raw: 'Bad parameters', contentType: 'text/plain', outOfContract: true });

      const response = await request(app).get('/calendar/events?from=2026-09-30&to=2026-09-01').set('Authorization', authorizationFor(admin.id));

      expect(response.status).toBe(400);
      expectBffContract('get', '/calendar/events', response);
      expect(response.body).toEqual({ code: 'UPSTREAM_ERROR', message: 'La requête a été refusée par le service Calendar.' });
    });

    test('maps a Calendar API 500 to 502 without leaking the upstream message', async () => {
      mockCalendarApi();
      calendarApi.on('get', CALENDAR.calendar, { status: 500, raw: 'An error occurred while accessing the database.', contentType: 'text/plain', outOfContract: true });

      const response = await request(app).get('/calendar/bootstrap?from=2026-09-01&to=2026-09-30').set('Authorization', authorizationFor(admin.id));

      expect(response.status).toBe(502);
      expectBffContract('get', '/calendar/bootstrap', response);
      expect(response.body).toEqual({ code: 'BAD_GATEWAY', message: 'Le service Calendar est indisponible.' });
    });

    test('maps a dropped Calendar API connection to 502', async () => {
      mockCalendarApi();
      calendarApi.on('post', CALENDAR.events, { dropConnection: true });

      const response = await request(app).post('/calendar/events').set('Authorization', authorizationFor(admin.id)).send({ title: 'Atelier', date: '2026-09-20' });

      expect(response.status).toBe(502);
      expectBffContract('post', '/calendar/events', response);
      expect(response.body.code).toBe('BAD_GATEWAY');
    });

    test('maps a Core API directory failure to 502 without leaking its body', async () => {
      mockCalendarApi({ list: [eventView(5)], details: [eventDetails(5)] });
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      coreApi.on('get', CORE.directory, {
        status: 500,
        raw: 'An error occurred while accessing the database.',
        contentType: 'text/plain',
        outOfContract: true,
      });

      const response = await request(app).get('/calendar/bootstrap?from=2026-09-01&to=2026-09-30').set('Authorization', authorizationFor(admin.id));

      expect(response.status).toBe(502);
      expectBffContract('get', '/calendar/bootstrap', response);
      expect(response.body).toEqual({ code: 'BAD_GATEWAY', message: 'Le service Calendar est indisponible.' });
      expect(JSON.stringify(response.body)).not.toContain('database');
    });
  });

  describe('GET /check_apis', () => {
    beforeEach(() => {
      calendarApi.on('get', CALENDAR.health, { raw: 'OK', contentType: 'text/plain' });
      coreApi.on('get', CORE.health, { raw: 'OK', contentType: 'text/plain' });
    });

    test('reports both APIs connected through their /health operations', async () => {
      const response = await request(app).get('/check_apis');

      expect(response.status).toBe(200);
      expectBffContract('get', '/check_apis', response);
      expect(response.body).toEqual({ status: 'OK', core_api: 'Connected', calendar_api: 'Connected' });
      expect(calendarApi.requests.map((call) => call.url.pathname)).toEqual([calendarApiUrls.getHealthUrl()]);
      expect(coreApi.requests.map((call) => call.url.pathname)).toEqual([coreApiUrls.getHealthUrl()]);
    });

    test('reports each API independently when Core API is unreachable', async () => {
      process.env.CORE_API_PORT = new URL(await unreachableUrl()).port;

      const response = await request(app).get('/check_apis');

      expect(response.status).toBe(502);
      expectBffContract('get', '/check_apis', response);
      expect(response.body).toEqual({ status: 'Error', core_api: 'Unreachable', calendar_api: 'Connected' });
    });
  });
});
