const { app, db, request, resetDatabase, makeUser } = require('./helpers');
const jwt = require('jsonwebtoken');

let userA, userB;
const auth = u => ({ Authorization: `Bearer ${u.token}` });
const state = { settings: { theme: 'dark', notifications: true }, tasks: [{ id: 1, title: 'Étudier la physique ✓', done: false }], sessions: 12.5 };

beforeAll(async () => {
  await resetDatabase();
  userA = await makeUser('a@focusflow.cm');
  userB = await makeUser('b@focusflow.cm');
});
afterAll(async () => { await db.end(); });

describe('FocusFlow offline isolation', () => {
  it('health works with no token and no account (the app core never needs the cloud)', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('success');
  });
});

describe('FocusFlow access control (401)', () => {
  it('blocks every backup route without a token', async () => {
    for (const [method, url] of [['get', '/api/backups'], ['post', '/api/backups'], ['get', '/api/backups/1'],
      ['get', '/api/backups/1/restore'], ['put', '/api/backups/1'], ['delete', '/api/backups/1']])
      expect((await request(app)[method](url)).statusCode).toBe(401);
  });

  it('blocks invalid, forged and expired tokens', async () => {
    const forged = jwt.sign({ id: userA.user.id }, 'wrong_secret');
    const expired = jwt.sign({ id: userA.user.id }, process.env.JWT_SECRET, { expiresIn: -10 });
    for (const t of ['abc.def.ghi', forged, expired])
      expect((await request(app).get('/api/backups').set('Authorization', `Bearer ${t}`)).statusCode).toBe(401);
  });
});

describe('FocusFlow backup and restore', () => {
  let id;

  it('creates a backup (201) and stores the size', async () => {
    const res = await request(app).post('/api/backups').set(auth(userA)).send({ backup_title: 'v1.0', data_payload: state });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.backup_title).toBe('v1.0');
    expect(res.body.data.file_size).toBe(Buffer.byteLength(JSON.stringify(state)));
    id = res.body.data.id;
  });

  it('accepts the payload as a JSON string too (like the course example)', async () => {
    const res = await request(app).post('/api/backups').set(auth(userA))
      .send({ backup_title: 'as-string', data_payload: '{"settings": {"theme": "dark", "notifications": true}}' });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.data_payload).toEqual({ settings: { theme: 'dark', notifications: true } });
  });

  it('restores the exact state without corruption (accents, booleans, numbers)', async () => {
    const res = await request(app).get(`/api/backups/${id}/restore`).set(auth(userA));
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(state);
    const one = await request(app).get(`/api/backups/${id}`).set(auth(userA));
    expect(one.body.data.data_payload).toEqual(state);
  });

  it('lists only my backups, without payloads', async () => {
    const res = await request(app).get('/api/backups').set(auth(userA));
    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(2);
    res.body.data.forEach(b => expect(b.data_payload).toBeUndefined());
    expect((await request(app).get('/api/backups').set(auth(userB))).body.count).toBe(0);
  });

  it('updates a backup (200)', async () => {
    const res = await request(app).put(`/api/backups/${id}`).set(auth(userA))
      .send({ backup_title: 'v1.1', data_payload: { settings: { theme: 'light' } } });
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({ backup_title: 'v1.1', data_payload: { settings: { theme: 'light' } } });
  });

  it("hides another user's backups: 404 on get, restore, update and delete", async () => {
    expect((await request(app).get(`/api/backups/${id}`).set(auth(userB))).statusCode).toBe(404);
    expect((await request(app).get(`/api/backups/${id}/restore`).set(auth(userB))).statusCode).toBe(404);
    expect((await request(app).put(`/api/backups/${id}`).set(auth(userB)).send({ backup_title: 'x', data_payload: {} })).statusCode).toBe(404);
    expect((await request(app).delete(`/api/backups/${id}`).set(auth(userB))).statusCode).toBe(404);
    expect((await request(app).get(`/api/backups/${id}`).set(auth(userA))).statusCode).toBe(200); // still there
  });

  it('returns 404 for a missing backup and 400 for a bad id', async () => {
    expect((await request(app).get('/api/backups/99999').set(auth(userA))).statusCode).toBe(404);
    expect((await request(app).get('/api/backups/abc').set(auth(userA))).statusCode).toBe(400);
    expect((await request(app).get('/api/backups/1%20OR%201=1').set(auth(userA))).statusCode).toBe(400);
  });

  it('deletes a backup (200) and it is gone', async () => {
    expect((await request(app).delete(`/api/backups/${id}`).set(auth(userA))).statusCode).toBe(200);
    expect((await request(app).get(`/api/backups/${id}`).set(auth(userA))).statusCode).toBe(404);
  });
});

describe('FocusFlow payload rejection (400)', () => {
  const send = body => request(app).post('/api/backups').set(auth(userA)).send(body);

  it('rejects missing fields', async () => {
    expect((await send({ data_payload: {} })).statusCode).toBe(400);
    expect((await send({ backup_title: 'x' })).statusCode).toBe(400);
    expect((await send({ backup_title: '', data_payload: {} })).statusCode).toBe(400);
  });

  it('rejects a payload that is not JSON data', async () => {
    expect((await send({ backup_title: 'x', data_payload: '{not json' })).statusCode).toBe(400);
    expect((await send({ backup_title: 'x', data_payload: 'just text' })).statusCode).toBe(400);
    expect((await send({ backup_title: 'x', data_payload: 42 })).statusCode).toBe(400);
    expect((await send({ backup_title: 'x', data_payload: null })).statusCode).toBe(400);
  });

  it('rejects a payload over 100 KB', async () => {
    const res = await send({ backup_title: 'big', data_payload: { blob: 'x'.repeat(150 * 1024) } });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/too large/i);
  });

  it('rejects a body over 200 KB', async () => {
    const res = await send({ backup_title: 'huge', data_payload: { blob: 'x'.repeat(300 * 1024) } });
    expect(res.statusCode).toBe(400);
  });

  it('rejects malformed JSON in the request body', async () => {
    const res = await request(app).post('/api/backups').set(auth(userA))
      .set('Content-Type', 'application/json').send('{"backup_title": "x", ');
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/malformed json/i);
  });

  it('stores a SQL injection title as plain text and the table survives', async () => {
    const evil = "x'); DROP TABLE backups; --";
    const res = await send({ backup_title: evil, data_payload: { ok: true } });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.backup_title).toBe(evil);
    expect((await request(app).get('/api/backups').set(auth(userA))).statusCode).toBe(200);
  });

  it('answers an unknown route with a JSON 404', async () => {
    const res = await request(app).get('/api/nothing');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});