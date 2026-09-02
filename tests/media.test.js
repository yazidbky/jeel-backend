// tests/media.test.js
import path from 'path';
import { app, request, pool, cleanupDb, createTestUser, createTestPost, makeAuthToken } from './setup.js';

// Adjust to wherever you keep small sample fixture files for upload tests.
const SAMPLE_IMAGE = path.join(process.cwd(), 'tests/fixtures/sample.jpg');
const SAMPLE_VIDEO = path.join(process.cwd(), 'tests/fixtures/sample.mp4');
const SAMPLE_INVALID = path.join(process.cwd(), 'tests/fixtures/sample.exe');

describe('Media', () => {
  afterEach(async () => {
    await cleanupDb();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('attaches a photo to a post', async () => {
    const user = await createTestUser();
    const post = await createTestPost(user.id);
    const token = makeAuthToken(user.id);

    const res = await request(app)
      .post(`/api/posts/${post.id}/media`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', SAMPLE_IMAGE);

    expect(res.status).toBe(201);
    expect(res.body.type).toBe('photo');
    expect(res.body.post_id).toBe(post.id);
    expect(res.body.url).toBeTruthy();
  });

  it('attaches a video to a post', async () => {
    const user = await createTestUser();
    const post = await createTestPost(user.id);
    const token = makeAuthToken(user.id);

    const res = await request(app)
      .post(`/api/posts/${post.id}/media`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', SAMPLE_VIDEO);

    expect(res.status).toBe(201);
    expect(res.body.type).toBe('video');
  });

  it('rejects an unsupported file type', async () => {
    const user = await createTestUser();
    const post = await createTestPost(user.id);
    const token = makeAuthToken(user.id);

    const res = await request(app)
      .post(`/api/posts/${post.id}/media`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', SAMPLE_INVALID);

    expect(res.status).toBe(400);
  });

  it('rejects a file over the size limit', async () => {
    const user = await createTestUser();
    const post = await createTestPost(user.id);
    const token = makeAuthToken(user.id);

    // Simulate an oversized buffer instead of shipping a huge fixture file.
    const oversizedBuffer = Buffer.alloc(50 * 1024 * 1024); // 50MB

    const res = await request(app)
      .post(`/api/posts/${post.id}/media`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', oversizedBuffer, 'huge.jpg');

    expect(res.status).toBe(413);
  });

  it('preserves order_index across multiple media items on one post', async () => {
    const user = await createTestUser();
    const post = await createTestPost(user.id);
    const token = makeAuthToken(user.id);

    await request(app)
      .post(`/api/posts/${post.id}/media`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', SAMPLE_IMAGE);

    await request(app)
      .post(`/api/posts/${post.id}/media`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', SAMPLE_IMAGE);

    const res = await request(app)
      .get(`/api/posts/${post.id}/media`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.length).toBe(2);
    expect(res.body[0].order_index).toBe(0);
    expect(res.body[1].order_index).toBe(1);
  });

  it('blocks attaching media to a post you do not own', async () => {
    const owner = await createTestUser();
    const intruder = await createTestUser();
    const post = await createTestPost(owner.id);
    const intruderToken = makeAuthToken(intruder.id);

    const res = await request(app)
      .post(`/api/posts/${post.id}/media`)
      .set('Authorization', `Bearer ${intruderToken}`)
      .attach('file', SAMPLE_IMAGE);

    expect(res.status).toBe(403);
  });
});
