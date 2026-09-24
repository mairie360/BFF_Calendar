import http from 'k6/http';
import { check, sleep } from 'k6';
import crypto from 'k6/crypto';
import encoding from 'k6/encoding';
import { createCoverage } from '/coverage.js';

// ---------------------------------------------------------------------------
// k6 load test of the BFF Calendar.
//
// Every operation of the contract (contracts/openapi.json, mounted as /openapi.json) has one
// handler below: the shared OpenAPI coverage module (mairie360/CICD tests/k6/coverage.js, see
// performance_test.sh) aborts at init when an operation has no handler, and fails the
// `operations_uncovered` threshold when a handler ends without sending its request. Adding a route
// to the BFF therefore means adding its handler here.
//
// Two scenarios share the handlers:
// - `crud` (2 VUs): `coverage.run()` calls every handler once per iteration, reads and writes, so
//   it carries the coverage gate. Handlers run path by path in contract order and, for one path,
//   in the order get, put, post, delete, options, head, patch, trace (so DELETE runs before PATCH).
//   Each iteration is one self-contained scenario: user 2 creates an event assigned to its
//   Responsable (user 3) plus a disposable one, deletes the disposable event, patches the kept one,
//   and user 3 approves it. `cleanup()` deletes the kept event at the end of the iteration.
// - `reads` (up to 20 VUs): replays only the GET handlers, on the June 2030 fixtures seeded by
//   init-test.sql; they never depend on `state`.
// Every operation gets a p(95) threshold, whose budget depends on its family (`budgetOf`).
// ---------------------------------------------------------------------------

// Must match the JWT_SECRET of the calendar-api / core-api services of the test stack.
const JWT_SECRET = __ENV.JWT_SECRET || 'b"secret"';
// User role, in group 20 with the Responsable (init-test.sql): reads and event writes.
const USER_ID = __ENV.PERF_USER_ID || '2';
// Responsable of group 20 (init-test.sql): approves the events user 2 assigns to it.
const RESPONSABLE_ID = __ENV.PERF_RESPONSABLE_ID || '3';
// Month of the seeded read fixtures (event 110); the crud scenario writes in July 2030.
const READ_RANGE = { from: '2030-06-01', to: '2030-06-30' };
const WRITE_DATE = '2030-07-01';

// State of the current iteration (module scope is per VU in k6).
let state = {};

function b64url(value) {
  return encoding.b64encode(value, 'rawurl');
}

// Minimal HS256 JWT accepted by Core / Calendar API (sub + role + exp claims).
function mintJwt(sub, role) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(JSON.stringify({ sub, role, exp: now + 3600 }));
  const signingInput = `${header}.${payload}`;
  const signature = crypto.hmac('sha256', JWT_SECRET, signingInput, 'base64rawurl');
  return `${signingInput}.${signature}`;
}

function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}

function need(value, what) {
  if (value === undefined || value === null) {
    throw new Error(`${what} is missing, an earlier handler of this iteration failed`);
  }
  return value;
}

function json(response) {
  try {
    return response.json();
  } catch (_) {
    return null;
  }
}

function eventBody(title) {
  return {
    title,
    date: WRITE_DATE,
    startTime: '09:00',
    endTime: '10:00',
    category: 'meeting',
    service: 'direction',
    location: 'Town hall',
    assigneeIds: [`user-${RESPONSABLE_ID}`],
  };
}

const handlers = {
  // --- Connectivity (public) ---
  'GET /health': ({ request }) =>
    check(request(), { 'health 200': (r) => r.status === 200 }),
  'GET /check_apis': ({ request }) =>
    check(request(), { 'check_apis 200': (r) => r.status === 200 }),

  // --- Calendar reads ---
  'GET /calendar/bootstrap': ({ request }) =>
    check(request({ query: READ_RANGE }), { 'bootstrap 200': (r) => r.status === 200 }),
  'GET /calendar/events': ({ request }) =>
    check(request({ query: READ_RANGE }), { 'events 200': (r) => r.status === 200 }),
  'GET /calendar/assignees': ({ request }) =>
    check(request(), { 'assignees 200': (r) => r.status === 200 }),
  'GET /calendar/categories': ({ request }) =>
    check(request(), { 'categories 200': (r) => r.status === 200 }),
  'GET /calendar/services': ({ request }) =>
    check(request(), { 'services 200': (r) => r.status === 200 }),

  // --- Event writes ---
  // Two events: one kept for PATCH and approval, one for DELETE (which runs before PATCH).
  'POST /calendar/events': ({ request }) => {
    [state.eventId, state.disposableEventId] = ['k6 event', 'k6 deleted event'].map((title) => {
      const res = request({ body: eventBody(title) });
      check(res, { 'create event 201': (r) => r.status === 201 });
      return (json(res) || {}).id;
    });
  },
  'DELETE /calendar/events/{id}': ({ request }) =>
    check(request({ path: { id: need(state.disposableEventId, 'disposable event') } }), {
      'delete event 204': (r) => r.status === 204,
    }),
  'PATCH /calendar/events/{id}': ({ request }) =>
    check(request({ path: { id: need(state.eventId, 'created event') }, body: { title: 'k6 event, patched' } }), {
      'patch event 200': (r) => r.status === 200,
    }),
  // The event was created by a User and assigned to its Responsable: it is pending until then.
  'PATCH /calendar/events/{id}/approval': ({ request, data }) =>
    check(request({ path: { id: need(state.eventId, 'created event') }, body: { approvalStatus: 'approved' }, headers: data.responsable }), {
      'approve event 200': (r) => r.status === 200 && (json(r) || {}).approvalStatus === 'approved',
    }),
};

const coverage = createCoverage(handlers);
const readOperations = coverage.operations.filter((o) => o.method === 'GET');

// Deletes the event kept by the handlers, so that the July listing does not grow during the test.
// Only its creator (user 2) may delete it.
function cleanup(data) {
  if (state.eventId === undefined || state.eventId === null) return;
  const op = 'DELETE /calendar/events/{id}';
  http.del(coverage.url(op, { id: state.eventId }), null, { headers: data.user, tags: { op } });
}

// p(95) budget of an operation, per family.
function budgetOf({ op, method }) {
  if (op === 'GET /health') return 50; // process probe
  if (op === 'GET /check_apis') return 150; // -> Calendar API /health
  if (method === 'GET') return 400; // BFF aggregation + Calendar / Core reads
  return 800; // event writes: several Calendar API calls each
}

const perOperationThresholds = {};
for (const operation of coverage.operations) {
  perOperationThresholds[`http_req_duration{op:${operation.op}}`] = [`p(95)<${budgetOf(operation)}`];
}

export const options = {
  scenarios: {
    reads: {
      executor: 'ramping-vus',
      exec: 'reads',
      stages: [
        { duration: '30s', target: 20 }, // ramp-up
        { duration: '1m', target: 20 }, // steady load
        { duration: '10s', target: 0 }, // ramp-down
      ],
    },
    crud: {
      executor: 'constant-vus',
      exec: 'crud',
      vus: 2,
      duration: '1m40s',
    },
  },
  thresholds: {
    ...coverage.thresholds,
    ...perOperationThresholds,
    http_req_failed: ['rate<0.01'], // < 1% errors
    checks: ['rate>0.99'],
  },
};

export function setup() {
  return {
    user: bearer(mintJwt(USER_ID, 'user')),
    responsable: bearer(mintJwt(RESPONSABLE_ID, 'responsable')),
  };
}

// Every GET handler, with a plain request() (no coverage accounting: `crud` owns the gate).
export function reads(data) {
  for (const operation of readOperations) {
    const request = (call = {}) =>
      http.get(coverage.url(operation.op, call.path, call.query), {
        headers: Object.assign({}, data.user, call.headers),
        tags: { op: operation.op },
      });
    handlers[operation.op]({ request, data, op: operation.op, method: operation.method, path: operation.path });
  }
  sleep(1);
}

export function crud(data) {
  state = {};
  // User 2 by default; the approval handler passes the Responsable token.
  coverage.run({ headers: data.user, data });
  cleanup(data);
  sleep(1);
}
