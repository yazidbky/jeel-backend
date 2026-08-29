// tests/shares.test.js
import { app, request, pool, cleanupDb, createTestUser, createTestPost, makeAuthToken } from './setup.js';

describe('Shares', () => {
  afterEach(async () => {
    await cleanupDb();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('shares a post', async () => {
    const owner = await createTestUser();
    const sharer = await createTestUser();
    const post = await createTestPost(owner.id);
    const token = makeAuthToken(sharer.id);

    const res = await request(app)
      .post(`/api/posts/${post.id}/share`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
    expect(res.body.post_id).toBe(post.id);
    expect(res.body.user_id).toBe(sharer.id);
  });

  it('allows the same user to share a post more than once', async () => {
    // Unlike likes, shares are typically not unique-constrained —
    // a user might reshare to different audiences/times.
    const owner = await createTestUser();
    const sharer = await createTestUser();
    const post = await createTestPost(owner.id);
    const token = makeAuthToken(sharer.id);

    await request(app).post(`/api/posts/${post.id}/share`).set('Authorization', `Bearer ${token}`);
    const res = await request(app).post(`/api/posts/${post.id}/share`).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
  });

  it('returns the correct share count for a post', async () => {
    const owner = await createTestUser();
    const sharerA = await createTestUser();
    const sharerB = await createTestUser();
    const post = await createTestPost(owner.id);

    await request(app).post(`/api/posts/${post.id}/share`).set('Authorization', `Bearer ${makeAuthToken(sharerA.id)}`);
    await request(app).post(`/api/posts/${post.id}/share`).set('Authorization', `Bearer ${makeAuthToken(sharerB.id)}`);

    const res = await request(app)
      .get(`/api/posts/${post.id}`)
      .set('Authorization', `Bearer ${makeAuthToken(owner.id)}`);

    expect(res.body.share_count).toBe(2);
  });

  it('rejects sharing a nonexistent post', async () => {
    const user = await createTestUser();
    const token = makeAuthToken(user.id);

    const res = await request(app)
      .post('/api/posts/999999/share')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('rejects sharing without authentication', async () => {
    const owner = await createTestUser();
    const post = await createTestPost(owner.id);

    const res = await request(app).post(`/api/posts/${post.id}/share`);

    expect(res.status).toBe(401);
  });
});
