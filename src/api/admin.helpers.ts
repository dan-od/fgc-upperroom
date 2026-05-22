import crypto from "node:crypto";
import express from "express";
import { AdminAuditLogEntry } from "./types.js";
import { requireAdminAuth, AuthenticatedRequest } from "./auth.middleware.js";
import { paths, readJsonArray, writeJsonArray } from "./storage.js";
import { roleHasPermission } from "../shared/admin-permissions.js";

export const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export const toIsoOrFallback = (value: unknown, fallback = new Date().toISOString()) => {
  const parsed = new Date(String(value || ""));
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
};

export const appendAuditLog = async (entry: Omit<AdminAuditLogEntry, "id" | "createdAt">) => {
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

export const requireBlogMutationAccess = async (
  req: AuthenticatedRequest,
  res: express.Response,
  next: express.NextFunction
) => {
  await requireAdminAuth(req, res, () => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Not authenticated." });
    if (
      roleHasPermission(user.role, "content:blog:write") ||
      roleHasPermission(user.role, "content:blog:approve")
    ) {
      return next();
    }
    return res.status(403).json({ error: "Insufficient permissions for this action." });
  });
};
