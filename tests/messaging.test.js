import http from "http";
import { io as socketClient } from "socket.io-client";
import { app, request, pool, cleanupDb, createTestUser, makeAuthToken } from "./setup.js";
import { createSocketServer } from "../src/realtime/socket.server.js";
import { runMigrations } from "../src/core/db/migrationRunner.js";

describe("Messaging", () => {
  let server;
  let io;

  beforeAll(async () => {
    await runMigrations();
    server = http.createServer(app);
    io = createSocketServer(server);
    await new Promise((resolve) => server.listen(0, resolve));
  });

  afterEach(async () => cleanupDb());

  afterAll(async () => {
    io.close();
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  });

  it("requires conversation membership for message reads", async () => {
    const owner = await createTestUser();
    const outsider = await createTestUser();
    const ownerToken = makeAuthToken(owner.id);
    const outsiderToken = makeAuthToken(outsider.id);

    const conversation = await request(app)
      .post("/api/conversations")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ participantIds: [] });

    expect(conversation.status).toBe(201);
    const response = await request(app)
      .get(`/api/conversations/${conversation.body.id}/messages`)
      .set("Authorization", `Bearer ${outsiderToken}`);

    expect(response.status).toBe(403);
  });

  it("creates and cursor-paginates messages, then soft-deletes owned messages", async () => {
    const sender = await createTestUser();
    const recipient = await createTestUser();
    const token = makeAuthToken(sender.id);
    const recipientToken = makeAuthToken(recipient.id);
    const conversation = await request(app)
      .post("/api/conversations")
      .set("Authorization", `Bearer ${token}`)
      .send({ participantIds: [recipient.id] });
    const id = conversation.body.id;

    const created = await request(app)
      .post(`/api/conversations/${id}/messages`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "hello" });

    expect(created.status).toBe(201);
    const page = await request(app)
      .get(`/api/conversations/${id}/messages?limit=1`)
      .set("Authorization", `Bearer ${recipientToken}`);
    expect(page.body.messages).toHaveLength(1);

    const removed = await request(app)
      .delete(`/api/messages/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(removed.status).toBe(204);
  });

  it("delivers a database-backed message between authenticated clients", async () => {
    const sender = await createTestUser();
    const recipient = await createTestUser();
    const senderToken = makeAuthToken(sender.id);
    const recipientToken = makeAuthToken(recipient.id);
    const conversation = await request(app)
      .post("/api/conversations")
      .set("Authorization", `Bearer ${senderToken}`)
      .send({ participantIds: [recipient.id] });
    const port = server.address().port;
    const recipientSocket = socketClient(`http://localhost:${port}`, { auth: { token: recipientToken } });
    const senderSocket = socketClient(`http://localhost:${port}`, { auth: { token: senderToken } });

    await Promise.all([
      new Promise((resolve, reject) => { recipientSocket.once("connect", resolve); recipientSocket.once("connect_error", reject); }),
      new Promise((resolve, reject) => { senderSocket.once("connect", resolve); senderSocket.once("connect_error", reject); }),
    ]);
    const received = new Promise((resolve) => recipientSocket.once("message:new", resolve));
    senderSocket.emit("message:send", { conversationId: conversation.body.id, content: "real time" });
    const message = await received;

    expect(message.content).toBe("real time");
    senderSocket.close();
    recipientSocket.close();
  });
});
