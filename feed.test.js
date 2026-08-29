// tests/feed.test.js
import { app, request, pool, cleanupDb, createTestUser, createTestPost, makeAuthToken } from './setup.js';

describe('Feed', () => {
  afterEach(async () => {
    await cleanupDb();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('only shows posts from users the viewer follows', async () => {
    const viewer = await createTestUser();
    const followed = await createTestUser();
    const stranger = await createTestUser();
    const token = makeAuthToken(viewer.id);

    await request(app).post(`/api/users/${followed.id}/follow`).set('Authorization', `Bearer ${token}`);

    await createTestPost(followed.id, { caption: 'Should appear' });
    await createTestPost(stranger.id, { caption: 'Should NOT appear' });

    const res = await request(app)
      .get('/api/feed')
      .set('Authorization', `Bearer ${token}`);

    const captions = res.body.posts.map(p => p.caption);
    expect(captions).toContain('Should appear');
    expect(captions).not.toContain('Should NOT appear');
  });

  it('orders posts newest first', async () => {
    const viewer = await createTestUser();
    const followed = await createTestUser();
    const token = makeAuthToken(viewer.id);

    await request(app).post(`/api/users/${followed.id}/follow`).set('Authorization', `Bearer ${token}`);

    const first = await createTestPost(followed.id, { caption: 'Older' });
    // Ensure a distinguishable created_at ordering.
    await new Promise(r => setTimeout(r, 50));
    const second = await createTestPost(followed.id, { caption: 'Newer' });

    const res = await request(app)
      .get('/api/feed')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.posts[0].id).toBe(second.id);
    expect(res.body.posts[1].id).toBe(first.id);
  });

  it('paginates results according to limit/offset', async () => {
    const viewer = await createTestUser();
    const followed = await createTestUser();
    const token = makeAuthToken(viewer.id);

    await request(app).post(`/api/users/${followed.id}/follow`).set('Authorization', `Bearer ${token}`);

    for (let i = 0; i < 25; i++) {
      await createTestPost(followed.id, { caption: `Post ${i}` });
    }

    const page1 = await request(app)
      .get('/api/feed?limit=20&offset=0')
      .set('Authorization', `Bearer ${token}`);
    const page2 = await request(app)
      .get('/api/feed?limit=20&offset=20')
      .set('Authorization', `Bearer ${token}`);

    expect(page1.body.posts.length).toBe(20);
    expect(page2.body.posts.length).toBe(5);

    const page1Ids = page1.body.posts.map(p => p.id);
    const page2Ids = page2.body.posts.map(p => p.id);
    const overlap = page1Ids.filter(id => page2Ids.includes(id));
    expect(overlap.length).toBe(0);
  });

  it('returns an empty feed for a user following nobody', async () => {
    const viewer = await createTestUser();
    const token = makeAuthToken(viewer.id);

    const res = await request(app)
      .get('/api/feed')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.posts).toEqual([]);
  });

  it('includes like_count, comment_count, and share_count on each feed post', async () => {
    const viewer = await createTestUser();
    const followed = await createTestUser();
    const token = makeAuthToken(viewer.id);

    await request(app).post(`/api/users/${followed.id}/follow`).set('Authorization', `Bearer ${token}`);
    const post = await createTestPost(followed.id);

    await request(app).post(`/api/posts/${post.id}/like`).set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .get('/api/feed')
      .set('Authorization', `Bearer ${token}`);

    const feedPost = res.body.posts.find(p => p.id === post.id);
    expect(feedPost).toHaveProperty('like_count', 1);
    expect(feedPost).toHaveProperty('comment_count', 0);
    expect(feedPost).toHaveProperty('share_count', 0);
  });

  it('rejects unauthenticated feed requests', async () => {
    const res = await request(app).get('/api/feed');
    expect(res.status).toBe(401);
  });
});
