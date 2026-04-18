const express = require("express");
const Disaster = require("../models/Disaster");
const { protect, requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/disasters — list all
router.get("/", async (req, res) => {
  try {
    const { status, severity } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    const disasters = await Disaster.find(filter).populate("createdBy", "name email").sort({ createdAt: -1 });
    res.json(disasters);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/disasters/:id
router.get("/:id", async (req, res) => {
  try {
    const disaster = await Disaster.findOne({ disasterId: req.params.id }).populate("createdBy", "name email");
    if (!disaster) return res.status(404).json({ message: "Disaster not found" });
    res.json(disaster);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/disasters — admin or ngo only
router.post("/", protect, requireRole("admin", "ngo"), async (req, res) => {
  try {
    const { disasterId, title, description, location, gpsCoordinates, severity, targetAmount, imageUrl } = req.body;
    const disaster = await Disaster.create({
      disasterId, title, description, location, gpsCoordinates, severity, targetAmount, imageUrl,
      createdBy: req.user._id,
    });
    res.status(201).json(disaster);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/disasters/:id — update status or collected amount
router.patch("/:id", protect, requireRole("admin", "ngo"), async (req, res) => {
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
