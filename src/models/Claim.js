const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
  },
  { _id: false }
);

const claimSchema = new mongoose.Schema(
  {
    reportId: { type: mongoose.Schema.Types.ObjectId, ref: "Report", required: true },
    claimantId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    answers: [answerSchema],
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewReason: { type: String, default: "" },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

// One student can't spam multiple pending claims on the same report
claimSchema.index({ reportId: 1, claimantId: 1 });

module.exports = mongoose.model("Claim", claimSchema);
