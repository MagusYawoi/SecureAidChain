const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { encrypt, decrypt } = require("../utils/crypto");

const ENCRYPTED_FIELDS = ["phone", "location"];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["donor", "beneficiary", "ngo", "admin"],
      default: "donor",
    },
    walletAddress: { type: String, default: "" },
    isVerified: { type: Boolean, default: false },
    location: { type: String, default: "" },
    phone: { type: String, default: "" },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  for (const field of ENCRYPTED_FIELDS) {
    if (this.isModified(field) && this[field]) {
      this[field] = encrypt(this[field]);
    }
  }
});

userSchema.post("init", function () {
  for (const field of ENCRYPTED_FIELDS) {
    if (this[field]) this[field] = decrypt(this[field]);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
