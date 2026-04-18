const crypto = require("crypto");

const ALGO = "aes-256-cbc";
const IV_LENGTH = 16;

function getKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("ENCRYPTION_KEY not set in environment");
  return Buffer.from(key, "hex");
}

function encrypt(text) {
  if (!text) return text;
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(String(text)), cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
  } catch {
    return text;
  }
}

function decrypt(text) {
  if (!text || !text.includes(":")) return text;
  try {
    const [ivHex, encryptedHex] = text.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString();
  } catch {
    return text;
  }
}

module.exports = { encrypt, decrypt };
