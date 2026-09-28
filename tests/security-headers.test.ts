import request from 'supertest';
import { app } from '../src/index';

describe('security headers (helmet)', () => {
  test.each(['/health', '/openapi.json', '/unknown-route'])('%s carries the helmet security headers', async (url) => {
    const res = await request(app).get(url);

    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['cross-origin-resource-policy']).toBe('same-origin');
    expect(res.headers['strict-transport-security']).toMatch(/max-age=\d+/);
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['content-security-policy']).not.toContain('upgrade-insecure-requests');
  });
});
