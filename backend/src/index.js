require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const disasterRoutes = require("./routes/disasters");
const transactionRoutes = require("./routes/transactions");
const userRoutes = require("./routes/users");
const qrcodeRoutes = require("./routes/qrcode");
const blockchainRoutes = require("./routes/blockchain");
const ipfsRoutes = require("./routes/ipfs");

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date() }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/disasters", disasterRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/users", userRoutes);
app.use("/api/qrcode", qrcodeRoutes);
app.use("/api/blockchain", blockchainRoutes);
app.use("/api/ipfs", ipfsRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/secureaidschain";

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
