const mongoose = require("mongoose");

const disasterSchema = new mongoose.Schema(
  {
    disasterId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, required: true },
    gpsCoordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    severity: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
    status: { type: String, enum: ["active", "resolved", "pending"], default: "active" },
    targetAmount: { type: Number, required: true },
    collectedAmount: { type: Number, default: 0 },
    imageUrl: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Disaster", disasterSchema);
