const express = require("express");
const Disaster = require("../models/Disaster");
const { protect, requireRole } = require("../middleware/auth");

const router = express.Router();

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function runAutoChecks(data) {
  const checks = {
    hasGPS:         !!(data.gpsCoordinates?.lat && data.gpsCoordinates?.lng),
    hasEvidence:    Array.isArray(data.evidenceHashes) && data.evidenceHashes.length > 0,
    hasSources:     Array.isArray(data.sourceUrls) && data.sourceUrls.filter(u => u.trim()).length > 0,
    hasDescription: typeof data.description === "string" && data.description.trim().length >= 50,
  };
  const score = Object.values(checks).filter(Boolean).length * 25;
  return { ...checks, checkScore: score };
}

// GET /api/disasters
router.get("/", async (req, res) => {
  try {
    const { status, severity, verificationStatus } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (verificationStatus) filter.verificationStatus = verificationStatus;
    const disasters = await Disaster.find(filter)
      .populate("createdBy", "name email")
      .populate("verifiedBy", "name email")
      .sort({ createdAt: -1 });
    res.json(disasters);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/disasters/:id
router.get("/:id", async (req, res) => {
  try {
    const disaster = await Disaster.findOne({ disasterId: req.params.id })
      .populate("createdBy", "name email")
      .populate("verifiedBy", "name email");
    if (!disaster) return res.status(404).json({ message: "Disaster not found" });
    res.json(disaster);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/disasters — admin or ngo only
router.post("/", protect, requireRole("admin", "ngo", "government"), async (req, res) => {
  try {
    const {
      disasterId, title, description, location, gpsCoordinates,
      severity, targetAmount, imageUrl, evidenceHashes, sourceUrls,
    } = req.body;

    // Duplicate check — first 3 title words, last 30 days (regex-escaped)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const titleWords = (title || "").split(/\s+/).slice(0, 3).filter(Boolean).map(escapeRegex);
    let possible = null;
    if (titleWords.length > 0) {
      possible = await Disaster.findOne({
        title: { $regex: new RegExp(titleWords.join("|"), "i") },
        createdAt: { $gte: thirtyDaysAgo },
      });
    }

    const autoChecks = runAutoChecks({ gpsCoordinates, evidenceHashes, sourceUrls, description });

    const disaster = await Disaster.create({
      disasterId, title, description, location,
      gpsCoordinates,
      severity, targetAmount, imageUrl,
      evidenceHashes: evidenceHashes || [],
      sourceUrls: sourceUrls || [],
      createdBy: req.user._id,
      verificationStatus: "unverified",
      status: "pending",
      isDuplicate: !!possible,
      duplicateOf: possible ? possible.disasterId : "",
      autoChecks,
    });

    res.status(201).json(disaster);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/disasters/:id/verify — admin only, verify or reject
router.patch("/:id/verify", protect, requireRole("admin"), async (req, res) => {
  try {
    const { action, note } = req.body;
    if (!["verify", "reject"].includes(action))
      return res.status(400).json({ message: "action must be 'verify' or 'reject'" });

    const update = action === "verify"
      ? {
          verificationStatus: "verified",
          status: "active",
          verifiedBy: req.user._id,
          verifiedAt: new Date(),
          verifyNote: note || "",
        }
      : {
          verificationStatus: "rejected",
          status: "pending",
          rejectedAt: new Date(),
          rejectReason: note || "",
        };

    const disaster = await Disaster.findOneAndUpdate(
      { disasterId: req.params.id },
      { $set: update },
      { new: true }
    ).populate("createdBy", "name email").populate("verifiedBy", "name email");

    if (!disaster) return res.status(404).json({ message: "Disaster not found" });

    console.log(`Disaster ${action === "verify" ? "VERIFIED" : "REJECTED"}: ${disaster.disasterId} by ${req.user.email}`);
    res.json(disaster);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/disasters/:id — update fields
router.patch("/:id", protect, requireRole("admin", "ngo", "government"), async (req, res) => {
  try {
    const disaster = await Disaster.findOneAndUpdate(
      { disasterId: req.params.id },
      { $set: req.body },
      { new: true }
    );
    if (!disaster) return res.status(404).json({ message: "Disaster not found" });
    res.json(disaster);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
