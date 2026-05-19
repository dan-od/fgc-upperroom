import crypto from "node:crypto";
import express from "express";
import { AdminRole, AdminUserRecord, AdminSessionRecord } from "./types.js";
import { requireAdminPermission, AuthenticatedRequest } from "./auth.middleware.js";
import { hashPassword } from "./auth.utils.js";
import { paths, readJsonArray, writeJsonArray } from "./storage.js";
import { appendAuditLog } from "./admin.helpers.js";

const router = express.Router();

// GET /api/admin/users
router.get("/", requireAdminPermission("admin:users:manage"), async (_req, res) => {
  const users = await readJsonArray<AdminUserRecord>(paths.adminUsers);
  return res.json({
    users: users.map((u) => ({
      id: u.id, email: u.email, name: u.name, role: u.role, isActive: u.isActive,
      twoFactorEnabled: u.twoFactorEnabled, createdAt: u.createdAt, lastLoginAt: u.lastLoginAt,
    })),
  });
});

// POST /api/admin/users
router.post("/", requireAdminPermission("admin:users:manage"), async (req: AuthenticatedRequest, res) => {
  const { email, name, role, password } = req.body || {};
  if (!email || !name || !role || !password) {
    return res.status(400).json({ error: "email, name, role, and password are required." });
  }
  const validRoles: AdminRole[] = ["super_admin", "editor", "reviewer"];
  if (!validRoles.includes(role)) return res.status(400).json({ error: `role must be one of: ${validRoles.join(", ")}` });
  if (String(password).length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });

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
router.patch("/:id", requireAdminPermission("admin:users:manage"), async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const users = await readJsonArray<AdminUserRecord>(paths.adminUsers);
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) return res.status(404).json({ error: "User not found." });

  const { name, role, isActive, password } = req.body || {};
  const updated = { ...users[index] };
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
router.delete("/:id", requireAdminPermission("admin:users:manage"), async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  if (id === req.user!.id) return res.status(400).json({ error: "You cannot delete your own account." });

  const users = await readJsonArray<AdminUserRecord>(paths.adminUsers);
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) return res.status(404).json({ error: "User not found." });

  const [removed] = users.splice(index, 1);
  await writeJsonArray(paths.adminUsers, users);

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

export default router;
