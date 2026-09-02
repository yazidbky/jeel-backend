// tests/follows.test.js
import { app, request, pool, cleanupDb, createTestUser, makeAuthToken } from './setup.js';

describe('Follows', () => {
  afterEach(async () => {
    await cleanupDb();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('follows another user', async () => {
    const follower = await createTestUser();
    const target = await createTestUser();
    const token = makeAuthToken(follower.id);

    const res = await request(app)
      .post(`/api/users/${target.id}/follow`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
  });

  it('prevents a user from following themselves', async () => {
    const user = await createTestUser();
    const token = makeAuthToken(user.id);

    const res = await request(app)
      .post(`/api/users/${user.id}/follow`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it('unfollows on a second call to the same endpoint (toggle)', async () => {
    const follower = await createTestUser();
    const target = await createTestUser();
    const token = makeAuthToken(follower.id);

    await request(app).post(`/api/users/${target.id}/follow`).set('Authorization', `Bearer ${token}`);
    const res = await request(app).post(`/api/users/${target.id}/follow`).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.following).toBe(false);
  });

  it('prevents duplicate follow rows for the same pair', async () => {
    const follower = await createTestUser();
    const target = await createTestUser();
    const token = makeAuthToken(follower.id);

    await Promise.all([
      request(app).post(`/api/users/${target.id}/follow`).set('Authorization', `Bearer ${token}`),
      request(app).post(`/api/users/${target.id}/follow`).set('Authorization', `Bearer ${token}`),
    ]);

    const rows = await pool.query(
      'SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2',
      [follower.id, target.id]
    );
    expect(rows.rows.length).toBeLessThanOrEqual(1);
  });

  it('lists a user\'s followers', async () => {
    const target = await createTestUser();
    const followerA = await createTestUser();
    const followerB = await createTestUser();

    await request(app).post(`/api/users/${target.id}/follow`).set('Authorization', `Bearer ${makeAuthToken(followerA.id)}`);
    await request(app).post(`/api/users/${target.id}/follow`).set('Authorization', `Bearer ${makeAuthToken(followerB.id)}`);

    const res = await request(app)
      .get(`/api/users/${target.id}/followers`)
      .set('Authorization', `Bearer ${makeAuthToken(target.id)}`);

    expect(res.body.length).toBe(2);
  });

  it('lists who a user is following', async () => {
    const follower = await createTestUser();
    const targetA = await createTestUser();
    const targetB = await createTestUser();
    const token = makeAuthToken(follower.id);

    await request(app).post(`/api/users/${targetA.id}/follow`).set('Authorization', `Bearer ${token}`);
    await request(app).post(`/api/users/${targetB.id}/follow`).set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .get(`/api/users/${follower.id}/following`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.length).toBe(2);
  });
});
