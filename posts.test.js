// tests/posts.test.js
import { app, request, pool, cleanupDb, createTestUser, createTestPost, makeAuthToken } from './setup.js';

describe('Posts', () => {
  afterEach(async () => {
    await cleanupDb();
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('POST /api/posts', () => {
    it('creates a post when authenticated', async () => {
      const user = await createTestUser();
      const token = makeAuthToken(user.id);

      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({ caption: 'Hello world' });

      expect(res.status).toBe(201);
      expect(res.body.caption).toBe('Hello world');
      expect(res.body.user_id).toBe(user.id);
    });

    it('rejects post creation without auth', async () => {
      const res = await request(app)
        .post('/api/posts')
        .send({ caption: 'No auth' });

      expect(res.status).toBe(401);
    });

    it('rejects a post with an empty caption and no media', async () => {
      const user = await createTestUser();
      const token = makeAuthToken(user.id);

      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({ caption: '' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/posts/:id', () => {
    it('returns a single post by id', async () => {
      const user = await createTestUser();
      const post = await createTestPost(user.id);
      const token = makeAuthToken(user.id);

      const res = await request(app)
        .get(`/api/posts/${post.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(post.id);
    });

    it('returns 404 for a nonexistent post', async () => {
      const user = await createTestUser();
      const token = makeAuthToken(user.id);

      const res = await request(app)
        .get('/api/posts/999999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/posts/:id', () => {
    it('allows the owner to update their post caption', async () => {
      const user = await createTestUser();
      const post = await createTestPost(user.id);
      const token = makeAuthToken(user.id);

      const res = await request(app)
        .patch(`/api/posts/${post.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ caption: 'Updated caption' });

      expect(res.status).toBe(200);
      expect(res.body.caption).toBe('Updated caption');
    });

    it('blocks a non-owner from updating the post', async () => {
      const owner = await createTestUser();
      const intruder = await createTestUser();
      const post = await createTestPost(owner.id);
      const intruderToken = makeAuthToken(intruder.id);

      const res = await request(app)
        .patch(`/api/posts/${post.id}`)
        .set('Authorization', `Bearer ${intruderToken}`)
        .send({ caption: 'Hijacked' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/posts/:id', () => {
    it('allows the owner to delete their post', async () => {
      const user = await createTestUser();
      const post = await createTestPost(user.id);
      const token = makeAuthToken(user.id);

      const res = await request(app)
        .delete(`/api/posts/${post.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);

      const check = await pool.query('SELECT * FROM posts WHERE id = $1', [post.id]);
      expect(check.rows.length).toBe(0);
    });

    it('blocks a non-owner from deleting the post', async () => {
      const owner = await createTestUser();
      const intruder = await createTestUser();
      const post = await createTestPost(owner.id);
      const intruderToken = makeAuthToken(intruder.id);

      const res = await request(app)
        .delete(`/api/posts/${post.id}`)
        .set('Authorization', `Bearer ${intruderToken}`);

      expect(res.status).toBe(403);
    });
  });
});
