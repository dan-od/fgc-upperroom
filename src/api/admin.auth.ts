import crypto from "node:crypto";
import express from "express";
import { AdminUserRecord, AdminSessionRecord, AdminResetTokenRecord } from "./types.js";
import { requireAdminAuth, AuthenticatedRequest } from "./auth.middleware.js";
import { hashPassword, verifyPassword } from "./auth.utils.js";
import { paths, readJsonArray, writeJsonArray } from "./storage.js";
import { createRateLimit } from "./middleware/rateLimit.js";
import { hashToken, appendAuditLog } from "./admin.helpers.js";
import twoFaRouter from "./admin.auth.2fa.js";

const router = express.Router();
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

const authRateLimit = createRateLimit(5, 15 * 60 * 1000, "Too many attempts. Please wait 15 minutes and try again.");

// POST /api/admin/auth/login
router.post("/login", authRateLimit, async (req, res) => {
  const { email, password, otpCode } = req.body || {};
  const ip = String(req.ip || req.headers["x-forwarded-for"] || "");
  if (!email || !password) return res.status(400).json({ error: "Email and password are required." });

  const users = await readJsonArray<AdminUserRecord>(paths.adminUsers);
  const user = users.find((u) => u.email.toLowerCase() === String(email).toLowerCase().trim());

  if (!user || !user.isActive) {
    await appendAuditLog({
      actorUserId: "", actorEmail: String(email).toLowerCase().trim(), actorRole: "reviewer",
      action: "auth.login_failed", resource: "session",
      ip, userAgent: String(req.headers["user-agent"] || ""),
      details: { reason: "user_not_found" },
    });
    return res.status(401).json({ error: "Invalid credentials." });
  }

  const valid = verifyPassword(String(password), user.passwordHash, user.passwordSalt);
  if (!valid) {
    await appendAuditLog({
      actorUserId: user.id, actorEmail: user.email, actorRole: user.role,
      action: "auth.login_failed", resource: "session",
      ip, userAgent: String(req.headers["user-agent"] || ""),
      details: { reason: "bad_password" },
    });
    return res.status(401).json({ error: "Invalid credentials." });
  }

  if (user.twoFactorEnabled && user.twoFactorSecret) {
    if (!otpCode) return res.status(401).json({ error: "Two-factor authentication code required.", code: "OTP_REQUIRED" });
    const otpValid = verifyTotpCode(user.twoFactorSecret, String(otpCode));
    if (!otpValid) {
      await appendAuditLog({
        actorUserId: user.id, actorEmail: user.email, actorRole: user.role,
        action: "auth.login_failed", resource: "session",
        ip, userAgent: String(req.headers["user-agent"] || ""),
        details: { reason: "bad_otp" },
      });
      return res.status(401).json({ error: "Invalid two-factor authentication code." });
    }
  }

  const rawToken = crypto.randomBytes(48).toString("hex");
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const session: AdminSessionRecord = {
    id: crypto.randomUUID(), userId: user.id, tokenHash,
    createdAt: now.toISOString(), updatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_DURATION_MS).toISOString(),
  };

  const sessions = await readJsonArray<AdminSessionRecord>(paths.adminSessions);
  const activeSessions = sessions.filter((s) => new Date(s.expiresAt).getTime() > Date.now());
  activeSessions.push(session);
  await writeJsonArray(paths.adminSessions, activeSessions);

  const updatedUsers = users.map((u) =>
    u.id === user.id ? { ...u, lastLoginAt: now.toISOString(), updatedAt: now.toISOString() } : u
  );
  await writeJsonArray(paths.adminUsers, updatedUsers);

  await appendAuditLog({
    actorUserId: user.id, actorEmail: user.email, actorRole: user.role,
    action: "auth.login", resource: "session",
    ip: String(req.ip || req.headers["x-forwarded-for"] || ""),
    userAgent: String(req.headers["user-agent"] || ""), details: {},
  });

  return res.json({
    token: rawToken,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, twoFactorEnabled: user.twoFactorEnabled },
  });
});

// GET /api/admin/auth/me
router.get("/me", requireAdminAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  return res.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, twoFactorEnabled: user.twoFactorEnabled },
  });
});

// POST /api/admin/auth/logout
router.post("/logout", requireAdminAuth, async (req: AuthenticatedRequest, res) => {
  const session = req.session!;
  const sessions = await readJsonArray<AdminSessionRecord>(paths.adminSessions);
  await writeJsonArray(paths.adminSessions, sessions.filter((s) => s.id !== session.id));
  await appendAuditLog({
    actorUserId: req.user!.id, actorEmail: req.user!.email, actorRole: req.user!.role,
    action: "auth.logout", resource: "session",
    ip: String(req.ip || req.headers["x-forwarded-for"] || ""),
    userAgent: String(req.headers["user-agent"] || ""), details: {},
  });
  return res.json({ ok: true });
});

// POST /api/admin/auth/change-password
router.post("/change-password", requireAdminAuth, async (req: AuthenticatedRequest, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) return res.status(400).json({ error: "currentPassword and newPassword are required." });
  if (String(newPassword).length < 8) return res.status(400).json({ error: "New password must be at least 8 characters." });

  const users = await readJsonArray<AdminUserRecord>(paths.adminUsers);
  const user = users.find((u) => u.id === req.user!.id)!;
  if (!verifyPassword(String(currentPassword), user.passwordHash, user.passwordSalt)) {
    return res.status(401).json({ error: "Current password is incorrect." });
  }

  const { hash, salt } = hashPassword(String(newPassword));
  await writeJsonArray(paths.adminUsers, users.map((u) =>
    u.id === user.id ? { ...u, passwordHash: hash, passwordSalt: salt, updatedAt: new Date().toISOString() } : u
  ));
  await appendAuditLog({
    actorUserId: user.id, actorEmail: user.email, actorRole: user.role,
    action: "auth.change_password", resource: "user",
    ip: String(req.ip || ""), userAgent: String(req.headers["user-agent"] || ""), details: {},
  });
  return res.json({ ok: true });
});

// POST /api/admin/auth/password-reset/request
router.post("/password-reset/request", async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.json({ ok: true, message: "If the account exists, a reset link has been noted." });

  const users = await readJsonArray<AdminUserRecord>(paths.adminUsers);
  const user = users.find((u) => u.email.toLowerCase() === String(email).toLowerCase().trim());

  if (user && user.isActive) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const record: AdminResetTokenRecord = {
      id: crypto.randomUUID(), userId: user.id, tokenHash: hashToken(rawToken),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      usedAt: null,
    };
    const tokens = await readJsonArray<AdminResetTokenRecord>(paths.adminResetTokens);
    tokens.push(record);
    await writeJsonArray(paths.adminResetTokens, tokens);
  }
  return res.json({ ok: true, message: "If the account exists, a reset link has been noted." });
});

// POST /api/admin/auth/password-reset/confirm
router.post("/password-reset/confirm", authRateLimit, async (req, res) => {
  const { token, newPassword } = req.body || {};
  if (!token || !newPassword) return res.status(400).json({ error: "token and newPassword are required." });
  if (String(newPassword).length < 8) return res.status(400).json({ error: "New password must be at least 8 characters." });

  const tokenHash = hashToken(String(token));
  const tokens = await readJsonArray<AdminResetTokenRecord>(paths.adminResetTokens);
  const record = tokens.find((t) => t.tokenHash === tokenHash && !t.usedAt);
  if (!record || new Date(record.expiresAt).getTime() < Date.now()) {
    return res.status(400).json({ error: "Reset token is invalid or expired." });
  }

  const users = await readJsonArray<AdminUserRecord>(paths.adminUsers);
  const { hash, salt } = hashPassword(String(newPassword));
  await writeJsonArray(paths.adminUsers, users.map((u) =>
    u.id === record.userId ? { ...u, passwordHash: hash, passwordSalt: salt, updatedAt: new Date().toISOString() } : u
  ));
  await writeJsonArray(paths.adminResetTokens, tokens.map((t) =>
    t.id === record.id ? { ...t, usedAt: new Date().toISOString() } : t
  ));
  return res.json({ ok: true });
});

router.use("/2fa", twoFaRouter);

export default router;
