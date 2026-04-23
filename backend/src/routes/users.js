const express = require("express");
const User = require("../models/User");
const { protect, requireRole } = require("../middleware/auth");
const { verifyBeneficiary, verifyNGO } = require("../utils/contract");

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

// GET /api/users/beneficiaries — admin or ngo; minimal fields for the disbursement picker
router.get("/beneficiaries", protect, requireRole("admin", "ngo", "government"), async (req, res) => {
  try {
    const users = await User
      .find({ role: "beneficiary", walletAddress: { $nin: ["", null] } })
      .select("_id name walletAddress isVerified")
      .sort({ name: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/users/:id/verify — admin verifies a user (DB + on-chain)
router.patch("/:id/verify", protect, requireRole("admin"), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isVerified: true }, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    let chainTxHash = null;
    let chainError = null;
    if (user.walletAddress) {
      try {
        if (user.role === "beneficiary") {
          chainTxHash = await verifyBeneficiary(user.walletAddress);
          console.log(`On-chain verifyBeneficiary(${user.walletAddress}) → ${chainTxHash}`);
        } else if (user.role === "ngo") {
          chainTxHash = await verifyNGO(user.walletAddress);
          console.log(`On-chain verifyNGO(${user.walletAddress}) → ${chainTxHash}`);
        }
      } catch (e) {
        chainError = e.message;
        console.error(`On-chain verification failed for ${user.walletAddress}:`, e.message);
      }
    }

    res.json({ ...user.toObject(), chainTxHash, chainError });
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
