const mongoose = require("mongoose");

const adminLogSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: {
      type: String,
      enum: [
        "approve_claim",
        "reject_claim",
        "publish_report",
        "flag_report",
        "remove_report",
        "edit_report",
        "suspend_user",
        "activate_user",
        "promote_user",
      ],
      required: true,
    },
    targetType: { type: String, enum: ["report", "claim", "user"], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    reason: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdminLog", adminLogSchema);
