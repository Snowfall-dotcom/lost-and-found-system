const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    studentId: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    program: { type: String, trim: true },
    year: { type: String, trim: true },
    avatar: { type: String, default: "" },
    role: { type: String, enum: ["student", "admin"], default: "student" },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    reportsCount: { type: Number, default: 0 },
    returnedCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toPublicProfile = function toPublicProfile() {
  return {
    id: this._id,
    name: this.name,
    studentId: this.studentId,
    program: this.program,
    year: this.year,
    avatar: this.avatar,
    role: this.role,
    status: this.status,
    reportsCount: this.reportsCount,
    returnedCount: this.returnedCount,
    memberSince: this.createdAt,
  };
};

module.exports = mongoose.model("User", userSchema);
