const express = require("express");
const {
  startConversation,
  listConversations,
  getMessages,
  sendMessage,
} = require("../controllers/conversationController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/", protect, startConversation);
router.get("/", protect, listConversations);
router.get("/:id/messages", protect, getMessages);
router.post("/:id/messages", protect, sendMessage);

module.exports = router;
