const mongoose = require("mongoose");

const disasterSchema = new mongoose.Schema(
  {
    disasterId:  { type: String, required: true, unique: true },
    title:       { type: String, required: true },
    description: { type: String, required: true },
    location:    { type: String, required: true },
    gpsCoordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    severity:        { type: String, enum: ["low","medium","high","critical"], default: "medium" },
    status:          { type: String, enum: ["active","resolved","pending"], default: "pending" },
    targetAmount:    { type: Number, required: true },
    collectedAmount: { type: Number, default: 0 },
    imageUrl:        { type: String, default: "" },
    createdBy:       { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Authenticity layer
    verificationStatus: {
      type: String,
      enum: ["unverified", "pending_review", "verified", "rejected"],
      default: "unverified",
    },
    verifiedBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    verifiedAt:   { type: Date },
    verifyNote:   { type: String, default: "" },
    rejectedAt:   { type: Date },
    rejectReason: { type: String, default: "" },

    evidenceHashes: [{ type: String }],
    sourceUrls:     [{ type: String }],

    isDuplicate: { type: Boolean, default: false },
    duplicateOf: { type: String, default: "" },

    autoChecks: {
      hasGPS:         { type: Boolean, default: false },
      hasEvidence:    { type: Boolean, default: false },
      hasSources:     { type: Boolean, default: false },
      hasDescription: { type: Boolean, default: false },
      checkScore:     { type: Number,  default: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Disaster", disasterSchema);
