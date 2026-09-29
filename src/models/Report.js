const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["lost", "found"], required: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    photos: [{ type: String }],
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Verification questions only apply to "found" reports — the claimant
    // has to answer these correctly before a claim can be approved.
    verificationQuestions: [{ type: String, trim: true }],

    // Admin moderation state (5.5.3 Report Moderation)
    moderationStatus: {
      type: String,
      enum: ["pending_review", "published", "flagged", "removed"],
      default: "published",
    },
    flagReason: { type: String, default: "" },

    // Workflow status (5.1 Item Reporting)
    status: {
      type: String,
      enum: ["open", "pending_claim", "resolved", "closed"],
      default: "open",
    },
  },
  { timestamps: true }
);

reportSchema.index({ title: "text", description: "text" });

module.exports = mongoose.model("Report", reportSchema);
