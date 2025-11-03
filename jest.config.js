module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    '!packages/*/src/**/*.d.ts',
    '!packages/*/src/**/__tests__/**',
    '!packages/*/src/**/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  moduleNameMapping: {
    '^@pdf-parser/(.*)$': '<rootDir>/packages/pdf-parser/src/$1',
    '^@mcp-server/(.*)$': '<rootDir>/packages/mcp-server/src/$1',
    '^@example-agent/(.*)$': '<rootDir>/packages/example-agent/src/$1',
    '^@tools/(.*)$': '<rootDir>/tools/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 30000, // 30 seconds for PDF processing tests
};