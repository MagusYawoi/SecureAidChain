const express = require("express");
const QRCode = require("qrcode");
const { protect } = require("../middleware/auth");

const router = express.Router();

// POST /api/qrcode/generate — generates a QR code for a beneficiary/delivery
router.post("/generate", protect, async (req, res) => {
  try {
    const { data } = req.body; // e.g. { beneficiaryId, disasterId, amount }
    if (!data) return res.status(400).json({ message: "data is required" });

    const payload = JSON.stringify(data);
    const qrDataUrl = await QRCode.toDataURL(payload);
    res.json({ qrDataUrl, payload });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
