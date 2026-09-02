// tests/sockets.test.js
import {
  pool,
  cleanupDb,
  createTestUser,
  createTestConversation,
  connectSocket,
  startTestSocketServer,
} from "./setup(2).js";

const TEST_PORT = 4010;
let httpServer;
let io;

describe("Messaging — Socket.IO", () => {
  beforeAll(async () => {
    ({ httpServer, io } = await startTestSocketServer(TEST_PORT));
  });

  afterAll(async () => {
    io.close();
    await new Promise((resolve) => httpServer.close(resolve));
  });

  afterEach(async () => {
    await cleanupDb();
  });

  it("rejects a connection with no token", async () => {
    await expect(connectSocket(undefined, TEST_PORT)).rejects.toBeDefined();
  });

  it("delivers message:new to all active participants via ack-based message:send", async () => {
    const owner = await createTestUser();
    const member = await createTestUser();
    const conversation = await createTestConversation(owner.id, [member.id]);

    const ownerSocket = await connectSocket(owner.id, TEST_PORT);
    const memberSocket = await connectSocket(member.id, TEST_PORT);

    const received = new Promise((resolve) => {
      memberSocket.on("message:new", resolve);
    });

    const ackResult = await new Promise((resolve) => {
      ownerSocket.emit(
        "message:send",
        { conversationId: conversation.id, content: "Real-time hello", messageType: "text", attachments: [] },
        resolve
      );
    });

    expect(ackResult.ok).toBe(true);
    expect(ackResult.message.content).toBe("Real-time hello");

    const message = await received;
    expect(message.content).toBe("Real-time hello");

    ownerSocket.close();
    memberSocket.close();
  });

  it("acknowledges with ok:false and does not broadcast when sender is not a participant", async () => {
    const owner = await createTestUser();
    const member = await createTestUser();
    const outsider = await createTestUser();
    const conversation = await createTestConversation(owner.id, [member.id]);

    const outsiderSocket = await connectSocket(outsider.id, TEST_PORT);
    const memberSocket = await connectSocket(member.id, TEST_PORT);

    let memberReceived = false;
    memberSocket.on("message:new", () => { memberReceived = true; });

    const ackResult = await new Promise((resolve) => {
      outsiderSocket.emit(
        "message:send",
        { conversationId: conversation.id, content: "Should fail", messageType: "text", attachments: [] },
        resolve
      );
    });

    expect(ackResult.ok).toBe(false);

    await new Promise((r) => setTimeout(r, 200));
    expect(memberReceived).toBe(false);

    outsiderSocket.close();
    memberSocket.close();
  });

  it("acknowledges with ok:false for content that fails validation (empty string)", async () => {
    const owner = await createTestUser();
    const member = await createTestUser();
    const conversation = await createTestConversation(owner.id, [member.id]);
    const socket = await connectSocket(owner.id, TEST_PORT);

    const ackResult = await new Promise((resolve) => {
      socket.emit(
        "message:send",
        { conversationId: conversation.id, content: "", messageType: "text", attachments: [] },
        resolve
      );
    });

    expect(ackResult.ok).toBe(false);
    socket.close();
  });

  it("does not deliver message:new to a user outside the conversation", async () => {
    const owner = await createTestUser();
    const member = await createTestUser();
    const stranger = await createTestUser();
    const conversation = await createTestConversation(owner.id, [member.id]);

    const ownerSocket = await connectSocket(owner.id, TEST_PORT);
    const strangerSocket = await connectSocket(stranger.id, TEST_PORT);

    let strangerReceived = false;
    strangerSocket.on("message:new", () => { strangerReceived = true; });

    await new Promise((resolve) => {
      ownerSocket.emit(
        "message:send",
        { conversationId: conversation.id, content: "Private", messageType: "text", attachments: [] },
        resolve
      );
    });
    await new Promise((r) => setTimeout(r, 200));

    expect(strangerReceived).toBe(false);

    ownerSocket.close();
    strangerSocket.close();
  });

  it("enforces the 30-message/10s rate limit on message:send and acks ok:false once exceeded", async () => {
    const owner = await createTestUser();
    const member = await createTestUser();
    const conversation = await createTestConversation(owner.id, [member.id]);
    const socket = await connectSocket(owner.id, TEST_PORT);

    let lastAck;
    for (let i = 0; i < 31; i++) {
      lastAck = await new Promise((resolve) => {
        socket.emit(
          "message:send",
          { conversationId: conversation.id, content: `msg ${i}`, messageType: "text", attachments: [] },
          resolve
        );
      });
    }

    expect(lastAck.ok).toBe(false);
    expect(lastAck.error).toMatch(/rate limit/i);

    socket.close();
  }, 20000);

  it("message:read updates status to read and emits message:status to participants", async () => {
    const owner = await createTestUser();
    const member = await createTestUser();
    const conversation = await createTestConversation(owner.id, [member.id]);

    const ownerSocket = await connectSocket(owner.id, TEST_PORT);
    const memberSocket = await connectSocket(member.id, TEST_PORT);

    const sendAck = await new Promise((resolve) => {
      ownerSocket.emit(
        "message:send",
        { conversationId: conversation.id, content: "Read me", messageType: "text", attachments: [] },
        resolve
      );
    });
    const messageId = sendAck.message.id;

    const statusReceived = new Promise((resolve) => {
      ownerSocket.on("message:status", resolve);
    });

    const readAck = await new Promise((resolve) => {
      memberSocket.emit("message:read", { conversationId: conversation.id, messageId }, resolve);
    });
    expect(readAck.ok).toBe(true);

    const status = await statusReceived;
    expect(status.status).toBe("read");
    expect(status.userId).toBe(member.id);
    expect(status.messageId).toBe(messageId);

    ownerSocket.close();
    memberSocket.close();
  });

  it("typing:start broadcasts typing:update to other participants but not the sender", async () => {
    const owner = await createTestUser();
    const member = await createTestUser();
    const conversation = await createTestConversation(owner.id, [member.id]);

    const ownerSocket = await connectSocket(owner.id, TEST_PORT);
    const memberSocket = await connectSocket(member.id, TEST_PORT);

    let ownerReceivedOwnTyping = false;
    ownerSocket.on("typing:update", () => { ownerReceivedOwnTyping = true; });

    const typingEvent = new Promise((resolve) => {
      memberSocket.on("typing:update", resolve);
    });

    ownerSocket.emit("typing:start", { conversationId: conversation.id });

    const event = await typingEvent;
    expect(event.userId).toBe(owner.id);
    expect(event.typing).toBe(true);
    expect(ownerReceivedOwnTyping).toBe(false);

    ownerSocket.close();
    memberSocket.close();
  });

  it("typing:stop broadcasts typing:false", async () => {
    const owner = await createTestUser();
    const member = await createTestUser();
    const conversation = await createTestConversation(owner.id, [member.id]);

    const ownerSocket = await connectSocket(owner.id, TEST_PORT);
    const memberSocket = await connectSocket(member.id, TEST_PORT);

    const typingEvent = new Promise((resolve) => {
      memberSocket.on("typing:update", resolve);
    });

    ownerSocket.emit("typing:stop", { conversationId: conversation.id });

    const event = await typingEvent;
    expect(event.typing).toBe(false);

    ownerSocket.close();
    memberSocket.close();
  });

  it("silently produces no typing:update when sender is not a participant (no ack, no crash)", async () => {
    const owner = await createTestUser();
    const member = await createTestUser();
    const outsider = await createTestUser();
    const conversation = await createTestConversation(owner.id, [member.id]);

    const outsiderSocket = await connectSocket(outsider.id, TEST_PORT);
    const memberSocket = await connectSocket(member.id, TEST_PORT);

    let received = false;
    memberSocket.on("typing:update", () => { received = true; });

    outsiderSocket.emit("typing:start", { conversationId: conversation.id });
    await new Promise((r) => setTimeout(r, 200));

    expect(received).toBe(false);

    outsiderSocket.close();
    memberSocket.close();
  });

  it("broadcasts presence:update online:true to already-connected users when a new user connects", async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();

    const socketA = await connectSocket(userA.id, TEST_PORT);

    const presenceEvent = new Promise((resolve) => {
      socketA.on("presence:update", resolve);
    });

    const socketB = await connectSocket(userB.id, TEST_PORT);

    const event = await presenceEvent;
    expect(event.userId).toBe(userB.id);
    expect(event.online).toBe(true);

    socketA.close();
    socketB.close();
  });

  it("broadcasts presence:update online:false when a user disconnects", async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();

    const socketA = await connectSocket(userA.id, TEST_PORT);
    const socketB = await connectSocket(userB.id, TEST_PORT);

    // Drain the initial online:true event from B's connection before
    // listening for the disconnect one, so we don't resolve on the wrong event.
    await new Promise((resolve) => socketA.once("presence:update", resolve));

    const disconnectEvent = new Promise((resolve) => {
      socketA.on("presence:update", (payload) => {
        if (payload.online === false) resolve(payload);
      });
    });

    socketB.close();

    const event = await disconnectEvent;
    expect(event.userId).toBe(userB.id);
    expect(event.online).toBe(false);

    socketA.close();
  });
});
