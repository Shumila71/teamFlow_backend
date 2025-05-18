const { pool } = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const register = async (req, res) => {
  const { username, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username",
      [username, hash]
    );
    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "24h" });
    res.status(201).json({ token, userId: user.id, username: user.username });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') { // уникальный ключ - username уже существует
      res.status(400).json({ error: "Данный логин занят" });
    } else {
      res.status(500).json({ error: "Ошибка на сервере" });
    }
  }
};

const login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const userRes = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    const user = userRes.rows[0];

    if (!user) {
      return res.status(401).json({ error: "Такого пользователя не существует" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Неверные логин или пароль (на самом деле только пароль)" });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "24h" });
    res.json({ token, username: user.username, userId: user.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка на сервере" });
  }
};

module.exports = { register, login };
