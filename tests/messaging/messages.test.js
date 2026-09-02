// tests/messages.test.js
import request from "supertest";
import {
  pool,
  cleanupDb,
  createTestUser,
  createTestConversation,
  createTestMessage,
  makeAuthToken,
  buildTestApp,
} from "./setup(2).js";
import * as messageModel from "../../src/features/messages/model.js";
import * as messageService from "../../src/features/messages/service.js";

const app = buildTestApp();

describe("Messages — model", () => {
  afterEach(async () => {
    await cleanupDb();
  });

  it("createMessage inserts message, attachments, status rows, and updates the conversation preview in one transaction", async () => {
    const owner = await createTestUser();
    const member = await createTestUser();
    const conversation = await createTestConversation(owner.id, [member.id]);

    const message = await messageModel.createMessage({
      conversationId: conversation.id,
      senderId: owner.id,
      content: "Hello with attachment",
      messageType: "text",
      replyToMessageId: null,
      attachments: [{ url: "https://example.com/a.jpg", type: "image", fileSize: 1024, mimeType: "image/jpeg" }],
    });

    expect(message.attachments).toHaveLength(1);
    expect(message.attachments[0].url).toBe("https://example.com/a.jpg");

    const [statusRows] = await pool.execute("SELECT * FROM message_status WHERE message_id = ?", [message.id]);
    expect(statusRows.length).toBe(2); // one per active participant (owner + member)
    expect(statusRows.every((r) => r.status === "sent")).toBe(true);

    const [convoRows] = await pool.execute("SELECT last_message_preview FROM conversations WHERE id = ?", [conversation.id]);
    expect(convoRows[0].last_message_preview).toBe("Hello with attachment");
  });

  it("rolls back the message insert if an attachment insert fails", async () => {
    const owner = await createTestUser();
    const member = await createTestUser();
    const conversation = await createTestConversation(owner.id, [member.id]);

    await expect(
      messageModel.createMessage({
        conversationId: conversation.id,
        senderId: owner.id,
        content: "Should not persist",
        messageType: "text",
        replyToMessageId: null,
        // url exceeds VARCHAR(1000) constraint if validation is bypassed at this layer,
        // simulating a DB-level failure mid-transaction.
        attachments: [{ url: "a".repeat(2000), type: "image" }],
      })
    ).rejects.toThrow();

    const [rows] = await pool.execute(
      "SELECT * FROM messages WHERE conversation_id = ? AND content = ?",
      [conversation.id, "Should not persist"]
    );
    expect(rows.length).toBe(0);
  });

  it("listMessages returns newest-first and correctly reverses for display order", async () => {
    const owner = await createTestUser();
    const member = await createTestUser();
    const conversation = await createTestConversation(owner.id, [member.id]);

    const first = await createTestMessage(conversation.id, owner.id, { content: "First" });
    const second = await createTestMessage(conversation.id, owner.id, { content: "Second" });

    const { messages } = await messageModel.listMessages(conversation.id, null, 10);
    expect(messages[0].id).toBe(first.id);
    expect(messages[1].id).toBe(second.id);
  });

  it("listMessages paginates via cursor with no overlap and correct nextCursor", async () => {
    const owner = await createTestUser();
    const member = await createTestUser();
    const conversation = await createTestConversation(owner.id, [member.id]);

    const created = [];
    for (let i = 0; i < 12; i++) {
      created.push(await createTestMessage(conversation.id, owner.id, { content: `msg ${i}` }));
    }

    const page1 = await messageModel.listMessages(conversation.id, null, 5);
    expect(page1.messages.length).toBe(5);
    expect(page1.nextCursor).not.toBeNull();

    const page2 = await messageModel.listMessages(conversation.id, page1.nextCursor, 5);
    expect(page2.messages.length).toBe(5);

    const page1Ids = page1.messages.map((m) => m.id);
    const page2Ids = page2.messages.map((m) => m.id);
    expect(page1Ids.some((id) => page2Ids.includes(id))).toBe(false);
  });

  it("listMessages sets nextCursor to null on the last page", async () => {
    const owner = await createTestUser();
    const member = await createTestUser();
    const conversation = await createTestConversation(owner.id, [member.id]);
    await createTestMessage(conversation.id, owner.id);

    const { nextCursor } = await messageModel.listMessages(conversation.id, null, 50);
    expect(nextCursor).toBeNull();
  });

  it("editMessage only updates when senderId matches and the message is not deleted", async () => {
    const owner = await createTestUser();
    const member = await createTestUser();
    const conversation = await createTestConversation(owner.id, [member.id]);
    const message = await createTestMessage(conversation.id, owner.id, { content: "Original" });

    const wrongSenderResult = await messageModel.editMessage(message.id, member.id, "Hijacked");
    expect(wrongSenderResult).toBeNull();

    const correctResult = await messageModel.editMessage(message.id, owner.id, "Edited");
    expect(correctResult.content).toBe("Edited");
    expect(correctResult.edited_at).not.toBeNull();
  });

  it("softDeleteMessage clears content and sets deleted_at without removing the row", async () => {
    const owner = await createTestUser();
    const member = await createTestUser();
    const conversation = await createTestConversation(owner.id, [member.id]);
    const message = await createTestMessage(conversation.id, owner.id);

    const success = await messageModel.softDeleteMessage(message.id, owner.id);
    expect(success).toBe(true);

    const [rows] = await pool.execute("SELECT content, deleted_at FROM messages WHERE id = ?", [message.id]);
    expect(rows[0].content).toBe("");
    expect(rows[0].deleted_at).not.toBeNull();
  });

  it("softDeleteMessage returns false for a message not owned by the caller", async () => {
    const owner = await createTestUser();
    const member = await createTestUser();
    const conversation = await createTestConversation(owner.id, [member.id]);
    const message = await createTestMessage(conversation.id, owner.id);

    const success = await messageModel.softDeleteMessage(message.id, member.id);
    expect(success).toBe(false);
  });

  it("markStatusesRead only marks statuses up to and including the given messageId", async () => {
    const owner = await createTestUser();
    const member = await createTestUser();
    const conversation = await createTestConversation(owner.id, [member.id]);

    const first = await createTestMessage(conversation.id, owner.id, { content: "one" });
    const second = await createTestMessage(conversation.id, owner.id, { content: "two" });
    const third = await createTestMessage(conversation.id, owner.id, { content: "three" });

    await messageModel.markStatusesRead(conversation.id, member.id, second.id);

    const [rows] = await pool.execute(
      "SELECT message_id, status FROM message_status WHERE user_id = ? ORDER BY message_id",
      [member.id]
    );
    const byId = Object.fromEntries(rows.map((r) => [r.message_id, r.status]));
    expect(byId[first.id]).toBe("read");
    expect(byId[second.id]).toBe("read");
    expect(byId[third.id]).toBe("sent");
  });
});

describe("Messages — service", () => {
  afterEach(async () => {
    await cleanupDb();
  });

  it("sendMessage rejects a sender who is not a conversation participant", async () => {
    const owner = await createTestUser();
    const member = await createTestUser();
    const outsider = await createTestUser();
    const conversation = await createTestConversation(owner.id, [member.id]);

    await expect(
      messageService.sendMessage(conversation.id, outsider.id, { content: "sneaky", messageType: "text", attachments: [] })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("updateMessage throws 404 for a message that exists but isn't owned by the caller", async () => {
    const owner = await createTestUser();
    const member = await createTestUser();
    const conversation = await createTestConversation(owner.id, [member.id]);
    const message = await createTestMessage(conversation.id, owner.id);

    await expect(
      messageService.updateMessage(message.id, member.id, conversation.id, "Hijacked")
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("deleteMessage throws 403 before even checking ownership if caller left the conversation", async () => {
    const owner = await createTestUser();
    const member = await createTestUser();
    const conversation = await createTestConversation(owner.id, [member.id]);
    const message = await createTestMessage(conversation.id, owner.id);

    await pool.execute(
      "UPDATE conversation_participants SET left_at = NOW() WHERE conversation_id = ? AND user_id = ?",
      [conversation.id, owner.id]
    );

    await expect(
      messageService.deleteMessage(message.id, owner.id, conversation.id)
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe("Messages — controller / routes", () => {
  afterEach(async () => {
    await cleanupDb();
  });

  it("POST /api/conversations/:id/messages sends a message", async () => {
    const owner = await createTestUser();
    const member = await createTestUser();
    const conversation = await createTestConversation(owner.id, [member.id]);
    const token = makeAuthToken(owner.id);

    const res = await request(app)
      .post(`/api/conversations/${conversation.id}/messages`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Hi there" });

    expect(res.status).toBe(201);
    expect(res.body.content).toBe("Hi there");
  });

  it("POST /api/conversations/:id/messages rejects empty content (min length 1)", async () => {
    const owner = await createTestUser();
    const member = await createTestUser();
    const conversation = await createTestConversation(owner.id, [member.id]);
    const token = makeAuthToken(owner.id);

    const res = await request(app)
      .post(`/api/conversations/${conversation.id}/messages`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "" });

    expect(res.status).toBe(400);
  });

  it("POST /api/conversations/:id/messages rejects content over 5000 chars", async () => {
    const owner = await createTestUser();
    const member = await createTestUser();
    const conversation = await createTestConversation(owner.id, [member.id]);
    const token = makeAuthToken(owner.id);

    const res = await request(app)
      .post(`/api/conversations/${conversation.id}/messages`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "a".repeat(5001) });

    expect(res.status).toBe(400);
  });

  it("POST /api/conversations/:id/messages is rate limited after 30 requests in the window", async () => {
    const owner = await createTestUser();
    const member = await createTestUser();
    const conversation = await createTestConversation(owner.id, [member.id]);
    const token = makeAuthToken(owner.id);

    let lastStatus;
    for (let i = 0; i < 31; i++) {
      const res = await request(app)
        .post(`/api/conversations/${conversation.id}/messages`)
        .set("Authorization", `Bearer ${token}`)
        .send({ content: `msg ${i}` });
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  }, 20000);

  it("GET /api/conversations/:id/messages supports ?limit and ?cursor", async () => {
    const owner = await createTestUser();
    const member = await createTestUser();
    const conversation = await createTestConversation(owner.id, [member.id]);
    const token = makeAuthToken(owner.id);

    for (let i = 0; i < 8; i++) {
      await createTestMessage(conversation.id, owner.id, { content: `m${i}` });
    }

    const res = await request(app)
      .get(`/api/conversations/${conversation.id}/messages?limit=5`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.messages.length).toBe(5);
    expect(res.body.nextCursor).toBeTruthy();
  });

  it("PATCH /api/messages/:id returns 404 when the message doesn't exist", async () => {
    const owner = await createTestUser();
    const token = makeAuthToken(owner.id);

    const res = await request(app)
      .patch("/api/messages/999999")
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "doesn't matter" });

    expect(res.status).toBe(404);
  });

  it("DELETE /api/messages/:id soft-deletes and returns 204", async () => {
    const owner = await createTestUser();
    const member = await createTestUser();
    const conversation = await createTestConversation(owner.id, [member.id]);
    const message = await createTestMessage(conversation.id, owner.id);
    const token = makeAuthToken(owner.id);

    const res = await request(app)
      .delete(`/api/messages/${message.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);

    const [rows] = await pool.execute("SELECT deleted_at FROM messages WHERE id = ?", [message.id]);
    expect(rows[0].deleted_at).not.toBeNull();
  });

  it("POST /api/conversations/:id/read marks messages read for the caller", async () => {
    const owner = await createTestUser();
    const member = await createTestUser();
    const conversation = await createTestConversation(owner.id, [member.id]);
    const message = await createTestMessage(conversation.id, owner.id);
    const token = makeAuthToken(member.id);

    const res = await request(app)
      .post(`/api/conversations/${conversation.id}/read`)
      .set("Authorization", `Bearer ${token}`)
      .send({ messageId: message.id });

    expect(res.status).toBe(204);

    const [rows] = await pool.execute(
      "SELECT status FROM message_status WHERE message_id = ? AND user_id = ?",
      [message.id, member.id]
    );
    expect(rows[0].status).toBe("read");
  });
});
