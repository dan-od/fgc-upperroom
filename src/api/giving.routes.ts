import { loadProjectEnv } from "./load-env.js";
import express from "express";
import { normalizeGivingStatus, resolveGivingStatus } from "../../lib/giving-utils.js";
import type { GivingTransactionStatus } from "./types.js";
import { getGivingRuntimeConfig } from "./giving.config.js";
import {
  safeIsoString,
  hashPayload,
  toGivingConfirmation,
  getTransactionByReference,
  updateGivingTransaction,
  markGivingTransactionAbandoned,
} from "./giving.db.js";
import { givingCors, initializeRateLimit } from "./giving.middleware.js";
import { webhookHandler } from "./giving.webhook.js";
import { handleInitialize } from "./giving.initialize.js";
import { handleVerifyCrypto } from "./giving.verify-crypto.js";

loadProjectEnv();

const router = express.Router();
router.use(givingCors);

const verifyPaystackTransaction = async (reference: string, secretKey: string) => {
  if (!secretKey) return null;
  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.status) return null;
    return payload.data || null;
  } catch {
    return null;
  }
};

router.get("/config", (_req, res) => {
  const runtimeConfig = getGivingRuntimeConfig();
  const defaultBank = runtimeConfig.defaultBankAccount;
  return res.json({
    ok: true,
    currency: runtimeConfig.givingCurrency,
    bankTransferEnabled: runtimeConfig.bankTransferEnabled,
    bankName: defaultBank?.bankName || "",
    accountName: defaultBank?.accountName || "",
    accountNumber: defaultBank?.accountNumber || "",
    transferInstructions: defaultBank?.instructions || "",
    details: defaultBank?.details || [],
    bankAccounts: runtimeConfig.bankAccounts,
    paystackEnabled: Boolean(runtimeConfig.paystackSecretKey && runtimeConfig.paystackPublicKey),
    paystackPublicKey: runtimeConfig.paystackPublicKey,
    cryptoEnabled: runtimeConfig.cryptoEnabled,
    ethereumAddress: runtimeConfig.cryptoEnabled ? runtimeConfig.ethereumWalletAddress : "",
    bitcoinAddress: runtimeConfig.cryptoEnabled ? runtimeConfig.bitcoinWalletAddress : "",
  });
});

router.post("/initialize", initializeRateLimit, handleInitialize);

router.post("/verify-crypto", handleVerifyCrypto);

router.get("/confirm", async (req, res) => {
  const runtimeConfig = getGivingRuntimeConfig();
  const reference = String(req.query.reference || "").trim();
  if (!reference) return res.status(400).json({ error: "reference is required." });

  const current = await getTransactionByReference(reference);
  if (!current) return res.status(404).json({ error: "Transaction not found." });

  if (current.provider === "paystack" && runtimeConfig.paystackSecretKey) {
    const verified = await verifyPaystackTransaction(reference, runtimeConfig.paystackSecretKey);
    if (verified) {
      const remoteStatus = normalizeGivingStatus(verified.status) as GivingTransactionStatus;
      const resolvedStatus = resolveGivingStatus(current.status, remoteStatus) as GivingTransactionStatus;
      const nowIso = new Date().toISOString();
      current.status = resolvedStatus;
      current.providerStatus = String(verified.status || current.providerStatus || "").trim();
      current.providerMessage = String(verified.gateway_response || verified.message || current.providerMessage || "").trim();
      current.updatedAt = nowIso;
      current.paidAt = resolvedStatus === "success"
        ? safeIsoString(verified.paid_at || current.paidAt || nowIso, nowIso)
        : current.paidAt;
      current.amountKobo = Number(verified.amount) || current.amountKobo;
      current.currency = String(verified.currency || current.currency || runtimeConfig.givingCurrency).trim().toUpperCase() || runtimeConfig.givingCurrency;
      current.timeline.push({
        event: "paystack.confirmed", status: resolvedStatus, at: nowIso,
        payloadHash: hashPayload(verified),
      });
      await updateGivingTransaction(current);
    }
  }
  return res.json({ data: toGivingConfirmation(current) });
});

router.post("/abandon", express.json(), async (req, res) => {
  const reference = String(req.body?.reference || "").trim();
  const providerMessage = String(req.body?.providerMessage || "").trim();
  if (!reference) return res.status(400).json({ error: "reference is required." });
  const current = await markGivingTransactionAbandoned(reference, providerMessage);
  if (!current) return res.status(404).json({ error: "Transaction not found." });
  return res.json({ ok: true, data: toGivingConfirmation(current) });
});

router.post("/webhook", express.raw({ type: "application/json" }), webhookHandler);

export default router;
