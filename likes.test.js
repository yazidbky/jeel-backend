// tests/likes.test.js
import { app, request, pool, cleanupDb, createTestUser, createTestPost, makeAuthToken } from './setup.js';

describe('Likes', () => {
  afterEach(async () => {
    await cleanupDb();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('likes a post', async () => {
    const owner = await createTestUser();
    const liker = await createTestUser();
    const post = await createTestPost(owner.id);
    const token = makeAuthToken(liker.id);

    const res = await request(app)
      .post(`/api/posts/${post.id}/like`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
    expect(res.body.liked).toBe(true);
  });

  it('unlikes a post on second call (toggle behavior)', async () => {
    const owner = await createTestUser();
    const liker = await createTestUser();
    const post = await createTestPost(owner.id);
    const token = makeAuthToken(liker.id);

    await request(app)
      .post(`/api/posts/${post.id}/like`)
      .set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .post(`/api/posts/${post.id}/like`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.liked).toBe(false);
  });

  it('does not allow duplicate like rows for the same user/post pair', async () => {
    const owner = await createTestUser();
    const liker = await createTestUser();
    const post = await createTestPost(owner.id);
    const token = makeAuthToken(liker.id);

    // Fire two concurrent like requests to test the race condition /
    // UNIQUE constraint, not just sequential calls.
    await Promise.all([
      request(app).post(`/api/posts/${post.id}/like`).set('Authorization', `Bearer ${token}`),
      request(app).post(`/api/posts/${post.id}/like`).set('Authorization', `Bearer ${token}`),
    ]);

    const rows = await pool.query(
      'SELECT * FROM likes WHERE user_id = $1 AND post_id = $2',
      [liker.id, post.id]
    );
    expect(rows.rows.length).toBeLessThanOrEqual(1);
  });

  it('returns the correct like count for a post', async () => {
    const owner = await createTestUser();
    const likerA = await createTestUser();
    const likerB = await createTestUser();
    const post = await createTestPost(owner.id);

    await request(app)
      .post(`/api/posts/${post.id}/like`)
      .set('Authorization', `Bearer ${makeAuthToken(likerA.id)}`);
    await request(app)
      .post(`/api/posts/${post.id}/like`)
      .set('Authorization', `Bearer ${makeAuthToken(likerB.id)}`);

    const res = await request(app)
      .get(`/api/posts/${post.id}`)
      .set('Authorization', `Bearer ${makeAuthToken(owner.id)}`);

    expect(res.body.like_count).toBe(2);
  });

  it('rejects liking without authentication', async () => {
    const owner = await createTestUser();
    const post = await createTestPost(owner.id);

    const res = await request(app).post(`/api/posts/${post.id}/like`);

    expect(res.status).toBe(401);
  });
});
