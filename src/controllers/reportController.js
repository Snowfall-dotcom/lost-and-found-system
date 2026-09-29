const Report = require("../models/Report");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

// GET /api/reports — browse/search/filter (5.2 Search & Discovery)
const listReports = asyncHandler(async (req, res) => {
  const { q, type, category, location, status, page = 1, limit = 20 } = req.query;

  const filter = { moderationStatus: "published" };
  if (type) filter.type = type;
  if (category) filter.category = category;
  if (location) filter.location = new RegExp(location, "i");
  if (status) filter.status = status;
  if (q) filter.$text = { $search: q };

  const skip = (Number(page) - 1) * Number(limit);

  const [reports, total] = await Promise.all([
    Report.find(filter)
      .populate("reporterId", "name avatar program year")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Report.countDocuments(filter),
  ]);

  res.json({
    reports,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
  });
});

// POST /api/reports — report a lost or found item (5.1)
const createReport = asyncHandler(async (req, res) => {
  const { type, title, category, description, location, date, verificationQuestions } = req.body;

  if (!type || !title || !category || !description || !location || !date) {
    return res.status(400).json({ message: "type, title, category, description, location, and date are required" });
  }
  if (!["lost", "found"].includes(type)) {
    return res.status(400).json({ message: "type must be 'lost' or 'found'" });
  }

  const photos = (req.files || []).map((f) => `/uploads/${f.filename}`);

  const report = await Report.create({
    type,
    title,
    category,
    description,
    location,
    date,
    photos,
    reporterId: req.user._id,
    // Only found items use verification questions to screen claimants
    verificationQuestions: type === "found" ? verificationQuestions || [] : [],
  });

  await User.findByIdAndUpdate(req.user._id, { $inc: { reportsCount: 1 } });

  res.status(201).json({ report });
});

// GET /api/reports/:id
const getReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id).populate("reporterId", "name avatar program year");
  if (!report) return res.status(404).json({ message: "Report not found" });
  res.json({ report });
});

// PATCH /api/reports/:id — owner or admin only
const updateReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) return res.status(404).json({ message: "Report not found" });

  const isOwner = report.reporterId.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "admin") {
    return res.status(403).json({ message: "Not authorized to edit this report" });
  }

  const editable = ["title", "category", "description", "location", "date", "status", "verificationQuestions"];
  editable.forEach((field) => {
    if (req.body[field] !== undefined) report[field] = req.body[field];
  });

  await report.save();
  res.json({ report });
});

// DELETE /api/reports/:id — owner or admin only
const deleteReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) return res.status(404).json({ message: "Report not found" });

  const isOwner = report.reporterId.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "admin") {
    return res.status(403).json({ message: "Not authorized to delete this report" });
  }

  await report.deleteOne();
  res.json({ message: "Report deleted" });
});

module.exports = { listReports, createReport, getReport, updateReport, deleteReport };
