import crypto from "node:crypto";
import pg from "pg";
import { normalizeGivingStatus, resolveGivingStatus } from "../../lib/giving-utils.js";
import type { GivingTransaction, GivingTransactionStatus } from "./types.js";
import { getGivingRuntimeConfig } from "./giving.config.js";
import { maskEmail, maskPhone } from "./utils/privacy.js";
import { paths, readJsonArray, writeJsonArray } from "./storage.js";

// ── Pure helpers (exported for use in route handlers) ──────────────────────
export const normalizeEmail = (value: unknown): string => {
  const email = String(value || "").trim().toLowerCase();
  return email.includes("@") ? email : "";
};
export const safeIsoString = (value: unknown, fallback = new Date().toISOString()): string => {
  const parsed = new Date(String(value || ""));
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
};
export const normalizeGivingFund = (value: unknown): string => {
  const n = String(value || "general").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  return n || "general";
};
export const normalizeGivingSource = (value: unknown): string =>
  String(value || "website").trim().toLowerCase() || "website";
export const hashPayload = (value: unknown): string => {
  const body = typeof value === "string" ? value : JSON.stringify(value || {});
  return crypto.createHash("sha256").update(body).digest("hex");
};

export const toGivingConfirmation = (record: GivingTransaction, maskPii = true) => ({
  reference: record.reference,
  status: record.status,
  amountNaira: record.amountKobo / 100,
  currency: record.currency,
  fund: record.fund,
  donorName: record.donorName,
  donorEmail: maskPii ? maskEmail(record.donorEmail) : record.donorEmail,
  donorPhone: maskPii ? maskPhone(record.donorPhone) : record.donorPhone,
  provider: record.provider,
  providerStatus: record.providerStatus,
  providerMessage: record.providerMessage,
  updatedAt: record.updatedAt,
  paidAt: record.paidAt,
  timeline: record.timeline,
});

export const normalizeGivingTransaction = (source: Partial<GivingTransaction>): GivingTransaction => {
  const status = normalizeGivingStatus(source.status) as GivingTransactionStatus;
  const nowIso = new Date().toISOString();
  const runtimeConfig = getGivingRuntimeConfig();
  const provider = source.provider === "crypto"
    ? "crypto" : source.provider === "bank_transfer" ? "bank_transfer" : "paystack";
  return {
    id: String(source.id || crypto.randomUUID()),
    reference: String(source.reference || "").trim(),
    provider,
    status,
    amountKobo: Math.max(0, Number(source.amountKobo) || 0),
    currency: String(
      source.currency || (provider === "crypto" ? "USDT" : runtimeConfig.givingCurrency)
    ).trim().toUpperCase() || (provider === "crypto" ? "USDT" : runtimeConfig.givingCurrency),
    fund: normalizeGivingFund(source.fund),
    donorName: String(source.donorName || "").trim(),
    donorEmail: normalizeEmail(source.donorEmail),
    donorPhone: String(source.donorPhone || "").trim(),
    message: String(source.message || "").trim(),
    source: normalizeGivingSource(source.source),
    providerStatus: String(source.providerStatus || "").trim(),
    providerMessage: String(source.providerMessage || "").trim(),
    initializedAt: safeIsoString(source.initializedAt, nowIso),
    updatedAt: safeIsoString(source.updatedAt, nowIso),
    paidAt: source.paidAt ? safeIsoString(source.paidAt, nowIso) : null,
    timeline: Array.isArray(source.timeline)
      ? source.timeline.map((entry) => ({
          event: String(entry?.event || "").trim() || "updated",
          status: normalizeGivingStatus(entry?.status) as GivingTransactionStatus,
          at: safeIsoString(entry?.at, nowIso),
          payloadHash: String(entry?.payloadHash || "").trim() || hashPayload(entry || {}),
        })).slice(-20)
      : [],
    metadata: source.metadata && typeof source.metadata === "object" ? source.metadata : {},
    txHash: source.txHash ? String(source.txHash).trim().toLowerCase() : undefined,
    walletAddress: source.walletAddress ? String(source.walletAddress).trim() : undefined,
  };
};

const { Pool } = pg;
let _givingPool: pg.Pool | null = null;

const useJsonGivingStore = () =>
  ["1", "true", "yes"].includes(String(process.env.GIVING_USE_JSON_STORE || "").trim().toLowerCase());

export const getGivingPool = (): pg.Pool => {
  if (!_givingPool) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set for giving transactions");
    _givingPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });
    _givingPool.on("error", (err) => console.error("[giving] DB pool error:", err.message));
  }
  return _givingPool;
};

export const rowToTransaction = (row: Record<string, unknown>): GivingTransaction =>
  normalizeGivingTransaction({
    id: String(row.id || ""),
    reference: String(row.reference || ""),
    provider: row.provider as GivingTransaction["provider"],
    status: row.status as GivingTransactionStatus,
    amountKobo: Number(row.amount_kobo) || 0,
    currency: String(row.currency || "NGN"),
    fund: String(row.fund || "general"),
    donorName: String(row.donor_name || ""),
    donorEmail: String(row.donor_email || ""),
    donorPhone: String(row.donor_phone || ""),
    message: String(row.message || ""),
    source: String(row.source || "website"),
    providerStatus: String(row.provider_status || ""),
    providerMessage: String(row.provider_message || ""),
    initializedAt: row.initialized_at ? String(row.initialized_at) : new Date().toISOString(),
    updatedAt: row.updated_at ? String(row.updated_at) : new Date().toISOString(),
    paidAt: row.paid_at ? String(row.paid_at) : null,
    timeline: Array.isArray(row.timeline) ? (row.timeline as GivingTransaction["timeline"]) : [],
    metadata: row.metadata && typeof row.metadata === "object" ? (row.metadata as Record<string, unknown>) : {},
    txHash: row.tx_hash ? String(row.tx_hash) : undefined,
    walletAddress: row.wallet_address ? String(row.wallet_address) : undefined,
  });

const readGivingJsonTransactions = async (): Promise<GivingTransaction[]> => {
  const records = await readJsonArray<Partial<GivingTransaction>>(paths.givingTransactions);
  return records.map((item) => normalizeGivingTransaction(item));
};

const writeGivingJsonTransactions = async (records: GivingTransaction[]) => {
  const normalized = records.map((item) => normalizeGivingTransaction(item));
  await writeJsonArray(paths.givingTransactions, normalized.slice(0, 5000));
};

// ── Query helpers ──────────────────────────────────────────────────────────
export const getTransactionByReference = async (reference: string): Promise<GivingTransaction | null> => {
  if (useJsonGivingStore()) {
    const records = await readGivingJsonTransactions();
    return records.find((item) => item.reference === reference) || null;
  }

  const result = await getGivingPool().query("SELECT * FROM giving_transactions WHERE reference = $1", [reference]);
  return result.rows.length ? rowToTransaction(result.rows[0]) : null;
};

export const referenceExists = async (reference: string): Promise<boolean> => {
  if (useJsonGivingStore()) {
    const records = await readGivingJsonTransactions();
    return records.some((item) => item.reference === reference);
  }

  const result = await getGivingPool().query("SELECT 1 FROM giving_transactions WHERE reference = $1", [reference]);
  return result.rows.length > 0;
};

export const insertGivingTransaction = async (tx: GivingTransaction): Promise<void> => {
  if (useJsonGivingStore()) {
    const records = await readGivingJsonTransactions();
    await writeGivingJsonTransactions([normalizeGivingTransaction(tx), ...records]);
    return;
  }

  await getGivingPool().query(
    `INSERT INTO giving_transactions
       (id, reference, provider, status, amount_kobo, currency, fund,
        donor_name, donor_email, donor_phone, message, source,
        provider_status, provider_message, initialized_at, updated_at,
        paid_at, timeline, metadata, tx_hash, wallet_address)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
    [
      tx.id, tx.reference, tx.provider, tx.status, tx.amountKobo,
      tx.currency, tx.fund, tx.donorName, tx.donorEmail, tx.donorPhone,
      tx.message, tx.source, tx.providerStatus, tx.providerMessage,
      tx.initializedAt, tx.updatedAt, tx.paidAt ?? null,
      JSON.stringify(tx.timeline), JSON.stringify(tx.metadata),
      tx.txHash ?? null, tx.walletAddress ?? null,
    ]
  );
};

export const updateGivingTransaction = async (tx: GivingTransaction): Promise<void> => {
  if (useJsonGivingStore()) {
    const records = await readGivingJsonTransactions();
    const normalized = normalizeGivingTransaction(tx);
    const updated = records.map((item) => item.reference === normalized.reference ? normalized : item);
    await writeGivingJsonTransactions(updated.some((item) => item.reference === normalized.reference) ? updated : [normalized, ...records]);
    return;
  }

  await getGivingPool().query(
    `UPDATE giving_transactions SET
       status=$1, amount_kobo=$2, currency=$3, provider_status=$4,
       provider_message=$5, updated_at=$6, paid_at=$7,
       timeline=$8, metadata=$9, tx_hash=$10, wallet_address=$11
     WHERE reference=$12`,
    [
      tx.status, tx.amountKobo, tx.currency, tx.providerStatus,
      tx.providerMessage, tx.updatedAt, tx.paidAt ?? null,
      JSON.stringify(tx.timeline), JSON.stringify(tx.metadata),
      tx.txHash ?? null, tx.walletAddress ?? null,
      tx.reference,
    ]
  );
};

export const findTransactionByTxHashDb = async (txHash: string, excludeReference: string): Promise<GivingTransaction | null> => {
  const normalizedHash = String(txHash || "").trim().toLowerCase();
  if (!normalizedHash) return null;
  if (useJsonGivingStore()) {
    const records = await readGivingJsonTransactions();
    return records.find((item) => item.txHash === normalizedHash && item.reference !== excludeReference) || null;
  }

  const result = await getGivingPool().query(
    "SELECT * FROM giving_transactions WHERE tx_hash = $1 AND reference != $2",
    [normalizedHash, excludeReference]
  );
  return result.rows.length ? rowToTransaction(result.rows[0]) : null;
};

export const markGivingTransactionAbandoned = async (
  reference: string,
  providerMessage = "Payment was not completed."
): Promise<GivingTransaction | null> => {
  const safeReference = String(reference || "").trim();
  if (!safeReference) return null;
  const current = await getTransactionByReference(safeReference);
  if (!current) return null;
  if (current.status === "success") return current;
  const nowIso = new Date().toISOString();
  current.status = resolveGivingStatus(current.status, "abandoned") as GivingTransactionStatus;
  current.providerStatus = current.provider === "paystack" ? "abandoned_by_donor" : current.providerStatus || "abandoned";
  current.providerMessage = String(providerMessage || current.providerMessage || "Payment was not completed.").trim();
  current.updatedAt = nowIso;
  current.timeline.push({
    event: "transaction.abandoned",
    status: current.status,
    at: nowIso,
    payloadHash: hashPayload({ reference: safeReference, providerMessage: current.providerMessage, at: nowIso }),
  });
  await updateGivingTransaction(current);
  return current;
};
