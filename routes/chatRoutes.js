const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const checkRole = require('../middleware/roleMiddleware');
const chatController = require('../controllers/chatController');

router.get("/:chatId/users", auth, chatController.getChatUsers);
router.get("/", auth, chatController.getUserChats);
router.post("/", auth, chatController.createChat);
router.post("/create", auth, chatController.createChat);
router.post("/add-user", auth, checkRole("admin"), chatController.addUserToChat);
router.post("/:chatId/assign-role", auth, chatController.assignRole);
router.post("/:chatId/assign-position-tag", auth, chatController.assignPositionTag);

router.delete("/:chatId", auth, chatController.deleteChat);
router.delete("/:chatId/users/:userId", auth, chatController.removeUserFromChat);
router.post("/:chatId/revoke-admin/:userId", auth, chatController.revokeAdmin);

module.exports = router;
