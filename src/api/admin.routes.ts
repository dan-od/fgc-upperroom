// src/api/admin.routes.ts
import express from "express";
import { AdminAuditLogEntry, AdminTestimonyRecord } from "./types.js";
import { requireAdminAuth, requireAdminPermission, AuthenticatedRequest } from "./auth.middleware.js";
import { readStoredBlogPosts, readStoredTestimonies } from "./public-content.js";
import { paths, readJsonArray, writeJsonArray } from "./storage.js";
import { toIsoOrFallback, requireBlogMutationAccess, appendAuditLog } from "./admin.helpers.js";
import { maskEmail, maskPhone } from "./utils/privacy.js";
import authRouter from "./admin.auth.js";
import usersRouter from "./admin.users.js";
import analyticsRouter from "./admin.analytics.js";

const router = express.Router();

router.use("/auth", express.json(), authRouter);
router.use("/users", express.json(), usersRouter);
router.use("/analytics", analyticsRouter);

// ─── AUDIT LOG ROUTES ──────────────────────────────────────────────────────

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

router.post("/audit-log", requireAdminPermission("audit:write"), async (req: AuthenticatedRequest, res) => {
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

// ─── GIVING ADMIN ROUTES ───────────────────────────────────────────────────

router.get("/giving", requireAdminPermission("giving:read"), async (req: AuthenticatedRequest, res) => {
  const { status = "", fund = "", q = "", since = "", page = "1", limit = "50" } = req.query as Record<string, string>;
  const isSuperAdmin = req.user?.role === "super_admin";
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
  const page_records = records.slice((pageN - 1) * limitN, pageN * limitN).map((r: any) =>
    isSuperAdmin ? r : { ...r, donorEmail: maskEmail(String(r.donorEmail || "")), donorPhone: maskPhone(String(r.donorPhone || "")) }
  );
  return res.json({ total: records.length, page: pageN, limit: limitN, data: page_records });
});

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
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=giving-${Date.now()}.csv`);
  return res.send([header.join(","), ...rows].join("\n"));
});

router.get("/giving/:reference", requireAdminPermission("giving:read"), async (req, res) => {
  const { reference } = req.params;
  const records = await readJsonArray<any>(paths.givingTransactions);
  const item = records.find((r: any) => r.reference === reference);
  if (!item) return res.status(404).json({ error: "Transaction not found." });
  return res.json({ data: item });
});

// ─── BLOG ROUTES ──────────────────────────────────────────────────────────

router.get("/blog", requireAdminPermission("content:blog:read"), async (_req, res) => {
  const items = await readStoredBlogPosts();
  return res.json({ data: items });
});

router.put("/blog", requireBlogMutationAccess, express.json(), async (req, res) => {
  const posts = req.body?.posts;
  if (!Array.isArray(posts)) return res.status(400).json({ error: "Expected body.posts to be an array." });
  await writeJsonArray(paths.adminBlogPosts, posts);
  return res.json({ ok: true, count: posts.length, data: posts });
});

// ─── TESTIMONY ROUTES ────────────────────────────────────────────────────

router.get("/testimonies", requireAdminPermission("content:testimonies:read"), async (_req, res) => {
  const items = await readStoredTestimonies();
  return res.json({ data: items });
});

router.put("/testimonies", requireAdminPermission("content:testimonies:write"), express.json(), async (req, res) => {
  const testimonies = req.body?.testimonies;
  if (!Array.isArray(testimonies)) return res.status(400).json({ error: "Expected body.testimonies to be an array." });
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

export default router;
