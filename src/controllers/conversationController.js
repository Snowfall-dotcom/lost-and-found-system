const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const notify = require("../utils/notify");
const asyncHandler = require("../utils/asyncHandler");

// POST /api/conversations — start a chat from a profile or a listing (5.7/5.8)
// Reuses an existing conversation between the same two users on the same
// report instead of creating duplicates.
const startConversation = asyncHandler(async (req, res) => {
  const { recipientId, reportId, text } = req.body;

  if (!recipientId || !text) {
    return res.status(400).json({ message: "recipientId and an initial text are required" });
  }
  if (recipientId === req.user._id.toString()) {
    return res.status(400).json({ message: "You can't message yourself" });
  }

  let conversation = await Conversation.findOne({
    participantIds: { $all: [req.user._id, recipientId], $size: 2 },
    reportId: reportId || null,
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participantIds: [req.user._id, recipientId],
      reportId: reportId || undefined,
    });
  }

  const message = await Message.create({
    conversationId: conversation._id,
    senderId: req.user._id,
    text,
  });

  conversation.lastMessageAt = message.createdAt;
  await conversation.save();

  await notify({
    userId: recipientId,
    type: "new_message",
    message: `${req.user.name} sent you a message.`,
    reportId: reportId || undefined,
  });

  res.status(201).json({ conversation, message });
});

// GET /api/conversations — list the current user's conversations
const listConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({ participantIds: req.user._id })
    .populate("participantIds", "name avatar")
    .populate("reportId", "title photos")
    .sort({ lastMessageAt: -1 });
  res.json({ conversations });
});

// GET /api/conversations/:id/messages
const getMessages = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) return res.status(404).json({ message: "Conversation not found" });
  if (!conversation.participantIds.some((id) => id.toString() === req.user._id.toString())) {
    return res.status(403).json({ message: "Not authorized to view this conversation" });
  }

  const messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 });
  res.json({ conversation, messages });
});

// POST /api/conversations/:id/messages — reply within an existing thread
const sendMessage = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ message: "text is required" });

  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) return res.status(404).json({ message: "Conversation not found" });
  if (!conversation.participantIds.some((id) => id.toString() === req.user._id.toString())) {
    return res.status(403).json({ message: "Not authorized to message in this conversation" });
  }

  const message = await Message.create({ conversationId: conversation._id, senderId: req.user._id, text });
  conversation.lastMessageAt = message.createdAt;
  await conversation.save();

  const recipientId = conversation.participantIds.find((id) => id.toString() !== req.user._id.toString());
  await notify({ userId: recipientId, type: "new_message", message: `${req.user.name} sent you a message.` });

  res.status(201).json({ message });
});

module.exports = { startConversation, listConversations, getMessages, sendMessage };
