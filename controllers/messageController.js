const Message = require("../models/Message");

exports.sendMessage = async (req, res) => {
  const { chatId, text, replyTo } = req.body;
  const senderId = req.user.userId;
  const username = req.user.username;

  try {
    const message = await Message.send(chatId, senderId, text, replyTo, username);
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: "Ошибка отправки сообщения" });
  }
};

exports.getMessages = async (req, res) => {
  const chatId = req.params.chatId;
  try {
    const messages = await Message.getChatMessages(chatId);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Ошибка получения сообщений" });
  }
};
