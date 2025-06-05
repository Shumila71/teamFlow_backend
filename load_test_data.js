const { pool } = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

async function seedTestData() {
  try {
    console.log('🌱 Проверяем наличие тестовых данных...');

    // Проверяем существование тестовых пользователей
    const adminCheck = await pool.query('SELECT id FROM users WHERE username = $1', ['admin']);
    const userCheck = await pool.query('SELECT id FROM users WHERE username = $1', ['user']);

    if (adminCheck.rows.length > 0 && userCheck.rows.length > 0) {
      console.log('✅ Тестовые данные уже существуют, пропускаем создание');
      return;
    }

    console.log('🌱 Начинаем добавление тестовых данных...');

    // Создаем первого пользователя (админ)
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminResult = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id',
      ['admin', adminPassword]
    );
    const adminId = adminResult.rows[0].id;
    console.log('✅ Создан пользователь admin');

    // Создаем второго пользователя
    const userPassword = await bcrypt.hash('user123', 10);
    const userResult = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id',
      ['user', userPassword]
    );
    const userId = userResult.rows[0].id;
    console.log('✅ Создан пользователь user');

    // Создаем чат
    const chatResult = await pool.query(
      'INSERT INTO chats (name, creator_id) VALUES ($1, $2) RETURNING id',
      ['Тестовый чат', adminId]
    );
    const chatId = chatResult.rows[0].id;
    console.log('✅ Создан чат');

    // Добавляем пользователей в чат с ролями и тегами
    await pool.query(
      'INSERT INTO chat_users (chat_id, user_id, role, position_tag) VALUES ($1, $2, $3, $4)',
      [chatId, adminId, 'admin', 'Руководитель']
    );
    await pool.query(
      'INSERT INTO chat_users (chat_id, user_id, role, position_tag) VALUES ($1, $2, $3, $4)',
      [chatId, userId, 'member', 'Сотрудник']
    );
    console.log('✅ Пользователи добавлены в чат с ролями и тегами');

    // Добавляем сообщения
    await pool.query(
      'INSERT INTO messages (chat_id, sender_id, text) VALUES ($1, $2, $3)',
      [chatId, adminId, 'Привет! Добро пожаловать в чат!']
    );
    await pool.query(
      'INSERT INTO messages (chat_id, sender_id, text) VALUES ($1, $2, $3)',
      [chatId, userId, 'Спасибо! Рад быть здесь!']
    );
    console.log('✅ Добавлены тестовые сообщения');

    console.log('✅ Тестовые данные успешно добавлены!');
  } catch (err) {
    console.error('❌ Ошибка при добавлении тестовых данных:', err);
  }
}

module.exports = { seedTestData }; 