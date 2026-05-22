import express from "express";
import { AdminUserRecord } from "./types.js";
import { requireAdminAuth, AuthenticatedRequest } from "./auth.middleware.js";
import { generateBase32Secret, verifyTotpCode } from "./auth.utils.js";
import { paths, readJsonArray, writeJsonArray } from "./storage.js";

const router = express.Router();

// POST /api/admin/auth/2fa/setup
router.post("/setup", requireAdminAuth, async (req: AuthenticatedRequest, res) => {
  const secret = generateBase32Secret();
  const users = await readJsonArray<AdminUserRecord>(paths.adminUsers);
  await writeJsonArray(paths.adminUsers, users.map((u) =>
    u.id === req.user!.id ? { ...u, pendingTwoFactorSecret: secret, updatedAt: new Date().toISOString() } : u
  ));
  const otpAuthUrl = `otpauth://totp/UpperRoom%20Admin:${encodeURIComponent(req.user!.email)}?secret=${secret}&issuer=UpperRoom`;
  return res.json({ ok: true, secret, otpAuthUrl });
});

// POST /api/admin/auth/2fa/verify
router.post("/verify", requireAdminAuth, async (req: AuthenticatedRequest, res) => {
  const { otpCode } = req.body || {};
  const users = await readJsonArray<AdminUserRecord>(paths.adminUsers);
  const user = users.find((u) => u.id === req.user!.id)!;
  if (!user.pendingTwoFactorSecret) return res.status(400).json({ error: "No pending 2FA setup found. Call /auth/2fa/setup first." });
  if (!verifyTotpCode(user.pendingTwoFactorSecret, String(otpCode || ""))) return res.status(400).json({ error: "Invalid OTP code." });
  await writeJsonArray(paths.adminUsers, users.map((u) =>
    u.id === user.id
      ? { ...u, twoFactorEnabled: true, twoFactorSecret: u.pendingTwoFactorSecret, pendingTwoFactorSecret: null, updatedAt: new Date().toISOString() }
      : u
  ));
  return res.json({ ok: true });
});

// POST /api/admin/auth/2fa/disable
router.post("/disable", requireAdminAuth, async (req: AuthenticatedRequest, res) => {
  const { otpCode } = req.body || {};
  const users = await readJsonArray<AdminUserRecord>(paths.adminUsers);
  const user = users.find((u) => u.id === req.user!.id)!;
  if (user.twoFactorEnabled && user.twoFactorSecret) {
    if (!verifyTotpCode(user.twoFactorSecret, String(otpCode || ""))) return res.status(400).json({ error: "Invalid OTP code." });
  }
  await writeJsonArray(paths.adminUsers, users.map((u) =>
    u.id === user.id
      ? { ...u, twoFactorEnabled: false, twoFactorSecret: null, pendingTwoFactorSecret: null, updatedAt: new Date().toISOString() }
      : u
  ));
  return res.json({ ok: true });
});

export default router;
