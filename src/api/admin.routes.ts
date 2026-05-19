// src/api/admin.routes.ts
import express from "express";
import crypto from "node:crypto";
import { AdminRole, AdminUserRecord, AdminSessionRecord, AdminAuditLogEntry, AdminResetTokenRecord, AdminTestimonyRecord } from "./types.js";
import { requireAdminAuth, requireAdminPermission, AuthenticatedRequest } from "./auth.middleware.js";
import { hashPassword, verifyPassword, generateBase32Secret, verifyTotpCode } from "./auth.utils.js";
import { readStoredBlogPosts, readStoredTestimonies } from "./public-content.js";
import { paths, readJsonArray, writeJsonArray } from "./storage.js";
import { roleHasPermission } from "../shared/admin-permissions.js";

const router = express.Router();
const logPrefix = "[ADMIN_API]";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

// ─── AUTH RATE LIMITER ────────────────────────────────────────────────────────
// 5 attempts per 15 minutes per IP, applied to login and password-reset/confirm
const _authRlStore = new Map<string, { count: number; resetAt: number }>();
const AUTH_RL_WINDOW_MS = 15 * 60 * 1000;
const AUTH_RL_MAX = 5;

const authRateLimit = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const ip = String(req.ip || (req.socket as any)?.remoteAddress || "unknown");
  const now = Date.now();
  if (_authRlStore.size > 5_000) {
    for (const [key, val] of _authRlStore) {
      if (now > val.resetAt) _authRlStore.delete(key);
    }
  }
  const entry = _authRlStore.get(ip);
  if (!entry || now > entry.resetAt) {
    _authRlStore.set(ip, { count: 1, resetAt: now + AUTH_RL_WINDOW_MS });
    return next();
  }
  if (entry.count >= AUTH_RL_MAX) {
    console.warn(`${logPrefix} Auth rate limit exceeded`, { ip });
    return res.status(429).json({ error: "Too many attempts. Please wait 15 minutes and try again." });
  }
  entry.count++;
  return next();
};

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
const toIsoOrFallback = (value: unknown, fallback = new Date().toISOString()) => {
  const parsed = new Date(String(value || ""));
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
};

const requireBlogMutationAccess = async (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  await requireAdminAuth(req, res, () => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated." });
    }

    if (
      roleHasPermission(user.role, "content:blog:write") ||
      roleHasPermission(user.role, "content:blog:approve")
    ) {
      return next();
    }

    return res.status(403).json({ error: "Insufficient permissions for this action." });
  });
};

const appendAuditLog = async (entry: Omit<AdminAuditLogEntry, "id" | "createdAt">) => {
  try {
    const logs = await readJsonArray<AdminAuditLogEntry>(paths.adminAuditLog);
    logs.unshift({
      id: crypto.randomUUID(),
      ...entry,
      createdAt: new Date().toISOString(),
    });
    await writeJsonArray(paths.adminAuditLog, logs.slice(0, 2000));
  } catch {
    // Non-critical, don't throw
  }
};

// ─── AUTH ROUTES ────────────────────────────────────────────────────────────

// POST /api/admin/auth/login
router.post("/auth/login", authRateLimit, async (req, res) => {
  const { email, password, otpCode } = req.body || {};
  const ip = String(req.ip || req.headers["x-forwarded-for"] || "");

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

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

  // 2FA check
  if (user.twoFactorEnabled && user.twoFactorSecret) {
    if (!otpCode) {
      return res.status(401).json({ error: "Two-factor authentication code required.", code: "OTP_REQUIRED" });
    }
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

  // Create session
  const rawToken = crypto.randomBytes(48).toString("hex");
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const session: AdminSessionRecord = {
    id: crypto.randomUUID(),
    userId: user.id,
    tokenHash,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_DURATION_MS).toISOString(),
  };

  const sessions = await readJsonArray<AdminSessionRecord>(paths.adminSessions);
  // Prune expired sessions
  const activeSessions = sessions.filter((s) => new Date(s.expiresAt).getTime() > Date.now());
  activeSessions.push(session);
  await writeJsonArray(paths.adminSessions, activeSessions);

  // Update last login
  const updatedUsers = users.map((u) =>
    u.id === user.id ? { ...u, lastLoginAt: now.toISOString(), updatedAt: now.toISOString() } : u
  );
  await writeJsonArray(paths.adminUsers, updatedUsers);

  await appendAuditLog({
    actorUserId: user.id,
    actorEmail: user.email,
    actorRole: user.role,
    action: "auth.login",
    resource: "session",
    ip: String(req.ip || req.headers["x-forwarded-for"] || ""),
    userAgent: String(req.headers["user-agent"] || ""),
    details: {},
  });

  return res.json({
    token: rawToken,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, twoFactorEnabled: user.twoFactorEnabled },
  });
});

// GET /api/admin/auth/me
router.get("/auth/me", requireAdminAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  return res.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, twoFactorEnabled: user.twoFactorEnabled },
  });
});

// POST /api/admin/auth/logout
router.post("/auth/logout", requireAdminAuth, async (req: AuthenticatedRequest, res) => {
  const session = req.session!;
  const sessions = await readJsonArray<AdminSessionRecord>(paths.adminSessions);
  const remaining = sessions.filter((s) => s.id !== session.id);
  await writeJsonArray(paths.adminSessions, remaining);

  await appendAuditLog({
    actorUserId: req.user!.id,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: "auth.logout",
    resource: "session",
    ip: String(req.ip || req.headers["x-forwarded-for"] || ""),
    userAgent: String(req.headers["user-agent"] || ""),
    details: {},
  });

  return res.json({ ok: true });
});

// POST /api/admin/auth/change-password
router.post("/auth/change-password", requireAdminAuth, async (req: AuthenticatedRequest, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "currentPassword and newPassword are required." });
  }
  if (String(newPassword).length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters." });
  }

  const users = await readJsonArray<AdminUserRecord>(paths.adminUsers);
  const user = users.find((u) => u.id === req.user!.id)!;

  if (!verifyPassword(String(currentPassword), user.passwordHash, user.passwordSalt)) {
    return res.status(401).json({ error: "Current password is incorrect." });
  }

  const { hash, salt } = hashPassword(String(newPassword));
  const updatedUsers = users.map((u) =>
    u.id === user.id ? { ...u, passwordHash: hash, passwordSalt: salt, updatedAt: new Date().toISOString() } : u
  );
  await writeJsonArray(paths.adminUsers, updatedUsers);

  await appendAuditLog({
    actorUserId: user.id, actorEmail: user.email, actorRole: user.role,
    action: "auth.change_password", resource: "user",
    ip: String(req.ip || ""), userAgent: String(req.headers["user-agent"] || ""), details: {},
  });

  return res.json({ ok: true });
});

// POST /api/admin/auth/password-reset/request
router.post("/auth/password-reset/request", async (req, res) => {
  const { email } = req.body || {};
  // Always return success to avoid email enumeration
  if (!email) return res.json({ ok: true, message: "If the account exists, a reset link has been noted." });

  const users = await readJsonArray<AdminUserRecord>(paths.adminUsers);
  const user = users.find((u) => u.email.toLowerCase() === String(email).toLowerCase().trim());

  if (user && user.isActive) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const record: AdminResetTokenRecord = {
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
      usedAt: null,
    };
    const tokens = await readJsonArray<AdminResetTokenRecord>(paths.adminResetTokens);
    tokens.push(record);
    await writeJsonArray(paths.adminResetTokens, tokens);
    // TODO: email rawToken to user.email via a transactional email service.
  }

  return res.json({ ok: true, message: "If the account exists, a reset link has been noted." });
});

// POST /api/admin/auth/password-reset/confirm
router.post("/auth/password-reset/confirm", authRateLimit, async (req, res) => {
  const { token, newPassword } = req.body || {};
  if (!token || !newPassword) {
    return res.status(400).json({ error: "token and newPassword are required." });
  }
  if (String(newPassword).length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters." });
  }

  const tokenHash = hashToken(String(token));
  const tokens = await readJsonArray<AdminResetTokenRecord>(paths.adminResetTokens);
  const record = tokens.find((t) => t.tokenHash === tokenHash && !t.usedAt);

  if (!record || new Date(record.expiresAt).getTime() < Date.now()) {
    return res.status(400).json({ error: "Reset token is invalid or expired." });
  }

  const users = await readJsonArray<AdminUserRecord>(paths.adminUsers);
  const { hash, salt } = hashPassword(String(newPassword));
  const updatedUsers = users.map((u) =>
    u.id === record.userId ? { ...u, passwordHash: hash, passwordSalt: salt, updatedAt: new Date().toISOString() } : u
  );
  await writeJsonArray(paths.adminUsers, updatedUsers);

  const updatedTokens = tokens.map((t) =>
    t.id === record.id ? { ...t, usedAt: new Date().toISOString() } : t
  );
  await writeJsonArray(paths.adminResetTokens, updatedTokens);

  return res.json({ ok: true });
});

// POST /api/admin/auth/2fa/setup
router.post("/auth/2fa/setup", requireAdminAuth, async (req: AuthenticatedRequest, res) => {
  const secret = generateBase32Secret();
  const users = await readJsonArray<AdminUserRecord>(paths.adminUsers);
  const updatedUsers = users.map((u) =>
    u.id === req.user!.id ? { ...u, pendingTwoFactorSecret: secret, updatedAt: new Date().toISOString() } : u
  );
  await writeJsonArray(paths.adminUsers, updatedUsers);

  const otpAuthUrl = `otpauth://totp/UpperRoom%20Admin:${encodeURIComponent(req.user!.email)}?secret=${secret}&issuer=UpperRoom`;
  return res.json({ ok: true, secret, otpAuthUrl });
});

// POST /api/admin/auth/2fa/verify
router.post("/auth/2fa/verify", requireAdminAuth, async (req: AuthenticatedRequest, res) => {
  const { otpCode } = req.body || {};
  const users = await readJsonArray<AdminUserRecord>(paths.adminUsers);
  const user = users.find((u) => u.id === req.user!.id)!;

  if (!user.pendingTwoFactorSecret) {
    return res.status(400).json({ error: "No pending 2FA setup found. Call /auth/2fa/setup first." });
  }

  if (!verifyTotpCode(user.pendingTwoFactorSecret, String(otpCode || ""))) {
    return res.status(400).json({ error: "Invalid OTP code." });
  }

  const updatedUsers = users.map((u) =>
    u.id === user.id
      ? { ...u, twoFactorEnabled: true, twoFactorSecret: u.pendingTwoFactorSecret, pendingTwoFactorSecret: null, updatedAt: new Date().toISOString() }
      : u
  );
  await writeJsonArray(paths.adminUsers, updatedUsers);

  return res.json({ ok: true });
});

// POST /api/admin/auth/2fa/disable
router.post("/auth/2fa/disable", requireAdminAuth, async (req: AuthenticatedRequest, res) => {
  const { otpCode } = req.body || {};
  const users = await readJsonArray<AdminUserRecord>(paths.adminUsers);
  const user = users.find((u) => u.id === req.user!.id)!;

  if (user.twoFactorEnabled && user.twoFactorSecret) {
    if (!verifyTotpCode(user.twoFactorSecret, String(otpCode || ""))) {
      return res.status(400).json({ error: "Invalid OTP code." });
    }
  }

  const updatedUsers = users.map((u) =>
    u.id === user.id
      ? { ...u, twoFactorEnabled: false, twoFactorSecret: null, pendingTwoFactorSecret: null, updatedAt: new Date().toISOString() }
      : u
  );
  await writeJsonArray(paths.adminUsers, updatedUsers);

  return res.json({ ok: true });
});

// ─── USER MANAGEMENT ROUTES ────────────────────────────────────────────────

// GET /api/admin/users
router.get("/users", requireAdminPermission("admin:users:manage"), async (_req, res) => {
  const users = await readJsonArray<AdminUserRecord>(paths.adminUsers);
  return res.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      isActive: u.isActive,
      twoFactorEnabled: u.twoFactorEnabled,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
    })),
  });
});

// POST /api/admin/users
router.post("/users", requireAdminPermission("admin:users:manage"), async (req: AuthenticatedRequest, res) => {
  const { email, name, role, password } = req.body || {};
  if (!email || !name || !role || !password) {
    return res.status(400).json({ error: "email, name, role, and password are required." });
  }
  const validRoles: AdminRole[] = ["super_admin", "editor", "reviewer"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${validRoles.join(", ")}` });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }

  const users = await readJsonArray<AdminUserRecord>(paths.adminUsers);
  if (users.some((u) => u.email.toLowerCase() === String(email).toLowerCase())) {
    return res.status(409).json({ error: "An admin with this email already exists." });
  }

  const { hash, salt } = hashPassword(String(password));
  const newUser: AdminUserRecord = {
    id: crypto.randomUUID(),
    email: String(email).toLowerCase().trim(),
    name: String(name).trim(),
    role: role as AdminRole,
    passwordHash: hash,
    passwordSalt: salt,
    isActive: true,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    pendingTwoFactorSecret: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: null,
  };

  users.push(newUser);
  await writeJsonArray(paths.adminUsers, users);

  await appendAuditLog({
    actorUserId: req.user!.id, actorEmail: req.user!.email, actorRole: req.user!.role,
    action: "admin_user.create", resource: `user:${newUser.id}`,
    ip: String(req.ip || ""), userAgent: String(req.headers["user-agent"] || ""),
    details: { email: newUser.email, role: newUser.role },
  });

  return res.status(201).json({ id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role });
});

// PATCH /api/admin/users/:id
router.patch("/users/:id", requireAdminPermission("admin:users:manage"), async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const users = await readJsonArray<AdminUserRecord>(paths.adminUsers);
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) return res.status(404).json({ error: "User not found." });

  const { name, role, isActive, password } = req.body || {};
  const user = users[index];
  const updated = { ...user };

  if (name !== undefined) updated.name = String(name).trim();
  if (role !== undefined) {
    const validRoles: AdminRole[] = ["super_admin", "editor", "reviewer"];
    if (!validRoles.includes(role)) return res.status(400).json({ error: "Invalid role." });
    updated.role = role;
  }
  if (isActive !== undefined) updated.isActive = Boolean(isActive);
  if (password) {
    if (String(password).length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
    const { hash, salt } = hashPassword(String(password));
    updated.passwordHash = hash;
    updated.passwordSalt = salt;
  }
  updated.updatedAt = new Date().toISOString();
  users[index] = updated;
  await writeJsonArray(paths.adminUsers, users);

  await appendAuditLog({
    actorUserId: req.user!.id, actorEmail: req.user!.email, actorRole: req.user!.role,
    action: "admin_user.update", resource: `user:${id}`,
    ip: String(req.ip || ""), userAgent: String(req.headers["user-agent"] || ""),
    details: { targetEmail: updated.email, changes: Object.keys(req.body || {}) },
  });

  return res.json({ id: updated.id, email: updated.email, name: updated.name, role: updated.role, isActive: updated.isActive });
});

// DELETE /api/admin/users/:id
router.delete("/users/:id", requireAdminPermission("admin:users:manage"), async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  if (id === req.user!.id) return res.status(400).json({ error: "You cannot delete your own account." });

  const users = await readJsonArray<AdminUserRecord>(paths.adminUsers);
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) return res.status(404).json({ error: "User not found." });

  const [removed] = users.splice(index, 1);
  await writeJsonArray(paths.adminUsers, users);

  // Invalidate user sessions
  const sessions = await readJsonArray<AdminSessionRecord>(paths.adminSessions);
  await writeJsonArray(paths.adminSessions, sessions.filter((s) => s.userId !== id));

  await appendAuditLog({
    actorUserId: req.user!.id, actorEmail: req.user!.email, actorRole: req.user!.role,
    action: "admin_user.delete", resource: `user:${id}`,
    ip: String(req.ip || ""), userAgent: String(req.headers["user-agent"] || ""),
    details: { deletedEmail: removed.email },
  });

  return res.json({ ok: true });
});

// ─── AUDIT LOG ROUTES ──────────────────────────────────────────────────────

// GET /api/admin/audit-log
router.get("/audit-log", requireAdminPermission("audit:read"), async (req, res) => {
  const { action = "", resource = "", actorEmail = "", since = "", limit = "100", offset = "0" } = req.query as Record<string, string>;
  let logs = await readJsonArray<AdminAuditLogEntry>(paths.adminAuditLog);

  if (action) logs = logs.filter((l) => l.action.includes(action));
  if (resource) logs = logs.filter((l) => l.resource.includes(resource));
  if (actorEmail) logs = logs.filter((l) => l.actorEmail?.includes(actorEmail));
  if (since) {
    const sinceMs = new Date(since).getTime();
    if (!isNaN(sinceMs)) logs = logs.filter((l) => new Date(l.createdAt).getTime() >= sinceMs);
  }

  const limitN = Math.max(1, Math.min(500, Number(limit) || 100));
  const offsetN = Math.max(0, Number(offset) || 0);
  return res.json({ total: logs.length, records: logs.slice(offsetN, offsetN + limitN) });
});

// POST /api/admin/audit-log
router.post("/audit-log", requireAdminAuth, async (req: AuthenticatedRequest, res) => {
  const { action, resource, details = {} } = req.body || {};
  if (!action || !resource) return res.status(400).json({ error: "action and resource are required." });

  await appendAuditLog({
    actorUserId: req.user!.id, actorEmail: req.user!.email, actorRole: req.user!.role,
    action: String(action), resource: String(resource),
    ip: String(req.ip || ""), userAgent: String(req.headers["user-agent"] || ""),
    details: details || {},
  });

  return res.json({ ok: true });
});

// ─── ANALYTICS ROUTE ──────────────────────────────────────────────────────

const buildSegmentItems = (counts: Record<string, number>) => {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  return Object.entries(counts)
    .map(([label, count]) => ({
      label,
      count,
      share: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.count - a.count);
};

const incrementCount = (record: Record<string, number>, key: string) => {
  const normalized = key.trim() || "Unknown";
  record[normalized] = (record[normalized] || 0) + 1;
};

// GET /api/admin/analytics
router.get("/analytics", requireAdminPermission("analytics:read"), async (req, res) => {
  const windowDays = Math.max(1, Math.min(365, Number(req.query.windowDays) || 30));
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [giving, blog, audit, rumEvents, contactSubmissions, subscribers] = await Promise.all([
    readJsonArray<any>(paths.givingTransactions),
    readStoredBlogPosts(),
    readJsonArray<AdminAuditLogEntry>(paths.adminAuditLog),
    readJsonArray<any>(paths.rumEvents),
    readJsonArray<any>(paths.contactSubmissions),
    readJsonArray<any>(paths.newsletterSubscribers),
  ]);

  const recentGiving = giving.filter((g: any) => new Date(g.initializedAt || g.updatedAt || 0) >= since);
  const successfulGiving = recentGiving.filter((g: any) => g.status === "success");
  const totalGivingKobo = successfulGiving.reduce((sum: number, g: any) => sum + (Number(g.amountKobo) || 0), 0);
  const recentAudit = audit.filter((a) => new Date(a.createdAt) >= since);
  const recentRum = rumEvents.filter((entry: any) => new Date(entry.timestamp || 0) >= since);
  const recentContacts = contactSubmissions.filter((entry: any) => new Date(entry.createdAt || 0) >= since);
  const activeSubscribers = subscribers.filter((entry: any) => String(entry.status || "active").trim().toLowerCase() !== "unsubscribed");
  const recentSubscribers = activeSubscribers.filter((entry: any) => new Date(entry.subscribedAt || entry.updatedAt || 0) >= since);
  const sundayOfferingCtaClicks = recentRum.filter((entry: any) => entry.metric === "SUNDAY_OFFERING_CTA_CLICK").length;
  const sundayOfferingInitializations = recentRum.filter((entry: any) => entry.metric === "SUNDAY_OFFERING_INITIALIZED").length;
  const uniqueRoutes = new Set(recentRum.map((entry: any) => String(entry.route || "").trim()).filter(Boolean)).size;

  const timelineMap = new Map<string, { day: string; pageViews: number; contacts: number }>();
  for (let index = windowDays - 1; index >= 0; index -= 1) {
    const day = new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    timelineMap.set(day, { day, pageViews: 0, contacts: 0 });
  }

  recentRum.forEach((entry: any) => {
    const day = new Date(entry.timestamp || 0).toISOString().slice(0, 10);
    const bucket = timelineMap.get(day);
    if (bucket) bucket.pageViews += 1;
  });

  recentContacts.forEach((entry: any) => {
    const day = new Date(entry.createdAt || 0).toISOString().slice(0, 10);
    const bucket = timelineMap.get(day);
    if (bucket) bucket.contacts += 1;
  });

  const trafficByRoute: Record<string, number> = {};
  const performanceRatings: Record<string, number> = {};
  const trafficSources: Record<string, number> = {};
  const contactSubjects: Record<string, number> = {};
  const subscriberSources: Record<string, number> = {};
  const givingByFund: Record<string, number> = {};
  const givingByStatus: Record<string, number> = {};
  const givingBySource: Record<string, number> = {};

  recentRum.forEach((entry: any) => {
    incrementCount(trafficByRoute, String(entry.route || "Unknown route"));
    incrementCount(performanceRatings, String(entry.rating || "unknown"));
    incrementCount(trafficSources, String(entry.source || "unknown"));
  });

  recentContacts.forEach((entry: any) => {
    incrementCount(contactSubjects, String(entry.subjectLabel || entry.subject || "General"));
  });

  activeSubscribers.forEach((entry: any) => {
    incrementCount(subscriberSources, String(entry.source || "website"));
  });

  recentGiving.forEach((entry: any) => {
    incrementCount(givingByFund, String(entry.fund || "general"));
    incrementCount(givingByStatus, String(entry.status || "pending"));
    incrementCount(givingBySource, String(entry.source || "website"));
  });

  return res.json({
    generatedAt: new Date().toISOString(),
    windowDays,
    overview: {
      pageViews: recentRum.length,
      uniqueRoutes,
      activeSubscribers: activeSubscribers.length,
      contactSubmissions: recentContacts.length,
      givingSuccessfulTransactions: successfulGiving.length,
      sundayOfferingCtaClicks,
      totalGivingNaira: totalGivingKobo / 100,
      publishedBlogPosts: blog.filter((entry: any) => entry.status === "published").length,
      auditEvents: recentAudit.length,
    },
    trends: {
      pageViews: null,
      uniqueRoutes: null,
      newSubscribers: null,
      contactSubmissions: null,
      givingSuccessfulTransactions: null,
      sundayOfferingCtaClicks: null,
    },
    timeline: Array.from(timelineMap.values()),
    segments: {
      trafficByRoute: buildSegmentItems(trafficByRoute),
      performanceRatings: buildSegmentItems(performanceRatings),
      trafficSources: buildSegmentItems(trafficSources),
      contactSubjects: buildSegmentItems(contactSubjects),
      subscriberSources: buildSegmentItems(subscriberSources),
      givingByFund: buildSegmentItems(givingByFund),
      givingByStatus: buildSegmentItems(givingByStatus),
      givingBySource: buildSegmentItems(givingBySource),
      sundayOfferingFunnel: buildSegmentItems({
        "CTA Clicks": sundayOfferingCtaClicks,
        "Payment Initialized": sundayOfferingInitializations,
        "Successful Giving": successfulGiving.filter((entry: any) => String(entry.fund || "") === "sunday-offering").length,
      }),
    },
  });
});

// ─── GIVING ADMIN ROUTES ───────────────────────────────────────────────────

// GET /api/admin/giving
router.get("/giving", requireAdminPermission("giving:read"), async (req, res) => {
  const { status = "", fund = "", q = "", since = "", page = "1", limit = "50" } = req.query as Record<string, string>;
  let records = await readJsonArray<any>(paths.givingTransactions);

  if (status) records = records.filter((r: any) => r.status === status);
  if (fund) records = records.filter((r: any) => r.fund === fund);
  if (since) {
    const sinceMs = new Date(since).getTime();
    if (!Number.isNaN(sinceMs)) {
      records = records.filter((r: any) => {
        const stamp = new Date(r.paidAt || r.updatedAt || r.initializedAt || 0).getTime();
        return Number.isFinite(stamp) && stamp >= sinceMs;
      });
    }
  }
  if (q) {
    const ql = q.toLowerCase();
    records = records.filter((r: any) =>
      r.reference?.toLowerCase().includes(ql) ||
      r.donorName?.toLowerCase().includes(ql) ||
      r.donorEmail?.toLowerCase().includes(ql)
    );
  }

  const pageN = Math.max(1, Number(page) || 1);
  const limitN = Math.max(1, Math.min(200, Number(limit) || 50));
  const total = records.length;
  const data = records.slice((pageN - 1) * limitN, pageN * limitN);

  return res.json({ total, page: pageN, limit: limitN, data });
});

// GET /api/admin/giving/export.csv
router.get("/giving/export.csv", requireAdminPermission("giving:read"), async (req, res) => {
  const { status = "", fund = "", q = "", since = "" } = req.query as Record<string, string>;
  let records = await readJsonArray<any>(paths.givingTransactions);
  if (status) records = records.filter((r: any) => r.status === status);
  if (fund) records = records.filter((r: any) => r.fund === fund);
  if (since) {
    const sinceMs = new Date(since).getTime();
    if (!Number.isNaN(sinceMs)) {
      records = records.filter((r: any) => {
        const stamp = new Date(r.paidAt || r.updatedAt || r.initializedAt || 0).getTime();
        return Number.isFinite(stamp) && stamp >= sinceMs;
      });
    }
  }
  if (q) {
    const ql = q.toLowerCase();
    records = records.filter((r: any) =>
      r.reference?.toLowerCase().includes(ql) ||
      r.donorName?.toLowerCase().includes(ql) ||
      r.donorEmail?.toLowerCase().includes(ql)
    );
  }
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ["reference", "status", "fund", "amountNaira", "currency", "donorName", "donorEmail", "donorPhone", "initializedAt", "paidAt"];
  const rows = records.map((r: any) => [r.reference, r.status, r.fund, r.amountKobo / 100, r.currency, r.donorName, r.donorEmail, r.donorPhone, r.initializedAt, r.paidAt || ""].map(esc).join(","));
  const csv = [header.join(","), ...rows].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=giving-${Date.now()}.csv`);
  return res.send(csv);
});

// GET /api/admin/giving/:reference
router.get("/giving/:reference", requireAdminPermission("giving:read"), async (req, res) => {
  const { reference } = req.params;
  const records = await readJsonArray<any>(paths.givingTransactions);
  const item = records.find((r: any) => r.reference === reference);
  if (!item) return res.status(404).json({ error: "Transaction not found." });
  return res.json({ data: item });
});

// ─── BLOG ROUTES ──────────────────────────────────────────────────────────

// GET /api/admin/blog
router.get("/blog", requireAdminPermission("content:blog:read"), async (_req, res) => {
  const items = await readStoredBlogPosts();
  return res.json({ data: items });
});

// PUT /api/admin/blog
router.put("/blog", requireBlogMutationAccess, async (req, res) => {
  const posts = req.body?.posts;
  if (!Array.isArray(posts)) return res.status(400).json({ error: "Expected body.posts to be an array." });
  await writeJsonArray(paths.adminBlogPosts, posts);
  return res.json({ ok: true, count: posts.length, data: posts });
});

// GET /api/admin/testimonies
router.get("/testimonies", requireAdminPermission("content:testimonies:read"), async (_req, res) => {
  const items = await readStoredTestimonies();
  return res.json({ data: items });
});

// PUT /api/admin/testimonies
router.put("/testimonies", requireAdminPermission("content:testimonies:write"), async (req, res) => {
  const testimonies = req.body?.testimonies;
  if (!Array.isArray(testimonies)) {
    return res.status(400).json({ error: "Expected body.testimonies to be an array." });
  }

  const normalized = testimonies.map((item: Partial<AdminTestimonyRecord>, index: number) => ({
    id: String(item?.id || `testimony-${index + 1}`),
    name: String(item?.name || "Anonymous").trim() || "Anonymous",
    role: String(item?.role || "Member").trim() || "Member",
    quote: String(item?.quote || "").trim(),
    createdAt: toIsoOrFallback(item?.createdAt),
    updatedAt: item?.updatedAt ? toIsoOrFallback(item.updatedAt, toIsoOrFallback(item?.createdAt)) : null,
  })).filter((item: AdminTestimonyRecord) => item.quote);

  await writeJsonArray(paths.adminTestimonies, normalized);
  return res.json({ ok: true, count: normalized.length, data: normalized });
});

// PUT /api/admin/media  (media metadata save — separate from file upload)
// GET /api/admin/media  is handled by media.routes.ts under /api/media
// This is just a convenience alias if needed

export default router;
