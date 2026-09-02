// tests/comments.test.js
import { app, request, pool, cleanupDb, createTestUser, createTestPost, makeAuthToken } from './setup.js';

describe('Comments', () => {
  afterEach(async () => {
    await cleanupDb();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('creates a top-level comment on a post', async () => {
    const owner = await createTestUser();
    const commenter = await createTestUser();
    const post = await createTestPost(owner.id);
    const token = makeAuthToken(commenter.id);

    const res = await request(app)
      .post(`/api/posts/${post.id}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Nice post!' });

    expect(res.status).toBe(201);
    expect(res.body.content).toBe('Nice post!');
    expect(res.body.parent_comment_id).toBeNull();
  });

  it('creates a nested reply to an existing comment', async () => {
    const owner = await createTestUser();
    const commenter = await createTestUser();
    const replier = await createTestUser();
    const post = await createTestPost(owner.id);

    const parent = await request(app)
      .post(`/api/posts/${post.id}/comments`)
      .set('Authorization', `Bearer ${makeAuthToken(commenter.id)}`)
      .send({ content: 'Original comment' });

    const res = await request(app)
      .post(`/api/posts/${post.id}/comments`)
      .set('Authorization', `Bearer ${makeAuthToken(replier.id)}`)
      .send({ content: 'Reply', parent_comment_id: parent.body.id });

    expect(res.status).toBe(201);
    expect(res.body.parent_comment_id).toBe(parent.body.id);
  });

  it('rejects an empty comment', async () => {
    const owner = await createTestUser();
    const post = await createTestPost(owner.id);
    const token = makeAuthToken(owner.id);

    const res = await request(app)
      .post(`/api/posts/${post.id}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '' });

    expect(res.status).toBe(400);
  });

  it('rejects a reply pointing to a comment on a different post', async () => {
    const owner = await createTestUser();
    const postA = await createTestPost(owner.id);
    const postB = await createTestPost(owner.id);
    const token = makeAuthToken(owner.id);

    const commentOnA = await request(app)
      .post(`/api/posts/${postA.id}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'On post A' });

    const res = await request(app)
      .post(`/api/posts/${postB.id}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Cross-post reply', parent_comment_id: commentOnA.body.id });

    expect(res.status).toBe(400);
  });

  it('lists comments for a post in chronological order', async () => {
    const owner = await createTestUser();
    const post = await createTestPost(owner.id);
    const token = makeAuthToken(owner.id);

    await request(app).post(`/api/posts/${post.id}/comments`).set('Authorization', `Bearer ${token}`).send({ content: 'First' });
    await request(app).post(`/api/posts/${post.id}/comments`).set('Authorization', `Bearer ${token}`).send({ content: 'Second' });

    const res = await request(app)
      .get(`/api/posts/${post.id}/comments`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.length).toBe(2);
    expect(res.body[0].content).toBe('First');
    expect(res.body[1].content).toBe('Second');
  });

  it('allows the comment author to delete their own comment', async () => {
    const owner = await createTestUser();
    const commenter = await createTestUser();
    const post = await createTestPost(owner.id);
    const token = makeAuthToken(commenter.id);

    const created = await request(app)
      .post(`/api/posts/${post.id}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Delete me' });

    const res = await request(app)
      .delete(`/api/comments/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
  });

  it('blocks a non-author from deleting someone else\'s comment', async () => {
    const owner = await createTestUser();
    const commenter = await createTestUser();
    const intruder = await createTestUser();
    const post = await createTestPost(owner.id);

    const created = await request(app)
      .post(`/api/posts/${post.id}/comments`)
      .set('Authorization', `Bearer ${makeAuthToken(commenter.id)}`)
      .send({ content: 'Not yours' });

    const res = await request(app)
      .delete(`/api/comments/${created.body.id}`)
      .set('Authorization', `Bearer ${makeAuthToken(intruder.id)}`);

    expect(res.status).toBe(403);
  });
});
