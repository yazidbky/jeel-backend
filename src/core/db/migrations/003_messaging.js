export default {
  name: "003_messaging",
  up: `
    CREATE TABLE IF NOT EXISTS conversations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type ENUM('direct', 'group') NOT NULL DEFAULT 'direct',
      name VARCHAR(255) DEFAULT NULL,
      created_by INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      last_message_at TIMESTAMP NULL DEFAULT NULL,
      last_message_preview VARCHAR(255) DEFAULT NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      conversation_id INT NOT NULL,
      sender_id INT NOT NULL,
      content TEXT NOT NULL,
      message_type ENUM('text', 'system') NOT NULL DEFAULT 'text',
      reply_to_message_id BIGINT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      edited_at TIMESTAMP NULL DEFAULT NULL,
      deleted_at TIMESTAMP NULL DEFAULT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reply_to_message_id) REFERENCES messages(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS conversation_participants (
      id INT AUTO_INCREMENT PRIMARY KEY,
      conversation_id INT NOT NULL,
      user_id INT NOT NULL,
      role ENUM('owner', 'member') NOT NULL DEFAULT 'member',
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      left_at TIMESTAMP NULL DEFAULT NULL,
      last_read_message_id BIGINT DEFAULT NULL,
      muted BOOLEAN NOT NULL DEFAULT FALSE,
      UNIQUE KEY ux_conversation_user (conversation_id, user_id),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (last_read_message_id) REFERENCES messages(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS message_attachments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      message_id BIGINT NOT NULL,
      url VARCHAR(1000) NOT NULL,
      type VARCHAR(50) NOT NULL,
      file_size BIGINT DEFAULT NULL,
      mime_type VARCHAR(255) DEFAULT NULL,
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS message_status (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      message_id BIGINT NOT NULL,
      user_id INT NOT NULL,
      status ENUM('sent', 'delivered', 'read') NOT NULL DEFAULT 'sent',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY ux_message_user_status (message_id, user_id),
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id_desc ON messages(conversation_id, id DESC);
    CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id, conversation_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at);
    CREATE INDEX IF NOT EXISTS idx_message_status_user ON message_status(user_id, status);
  `,
};