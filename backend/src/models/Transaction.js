const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    txHash: { type: String, required: true, unique: true },
    type: { type: String, enum: ["donation", "disbursement", "withdrawal"], required: true },
    fromAddress: { type: String, required: true },
    toAddress: { type: String, default: "" },
    amount: { type: String, required: true }, // stored as string (wei or ETH string)
    disasterId: { type: String, required: true },
    status: { type: String, enum: ["pending", "confirmed", "failed"], default: "confirmed" },
    blockNumber: { type: Number },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
