const { pool } = require('../db');

// Создание чата
exports.createChat = async (req, res) => {
  const { name } = req.body;
  const userId = req.user.userId;

  try {
    const chatResult = await pool.query(
      'INSERT INTO chats (name, creator_id) VALUES ($1, $2) RETURNING *',
      [name, userId]
    );
    const chat = chatResult.rows[0];

    // добавим создателя в chat_users с ролью admin
    await pool.query(
      'INSERT INTO chat_users (chat_id, user_id, role) VALUES ($1, $2, $3)',
      [chat.id, userId, 'admin']
    );

    res.status(201).json(chat);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при создании чата' });
  }
};

// проверка админки
const isUserAdmin = async (chatId, userId) => {
  const res = await pool.query(
    'SELECT role FROM chat_users WHERE chat_id = $1 AND user_id = $2',
    [chatId, userId]
  );
  return res.rows.length > 0 && res.rows[0].role === 'admin';
};

// админка выдача
exports.assignRole = async (req, res) => {
  const currentUserId = req.user.userId;
  const { chatId } = req.params;
  const { userId, role } = req.body;

  try {
    const isAdmin = await isUserAdmin(chatId, currentUserId);
    if (!isAdmin) return res.status(403).json({ error: 'Недостаточно прав' });

    // чекаем на то что он в чате
    const userInChat = await pool.query(
      'SELECT * FROM chat_users WHERE chat_id = $1 AND user_id = $2',
      [chatId, userId]
    );

    if (userInChat.rows.length === 0) {
      await pool.query(
        'INSERT INTO chat_users (chat_id, user_id, role) VALUES ($1, $2, $3)',
        [chatId, userId, role]
      );
    } else {
      // обновляем роль
      await pool.query(
        'UPDATE chat_users SET role = $1 WHERE chat_id = $2 AND user_id = $3',
        [role, chatId, userId]
      );
    }

    res.json({ message: 'Роль назначена' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при назначении роли' });
  }
};

// лепим тег
exports.assignPositionTag = async (req, res) => {
  const currentUserId = req.user.userId;
  const { chatId } = req.params;
  const { userId, positionTag } = req.body;

  try {
    const isAdmin = await isUserAdmin(chatId, currentUserId);
    if (!isAdmin) return res.status(403).json({ error: 'Недостаточно прав' });

    await pool.query(
      'UPDATE chat_users SET position_tag = $1 WHERE chat_id = $2 AND user_id = $3',
      [positionTag, chatId, userId]
    );

    res.json({ message: 'Тег должности назначен' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при назначении тега должности' });
  }
};

// Добавление пользователя в чат
exports.addUserToChat = async (req, res) => {
  try {
    const { chatId, username } = req.body;

    if (!chatId || !username) {
      return res.status(400).json({ message: "chatId и username обязательны" });
    }

    const userResult = await pool.query("SELECT id FROM users WHERE username = $1", [username]);
    if (userResult.rowCount === 0) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    const userId = userResult.rows[0].id;

    const exists = await pool.query(
      "SELECT * FROM chat_users WHERE chat_id = $1 AND user_id = $2",
      [chatId, userId]
    );

    if (exists.rowCount > 0) {
      return res.status(400).json({ message: "Пользователь уже в чате" });
    }

    await pool.query(
      "INSERT INTO chat_users (chat_id, user_id, role) VALUES ($1, $2, $3)",
      [chatId, userId, "member"]
    );

    const usersInChat = await pool.query(
      `SELECT u.id as user_id, u.username, cu.role, cu.position_tag
       FROM users u
       JOIN chat_users cu ON u.id = cu.user_id
       WHERE cu.chat_id = $1`,
      [chatId]
    );

    res.json(usersInChat.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Ошибка сервера при добавлении пользователя в чат" });
  }
};
//список юзеров в чате
exports.getChatUsers = async (req, res) => {
  const { chatId } = req.params;

  try {
    const result = await pool.query(
      `SELECT u.id as user_id, u.username, cu.role, cu.position_tag
       FROM users u
       JOIN chat_users cu ON u.id = cu.user_id
       WHERE cu.chat_id = $1`,
      [chatId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка при получении участников чата' });
  }
};
//список чатов юзера
exports.getUserChats = async (req, res) => {
  const userId = req.user.userId;

  try {
    const result = await pool.query(
      `SELECT c.id, c.name, c.creator_id
       FROM chats c
       JOIN chat_users cu ON c.id = cu.chat_id
       WHERE cu.user_id = $1`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при получении чатов пользователя' });
  }
};

// удаление чата
exports.deleteChat = async (req, res) => {
  const chatId = req.params.chatId;
  const userId = req.user.userId;

  try {
    const isAdmin = await isUserAdmin(chatId, userId);
    if (!isAdmin) return res.status(403).json({ error: "Недостаточно прав" });

    await pool.query("DELETE FROM chat_users WHERE chat_id = $1", [chatId]);
    await pool.query("DELETE FROM messages WHERE chat_id = $1", [chatId]);
    await pool.query("DELETE FROM chats WHERE id = $1", [chatId]);

    res.json({ message: "Чат удалён" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка при удалении чата" });
  }
};

// удаление пользователя из чата 
exports.removeUserFromChat = async (req, res) => {
  const currentUserId = req.user.userId;
  const { chatId, userId } = req.params;

  try {
    const isAdmin = await isUserAdmin(chatId, currentUserId);
    if (!isAdmin) return res.status(403).json({ error: "Недостаточно прав" });

    await pool.query(
      "DELETE FROM chat_users WHERE chat_id = $1 AND user_id = $2",
      [chatId, userId]
    );

    res.json({ message: "Пользователь удалён из чата" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка при удалении пользователя из чата" });
  }
};

// снятие админки
exports.revokeAdmin = async (req, res) => {
  const currentUserId = req.user.userId;
  const { chatId, userId } = req.params;

  try {
    const isAdmin = await isUserAdmin(chatId, currentUserId);
    if (!isAdmin) return res.status(403).json({ error: "Недостаточно прав" });

    await pool.query(
      "UPDATE chat_users SET role = 'member' WHERE chat_id = $1 AND user_id = $2",
      [chatId, userId]
    );

    res.json({ message: "Роль администратора снята" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка при снятии прав администратора" });
  }
};