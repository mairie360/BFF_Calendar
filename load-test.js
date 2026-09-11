import http from 'k6/http';
import { check, sleep, group } from 'k6';
import crypto from 'k6/crypto';
import encoding from 'k6/encoding';

// ---------------------------------------------------------------------------
// Test de charge k6 pour le BFF Calendar.
// Cible les routes réellement servies par le BFF : /health (sans auth) et les
// lectures /calendar/* (avec un JWT HS256 signé comme le fait Core API).
// ---------------------------------------------------------------------------

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4002';
// Doit correspondre au JWT_SECRET du service calendar-api de la stack de test.
const JWT_SECRET = __ENV.JWT_SECRET || 'secret';
// Utilisateur inséré par init-test.sql (sub du token).
const USER_ID = __ENV.PERF_USER_ID || '2';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // montée en charge
    { duration: '1m', target: 20 },  // maintien
    { duration: '10s', target: 0 },  // descente
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],                        // < 1% d'erreurs
    'http_req_duration{endpoint:health}': ['p(95)<50'],    // sonde process
    'http_req_duration{endpoint:calendar}': ['p(95)<400'], // agrégation BFF + upstream
  },
};

function b64url(value) {
  return encoding.b64encode(value, 'rawurl');
}

// JWT HS256 minimal accepté par Core/Calendar API (claims sub + role + exp).
function mintJwt() {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(JSON.stringify({ sub: USER_ID, role: 'user', exp: now + 3600 }));
  const signingInput = `${header}.${payload}`;
  const signature = crypto.hmac('sha256', JWT_SECRET, signingInput, 'base64rawurl');
  return `${signingInput}.${signature}`;
}

function monthRange() {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export function setup() {
  return { token: mintJwt() };
}

export default function (data) {
  const authParams = {
    headers: { Authorization: `Bearer ${data.token}` },
    tags: { endpoint: 'calendar' },
  };
  const { from, to } = monthRange();

  group('health', () => {
    const res = http.get(`${BASE_URL}/health`, { tags: { endpoint: 'health' } });
    check(res, { 'health 200': (r) => r.status === 200 });
  });

  group('calendar reads', () => {
    const bootstrap = http.get(`${BASE_URL}/calendar/bootstrap?from=${from}&to=${to}`, authParams);
    check(bootstrap, { 'bootstrap 200': (r) => r.status === 200 });

    const events = http.get(`${BASE_URL}/calendar/events?from=${from}&to=${to}`, authParams);
    check(events, { 'events 200': (r) => r.status === 200 });

    const assignees = http.get(`${BASE_URL}/calendar/assignees`, authParams);
    check(assignees, { 'assignees 200': (r) => r.status === 200 });

    const categories = http.get(`${BASE_URL}/calendar/categories`, authParams);
    check(categories, { 'categories 200': (r) => r.status === 200 });

    const services = http.get(`${BASE_URL}/calendar/services`, authParams);
    check(services, { 'services 200': (r) => r.status === 200 });
  });

  sleep(1);
}
