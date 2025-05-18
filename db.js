const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const checkIfTablesExist = async () => {
  const res = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema='public' AND table_name IN (
      'users', 'chats', 'chat_users', 'messages', 'user_roles'
    );
  `);
  return res.rows.map(r => r.table_name);
};

const initDB = async () => {
  try {
    const existingTables = await checkIfTablesExist();
    if (existingTables.length === 5) {
      console.log("Таблицы уже существуют. Пропускаем создание.");
      return;
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS chats (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS chat_users (
        chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'member',
        position_tag VARCHAR(100),
        PRIMARY KEY (chat_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
        sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        text TEXT NOT NULL,
        reply_to INTEGER REFERENCES messages(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_roles (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id),
        role_name VARCHAR(50) NOT NULL
      );
    `);

    console.log("✅ Таблицы успешно созданы");
  } catch (err) {
    console.error("❌ Ошибка при инициализации базы данных", err);
  }
};

module.exports = { pool, initDB };
