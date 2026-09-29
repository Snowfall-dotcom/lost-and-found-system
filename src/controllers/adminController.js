const Report = require("../models/Report");
const Claim = require("../models/Claim");
const User = require("../models/User");
const AdminLog = require("../models/AdminLog");
const notify = require("../utils/notify");
const asyncHandler = require("../utils/asyncHandler");

function logAction({ adminId, action, targetType, targetId, reason }) {
  return AdminLog.create({ adminId, action, targetType, targetId, reason: reason || "" });
}

// GET /api/admin/dashboard — overview stats (5.5.1)
const getDashboard = asyncHandler(async (req, res) => {
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const [openLost, openFound, pendingClaims, resolvedThisWeek, needsReview, flagged] = await Promise.all([
    Report.countDocuments({ type: "lost", status: { $in: ["open", "pending_claim"] }, moderationStatus: "published" }),
    Report.countDocuments({ type: "found", status: { $in: ["open", "pending_claim"] }, moderationStatus: "published" }),
    Claim.countDocuments({ status: "pending" }),
    Report.countDocuments({ status: "resolved", updatedAt: { $gte: since } }),
    Report.countDocuments({ moderationStatus: "pending_review" }),
    Report.countDocuments({ moderationStatus: "flagged" }),
  ]);

  res.json({
    stats: { openLostReports: openLost, openFoundReports: openFound, pendingClaims, resolvedThisWeek },
    queues: { needsReview, awaitingRelease: pendingClaims, flagged },
  });
});

// GET /api/admin/reports — moderation list (5.5.3)
const listReportsForModeration = asyncHandler(async (req, res) => {
  const { status, category, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.moderationStatus = status;
  if (category) filter.category = category;

  const skip = (Number(page) - 1) * Number(limit);
  const [reports, total] = await Promise.all([
    Report.find(filter)
      .populate("reporterId", "name program year")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Report.countDocuments(filter),
  ]);

  res.json({ reports, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } });
});

// PATCH /api/admin/reports/:id — publish / flag / remove / edit a report
const moderateReport = asyncHandler(async (req, res) => {
  const { action, reason, ...edits } = req.body; // action: 'publish' | 'flag' | 'remove' | 'edit'

  const report = await Report.findById(req.params.id);
  if (!report) return res.status(404).json({ message: "Report not found" });

  if (action === "publish") {
    report.moderationStatus = "published";
    await logAction({ adminId: req.user._id, action: "publish_report", targetType: "report", targetId: report._id, reason });
  } else if (action === "flag") {
    report.moderationStatus = "flagged";
    report.flagReason = reason || "";
    await logAction({ adminId: req.user._id, action: "flag_report", targetType: "report", targetId: report._id, reason });
  } else if (action === "remove") {
    report.moderationStatus = "removed";
    await logAction({ adminId: req.user._id, action: "remove_report", targetType: "report", targetId: report._id, reason });
  } else if (action === "edit") {
    const editable = ["title", "category", "description", "location", "date"];
    editable.forEach((field) => {
      if (edits[field] !== undefined) report[field] = edits[field];
    });
    await logAction({ adminId: req.user._id, action: "edit_report", targetType: "report", targetId: report._id, reason });
  } else {
    return res.status(400).json({ message: "action must be one of: publish, flag, remove, edit" });
  }

  await report.save();
  res.json({ report });
});

// GET /api/admin/claims — claim approval queue (5.5.2)
const listPendingClaims = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [claims, total] = await Promise.all([
    Claim.find({ status: "pending" })
      .populate("reportId", "title photos verificationQuestions")
      .populate("claimantId", "name program year")
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(Number(limit)),
    Claim.countDocuments({ status: "pending" }),
  ]);

  res.json({ claims, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } });
});

// PATCH /api/admin/claims/:id — admin override approve/reject a claim
const reviewClaimAsAdmin = asyncHandler(async (req, res) => {
  const { decision, reason } = req.body;
  if (!["approved", "rejected"].includes(decision)) {
    return res.status(400).json({ message: "decision must be 'approved' or 'rejected'" });
  }

  const claim = await Claim.findById(req.params.id).populate("reportId");
  if (!claim) return res.status(404).json({ message: "Claim not found" });
  if (claim.status !== "pending") {
    return res.status(409).json({ message: "This claim has already been reviewed" });
  }

  claim.status = decision;
  claim.reviewedBy = req.user._id;
  claim.reviewReason = reason || "";
  claim.reviewedAt = new Date();
  await claim.save();

  const report = claim.reportId;
  if (decision === "approved") {
    report.status = "resolved";
    await report.save();
    await User.findByIdAndUpdate(report.reporterId, { $inc: { returnedCount: 1 } });
  } else {
    const otherPending = await Claim.countDocuments({ reportId: report._id, status: "pending" });
    if (otherPending === 0) {
      report.status = "open";
      await report.save();
    }
  }

  await logAction({
    adminId: req.user._id,
    action: decision === "approved" ? "approve_claim" : "reject_claim",
    targetType: "claim",
    targetId: claim._id,
    reason,
  });

  await notify({
    userId: claim.claimantId,
    type: decision === "approved" ? "claim_approved" : "claim_rejected",
    message:
      decision === "approved"
        ? `Your claim on "${report.title}" was approved by an admin.`
        : `Your claim on "${report.title}" was rejected.${reason ? " Reason: " + reason : ""}`,
    reportId: report._id,
    claimId: claim._id,
  });

  res.json({ claim });
});

// GET /api/admin/users — user management (5.5.4)
const listUsers = asyncHandler(async (req, res) => {
  const { q, status, role, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (role) filter.role = role;
  if (q) {
    filter.$or = [{ name: new RegExp(q, "i") }, { studentId: new RegExp(q, "i") }];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    User.countDocuments(filter),
  ]);

  res.json({
    users: users.map((u) => u.toPublicProfile()),
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
  });
});

// PATCH /api/admin/users/:id — suspend / activate / promote a user
const updateUserStatus = asyncHandler(async (req, res) => {
  const { action, reason } = req.body; // action: 'suspend' | 'activate' | 'promote'

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  if (action === "suspend") {
    user.status = "suspended";
    await logAction({ adminId: req.user._id, action: "suspend_user", targetType: "user", targetId: user._id, reason });
  } else if (action === "activate") {
    user.status = "active";
    await logAction({ adminId: req.user._id, action: "activate_user", targetType: "user", targetId: user._id, reason });
  } else if (action === "promote") {
    user.role = "admin";
    await logAction({ adminId: req.user._id, action: "promote_user", targetType: "user", targetId: user._id, reason });
  } else {
    return res.status(400).json({ message: "action must be one of: suspend, activate, promote" });
  }

  await user.save();
  res.json({ user: user.toPublicProfile() });
});

// GET /api/admin/logs — audit log (5.5.5)
const getAuditLog = asyncHandler(async (req, res) => {
  const { from, to, page = 1, limit = 30 } = req.query;
  const filter = {};
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [logs, total] = await Promise.all([
    AdminLog.find(filter)
      .populate("adminId", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    AdminLog.countDocuments(filter),
  ]);

  res.json({ logs, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } });
});

module.exports = {
  getDashboard,
  listReportsForModeration,
  moderateReport,
  listPendingClaims,
  reviewClaimAsAdmin,
  listUsers,
  updateUserStatus,
  getAuditLog,
};
