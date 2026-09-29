const express = require("express");
const { getPublicProfile, updateMe } = require("../controllers/userController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.patch("/me", protect, updateMe);
router.get("/:id", getPublicProfile);

module.exports = router;
