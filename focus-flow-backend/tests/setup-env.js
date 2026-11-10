// Tests use their OWN database, so your real data is never touched.
process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.TEST_DB_NAME || 'focus_flow_test_db';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_for_jest';
process.env.DOTENV_CONFIG_QUIET = 'true';