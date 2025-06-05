const { pool } = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Получить или создать пользователя
async function getOrCreateUser(username, password) {
  const check = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
  
  if (check.rows.length > 0) {
    console.log(`✅ Пользователь ${username} уже существует (ID: ${check.rows[0].id})`);
    return check.rows[0].id;
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await pool.query(
    'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id',
    [username, hashedPassword]
  );
  console.log(`✅ Создан пользователь ${username} (ID: ${result.rows[0].id})`);
  return result.rows[0].id;
}

// Получить или создать чат
async function getOrCreateChat(name, creatorId) {
  const check = await pool.query('SELECT id FROM chats WHERE name = $1', [name]);
  
  if (check.rows.length > 0) {
    console.log(`✅ Чат "${name}" уже существует (ID: ${check.rows[0].id})`);
    return check.rows[0].id;
  }
  
  const result = await pool.query(
    'INSERT INTO chats (name, creator_id) VALUES ($1, $2) RETURNING id',
    [name, creatorId]
  );
  console.log(`✅ Создан чат "${name}" (ID: ${result.rows[0].id})`);
  return result.rows[0].id;
}

// Добавить пользователя в чат если его там нет
async function addUserToChat(chatId, userId, role, positionTag) {
  const check = await pool.query(
    'SELECT * FROM chat_users WHERE chat_id = $1 AND user_id = $2',
    [chatId, userId]
  );
  
  if (check.rows.length === 0) {
    await pool.query(
      'INSERT INTO chat_users (chat_id, user_id, role, position_tag) VALUES ($1, $2, $3, $4)',
      [chatId, userId, role, positionTag]
    );
    console.log(`✅ Пользователь (ID: ${userId}) добавлен в чат как ${role} с тегом "${positionTag}"`);
  } else {
    console.log(`✅ Пользователь (ID: ${userId}) уже участник чата`);
  }
}

// Добавить тестовые сообщения если их нет
async function addTestMessages(chatId, adminId, userId) {
  const check = await pool.query('SELECT COUNT(*) FROM messages WHERE chat_id = $1', [chatId]);
  const messageCount = parseInt(check.rows[0].count);
  
  if (messageCount === 0) {
    await pool.query(
      'INSERT INTO messages (chat_id, sender_id, text) VALUES ($1, $2, $3)',
      [chatId, adminId, 'Привет! Добро пожаловать в чат!']
    );
    await pool.query(
      'INSERT INTO messages (chat_id, sender_id, text) VALUES ($1, $2, $3)',
      [chatId, userId, 'Спасибо! Рад быть здесь!']
    );
    console.log('✅ Добавлены тестовые сообщения');
  } else {
    console.log(`✅ В чате уже есть ${messageCount} сообщений`);
  }
}

async function seedTestData() {
  try {
    console.log('🌱 Проверяем и создаем тестовые данные...');

    // Получаем или создаем тестовых пользователей
    let adminId = await getOrCreateUser('admin', 'admin123');
    let userId = await getOrCreateUser('user', 'user123');

    // Получаем или создаем тестовый чат
    let chatId = await getOrCreateChat('Тестовый чат', adminId);

    // Добавляем пользователей в чат если их там нет
    await addUserToChat(chatId, adminId, 'admin', 'Руководитель');
    await addUserToChat(chatId, userId, 'member', 'Сотрудник');

    // Добавляем тестовые сообщения если их нет
    await addTestMessages(chatId, adminId, userId);

    console.log('✅ Тестовые данные готовы!');
  } catch (err) {
    console.error('❌ Ошибка при добавлении тестовых данных:', err);
  }
}

module.exports = { seedTestData }; 