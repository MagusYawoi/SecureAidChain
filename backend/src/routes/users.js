const express = require("express");
const User = require("../models/User");
const { protect, requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/users — admin only
router.get("/", protect, requireRole("admin"), async (req, res) => {
  try {
    const { role } = req.query;
    const filter = role ? { role } : {};
    const users = await User.find(filter).select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/users/:id/verify — admin verifies a user
router.patch("/:id/verify", protect, requireRole("admin"), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isVerified: true }, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/users/:id/wallet — update wallet address
router.patch("/:id/wallet", protect, async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { walletAddress: req.body.walletAddress }, { new: true }).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
