import { defineConfig } from '@orval/core';

export default defineConfig({
  bffCalendar: {
    input: {
      target: './openapi.json',
    },
    output: {
      mode: 'tags-split',
      target: './generated/calendar-api.ts',
      schemas: './generated/model',
      client: 'fetch',
      httpClient: 'fetch',
      mock: {
        enabled: true,
        type: 'msw',
      },
    },
  },
});
