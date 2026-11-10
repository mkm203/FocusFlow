module.exports = {
  testEnvironment: 'node',
  verbose: true,
  forceExit: true,
  setupFiles: ['<rootDir>/tests/setup-env.js'], // runs BEFORE the app loads
  testMatch: ['**/tests/**/*.test.js'],
  maxWorkers: 1 // both test files share one test database, so they run one after another
};