const { pool } = require("../db");

const Message = {
  async send(chatId, senderId, text, replyTo = null) {
    const result = await pool.query(
      "INSERT INTO messages (chat_id, sender_id, text, reply_to) VALUES ($1, $2, $3, $4) RETURNING *",
      [chatId, senderId, text, replyTo]
    );
    return result.rows[0];
  },

  async getChatMessages(chatId) {
    const result = await pool.query(
      `SELECT 
        m.id,
        m.chat_id,
        m.sender_id,
        m.text,
        m.reply_to,
        m.created_at AS timestamp,
        u.username,
        cu.position_tag 
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      JOIN chat_users cu ON m.sender_id = cu.user_id AND m.chat_id = cu.chat_id
      WHERE m.chat_id = $1
      ORDER BY m.created_at ASC`,
      [chatId]
    );
    return result.rows;
  },
};

module.exports = Message;
