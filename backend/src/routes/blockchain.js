const express = require("express");
const { protect, requireRole } = require("../middleware/auth");
const {
  getContractBalance,
  getTotalFunds,
  getDonationCount,
  getDisbursementCount,
  contractAddress,
  verifyBeneficiary,
  verifyNGO,
  requestDisbursement,
  approveDisbursement,
  isPaused,
  setPaused,
  confirmDelivery,
  getDisbursements,
  getPendingRequests,
} = require("../utils/contract");

const router = express.Router();

// GET /api/blockchain/stats — public contract stats
router.get("/stats", async (req, res) => {
  try {
    const [balance, totalFunds, donations, disbursements, paused] = await Promise.all([
      getContractBalance(),
      getTotalFunds(),
      getDonationCount(),
      getDisbursementCount(),
      isPaused(),
    ]);
    res.json({ contractAddress, balance, totalFunds, donations, disbursements, paused });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/blockchain/verify-beneficiary — admin only
router.post("/verify-beneficiary", protect, requireRole("admin"), async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) return res.status(400).json({ message: "address required" });
    const txHash = await verifyBeneficiary(address);
    res.json({ txHash });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/blockchain/verify-ngo — admin only
router.post("/verify-ngo", protect, requireRole("admin"), async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) return res.status(400).json({ message: "address required" });
    const txHash = await verifyNGO(address);
    res.json({ txHash });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/blockchain/request-disbursement — admin/ngo only
router.post("/request-disbursement", protect, requireRole("admin", "ngo", "government"), async (req, res) => {
  try {
    const { recipientAddress, amountEth, disasterId } = req.body;
    if (!recipientAddress || !amountEth || !disasterId)
      return res.status(400).json({ message: "recipientAddress, amountEth, disasterId required" });
    const txHash = await requestDisbursement(recipientAddress, amountEth, disasterId);
    res.json({ txHash });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/blockchain/approve-disbursement — admin only
router.post("/approve-disbursement", protect, requireRole("admin"), async (req, res) => {
  try {
    const { requestId } = req.body;
    if (requestId === undefined) return res.status(400).json({ message: "requestId required" });
    const txHash = await approveDisbursement(requestId);
    res.json({ txHash });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/blockchain/requests — admin only
router.get("/requests", protect, requireRole("admin"), async (req, res) => {
  try {
    const requests = await getPendingRequests();
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/blockchain/disbursements — admin, ngo, or beneficiary (self only)
router.get("/disbursements", protect, requireRole("admin", "ngo", "beneficiary"), async (req, res) => {
  try {
    const disbursements = await getDisbursements();
    // Beneficiaries may only see their own disbursements
    if (req.user.role === "beneficiary") {
      const myWallet = (req.user.walletAddress || "").toLowerCase();
      return res.json(disbursements.filter((d) => d.recipient.toLowerCase() === myWallet));
    }
    res.json(disbursements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/blockchain/confirm-delivery — admin, ngo, or beneficiary (only their own)
router.post("/confirm-delivery", protect, requireRole("admin", "ngo", "beneficiary"), async (req, res) => {
  try {
    const { disbursementIndex, ipfsHash } = req.body;
    if (disbursementIndex === undefined || !ipfsHash)
      return res.status(400).json({ message: "disbursementIndex and ipfsHash required" });

    // Beneficiaries may only confirm disbursements where they are the recipient
    if (req.user.role === "beneficiary") {
      const all = await getDisbursements();
      const target = all[Number(disbursementIndex)];
      if (!target) return res.status(404).json({ message: "Disbursement not found" });
      const myWallet = (req.user.walletAddress || "").toLowerCase();
      if (target.recipient.toLowerCase() !== myWallet) {
        return res.status(403).json({ message: "You can only confirm delivery of your own disbursements" });
      }
    }

    const txHash = await confirmDelivery(disbursementIndex, ipfsHash);
    res.json({ txHash, ipfsHash, url: `https://gateway.pinata.cloud/ipfs/${ipfsHash}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/blockchain/pause — admin only
router.post("/pause", protect, requireRole("admin"), async (req, res) => {
  try {
    const { paused } = req.body;
    const txHash = await setPaused(paused);
    res.json({ txHash });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
