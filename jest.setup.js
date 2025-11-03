// Global test setup
global.beforeAll = global.beforeAll || (() => {});
global.afterAll = global.afterAll || (() => {});

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock console methods during tests to reduce noise
const originalConsole = global.console;
beforeEach(() => {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
});

afterEach(() => {
  global.console = originalConsole;
});