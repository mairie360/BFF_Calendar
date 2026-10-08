import { startTelemetry } from '@mairie360/bffs-lib';
import '../src/telemetry';

jest.mock('@mairie360/bffs-lib', () => ({ startTelemetry: jest.fn() }));

// src/telemetry.ts starts OpenTelemetry when src/index.ts imports it, before the app (MAIR-504).
test('starts the telemetry under the service name', () => {
  expect(startTelemetry).toHaveBeenCalledWith({ serviceName: 'bff-calendar' });
});
