const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const { pool } = require("./db");
const io = new Server(server, {
  cors: {
    origin: "https://app.example.com",
  }
});

const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");


const { initDB } = require("./db");
const Message = require("./models/Message");

require("dotenv").config();
app.use(cors());
app.use(express.json());

initDB();

app.use("/api/auth", authRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/messages", messageRoutes);



io.on("connection", (socket) => {
  console.log("Новый пользователь подключился:", socket.id);

  socket.on("joinChat", (chatId) => {
    socket.join(`chat_${chatId}`);
    console.log(`Пользователь вошёл в чат ${chatId}`);
  });

  socket.on("sendMessage", async (data) => {
    const { chatId, senderId, text, replyTo } = data;
    try {
      // Сохраняем сообщение в БД
      const savedMessage = await Message.send(chatId, senderId, text, replyTo);

      const userRes = await pool.query("SELECT username FROM users WHERE id = $1", [senderId]);
      const username = userRes.rows[0]?.username || "Unknown";

      const messageWithUser = { ...savedMessage, username };

      // Рассылаем новое сообщение с ID и временем всем в комнате
      io.to(`chat_${chatId}`).emit("newMessage", messageWithUser);
    } catch (err) {
      console.error("Ошибка при сохранении сообщения:", err);
      socket.emit("errorMessage", "Ошибка при отправке сообщения");
    }
  });

  socket.on("disconnect", () => {
    console.log("Пользователь отключился:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));