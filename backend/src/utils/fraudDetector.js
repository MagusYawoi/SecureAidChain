const FraudAlert = require("../models/FraudAlert");
const Transaction = require("../models/Transaction");

const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

const LARGE_DONATION_ETH      = 50;
const LARGE_DISBURSEMENT_ETH  = 50;
const ROUND_AMOUNT_MIN_ETH    = 10;
const DUST_THRESHOLD_ETH      = 0.001;
const RAPID_FIRE_WINDOW_MS    = 10 * 60 * 1000;       // 10 minutes
const DUPLICATE_WINDOW_MS     = 60 * 60 * 1000;       // 1 hour

const isSuspiciousAddress = (addr) =>
  !addr || addr === NULL_ADDRESS || addr.toLowerCase() === NULL_ADDRESS;

const isRoundAmount = (amt) => amt >= ROUND_AMOUNT_MIN_ETH && Number.isInteger(amt);

async function recentActivityFrom(address) {
  if (!address) return 0;
  const since = new Date(Date.now() - RAPID_FIRE_WINDOW_MS);
  const [alertCount, txCount] = await Promise.all([
    FraudAlert.countDocuments({ fromAddress: address, createdAt: { $gte: since } }),
    Transaction.countDocuments({ fromAddress: address, createdAt: { $gte: since } }),
  ]);
  return Math.max(alertCount, txCount);
}

async function priorAlertCountFor(address) {
  if (!address) return 0;
  return FraudAlert.countDocuments({ fromAddress: address });
}

async function analyzeTransaction(tx) {
  const flags = [];
  let riskScore = 0;

  const amount    = parseFloat(tx.amount);
  const fromLower = (tx.fromAddress || "").toLowerCase();
  const toLower   = (tx.toAddress   || "").toLowerCase();

  // Rule 1 — Large donation
  if (tx.type === "donation" && amount > LARGE_DONATION_ETH) {
    flags.push(`Large donation amount: ${amount} ETH (threshold ${LARGE_DONATION_ETH} ETH)`);
    riskScore += amount > 100 ? 40 : 20;
  }

  // Rule 2 — Rapid fire (3+ in 10 min from same address)
  const recentCount = await recentActivityFrom(tx.fromAddress);
  if (recentCount >= 2) {
    flags.push(`Rapid-fire activity: ${recentCount + 1} transactions from same address in 10 minutes`);
    riskScore += recentCount >= 5 ? 50 : 25;
  }

  // Rule 3 — Round amount
  if (isRoundAmount(amount)) {
    flags.push(`Suspiciously round amount: exactly ${amount} ETH`);
    riskScore += 15;
  }

  // Rule 4 — Duplicate disaster (same address + campaign within 1 hour)
  if (tx.disasterId) {
    const dupSince = new Date(Date.now() - DUPLICATE_WINDOW_MS);
    const [dupAlerts, dupTxs] = await Promise.all([
      FraudAlert.countDocuments({ fromAddress: tx.fromAddress, disasterId: tx.disasterId, createdAt: { $gte: dupSince } }),
      Transaction.countDocuments({ fromAddress: tx.fromAddress, disasterId: tx.disasterId, createdAt: { $gte: dupSince } }),
    ]);
    const dup = Math.max(dupAlerts, dupTxs);
    if (dup > 0) {
      flags.push(`Duplicate: same address contributed to "${tx.disasterId}" in last hour (${dup}x)`);
      riskScore += dup > 2 ? 35 : 15;
    }
  }

  // Rule 5 — Zero / dust
  if (amount === 0) {
    flags.push("Zero-value transaction (test/probe)");
    riskScore += 30;
  } else if (amount > 0 && amount <= DUST_THRESHOLD_ETH) {
    flags.push(`Dust attack: ${amount} ETH (probing pattern, ≤ ${DUST_THRESHOLD_ETH} ETH)`);
    riskScore += 30;
  }

  // Rule 6 — Suspicious address (self-transfer or null)
  if (toLower && fromLower === toLower) {
    flags.push("Self-transfer detected: sender and recipient are the same address");
    riskScore += 90;
  } else if (isSuspiciousAddress(fromLower)) {
    flags.push("Sender is a null/burn address");
    riskScore += 70;
  }

  // Rule 7 — Large disbursement
  if (tx.type === "disbursement" && amount > LARGE_DISBURSEMENT_ETH) {
    flags.push(`Large disbursement: ${amount} ETH (threshold ${LARGE_DISBURSEMENT_ETH} ETH)`);
    riskScore += 45;
  }

  if (flags.length === 0) return null;

  riskScore = Math.min(100, riskScore);

  const riskLevel =
    riskScore >= 70 ? "critical" :
    riskScore >= 40 ? "high"     :
    riskScore >= 20 ? "medium"   :
                      "low";

  const previousAlerts = await priorAlertCountFor(tx.fromAddress);

  let attackPattern  = "Anomaly detected";
  let severity       = riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1);
  let recommendation = "Monitor for further suspicious activity from this address.";

  if (toLower && fromLower === toLower) {
    attackPattern  = "Self-transfer / wash trading";
    severity       = "Critical";
    recommendation = "Block this address immediately. This is circular fund movement, often used to launder ETH or fake activity.";
  } else if (isSuspiciousAddress(fromLower)) {
    attackPattern  = "Burn-address activity";
    severity       = "Critical";
    recommendation = "Treat as malicious. Pause the contract if a pattern continues from null addresses.";
  } else if (recentCount >= 2) {
    attackPattern  = "Rapid-fire transaction spam";
    severity       = recentCount >= 5 ? "Critical" : "High";
    recommendation = "Likely automated/bot activity. Add address to a rate-limit watchlist.";
  } else if (tx.type === "donation" && amount > LARGE_DONATION_ETH) {
    attackPattern  = "Anomalously large donation";
    severity       = amount > 100 ? "High" : "Medium";
    recommendation = "Verify donor identity off-chain. Could be misdirected funds or money laundering.";
  } else if (tx.type === "disbursement" && amount > LARGE_DISBURSEMENT_ETH) {
    attackPattern  = "Suspicious large disbursement";
    severity       = "High";
    recommendation = "Audit the multi-sig approval chain for this disbursement before further releases.";
  } else if (amount > 0 && amount <= DUST_THRESHOLD_ETH) {
    attackPattern  = "Dust attack pattern";
    severity       = "Medium";
    recommendation = "Track this address for follow-up activity. Dust transfers often precede larger attacks.";
  }

  const alert = await FraudAlert.create({
    txHash:      tx.txHash,
    fromAddress: tx.fromAddress,
    toAddress:   tx.toAddress || "",
    amount:      String(tx.amount),
    disasterId:  tx.disasterId || "",
    type:        tx.type,
    riskScore,
    riskLevel,
    flags,
    attackMetadata: {
      detectedAt:       new Date(),
      rulesTriggered:   flags.length,
      transactionCount: recentCount + 1,
      previousAlerts,
      attackPattern,
      severity,
      recommendation,
    },
    status: "flagged",
  });

  return alert;
}

module.exports = { analyzeTransaction };
