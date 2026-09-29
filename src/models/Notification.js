const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["claim_submitted", "claim_approved", "claim_rejected", "new_message", "report_flagged", "match_suggestion"],
      required: true,
    },
    message: { type: String, required: true },
    reportId: { type: mongoose.Schema.Types.ObjectId, ref: "Report" },
    claimId: { type: mongoose.Schema.Types.ObjectId, ref: "Claim" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
