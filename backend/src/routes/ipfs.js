const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const { protect, requireRole } = require("../middleware/auth");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/ipfs/upload — admin only, upload proof document to IPFS via Pinata
router.post("/upload", protect, requireRole("admin", "ngo"), upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file provided" });

    const pinataJWT = process.env.PINATA_JWT;
    if (!pinataJWT) return res.status(500).json({ message: "IPFS not configured (PINATA_JWT missing)" });

    const form = new FormData();
    form.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const metadata = JSON.stringify({ name: req.file.originalname, keyvalues: { uploadedBy: req.user.email } });
    form.append("pinataMetadata", metadata);

    const response = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", form, {
      headers: { Authorization: `Bearer ${pinataJWT}`, ...form.getHeaders() },
    });

    const ipfsHash = response.data.IpfsHash;
    res.json({ ipfsHash, url: `https://gateway.pinata.cloud/ipfs/${ipfsHash}` });
  } catch (err) {
    res.status(500).json({ message: err.response?.data?.error?.details || err.message });
  }
});

module.exports = router;
