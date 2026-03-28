// src/api/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { AdminUserRecord, AdminSessionRecord } from "./types.js";
import { readJsonArray, paths } from "./storage.js";
import { roleHasPermission } from "../shared/admin-permissions.js";

export interface AuthenticatedRequest extends Request {
  user?: AdminUserRecord;
  session?: AdminSessionRecord;
}

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

const getAdminTokenFromRequest = (req: Request) => {
  const headerValue = String(req.headers.authorization || "").trim();
  if (headerValue.toLowerCase().startsWith("bearer ")) {
    return headerValue.slice(7).trim();
  }
  const alt = String(req.headers["x-admin-token"] || "").trim();
  return alt || "";
};

export const requireAdminAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const token = getAdminTokenFromRequest(req);
  if (!token) return res.status(401).json({ error: "Session expired or invalid." });

  const tokenHash = hashToken(token);
  const sessions = await readJsonArray<AdminSessionRecord>(paths.adminSessions);
  const session = sessions.find((s) => s.tokenHash === tokenHash);
  
  if (!session || new Date(session.expiresAt).getTime() < Date.now()) {
    return res.status(401).json({ error: "Session expired or invalid." });
  }

  const users = await readJsonArray<AdminUserRecord>(paths.adminUsers);
  const user = users.find((u) => u.id === session.userId);

  if (!user || !user.isActive) {
    return res.status(401).json({ error: "Authenticated user not found or inactive." });
  }

  req.user = user;
  req.session = session;
  next();
};

export const requireAdminPermission = (permission: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    await requireAdminAuth(req, res, () => {
      const user = req.user;
      if (!user) return res.status(401).json({ error: "Not authenticated." });

      if (!roleHasPermission(user.role, permission)) {
        return res.status(403).json({ error: "Insufficient permissions for this action." });
      }
      next();
    });
  };
};
