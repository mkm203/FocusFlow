const request = require('supertest');
const initDatabase = require('../scripts/init-db');
const db = require('../config/db');
const app = require('../app');

// Creates the test database if needed and empties the tables
async function resetDatabase() {
  await initDatabase(process.env.DB_NAME);
  await db.query('SET FOREIGN_KEY_CHECKS = 0');
  await db.query('TRUNCATE TABLE backups');
  await db.query('TRUNCATE TABLE cloud_users');
  await db.query('SET FOREIGN_KEY_CHECKS = 1');
}

// Registers and logs in a cloud user, returns { token, user }
async function makeUser(email) {
  await request(app).post('/api/auth/register').send({ email, password: 'Password123' });
  const res = await request(app).post('/api/auth/login').send({ email, password: 'Password123' });
  return { token: res.body.token, user: res.body.user };
}

module.exports = { app, db, request, resetDatabase, makeUser };