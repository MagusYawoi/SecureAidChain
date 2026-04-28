const express = require("express");
const FraudAlert = require("../models/FraudAlert");
const { protect, requireRole } = require("../middleware/auth");
const { analyzeTransaction } = require("../utils/fraudDetector");

const router = express.Router();

// GET /api/fraud — list alerts (admin only)
router.get("/", protect, requireRole("admin"), async (req, res) => {
  try {
    const { status, riskLevel } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (riskLevel) filter.riskLevel = riskLevel;
    const alerts = await FraudAlert.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/fraud/stats — summary counts (admin only)
router.get("/stats", protect, requireRole("admin"), async (req, res) => {
  try {
    const [total, critical, high, medium, low, flagged, confirmed] = await Promise.all([
      FraudAlert.countDocuments({}),
      FraudAlert.countDocuments({ riskLevel: "critical" }),
      FraudAlert.countDocuments({ riskLevel: "high" }),
      FraudAlert.countDocuments({ riskLevel: "medium" }),
      FraudAlert.countDocuments({ riskLevel: "low" }),
      FraudAlert.countDocuments({ status: "flagged" }),
      FraudAlert.countDocuments({ status: "confirmed_fraud" }),
    ]);
    res.json({ total, critical, high, medium, low, flagged, confirmed });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/fraud/:id/review — admin reviews an alert
router.patch("/:id/review", protect, requireRole("admin"), async (req, res) => {
  try {
    const { status, reviewNote } = req.body;
    const alert = await FraudAlert.findByIdAndUpdate(
      req.params.id,
      { status, reviewNote, reviewedBy: req.user.name, reviewedAt: new Date() },
      { new: true }
    );
    if (!alert) return res.status(404).json({ message: "Alert not found" });
    res.json(alert);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/fraud/simulate — generate a fake suspicious transaction (demo)
router.post("/simulate", protect, requireRole("admin"), async (req, res) => {
  try {
    const { scenario, disasterId } = req.body;
    const targetDisaster = disasterId || "demo-flood-2026";

    const scenarios = {
      large_amount: {
        txHash: "0xSIM_LARGE_" + Date.now(),
        fromAddress: "0xDEAD000000000000000000000000000000000001",
        toAddress: "",
        amount: "150",
        disasterId: targetDisaster,
        type: "donation",
      },
      rapid_fire: {
        txHash: "0xSIM_RAPID_" + Date.now(),
        fromAddress: "0xDEAD000000000000000000000000000000000002",
        toAddress: "",
        amount: "0.5",
        disasterId: targetDisaster,
        type: "donation",
      },
      self_transfer: {
        txHash: "0xSIM_SELF_" + Date.now(),
        fromAddress: "0xDEAD000000000000000000000000000000000003",
        toAddress: "0xDEAD000000000000000000000000000000000003",
        amount: "5",
        disasterId: targetDisaster,
        type: "donation",
      },
      dust_attack: {
        txHash: "0xSIM_DUST_" + Date.now(),
        fromAddress: "0xDEAD000000000000000000000000000000000004",
        toAddress: "",
        amount: "0.0001",
        disasterId: targetDisaster,
        type: "donation",
      },
      large_disbursement: {
        txHash: "0xSIM_DISB_" + Date.now(),
        fromAddress: "0xDEAD000000000000000000000000000000000005",
        toAddress: "0xDEAD000000000000000000000000000000000006",
        amount: "80",
        disasterId: targetDisaster,
        type: "disbursement",
      },
    };

    const fakeTx = scenarios[scenario];
    if (!fakeTx) return res.status(400).json({ message: "Unknown scenario" });

    const alert = await analyzeTransaction(fakeTx);
    if (!alert) return res.json({ message: "No fraud detected for this scenario" });

    res.json({ message: "Fraud alert generated!", alert });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
