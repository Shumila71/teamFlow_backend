const { pool } = require('../db');

module.exports = (requiredRole) => {
  return async (req, res, next) => {
    const userId = req.user.userId;
    const chatId = req.params.chatId || req.body.chatId;

    if (!chatId) {
      return res.status(400).json({ message: 'Не передан chatId' });
    }

    try {
      const result = await pool.query(
        'SELECT role FROM chat_users WHERE chat_id = $1 AND user_id = $2',
        [chatId, userId]
      );

      const userRole = result.rows[0]?.role;

      if (!userRole || (requiredRole === 'admin' && userRole !== 'admin')) {
        return res.status(403).json({ message: 'Недостаточно прав' });
      }

      next();
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Ошибка проверки прав' });
    }
  };
};
