const Claim = require("../models/Claim");
const Report = require("../models/Report");
const User = require("../models/User");
const notify = require("../utils/notify");
const asyncHandler = require("../utils/asyncHandler");

// POST /api/claims — submit a claim on a found-item report (5.3)
const createClaim = asyncHandler(async (req, res) => {
  const { reportId, answers } = req.body;

  if (!reportId || !Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ message: "reportId and answers[] are required" });
  }

  const report = await Report.findById(reportId);
  if (!report) return res.status(404).json({ message: "Report not found" });
  if (report.type !== "found") {
    return res.status(400).json({ message: "Claims can only be filed on found-item reports" });
  }
  if (report.reporterId.toString() === req.user._id.toString()) {
    return res.status(400).json({ message: "You can't claim your own report" });
  }
  if (report.status === "resolved" || report.status === "closed") {
    return res.status(409).json({ message: "This item has already been resolved" });
  }

  const existingPending = await Claim.findOne({ reportId, claimantId: req.user._id, status: "pending" });
  if (existingPending) {
    return res.status(409).json({ message: "You already have a pending claim on this item" });
  }

  const claim = await Claim.create({
    reportId,
    claimantId: req.user._id,
    answers,
  });

  report.status = "pending_claim";
  await report.save();

  await notify({
    userId: report.reporterId,
    type: "claim_submitted",
    message: `${req.user.name} submitted a claim on your item "${report.title}".`,
    reportId: report._id,
    claimId: claim._id,
  });

  res.status(201).json({ claim });
});

// GET /api/claims/mine — current user's own claims (My Claims screen)
const getMyClaims = asyncHandler(async (req, res) => {
  const claims = await Claim.find({ claimantId: req.user._id })
    .populate("reportId", "title photos status type")
    .sort({ createdAt: -1 });
  res.json({ claims });
});

// GET /api/claims/:id
const getClaim = asyncHandler(async (req, res) => {
  const claim = await Claim.findById(req.params.id)
    .populate("reportId")
    .populate("claimantId", "name avatar program year");
  if (!claim) return res.status(404).json({ message: "Claim not found" });

  const report = claim.reportId;
  const isClaimant = claim.claimantId._id.toString() === req.user._id.toString();
  const isFinder = report.reporterId.toString() === req.user._id.toString();
  if (!isClaimant && !isFinder && req.user.role !== "admin") {
    return res.status(403).json({ message: "Not authorized to view this claim" });
  }

  res.json({ claim });
});

// PATCH /api/claims/:id/verify — approve/reject a claim (finder or admin)
const verifyClaim = asyncHandler(async (req, res) => {
  const { decision, reason } = req.body; // decision: 'approved' | 'rejected'

  if (!["approved", "rejected"].includes(decision)) {
    return res.status(400).json({ message: "decision must be 'approved' or 'rejected'" });
  }

  const claim = await Claim.findById(req.params.id).populate("reportId");
  if (!claim) return res.status(404).json({ message: "Claim not found" });
  if (claim.status !== "pending") {
    return res.status(409).json({ message: "This claim has already been reviewed" });
  }

  const report = claim.reportId;
  const isFinder = report.reporterId.toString() === req.user._id.toString();
  if (!isFinder && req.user.role !== "admin") {
    return res.status(403).json({ message: "Only the finder or an admin can review this claim" });
  }

  claim.status = decision;
  claim.reviewedBy = req.user._id;
  claim.reviewReason = reason || "";
  claim.reviewedAt = new Date();
  await claim.save();

  if (decision === "approved") {
    report.status = "resolved";
    await report.save();
    await User.findByIdAndUpdate(report.reporterId, { $inc: { returnedCount: 1 } });

    // Any other pending claims on this item are now moot
    await Claim.updateMany(
      { reportId: report._id, status: "pending", _id: { $ne: claim._id } },
      { status: "rejected", reviewReason: "Item already released to another claimant", reviewedBy: req.user._id, reviewedAt: new Date() }
    );
  } else {
    // Reopen the report if no other pending claims remain
    const otherPending = await Claim.countDocuments({ reportId: report._id, status: "pending" });
    if (otherPending === 0) {
      report.status = "open";
      await report.save();
    }
  }

  await notify({
    userId: claim.claimantId,
    type: decision === "approved" ? "claim_approved" : "claim_rejected",
    message:
      decision === "approved"
        ? `Your claim on "${report.title}" was approved. Coordinate the handoff with the finder.`
        : `Your claim on "${report.title}" was rejected.${reason ? " Reason: " + reason : ""}`,
    reportId: report._id,
    claimId: claim._id,
  });

  res.json({ claim });
});

module.exports = { createClaim, getMyClaims, getClaim, verifyClaim };
