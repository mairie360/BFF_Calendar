import express from 'express';
import request from 'supertest';

jest.mock('../src/clients/calendarClient', () => ({
  __esModule: true,
  default: {
    getCalendar: jest.fn(),
    createEvent: jest.fn(),
    getEvent: jest.fn(),
    deleteEvent: jest.fn(),
    patchEvent: jest.fn(),
    getEventMembers: jest.fn(),
    addEventMember: jest.fn(),
    removeEventMember: jest.fn(),
  },
}));

jest.mock('../src/repositories/calendarAccessRepository', () => ({
  filterAssignedCalendarEventIds: jest.fn(),
  getCalendarDirectoryUser: jest.fn(),
  getCalendarEventAccess: jest.fn(),
  getCalendarEventMetadata: jest.fn(),
  listCalendarDirectoryUsers: jest.fn(),
  listAssignedRecurringCalendarEvents: jest.fn(),
  setCalendarEventValidationStatus: jest.fn(),
  updateCalendarEventDetails: jest.fn(),
  upsertCalendarEventMetadata: jest.fn(),
}));

import calendarApi from '../src/clients/calendarClient';
import * as calendarAccessRepository from '../src/repositories/calendarAccessRepository';
import calendarRouter from '../src/routes/calendar-routes';

const app = express();
app.use(express.json());
app.use('/calendar', calendarRouter);

const authorization = 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.test-signature';

const adminUser = {
  id: 1,
  firstName: 'Admin',
  lastName: 'User',
  email: 'admin@example.test',
  roles: ['Admin'],
  groupIds: [1],
};

const assignedUser = {
  id: 7,
  firstName: 'Alice',
  lastName: 'Martin',
  email: 'alice@example.test',
  roles: ['User'],
  groupIds: [1],
};

const regularUser = {
  id: 2,
  firstName: 'Jean',
  lastName: 'Utilisateur',
  email: 'jean@example.test',
  roles: ['User'],
  groupIds: [1],
};

const responsibleUser = {
  id: 3,
  firstName: 'Marie',
  lastName: 'Responsable',
  email: 'marie@example.test',
  roles: ['Responsable'],
  groupIds: [1],
};

const authorizationFor = (userId: number) => (
  `Bearer eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: String(userId) })).toString('base64url')}.test-signature`
);

function eventAccess(id: number) {
  return {
    eventId: id,
    createdById: 1,
    members: [
      { ...adminUser, validationStatus: 'validated' as const },
      { ...assignedUser, validationStatus: 'validated' as const },
    ],
  };
}

function eventDetails(id: number, name = `Événement ${id}`) {
  return {
    id,
    name,
    description: `Description ${id}`,
    events_start_time: '2026-07-16T09:00:00Z',
    events_end_time: '2026-07-16T10:00:00Z',
    members: [{ id: 7, validation_status: 'Pending' }],
    owner: 1,
    recurrence_id: null,
    visibility: 'Public',
  };
}

describe('Calendar BFF routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(calendarAccessRepository.getCalendarDirectoryUser).mockImplementation(async (userId) => (
      userId === adminUser.id ? adminUser : userId === assignedUser.id ? assignedUser : null
    ));
    jest.mocked(calendarAccessRepository.listCalendarDirectoryUsers).mockResolvedValue([
      adminUser,
      assignedUser,
    ]);
    jest.mocked(calendarAccessRepository.filterAssignedCalendarEventIds).mockImplementation(async (eventIds) => (
      new Set(eventIds)
    ));
    jest.mocked(calendarAccessRepository.getCalendarEventAccess).mockImplementation(async (eventId) => (
      eventAccess(eventId)
    ));
    jest.mocked(calendarAccessRepository.getCalendarEventMetadata).mockResolvedValue(null);
    jest.mocked(calendarAccessRepository.listAssignedRecurringCalendarEvents).mockResolvedValue([]);
    jest.mocked(calendarAccessRepository.setCalendarEventValidationStatus).mockResolvedValue();
    jest.mocked(calendarAccessRepository.updateCalendarEventDetails).mockResolvedValue(true);
    jest.mocked(calendarAccessRepository.upsertCalendarEventMetadata).mockResolvedValue();
  });

  it('loads detailed events and assignees through a single bootstrap request', async () => {
    jest.mocked(calendarAccessRepository.getCalendarEventMetadata).mockResolvedValue({
      category: 'ceremony',
      service: 'communication',
      location: 'Parvis de la mairie',
      recurrence: {
        frequency: 'weekly',
        interval: 1,
        daysOfWeek: [4],
        endsOn: '2026-07-30',
      },
    });
    jest.mocked(calendarApi.getCalendar).mockResolvedValue({
      data: {
        events: [
          { id: 1, name: 'Résumé 1', start: '2026-07-16T09:00:00Z', end: '2026-07-16T10:00:00Z' },
          { id: 2, name: 'Résumé 2', start: '2026-07-17T11:00:00Z', end: '2026-07-17T12:00:00Z' },
        ],
      },
    } as never);
    jest.mocked(calendarApi.getEvent).mockImplementation(async (eventId) => ({
      data: eventDetails(eventId),
    } as never));

    const response = await request(app)
      .get('/calendar/bootstrap?from=2026-07-01&to=2026-07-31')
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    expect(response.body.events).toHaveLength(2);
    expect(response.body.events[0]).toEqual(expect.objectContaining({
      id: 1,
      title: 'Événement 1',
      description: 'Description 1',
      assigneeIds: ['user-1', 'user-7'],
      approvalStatus: 'approved',
      category: 'ceremony',
      location: 'Parvis de la mairie',
      recurrence: expect.objectContaining({ frequency: 'weekly' }),
    }));
    expect(response.body.assignees).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'user-1', name: 'Admin User' }),
      expect.objectContaining({ id: 'user-7', name: 'Alice Martin' }),
    ]));
    expect(response.body.currentUser).toEqual(expect.objectContaining({
      id: 'user-1',
      role: 'Admin',
    }));
    expect(response.body.assigneeScope).toBe('all');
    expect(response.body.categories).toContainEqual({ label: 'Réunion', value: 'meeting' });
    expect(calendarApi.getCalendar).toHaveBeenCalledTimes(1);
    expect(calendarApi.getEvent).toHaveBeenCalledTimes(2);
    expect(calendarApi.getCalendar).toHaveBeenCalledWith(
      {
        start: '2026-07-01T00:00:00Z',
        end: '2026-07-31T23:59:59Z',
      },
      { headers: { Authorization: authorization } },
    );
  });

  it('creates an event and synchronizes its assignees', async () => {
    jest.mocked(calendarApi.createEvent).mockResolvedValue({ data: { event_id: 3 } } as never);
    jest.mocked(calendarApi.addEventMember).mockResolvedValue({ data: { user_id: 7 } } as never);
    jest.mocked(calendarApi.getEvent).mockResolvedValue({ data: eventDetails(3, 'Conseil municipal') } as never);

    const response = await request(app)
      .post('/calendar/events')
      .set('Authorization', authorization)
      .send({
        title: 'Conseil municipal',
        description: 'Séance publique',
        date: '2026-07-16',
        category: 'meeting',
        location: 'Salle du conseil',
        service: 'direction',
        startTime: '09:00',
        endTime: '10:00',
        assigneeIds: ['user-7'],
        recurrence: {
          frequency: 'weekly',
          interval: 1,
          daysOfWeek: [4],
          endsOn: '2026-07-30',
        },
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(expect.objectContaining({ id: 3, title: 'Conseil municipal' }));
    expect(calendarApi.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        custom_name: 'Conseil municipal',
        events_start_time: '2026-07-16T09:00:00Z',
        events_end_time: '2026-07-16T10:00:00Z',
      }),
      { headers: { Authorization: authorization } },
    );
    expect(calendarApi.addEventMember).toHaveBeenCalledWith(
      3,
      { user_id: 7 },
      { headers: { Authorization: authorization } },
    );
    expect(calendarApi.addEventMember).toHaveBeenCalledWith(
      3,
      { user_id: 1 },
      { headers: { Authorization: authorization } },
    );
    expect(calendarAccessRepository.setCalendarEventValidationStatus).toHaveBeenCalledWith(3, 'validated');
    expect(calendarAccessRepository.upsertCalendarEventMetadata).toHaveBeenCalledWith(3, {
      category: 'meeting',
      service: 'direction',
      location: 'Salle du conseil',
      recurrence: {
        frequency: 'weekly',
        interval: 1,
        daysOfWeek: [4],
        endsOn: '2026-07-30',
      },
    });
  });

  it('updates an event and returns the persisted representation', async () => {
    jest.mocked(calendarApi.getEvent)
      .mockResolvedValueOnce({ data: eventDetails(4, 'Ancien titre') } as never)
      .mockResolvedValueOnce({ data: eventDetails(4, 'Nouveau titre') } as never);
    jest.mocked(calendarApi.patchEvent).mockResolvedValue({ data: undefined } as never);

    const response = await request(app)
      .patch('/calendar/events/4')
      .set('Authorization', authorization)
      .send({
        title: 'Nouveau titre',
        description: 'Nouvelle description',
        category: 'activity',
        location: 'Salle polyvalente',
        service: 'culture',
        recurrence: {
          frequency: 'none',
          interval: 1,
          daysOfWeek: [],
          endsOn: '',
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.title).toBe('Nouveau titre');
    expect(calendarApi.patchEvent).toHaveBeenCalledWith(
      4,
      expect.objectContaining({
        name: 'Nouveau titre',
        intervalle: null,
        reccurence_end_date: '2026-07-16T00:00:00Z',
      }),
      { reccurent: false },
      { headers: { Authorization: authorization } },
    );
    expect(calendarAccessRepository.updateCalendarEventDetails).toHaveBeenCalledWith(
      4,
      expect.objectContaining({
        name: 'Nouveau titre',
        startDate: '2026-07-16T09:00:00Z',
        endDate: '2026-07-16T10:00:00Z',
      }),
    );
    expect(calendarAccessRepository.upsertCalendarEventMetadata).toHaveBeenCalledWith(4, {
      category: 'activity',
      service: 'culture',
      location: 'Salle polyvalente',
      recurrence: {
        frequency: 'none',
        interval: 1,
        daysOfWeek: [],
        endsOn: undefined,
      },
    });
  });

  it('deletes an event', async () => {
    jest.mocked(calendarApi.deleteEvent).mockResolvedValue({ data: undefined } as never);

    const response = await request(app)
      .delete('/calendar/events/5')
      .set('Authorization', authorization);

    expect(response.status).toBe(204);
    expect(calendarApi.deleteEvent).toHaveBeenCalledWith(
      5,
      { headers: { Authorization: authorization } },
    );
  });

  it('allows an assigned responsible to update an event created by a user', async () => {
    const responsibleAuthorization = authorizationFor(responsibleUser.id);
    const access = {
      eventId: 12,
      createdById: regularUser.id,
      members: [
        { ...regularUser, validationStatus: 'pending' as const },
        { ...responsibleUser, validationStatus: 'pending' as const },
      ],
    };

    jest.mocked(calendarAccessRepository.getCalendarDirectoryUser).mockImplementation(async (userId) => (
      userId === regularUser.id ? regularUser : userId === responsibleUser.id ? responsibleUser : null
    ));
    jest.mocked(calendarAccessRepository.getCalendarEventAccess).mockResolvedValue(access);
    jest.mocked(calendarApi.getEvent).mockResolvedValue({ data: eventDetails(12, 'Ancien titre') } as never);
    jest.mocked(calendarApi.patchEvent).mockResolvedValue({ data: undefined } as never);

    const response = await request(app)
      .patch('/calendar/events/12')
      .set('Authorization', responsibleAuthorization)
      .send({ title: 'Titre du responsable' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      title: 'Titre du responsable',
      canEdit: true,
    }));
  });

  it('forbids an assigned regular user from updating another creator event', async () => {
    jest.mocked(calendarApi.getEvent).mockResolvedValue({ data: eventDetails(13, 'Événement admin') } as never);

    const response = await request(app)
      .patch('/calendar/events/13')
      .set('Authorization', authorizationFor(assignedUser.id))
      .send({ title: 'Tentative interdite' });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('EVENT_UPDATE_FORBIDDEN');
    expect(calendarAccessRepository.updateCalendarEventDetails).not.toHaveBeenCalled();
  });

  it('returns only events assigned to the authenticated user', async () => {
    jest.mocked(calendarApi.getCalendar).mockResolvedValue({
      data: {
        events: [
          { id: 8, name: 'Non assigné', start: '2026-07-16T09:00:00Z', end: '2026-07-16T10:00:00Z' },
          { id: 9, name: 'Assigné', start: '2026-07-17T09:00:00Z', end: '2026-07-17T10:00:00Z' },
        ],
      },
    } as never);
    jest.mocked(calendarAccessRepository.filterAssignedCalendarEventIds).mockResolvedValue(new Set([9]));

    const response = await request(app)
      .get('/calendar/events?from=2026-07-01&to=2026-07-31')
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      expect.objectContaining({ id: 9, title: 'Assigné' }),
    ]);
  });

  it('keeps an assigned recurring event visible in a later calendar period', async () => {
    jest.mocked(calendarApi.getCalendar).mockResolvedValue({ data: { events: [] } } as never);
    jest.mocked(calendarAccessRepository.listAssignedRecurringCalendarEvents).mockResolvedValue([
      {
        id: 30,
        name: 'Récurrence inter-mois',
        start: '2026-07-16T09:00:00Z',
        end: '2026-07-16T10:00:00Z',
      },
    ]);
    jest.mocked(calendarAccessRepository.filterAssignedCalendarEventIds).mockResolvedValue(new Set([30]));
    jest.mocked(calendarAccessRepository.getCalendarEventMetadata).mockResolvedValue({
      category: 'meeting',
      service: null,
      location: 'Salle A',
      recurrence: {
        frequency: 'weekly',
        interval: 1,
        daysOfWeek: [4],
        endsOn: '2026-08-27',
      },
    });
    jest.mocked(calendarApi.getEvent).mockResolvedValue({
      data: eventDetails(30, 'Récurrence inter-mois'),
    } as never);

    const response = await request(app)
      .get('/calendar/bootstrap?from=2026-08-01&to=2026-08-31')
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    expect(response.body.events).toEqual([
      expect.objectContaining({
        id: 30,
        title: 'Récurrence inter-mois',
        recurrence: expect.objectContaining({ endsOn: '2026-08-27' }),
      }),
    ]);
  });

  it('requires responsible approval when a user assigns a responsible from their group', async () => {
    const userAuthorization = authorizationFor(regularUser.id);
    const pendingAccess = {
      eventId: 10,
      createdById: regularUser.id,
      members: [
        { ...regularUser, validationStatus: 'pending' as const },
        { ...responsibleUser, validationStatus: 'pending' as const },
      ],
    };

    jest.mocked(calendarAccessRepository.getCalendarDirectoryUser).mockImplementation(async (userId) => (
      userId === regularUser.id ? regularUser : userId === responsibleUser.id ? responsibleUser : null
    ));
    jest.mocked(calendarAccessRepository.listCalendarDirectoryUsers).mockResolvedValue([
      regularUser,
      responsibleUser,
    ]);
    jest.mocked(calendarAccessRepository.getCalendarEventAccess).mockResolvedValue(pendingAccess);
    jest.mocked(calendarApi.createEvent).mockResolvedValue({ data: { event_id: 10 } } as never);
    jest.mocked(calendarApi.addEventMember).mockResolvedValue({ data: { user_id: 2 } } as never);
    jest.mocked(calendarApi.getEvent).mockResolvedValue({ data: eventDetails(10, 'Réunion du groupe') } as never);

    const response = await request(app)
      .post('/calendar/events')
      .set('Authorization', userAuthorization)
      .send({
        title: 'Réunion du groupe',
        date: '2026-07-16',
        startTime: '09:00',
        endTime: '10:00',
        assigneeIds: ['user-3'],
      });

    expect(response.status).toBe(201);
    expect(response.body.approvalStatus).toBe('pending');
    expect(response.body.canValidate).toBe(false);
    expect(calendarAccessRepository.listCalendarDirectoryUsers).toHaveBeenCalledWith({ groupIds: [1] });
    expect(calendarAccessRepository.setCalendarEventValidationStatus).toHaveBeenCalledWith(10, 'pending');
  });

  it('allows only an assigned responsible from the creator group to approve the event', async () => {
    const responsibleAuthorization = authorizationFor(responsibleUser.id);
    let validationStatus: 'pending' | 'validated' = 'pending';

    jest.mocked(calendarAccessRepository.getCalendarDirectoryUser).mockImplementation(async (userId) => (
      userId === regularUser.id ? regularUser : userId === responsibleUser.id ? responsibleUser : null
    ));
    jest.mocked(calendarAccessRepository.getCalendarEventAccess).mockImplementation(async () => ({
      eventId: 11,
      createdById: regularUser.id,
      members: [
        { ...regularUser, validationStatus },
        { ...responsibleUser, validationStatus },
      ],
    }));
    jest.mocked(calendarAccessRepository.setCalendarEventValidationStatus).mockImplementation(async (_eventId, status) => {
      validationStatus = status === 'validated' ? 'validated' : 'pending';
    });
    jest.mocked(calendarApi.getEvent).mockResolvedValue({ data: eventDetails(11, 'À valider') } as never);

    const response = await request(app)
      .patch('/calendar/events/11/approval')
      .set('Authorization', responsibleAuthorization)
      .send({ approvalStatus: 'approved' });

    expect(response.status).toBe(200);
    expect(response.body.approvalStatus).toBe('approved');
    expect(response.body.canValidate).toBe(false);
    expect(calendarAccessRepository.setCalendarEventValidationStatus).toHaveBeenCalledWith(11, 'validated');
  });
});
