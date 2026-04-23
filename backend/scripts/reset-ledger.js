// Wipes donation history and resets collectedAmount on all disasters.
// Use this after restarting/redeploying the Hardhat node so MongoDB
// stops showing donations that no longer exist on-chain.
//
// Usage (from the backend/ folder):
//   node scripts/reset-ledger.js

require("dotenv").config();
const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/secureaidschain";

(async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection;

    const txResult = await db.collection("transactions").deleteMany({});
    console.log(`Deleted ${txResult.deletedCount} transaction record(s).`);

    const dsResult = await db.collection("disasters").updateMany(
      {},
      { $set: { collectedAmount: 0 } }
    );
    console.log(`Reset collectedAmount on ${dsResult.modifiedCount} disaster(s).`);

    await mongoose.disconnect();
    console.log("Done. Your MongoDB ledger is back in sync with a fresh on-chain state.");
    process.exit(0);
  } catch (err) {
    console.error("Reset failed:", err.message);
    process.exit(1);
  }
})();
