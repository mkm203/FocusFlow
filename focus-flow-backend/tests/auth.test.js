const { app, db, request, resetDatabase } = require('./helpers');
const jwt = require('jsonwebtoken');

beforeAll(resetDatabase);
afterAll(async () => { await db.end(); });

describe('FocusFlow cloud account tests', () => {
  const account = { email: 'student@focusflow.cm', password: 'Password123' };

  it('creates a cloud account (201) without returning the password', async () => {
    const res = await request(app).post('/api/auth/register').send(account);
    expect(res.statusCode).toBe(201);
    expect(res.body.data.email).toBe(account.email);
    expect(res.body.data.password).toBeUndefined();
  });

  it('rejects a duplicate email (400)', async () => {
    expect((await request(app).post('/api/auth/register').send(account)).statusCode).toBe(400);
  });

  it('stores a bcrypt hash, not the password', async () => {
    const [rows] = await db.execute('SELECT password FROM cloud_users WHERE email = ?', [account.email]);
    expect(rows[0].password).toMatch(/^\$2[aby]\$10\$/);
  });

  it('rejects missing, invalid or too-short credentials (400)', async () => {
    for (const body of [{}, { email: account.email }, { password: 'Password123' },
      { email: 'nope', password: 'Password123' }, { email: 'a@b.cm', password: '123' }])
      expect((await request(app).post('/api/auth/register').send(body)).statusCode).toBe(400);
  });

  it('logs in and returns a valid JWT (200)', async () => {
    const res = await request(app).post('/api/auth/login').send(account);
    expect(res.statusCode).toBe(200);
    expect(jwt.verify(res.body.token, process.env.JWT_SECRET)).toMatchObject({ email: account.email });
  });

  it('rejects wrong password and unknown email with the same 401', async () => {
    const a = await request(app).post('/api/auth/login').send({ email: account.email, password: 'WrongPass1' });
    const b = await request(app).post('/api/auth/login').send({ email: 'ghost@focusflow.cm', password: 'Password123' });
    expect(a.statusCode).toBe(401);
    expect(b.statusCode).toBe(401);
    expect(a.body.message).toBe(b.body.message);
  });

  it('treats a SQL injection login as a plain wrong login (401)', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: "' OR '1'='1", password: "' OR '1'='1" });
    expect(res.statusCode).toBe(401);
  });
});