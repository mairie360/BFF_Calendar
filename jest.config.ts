export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  // Les clients @mairie360/*-api-openapi sont publiés en TypeScript ESM (orval) : ts-jest doit les compiler
  // pour que les tests d'intégration passent par le vrai client HTTP. Leurs déclarations dupliquées ne
  // sont pas vérifiées (même contournement que le require non typé de src/clients/calendarClient.ts).
  transform: { '^.+\\.ts$': ['ts-jest', { diagnostics: { exclude: ['**/node_modules/**'] } }] },
  transformIgnorePatterns: ['/node_modules/(?!@mairie360/)'],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageReporters: ['text-summary', 'lcov'],
};
