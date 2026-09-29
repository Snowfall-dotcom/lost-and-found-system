const express = require("express");
const { createClaim, getMyClaims, getClaim, verifyClaim } = require("../controllers/claimController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/", protect, createClaim);
router.get("/mine", protect, getMyClaims);
router.get("/:id", protect, getClaim);
router.patch("/:id/verify", protect, verifyClaim);

module.exports = router;
