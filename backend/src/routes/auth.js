const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

const router = express.Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

function checkPasswordStrength(password) {
  const errors = [];
  if (typeof password !== "string") {
    errors.push("Password is required");
    return errors;
  }
  if (password.length < 8) errors.push("At least 8 characters");
  if (!/[A-Z]/.test(password)) errors.push("At least one uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("At least one lowercase letter");
  if (!/[0-9]/.test(password)) errors.push("At least one digit");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("At least one special character");
  return errors;
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, walletAddress, location, phone } = req.body;

    const pwErrors = checkPasswordStrength(password);
    if (pwErrors.length > 0) {
      return res.status(400).json({ message: "Password does not meet requirements", errors: pwErrors });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already registered" });

    const user = await User.create({ name, email, password, role, walletAddress, location, phone });
    const token = signToken(user._id);
    res.status(201).json({ token, user: { id: user._id, name, email, role, walletAddress } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const token = signToken(user._id);
    res.json({ token, user: { id: user._id, name: user.name, email, role: user.role, walletAddress: user.walletAddress, isVerified: user.isVerified } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me
router.get("/me", protect, (req, res) => {
  res.json(req.user);
});

module.exports = router;
