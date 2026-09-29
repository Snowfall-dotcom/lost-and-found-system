const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    participantIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    reportId: { type: mongoose.Schema.Types.ObjectId, ref: "Report" },
    // Set once a formal claim is filed on this thread; left null for an
    // early "is this yours?" message started straight from a profile (5.7/5.8).
    claimId: { type: mongoose.Schema.Types.ObjectId, ref: "Claim", default: null },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Conversation", conversationSchema);
