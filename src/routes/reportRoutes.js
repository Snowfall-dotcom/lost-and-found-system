const express = require("express");
const {
  listReports,
  createReport,
  getReport,
  updateReport,
  deleteReport,
} = require("../controllers/reportController");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

router.get("/", listReports);
router.post("/", protect, upload.array("photos", 5), createReport);
router.get("/:id", getReport);
router.patch("/:id", protect, updateReport);
router.delete("/:id", protect, deleteReport);

module.exports = router;
