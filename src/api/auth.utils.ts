// src/api/auth.utils.ts
import crypto from "node:crypto";

const ADMIN_BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export const hashPassword = (password: string, salt = crypto.randomBytes(16).toString("hex")) => {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
  return { hash, salt };
};

export const verifyPassword = (password: string, hash: string, salt: string) => {
  if (!password || !hash || !salt) return false;
  const calculated = hashPassword(password, salt).hash;
  const left = Buffer.from(calculated, "hex");
  const right = Buffer.from(hash, "hex");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};

export const generateBase32Secret = (bytes = 20) => {
  const source = crypto.randomBytes(bytes);
  let bits = "";
  for (const byte of source) {
    bits += byte.toString(2).padStart(8, "0");
  }
  let output = "";
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, "0");
    output += ADMIN_BASE32_ALPHABET[parseInt(chunk, 2)];
  }
  return output;
};

export const decodeBase32 = (input: string) => {
  const normalized = String(input || "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const char of normalized) {
    const idx = ADMIN_BASE32_ALPHABET.indexOf(char);
    if (idx < 0) continue;
    bits += idx.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
};

export const generateTotpCode = (secret: string, timestampMs = Date.now(), periodSeconds = 30) => {
  const counter = Math.floor(timestampMs / 1000 / periodSeconds);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const secretBytes = decodeBase32(secret);
  const digest = crypto.createHmac("sha1", secretBytes).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return (binary % 1000000).toString().padStart(6, "0");
};

export const verifyTotpCode = (secret: string, code: string, window = 1) => {
  const normalizedCode = String(code || "").replace(/\D/g, "");
  if (normalizedCode.length !== 6 || !secret) return false;
  const now = Date.now();
  for (let i = -window; i <= window; i++) {
    const candidate = generateTotpCode(secret, now + i * 30_000);
    if (candidate === normalizedCode) return true;
  }
  return false;
};
