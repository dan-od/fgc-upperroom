import crypto from "node:crypto";
import express from "express";
import { buildGivingReference, toKobo } from "../../lib/giving-utils.js";
import type { GivingTransaction } from "./types.js";
import { cleanEnv, getGivingRuntimeConfig } from "./giving.config.js";
import {
  normalizeEmail,
  normalizeGivingFund,
  normalizeGivingSource,
  hashPayload,
  normalizeGivingTransaction,
  referenceExists,
  insertGivingTransaction,
} from "./giving.db.js";
import { buildPublicAppUrl } from "./server-paths.js";

const MIN_GIVING_AMOUNT_KOBO = 100 * 100;

const parseGivingAmountKobo = (value: unknown): number => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return Number.NaN;
  const rounded = Math.round(amount);
  return rounded >= MIN_GIVING_AMOUNT_KOBO ? rounded : Math.round(toKobo(amount));
};

const appendReferenceQuery = (value: string, reference: string): string => {
  const separator = value.includes("?") ? "&" : "?";
  return `${value}${separator}reference=${encodeURIComponent(reference)}`;
};

const resolveGivingCallbackUrl = (req: express.Request, reference: string, callbackUrl: string): string => {
  if (callbackUrl) return appendReferenceQuery(callbackUrl, reference);
  return buildPublicAppUrl(req, `giving?reference=${encodeURIComponent(reference)}`);
};

export const handleInitialize = async (req: express.Request, res: express.Response) => {
  const runtimeConfig = getGivingRuntimeConfig();
  const donorName = String(req.body?.donorName || req.body?.name || "").trim().slice(0, 120);
  const donorEmail = normalizeEmail(req.body?.donorEmail || req.body?.email);
  const donorPhone = String(req.body?.donorPhone || req.body?.phone || "").trim().slice(0, 40);
  const fund = normalizeGivingFund(req.body?.fund);
  const source = normalizeGivingSource(req.body?.source || "website-giving");
  const message = String(req.body?.message || "").trim().slice(0, 800);
  const amountKobo = parseGivingAmountKobo(req.body?.amountKobo ?? req.body?.amount);
  const ctaRef = String(req.body?.ctaRef || "").trim().slice(0, 80);
  const isCrypto = req.body?.provider === "crypto" || req.body?.paymentMethod === "crypto";
  const isBankTransfer = req.body?.provider === "bank_transfer"
    || req.body?.paymentMethod === "bank_transfer"
    || req.body?.paymentMethod === "bank-transfer";
  const requestedBankAccountId = cleanEnv(req.body?.bankAccountId || req.body?.bankId);

  if (donorName.length < 2) return res.status(400).json({ error: "Please provide donorName." });
  if (!donorEmail) return res.status(400).json({ error: "Please provide a valid donorEmail." });

  const minAmount = isCrypto ? 500 : MIN_GIVING_AMOUNT_KOBO;
  const minLabel = isCrypto ? "$5 USDT" : "100 NGN";
  if (!Number.isFinite(amountKobo) || amountKobo < minAmount) {
    return res.status(400).json({ error: `Minimum giving amount is ${minLabel}.` });
  }

  let reference = buildGivingReference("URG");
  while (await referenceExists(reference)) {
    reference = buildGivingReference("URG");
  }

  const nowIso = new Date().toISOString();
  const timelineHash = hashPayload({ reference, event: "initialize.requested", amountKobo, fund, donorEmail });
  const baseTransaction = { donorName, donorEmail, donorPhone, fund, message, source, amountKobo };

  if (isCrypto) {
    if (!runtimeConfig.cryptoEnabled) {
      return res.status(400).json({ error: "Crypto payments are not currently available." });
    }
    const pending: GivingTransaction = normalizeGivingTransaction({
      id: crypto.randomUUID(), provider: "crypto", reference, status: "pending",
      currency: "USDT", ...baseTransaction,
      providerStatus: "crypto_awaiting_payment",
      providerMessage: "Awaiting crypto payment confirmation.",
      initializedAt: nowIso, updatedAt: nowIso, paidAt: null,
      timeline: [{ event: "initialize.requested", status: "pending", at: nowIso, payloadHash: timelineHash }],
      metadata: { ctaRef },
      walletAddress: runtimeConfig.ethereumWalletAddress,
    });
    await insertGivingTransaction(pending);
    return res.json({
      ok: true, reference, amountNaira: amountKobo / 100,
      walletAddress: runtimeConfig.ethereumWalletAddress,
      ethereumAddress: runtimeConfig.ethereumWalletAddress,
      bitcoinAddress: runtimeConfig.bitcoinWalletAddress,
    });
  }

  if (isBankTransfer) {
    if (!runtimeConfig.bankTransferEnabled) {
      return res.status(503).json({ error: "Bank transfer is not configured." });
    }
    const selectedBankAccount = requestedBankAccountId
      ? runtimeConfig.bankAccounts.find((item) => item.id === requestedBankAccountId) || null
      : runtimeConfig.defaultBankAccount;
    if (requestedBankAccountId && !selectedBankAccount) {
      return res.status(400).json({ error: "Selected bank transfer option is invalid." });
    }
    if (!selectedBankAccount) {
      return res.status(503).json({ error: "Bank transfer is not configured." });
    }
    const pending: GivingTransaction = normalizeGivingTransaction({
      id: crypto.randomUUID(), provider: "bank_transfer", reference, status: "pending",
      currency: runtimeConfig.givingCurrency, ...baseTransaction,
      providerStatus: "bank_transfer_awaiting_payment",
      providerMessage: "Awaiting bank transfer confirmation.",
      initializedAt: nowIso, updatedAt: nowIso, paidAt: null,
      timeline: [{ event: "initialize.requested", status: "pending", at: nowIso, payloadHash: timelineHash }],
      metadata: {
        ctaRef, bankAccountId: selectedBankAccount.id, bankName: selectedBankAccount.bankName,
        accountName: selectedBankAccount.accountName, accountNumber: selectedBankAccount.accountNumber,
        bankDetails: selectedBankAccount.details,
      },
    });
    await insertGivingTransaction(pending);
    return res.json({
      ok: true, reference, amountNaira: amountKobo / 100,
      bankAccountId: selectedBankAccount.id, bankName: selectedBankAccount.bankName,
      accountName: selectedBankAccount.accountName, accountNumber: selectedBankAccount.accountNumber,
      transferInstructions: selectedBankAccount.instructions, details: selectedBankAccount.details,
      bankAccounts: runtimeConfig.bankAccounts,
    });
  }

  if (!runtimeConfig.paystackSecretKey || !runtimeConfig.paystackPublicKey) {
    return res.status(503).json({ error: "Paystack is not configured." });
  }
  const callback_url = resolveGivingCallbackUrl(req, reference, runtimeConfig.givingCallbackUrl);
  const pending: GivingTransaction = normalizeGivingTransaction({
    id: crypto.randomUUID(), provider: "paystack", reference, status: "pending",
    currency: runtimeConfig.givingCurrency, ...baseTransaction,
    providerStatus: "popup_ready",
    providerMessage: "Payment popup is ready to launch.",
    initializedAt: nowIso, updatedAt: nowIso, paidAt: null,
    timeline: [{ event: "initialize.requested", status: "pending", at: nowIso, payloadHash: timelineHash }],
    metadata: { ctaRef, callbackUrl: callback_url },
  });
  await insertGivingTransaction(pending);
  return res.json({
    ok: true, reference, publicKey: runtimeConfig.paystackPublicKey,
    amountKobo, currency: runtimeConfig.givingCurrency, callbackUrl: callback_url,
  });
};
