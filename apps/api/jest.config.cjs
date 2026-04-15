/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true }],
  },
  snapshotSerializers: ['<rootDir>/jest-bigint-serializer.js'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    'src/lib/calculations.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    'src/routes/*.ts': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    'src/workers/*.ts': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  globalSetup: '<rootDir>/jest.globalSetup.js',
  // Reduce timeout to default as most tests are fast; per-suite increase should be done with jest.setTimeout in slow integration tests.
  testTimeout: 5000,
}
