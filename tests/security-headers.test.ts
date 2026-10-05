import request from 'supertest';
import { app } from '../src/app';

describe('security headers (@mairie360/bffs-lib securityHeaders + apiOnlyHeaders)', () => {
  test.each(['/health', '/openapi.json', '/unknown-route', '/docs/'])('%s carries the shared security headers', async (url) => {
    const res = await request(app).get(url);

    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['cross-origin-resource-policy']).toBe('same-origin');
    expect(res.headers['strict-transport-security']).toMatch(/max-age=\d+/);
    expect(res.headers['content-security-policy']).not.toContain('upgrade-insecure-requests');
  });

  test.each(['/health', '/openapi.json', '/unknown-route', '/calendar/categories'])('%s, an API path, gets the strict API-only CSP', async (url) => {
    const res = await request(app).get(url);

    expect(res.headers['content-security-policy']).toBe("default-src 'none'");
    expect(res.headers['permissions-policy']).toBe('geolocation=(), camera=(), microphone=()');
  });

  test('the interactive documentation keeps the helmet CSP it needs', async () => {
    const res = await request(app).get('/docs/');

    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
  });

  test('an unparsable JSON body still gets the API-only headers', async () => {
    const res = await request(app).post('/calendar/events').set('Content-Type', 'application/json').send('{"title"');

    expect(res.status).toBe(400);
    expect(res.headers['content-security-policy']).toBe("default-src 'none'");
  });
});

describe('trust proxy', () => {
  test('trusts no proxy when TRUST_PROXY is unset', () => {
    expect(process.env.TRUST_PROXY).toBeUndefined();
    expect(app.get('trust proxy')).toBe(false);
  });
});
