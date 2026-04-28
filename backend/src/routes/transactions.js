const express = require("express");
const Transaction = require("../models/Transaction");
const Disaster = require("../models/Disaster");
const { protect } = require("../middleware/auth");
const { analyzeTransaction } = require("../utils/fraudDetector");

const router = express.Router();

// GET /api/transactions — list (optionally filtered by disasterId)
router.get("/", async (req, res) => {
  try {
    const { disasterId, type, address } = req.query;
    const filter = {};
    if (disasterId) filter.disasterId = disasterId;
    if (type) filter.type = type;
    if (address) filter.$or = [{ fromAddress: address }, { toAddress: address }];
    const txs = await Transaction.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json(txs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/transactions — record a tx after it's mined on-chain
router.post("/", protect, async (req, res) => {
  try {
    const { txHash, type, fromAddress, toAddress, amount, disasterId, blockNumber, metadata } = req.body;
    const existing = await Transaction.findOne({ txHash });
    if (existing) return res.status(409).json({ message: "Transaction already recorded" });

    const tx = await Transaction.create({ txHash, type, fromAddress, toAddress, amount, disasterId, blockNumber, metadata });

    // Update disaster collected amount on donation
    if (type === "donation") {
      await Disaster.findOneAndUpdate(
        { disasterId },
        { $inc: { collectedAmount: parseFloat(amount) } }
      );
    }

    // Run the transaction through the fraud detector — non-blocking, errors logged
    analyzeTransaction({ txHash, type, fromAddress, toAddress, amount, disasterId })
      .then((alert) => {
        if (alert) console.log(`Fraud alert raised: ${alert.riskLevel.toUpperCase()} (${alert.flags.length} flags) tx=${txHash}`);
      })
      .catch((err) => console.error("Fraud detector failed:", err.message));

    res.status(201).json(tx);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
