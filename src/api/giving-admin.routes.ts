import express from "express";
import pg from "pg";
import { requireAdminPermission } from "./auth.middleware.js";
import type { AuthenticatedRequest } from "./auth.middleware.js";
import { maskEmail, maskPhone } from "./utils/privacy.js";

const router = express.Router();
const { Pool } = pg;
let _pool: pg.Pool | null = null;

const getPool = (): pg.Pool => {
  if (!_pool) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set for giving admin routes");
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    _pool.on("error", (err) => console.error("[admin-giving] DB pool error:", err.message));
  }
  return _pool;
};

// GET /api/admin/giving/summary
router.get("/summary", requireAdminPermission("giving:read"), async (_req, res) => {
  try {
    const pool = getPool();
    const [overallResult, byStatusResult, byFundResult] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int                                                                                AS total_count,
          COALESCE(SUM(amount_kobo) FILTER (WHERE status = 'success'), 0)::bigint                    AS total_successful_kobo,
          COALESCE(SUM(amount_kobo) FILTER (WHERE status = 'success'
            AND paid_at >= NOW() - INTERVAL '7 days'),  0)::bigint                                   AS last_7_days_kobo,
          COUNT(*)         FILTER (WHERE status = 'success'
            AND paid_at >= NOW() - INTERVAL '7 days')::int                                           AS last_7_days_count,
          COALESCE(SUM(amount_kobo) FILTER (WHERE status = 'success'
            AND paid_at >= NOW() - INTERVAL '30 days'), 0)::bigint                                   AS last_30_days_kobo,
          COUNT(*)         FILTER (WHERE status = 'success'
            AND paid_at >= NOW() - INTERVAL '30 days')::int                                          AS last_30_days_count
        FROM giving_transactions
      `),
      pool.query(`
        SELECT status,
               COUNT(*)::int                                AS count,
               COALESCE(SUM(amount_kobo), 0)::bigint        AS total_kobo
        FROM giving_transactions
        GROUP BY status
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT fund,
               COUNT(*)::int                                                            AS count,
               COALESCE(SUM(amount_kobo) FILTER (WHERE status = 'success'), 0)::bigint AS total_kobo
        FROM giving_transactions
        GROUP BY fund
        ORDER BY total_kobo DESC
      `),
    ]);

    const o = overallResult.rows[0] || {};
    return res.json({
      generatedAt: new Date().toISOString(),
      totalCount: Number(o.total_count) || 0,
      totalSuccessfulNaira: (Number(o.total_successful_kobo) || 0) / 100,
      last7Days: {
        count: Number(o.last_7_days_count) || 0,
        amountNaira: (Number(o.last_7_days_kobo) || 0) / 100,
      },
      last30Days: {
        count: Number(o.last_30_days_count) || 0,
        amountNaira: (Number(o.last_30_days_kobo) || 0) / 100,
      },
      byStatus: byStatusResult.rows.map((r) => ({
        status: r.status,
        count: Number(r.count),
        totalNaira: (Number(r.total_kobo) || 0) / 100,
      })),
      byFund: byFundResult.rows.map((r) => ({
        fund: r.fund,
        count: Number(r.count),
        totalNaira: (Number(r.total_kobo) || 0) / 100,
      })),
    });
  } catch (err: any) {
    console.error("[admin-giving] Summary query failed:", err.message);
    return res.status(500).json({ error: "Failed to fetch giving summary." });
  }
});

// GET /api/admin/giving/transactions
router.get("/transactions", requireAdminPermission("giving:read"), async (req: AuthenticatedRequest, res) => {
  const { fund = "", status = "", page = "1", limit = "50" } = req.query as Record<string, string>;
  const pageN = Math.max(1, Number(page) || 1);
  const limitN = Math.max(1, Math.min(200, Number(limit) || 50));
  const offset = (pageN - 1) * limitN;
  const isSuperAdmin = req.user?.role === "super_admin";

  try {
    const pool = getPool();
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (fund)   { params.push(fund);   conditions.push(`fund = $${params.length}`); }
    if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [countResult, rowsResult] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS total FROM giving_transactions ${where}`,
        params
      ),
      pool.query(
        `SELECT id, reference, provider, status, amount_kobo, currency, fund,
                donor_name, donor_email, donor_phone, source,
                provider_status, provider_message, initialized_at, updated_at, paid_at
         FROM giving_transactions ${where}
         ORDER BY initialized_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limitN, offset]
      ),
    ]);

    const total = Number(countResult.rows[0]?.total) || 0;
    const data = rowsResult.rows.map((row) => ({
      id: row.id,
      reference: row.reference,
      provider: row.provider,
      status: row.status,
      amountNaira: (Number(row.amount_kobo) || 0) / 100,
      currency: row.currency,
      fund: row.fund,
      donorName: String(row.donor_name || ""),
      donorEmail: isSuperAdmin ? String(row.donor_email || "") : maskEmail(String(row.donor_email || "")),
      donorPhone: isSuperAdmin ? String(row.donor_phone || "") : maskPhone(String(row.donor_phone || "")),
      source: row.source || "",
      providerStatus: row.provider_status || "",
      providerMessage: row.provider_message || "",
      initializedAt: row.initialized_at,
      updatedAt: row.updated_at,
      paidAt: row.paid_at,
    }));

    return res.json({ total, page: pageN, limit: limitN, data });
  } catch (err: any) {
    console.error("[admin-giving] Transactions query failed:", err.message);
    return res.status(500).json({ error: "Failed to fetch giving transactions." });
  }
});

export default router;
