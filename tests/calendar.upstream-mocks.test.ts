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
import { parisDate } from '@mairie360/bffs-lib';
import { monthBounds, wallClockToUtc } from '../src/services/calendarTimeZone';
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
  // The upstream URLs are read on each call (beforeEach sets <SERVICE>_URL / _PORT).
  ({ app } = await import('../src/app'));
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
      // Calendar API instants are UTC; the BFF answers wall-clock times in Europe/Paris (UTC+2 in September).
      expect(response.body).toEqual([
        { id: 1, title: 'Événement 1', date: '2026-09-16', category: 'meeting', location: 'Salle 1', startTime: '11:00', endTime: '12:30' },
        {
          id: 3, title: 'Permanence', date: '2026-09-20', endDate: '2026-09-21', category: 'other',
          startTime: '20:00', endTime: '03:00',
          recurrence: { frequency: 'weekly', interval: 1, daysOfWeek: [1], endsOn: '2026-12-31' },
        },
      ]);
      const [calendar] = calendarApi.calls(CALENDAR.calendar);
      // The requested days are Paris days: their bounds are sent to Calendar API as UTC instants.
      expect(`${calendar.url.pathname}${calendar.url.search}`).toBe(calendarApiUrls.getGetCalendarUrl({ start: '2026-08-31T22:00:00Z', end: '2026-09-30T21:59:59Z' }));
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
      ['a from date after the to date', '/calendar/events?from=2026-09-30&to=2026-09-01'],
      ['a range longer than three years', '/calendar/events?from=2026-01-01&to=2029-01-02'],
      ['a bootstrap range longer than three years', '/calendar/bootstrap?from=2020-01-01&to=2026-09-30'],
      ['an assignees range longer than three years', '/calendar/assignees?from=2020-01-01&to=2026-09-30'],
    ])('rejects %s with a documented 400 before calling Calendar API', async (_label, url) => {
      mockCalendarApi();

      const response = await request(app).get(url).set('Authorization', authorizationFor(admin.id));

      expect(response.status).toBe(400);
      expectBffContract('get', url.split('?')[0], response);
      expect(response.body).toEqual({ error: { code: 'BAD_REQUEST', message: expect.stringMatching(/from|to/), details: [] } });
      expect(calendarApi.requests).toHaveLength(0);
    });

    test('accepts the three-year window BFF_Message requests for its business references', async () => {
      mockCalendarApi();

      const response = await request(app).get('/calendar/bootstrap?from=2025-01-01&to=2027-12-31').set('Authorization', authorizationFor(admin.id));

      expect(response.status).toBe(200);
      expect(upstreamSequence()).toEqual([calendarListed]);
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
      expect(upstreamSequence()[0]).toBe(calendarListed);
      expect(upstreamSequence().slice(1).sort()).toEqual([called('GET', calendarApiUrls.getGetEventUrl(5)), called('GET', calendarApiUrls.getGetEventUrl(6))].sort());
      // Members of all the events are resolved by a single directory call, not one per event.
      expect(coreApi.calls(CORE.directory).filter((call) => call.url.searchParams.get('ids') === `${admin.id},${alice.id}`)).toHaveLength(1);
      expect(response.body.events[0]).toEqual({
        id: 5, title: 'Conseil municipal', date: '2026-09-16', category: 'ceremony', service: 'direction', location: 'Salle du conseil',
        startTime: '11:00', endTime: '12:00', description: 'Description 5',
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

    test('GET /calendar/bootstrap without from/to uses the current Paris month', async () => {
      mockCalendarApi();
      const { from, to } = monthBounds(parisDate());

      const response = await request(app).get('/calendar/bootstrap').set('Authorization', authorizationFor(admin.id));

      expect(response.status).toBe(200);
      const [calendar] = calendarApi.calls(CALENDAR.calendar);
      expect(`${calendar.url.pathname}${calendar.url.search}`)
        .toBe(calendarApiUrls.getGetCalendarUrl({ start: wallClockToUtc(from, '00:00:00'), end: wallClockToUtc(to, '23:59:59') }));
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
        events_start_time: '2026-09-20T12:00:00Z',
        events_end_time: '2026-09-20T14:00:00Z',
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
      // 14:00-16:00 typed in Paris (UTC+2 in September) is stored as 12:00Z-14:00Z.
      expect(calendarApi.calls(CALENDAR.events, 'POST')[0].body).toEqual({
        name: 'Atelier', description: null,
        events_start_time: '2026-09-20T12:00:00Z', events_end_time: '2026-09-20T14:00:00Z',
        category: 'activity', service: null, location: 'Salle 2',
        recurrence: { frequency: 'weekly', interval: 2, ends_on: '2026-12-31' },
      });
      expect(calendarApi.calls(CALENDAR.members, 'POST').map((call) => [call.url.pathname, call.body]))
        .toEqual(expect.arrayContaining([[calendarApiUrls.getAddEventMemberUrl(42), { user_id: alice.id }], [calendarApiUrls.getAddEventMemberUrl(42), { user_id: marie.id }]]));
      expect(response.body).toMatchObject({
        id: 42, title: 'Atelier', startTime: '14:00', endTime: '16:00', approvalStatus: 'pending', canDelete: true,
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

    test.each([
      { title: '<script>alert(1)</script>', date: '2026-09-20' },
      { title: 'Atelier', date: '2026-09-20', description: '<img src=x onerror=alert(1)>' },
      { title: 'Atelier', date: '2026-09-20', location: '<b>Mairie</b>' },
      { title: 'Atelier', date: '2026-09-20', service: '<i>culture</i>' },
    ])('POST /calendar/events refuses markup in a stored text before calling Calendar API (%#)', async (body) => {
      mockCalendarApi();

      const response = await request(app).post('/calendar/events').set('Authorization', authorizationFor(admin.id)).send(body);

      expect(response.status).toBe(400);
      expectBffContract('post', '/calendar/events', response);
      expect(calendarApi.requests).toHaveLength(0);
    });

    test.each(['1 AND 1=2', 'x-1', 'user-1 ', '01x1'])('POST /calendar/events refuses the malformed assignee id %p with a 400', async (assigneeId) => {
      mockCalendarApi();

      const response = await request(app).post('/calendar/events').set('Authorization', authorizationFor(alice.id))
        .send({ title: 'Atelier', date: '2026-09-20', assigneeIds: [assigneeId] });

      expect(response.status).toBe(400);
      expectBffContract('post', '/calendar/events', response);
      expect(response.body.error.message).toBe('An assignee has an invalid id.');
      expect(calendarApi.requests).toHaveLength(0);
    });

    test('POST /calendar/events refuses an assignee outside the user scope without creating the event', async () => {
      mockCalendarApi();

      const response = await request(app).post('/calendar/events').set('Authorization', authorizationFor(alice.id))
        .send({ title: 'Atelier', date: '2026-09-20', assigneeIds: ['user-99'] });

      expect(response.status).toBe(403);
      expectBffContract('post', '/calendar/events', response);
      expect(response.body).toEqual({ error: { code: 'FORBIDDEN', message: 'This person is outside your assignment scope.', details: [] } });
      expect(calendarApi.requests).toHaveLength(0);
    });

    test('PATCH /calendar/events/:id patches Calendar API then synchronizes members', async () => {
      mockCalendarApi({ details: [eventDetails(5, { members: [{ id: admin.id, validation_status: 'validated' }, { id: alice.id, validation_status: 'validated' }] })] });

      const response = await request(app).patch('/calendar/events/5').set('Authorization', authorizationFor(admin.id))
        .send({ title: 'Conseil municipal', startTime: '18:30', endTime: '20:00', assigneeIds: ['user-3'] });

      expect(response.status).toBe(200);
      expectBffContract('patch', '/calendar/events/5', response);
      const [patch] = calendarApi.calls(CALENDAR.event, 'PATCH');
      // Calendar API's PATCH names the dates event_start_time / event_end_time (singular), and they are UTC.
      expect(patch.body).toEqual({
        name: 'Conseil municipal', description: 'Description 5',
        event_start_time: '2026-09-16T16:30:00Z', event_end_time: '2026-09-16T18:00:00Z',
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
      expect(response.body.error.code).toBe('FORBIDDEN');
      expect(upstreamSequence()).toEqual([called('GET', calendarApiUrls.getGetEventUrl(5))]);
    });

    test('PATCH /calendar/events/:id refuses an assignee outside the user scope without modifying the event', async () => {
      mockCalendarApi({ details: [eventDetails(5, {
        created_by: alice.id,
        members: [{ id: alice.id, validation_status: 'validated' }],
        permissions: { can_edit: true, can_delete: true, can_validate: false },
      })] });

      const response = await request(app).patch('/calendar/events/5').set('Authorization', authorizationFor(alice.id))
        .send({ title: 'Renommé', startTime: '08:00', assigneeIds: ['user-99'] });

      expect(response.status).toBe(403);
      expectBffContract('patch', '/calendar/events/5', response);
      expect(response.body).toEqual({ error: { code: 'FORBIDDEN', message: 'This person is outside your assignment scope.', details: [] } });
      // Only the read that checked the rights: no PATCH, no member change.
      expect(upstreamSequence()).toEqual([called('GET', calendarApiUrls.getGetEventUrl(5))]);
    });

    test('POST /calendar/events deletes the created event when assigning its members fails', async () => {
      mockCalendarApi({ createdId: 42 });
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      calendarApi.on('post', CALENDAR.members, { status: 500, raw: 'database down', contentType: 'text/plain', outOfContract: true });

      const response = await request(app).post('/calendar/events').set('Authorization', authorizationFor(alice.id))
        .send({ title: 'Atelier', date: '2026-09-20', startTime: '14:00', endTime: '16:00', assigneeIds: ['user-3'] });

      expect(response.status).toBe(502);
      expectBffContract('post', '/calendar/events', response);
      expect(upstreamSequence()[0]).toBe(called('POST', calendarApiUrls.getCreateEventUrl()));
      expect(upstreamSequence().slice(-1)).toEqual([called('DELETE', calendarApiUrls.getDeleteEventUrl(42))]);
    });

    test.each(['abc', '1.5', '0', '-3'])('rejects the event id %s with 400 before calling Calendar API', async (id) => {
      mockCalendarApi();

      const responses = await Promise.all([
        request(app).patch(`/calendar/events/${id}`).set('Authorization', authorizationFor(admin.id)).send({ title: 'x' }),
        request(app).patch(`/calendar/events/${id}/approval`).set('Authorization', authorizationFor(admin.id)).send({ approvalStatus: 'approved' }),
        request(app).delete(`/calendar/events/${id}`).set('Authorization', authorizationFor(admin.id)),
      ]);

      expect(responses.map((response) => response.status)).toEqual([400, 400, 400]);
      expect(responses[0].body).toEqual({ error: { code: 'BAD_REQUEST', message: 'The event id must be a positive integer.', details: [] } });
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
      expect(response.body.error.code).toBe('FORBIDDEN');
      expect(calendarApi.calls(CALENDAR.event, 'DELETE')).toHaveLength(0);
    });

    test('DELETE /calendar/events/:id returns 404 for an event unknown to Calendar API without deleting', async () => {
      mockCalendarApi();

      const response = await request(app).delete('/calendar/events/404').set('Authorization', authorizationFor(admin.id));

      expect(response.status).toBe(404);
      expectBffContract('delete', '/calendar/events/404', response);
      expect(response.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Resource not found', details: [] } });
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
      expect(response.body).toEqual({ error: { code: 'UNAUTHORIZED', message: 'Authentication required', details: [] } });
      expect(coreApi.requests).toHaveLength(0);
    });

    test.each([
      ['get', '/calendar/events?from=2026-09-01&to=2026-09-30', undefined],
      ['get', '/calendar/bootstrap', undefined],
      ['get', '/calendar/assignees', undefined],
      ['post', '/calendar/events', 'Bearer not-a-jwt'],
      ['patch', '/calendar/events/5', 'Basic dXNlcjpwYXNz'],
      ['patch', '/calendar/events/5/approval', 'Bearer'],
      ['delete', '/calendar/events/5', undefined],
    ] as const)('answers %s %s without a usable session token with 401 before any upstream call', async (method, url, authorization) => {
      mockCalendarApi({ details: [eventDetails(5)] });

      let call = request(app)[method](url);
      if (authorization) call = call.set('Authorization', authorization);
      const response = await (method === 'get' || method === 'delete' ? call : call.send({ title: 'Atelier', date: '2026-09-20' }));

      expect(response.status).toBe(401);
      expectBffContract(method, url.split('?')[0], response);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(calendarApi.requests).toHaveLength(0);
      expect(coreApi.requests).toHaveLength(0);
    });

    test.each([
      ['/calendar/events?from=2026-09-01&to=2026-09-30', 401],
      ['/calendar/bootstrap', 401],
      ['/calendar/assignees', 401],
    ] as const)('never lets GET %s be cached, even when refused', async (url, status) => {
      const response = await request(app).get(url);

      expect(response.status).toBe(status);
      expect(response.headers['cache-control']).toBe('no-store');
    });

    test('forwards the caller session normalised to "Bearer <token>", whatever the scheme case', async () => {
      mockCalendarApi({ list: [] });
      const token = authorizationFor(admin.id).replace(/^Bearer /, '');

      const response = await request(app).get('/calendar/events?from=2026-09-01&to=2026-09-30').set('Authorization', `bearer   ${token}`);

      expect(response.status).toBe(200);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(calendarApi.calls(CALENDAR.calendar, 'GET')[0].headers.authorization).toBe(`Bearer ${token}`);
    });

    test('lets Calendar API judge a Bearer token the BFF cannot read, and relays its 401', async () => {
      mockCalendarApi();
      calendarApi.on('get', CALENDAR.calendar, { status: 401, raw: 'Unauthorized', contentType: 'text/plain', outOfContract: true });

      const response = await request(app).get('/calendar/events?from=2026-09-01&to=2026-09-30').set('Authorization', 'Bearer not-a-jwt');

      expect(response.status).toBe(401);
      expectBffContract('get', '/calendar/events', response);
      expect(calendarApi.calls(CALENDAR.calendar, 'GET')[0].headers.authorization).toBe('Bearer not-a-jwt');
      expect(coreApi.requests).toHaveLength(0);
    });

    test('ignores the accessToken cookie: only the Authorization header carries the session', async () => {
      mockCalendarApi();

      const response = await request(app).get('/calendar/events?from=2026-09-01&to=2026-09-30')
        .set('Cookie', `accessToken=${authorizationFor(admin.id).replace(/^Bearer /, '')}`);

      expect(response.status).toBe(401);
      expect(calendarApi.requests).toHaveLength(0);
    });

    test('keeps the static categories and services public', async () => {
      const responses = await Promise.all([request(app).get('/calendar/categories'), request(app).get('/calendar/services')]);

      expect(responses.map((response) => response.status)).toEqual([200, 200]);
    });

    test('maps a Calendar API 400 to 400 without leaking the upstream body', async () => {
      mockCalendarApi();
      calendarApi.on('get', CALENDAR.calendar, { status: 400, raw: 'Bad parameters', contentType: 'text/plain', outOfContract: true });

      const response = await request(app).get('/calendar/events?from=2026-09-01&to=2026-09-30').set('Authorization', authorizationFor(admin.id));

      expect(response.status).toBe(400);
      expectBffContract('get', '/calendar/events', response);
      expect(response.body).toEqual({ error: { code: 'BAD_REQUEST', message: 'Invalid request', details: [] } });
    });

    test('maps a Calendar API 500 to 502 without leaking the upstream message', async () => {
      mockCalendarApi();
      calendarApi.on('get', CALENDAR.calendar, { status: 500, raw: 'An error occurred while accessing the database.', contentType: 'text/plain', outOfContract: true });

      const response = await request(app).get('/calendar/bootstrap?from=2026-09-01&to=2026-09-30').set('Authorization', authorizationFor(admin.id));

      expect(response.status).toBe(502);
      expectBffContract('get', '/calendar/bootstrap', response);
      expect(response.body).toEqual({ error: { code: 'BAD_GATEWAY', message: 'Upstream service error', details: [] } });
    });

    test('maps a dropped Calendar API connection to 502', async () => {
      mockCalendarApi();
      calendarApi.on('post', CALENDAR.events, { dropConnection: true });

      const response = await request(app).post('/calendar/events').set('Authorization', authorizationFor(admin.id)).send({ title: 'Atelier', date: '2026-09-20' });

      expect(response.status).toBe(502);
      expectBffContract('post', '/calendar/events', response);
      expect(response.body).toEqual({ error: { code: 'BAD_GATEWAY', message: 'The CALENDAR_API service is unavailable.', details: [] } });
    });

    test('names Core API when its connection drops', async () => {
      mockCalendarApi({ list: [eventView(5)], details: [eventDetails(5)] });
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      coreApi.on('get', CORE.directory, { dropConnection: true });

      const response = await request(app).get('/calendar/bootstrap?from=2026-09-01&to=2026-09-30').set('Authorization', authorizationFor(admin.id));

      expect(response.status).toBe(502);
      expectBffContract('get', '/calendar/bootstrap', response);
      expect(response.body).toEqual({ error: { code: 'BAD_GATEWAY', message: 'The CORE_API service is unavailable.', details: [] } });
    });

    test('retries an idempotent Calendar API read once after a transient 503', async () => {
      mockCalendarApi();
      let attempts = 0;
      calendarApi.on('get', CALENDAR.calendar, () => (++attempts === 1
        ? { status: 503, raw: 'Unavailable', contentType: 'text/plain', outOfContract: true }
        : { body: calendarResult([]) }));

      const response = await request(app).get('/calendar/events?from=2026-09-01&to=2026-09-30').set('Authorization', authorizationFor(admin.id));

      expect(response.status).toBe(200);
      expect(calendarApi.calls(CALENDAR.calendar, 'GET')).toHaveLength(2);
    });

    test('never retries a Calendar API write', async () => {
      mockCalendarApi();
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      calendarApi.on('post', CALENDAR.events, { status: 503, raw: 'Unavailable', contentType: 'text/plain', outOfContract: true });

      const response = await request(app).post('/calendar/events').set('Authorization', authorizationFor(admin.id)).send({ title: 'Atelier', date: '2026-09-20' });

      expect(response.status).toBe(502);
      expectBffContract('post', '/calendar/events', response);
      expect(calendarApi.calls(CALENDAR.events, 'POST')).toHaveLength(1);
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
      expect(response.body).toEqual({ error: { code: 'BAD_GATEWAY', message: 'Upstream service error', details: [] } });
      expect(JSON.stringify(response.body)).not.toContain('database');
    });
  });

  describe('undeclared upstream statuses and the error envelope', () => {
    test.each([403, 404, 409])('maps a Calendar API %i that GET /calendar/events does not declare to 502', async (status) => {
      mockCalendarApi();
      calendarApi.on('get', CALENDAR.calendar, { status, raw: 'Refused', contentType: 'text/plain', outOfContract: true });

      const response = await request(app).get('/calendar/events?from=2026-09-01&to=2026-09-30').set('Authorization', authorizationFor(admin.id));

      expect(response.status).toBe(502);
      expectBffContract('get', '/calendar/events', response);
      expect(response.body).toEqual({ error: { code: 'BAD_GATEWAY', message: 'Upstream service error', details: [] } });
    });

    test('maps a Calendar API 409 on PATCH /calendar/events/:id to 502', async () => {
      mockCalendarApi({ details: [eventDetails(5)] });
      calendarApi.on('patch', CALENDAR.event, { status: 409, raw: 'Conflict', contentType: 'text/plain', outOfContract: true });

      const response = await request(app).patch('/calendar/events/5').set('Authorization', authorizationFor(admin.id)).send({ title: 'x' });

      expect(response.status).toBe(502);
      expectBffContract('patch', '/calendar/events/5', response);
      expect(response.body).toEqual({ error: { code: 'BAD_GATEWAY', message: 'Upstream service error', details: [] } });
    });

    test('keeps a declared Calendar API 403 on DELETE /calendar/events/:id with a generic message', async () => {
      mockCalendarApi({ details: [eventDetails(5)] });
      calendarApi.on('delete', CALENDAR.event, { status: 403, raw: 'Forbidden by policy', contentType: 'text/plain', outOfContract: true });

      const response = await request(app).delete('/calendar/events/5').set('Authorization', authorizationFor(admin.id));

      expect(response.status).toBe(403);
      expectBffContract('delete', '/calendar/events/5', response);
      expect(response.body).toEqual({ error: { code: 'FORBIDDEN', message: 'Access denied', details: [] } });
    });

    test('answers the validation issues of an invalid body as details', async () => {
      mockCalendarApi();

      const response = await request(app).post('/calendar/events').set('Authorization', authorizationFor(admin.id)).send({ date: '2026-09-20' });

      expect(response.status).toBe(400);
      expectBffContract('post', '/calendar/events', response);
      expect(response.body.error).toMatchObject({ code: 'BAD_REQUEST', message: 'Validation failed' });
      expect(response.body.error.details).toEqual(expect.arrayContaining([{ path: 'body.title', message: expect.any(String) }]));
    });

    test('answers an unexpected failure with a generic 500 that leaks nothing', async () => {
      mockCalendarApi();
      const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      // A list without its events array makes the mapping throw a TypeError: a bug, not an upstream status.
      calendarApi.on('get', CALENDAR.calendar, { body: { events: null }, outOfContract: true });

      const response = await request(app).get('/calendar/events?from=2026-09-01&to=2026-09-30').set('Authorization', authorizationFor(admin.id));

      expect(response.status).toBe(500);
      expectBffContract('get', '/calendar/events', response);
      expect(response.body).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error', details: [] } });
      expect(log).toHaveBeenCalled();
    });

    test('answers an unknown route with a 404 envelope', async () => {
      const response = await request(app).get('/calendar/unknown/route');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Route not found', details: [] } });
    });

    test('answers an unparsable JSON body with a 400 envelope', async () => {
      const response = await request(app).post('/calendar/events').set('Authorization', authorizationFor(admin.id))
        .set('Content-Type', 'application/json').send('{"title"');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: { code: 'BAD_REQUEST', message: 'Invalid request', details: [] } });
      expect(calendarApi.requests).toHaveLength(0);
    });
  });

  describe('upstream configuration', () => {
    afterEach(() => { jest.restoreAllMocks(); });

    test.each(['CALENDAR_API', 'CORE_API'])('answers 503 without calling the API whose %s_URL is missing', async (service) => {
      mockCalendarApi({ list: [eventView(5)], details: [eventDetails(5)] });
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      delete process.env[`${service}_URL`];

      const response = await request(app).get('/calendar/bootstrap?from=2026-09-01&to=2026-09-30').set('Authorization', authorizationFor(admin.id));

      expect(response.status).toBe(503);
      expectBffContract('get', '/calendar/bootstrap', response);
      expect(response.body).toEqual({ error: { code: 'SERVICE_UNAVAILABLE', message: `The ${service} service is not configured.`, details: [] } });
      expect((service === 'CORE_API' ? coreApi : calendarApi).requests).toHaveLength(0);
    });

    test('never falls back to localhost: only the port configured, no URL, is a 503', async () => {
      mockCalendarApi();
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      // The mock listens on localhost at CALENDAR_API_PORT: without CALENDAR_API_URL it must not be reached.
      delete process.env.CALENDAR_API_URL;

      const response = await request(app).post('/calendar/events').set('Authorization', authorizationFor(admin.id)).send({ title: 'Atelier', date: '2026-09-20' });

      expect(response.status).toBe(503);
      expectBffContract('post', '/calendar/events', response);
      expect(calendarApi.requests).toHaveLength(0);
    });

    test('answers 401 before 503 when the caller has no session', async () => {
      delete process.env.CALENDAR_API_URL;
      delete process.env.CORE_API_URL;

      const response = await request(app).delete('/calendar/events/5');

      expect(response.status).toBe(401);
      expectBffContract('delete', '/calendar/events/5', response);
    });

    test('reports an unconfigured API as unreachable in /check_apis', async () => {
      coreApi.on('get', CORE.health, { raw: 'OK', contentType: 'text/plain' });
      delete process.env.CALENDAR_API_URL;

      const response = await request(app).get('/check_apis');

      expect(response.status).toBe(502);
      expectBffContract('get', '/check_apis', response);
      expect(response.body).toEqual({ status: 'Error', core_api: 'Connected', calendar_api: 'Unreachable' });
      expect(calendarApi.requests).toHaveLength(0);
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
