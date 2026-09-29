const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const asyncHandler = require("../utils/asyncHandler");

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, studentId, email, password, program, year } = req.body;

  if (!name || !studentId || !email || !password) {
    return res.status(400).json({ message: "Name, student ID, email, and password are required" });
  }

  const existing = await User.findOne({ $or: [{ email }, { studentId }] });
  if (existing) {
    return res.status(409).json({ message: "An account with that email or student ID already exists" });
  }

  const user = await User.create({ name, studentId, email, password, program, year });

  res.status(201).json({
    token: generateToken(user),
    user: user.toPublicProfile(),
  });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  if (user.status === "suspended") {
    return res.status(403).json({ message: "This account has been suspended" });
  }

  res.json({
    token: generateToken(user),
    user: user.toPublicProfile(),
  });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toPublicProfile() });
});

module.exports = { register, login, getMe };
