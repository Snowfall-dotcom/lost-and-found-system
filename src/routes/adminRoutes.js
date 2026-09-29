const express = require("express");
const {
  getDashboard,
  listReportsForModeration,
  moderateReport,
  listPendingClaims,
  reviewClaimAsAdmin,
  listUsers,
  updateUserStatus,
  getAuditLog,
} = require("../controllers/adminController");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

// Every route below is admin-only
router.use(protect, adminOnly);

router.get("/dashboard", getDashboard);

router.get("/reports", listReportsForModeration);
router.patch("/reports/:id", moderateReport);

router.get("/claims", listPendingClaims);
router.patch("/claims/:id", reviewClaimAsAdmin);

router.get("/users", listUsers);
router.patch("/users/:id", updateUserStatus);

router.get("/logs", getAuditLog);

module.exports = router;
