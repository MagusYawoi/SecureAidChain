const mongoose = require("mongoose");

const fraudAlertSchema = new mongoose.Schema(
  {
    txHash:      { type: String, required: true },
    fromAddress: { type: String, required: true },
    toAddress:   { type: String, default: "" },
    amount:      { type: String, required: true },
    disasterId:  { type: String, required: true },
    type:        { type: String, required: true },

    riskScore: { type: Number, required: true },
    riskLevel: { type: String, enum: ["low", "medium", "high", "critical"], required: true },
    flags:     [{ type: String }],

    attackMetadata: {
      detectedAt:       { type: Date, default: Date.now },
      rulesTriggered:   { type: Number, default: 0 },
      transactionCount: { type: Number, default: 1 },
      previousAlerts:   { type: Number, default: 0 },
      attackPattern:    { type: String, default: "" },
      severity:         { type: String, default: "" },
      recommendation:   { type: String, default: "" },
    },

    status:     { type: String, enum: ["flagged", "reviewed", "dismissed", "confirmed_fraud"], default: "flagged" },
    reviewedBy: { type: String, default: "" },
    reviewedAt: { type: Date },
    reviewNote: { type: String, default: "" },
  },
  { timestamps: true }
);

fraudAlertSchema.index({ fromAddress: 1, createdAt: -1 });

module.exports = mongoose.model("FraudAlert", fraudAlertSchema);
