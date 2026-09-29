const User = require("../models/User");
const Report = require("../models/Report");
const asyncHandler = require("../utils/asyncHandler");

// GET /api/users/:id — public profile (5.8 Public Profiles)
const getPublicProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  const reports = await Report.find({
    reporterId: user._id,
    moderationStatus: { $ne: "removed" },
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .select("title type status photos createdAt");

  res.json({ profile: user.toPublicProfile(), reportHistory: reports });
});

// PATCH /api/users/me — update own profile
const updateMe = asyncHandler(async (req, res) => {
  const allowed = ["name", "program", "year", "avatar"];
  const updates = {};
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  res.json({ user: user.toPublicProfile() });
});

module.exports = { getPublicProfile, updateMe };
