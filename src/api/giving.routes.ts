import { loadProjectEnv } from "./load-env.js";
import express from "express";
import crypto from "node:crypto";
import pg from "pg";
import {
  buildGivingReference,
  normalizeGivingStatus,
  resolveGivingStatus,
  toKobo,
} from "../../lib/giving-utils.js";
import type { GivingTransaction, GivingTransactionStatus } from "./types.js";
import { buildPublicAppUrl } from "./server-paths.js";

const router = express.Router();
type BankTransferDetail = {
  label: string;
  value: string;
};

type BankTransferAccount = {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  instructions: string;
  details: BankTransferDetail[];
};

type GivingRuntimeConfig = {
  paystackPublicKey: string;
  paystackSecretKey: string;
  paystackWebhookSecret: string;
  givingCurrency: string;
  givingCallbackUrl: string;
  ethereumWalletAddress: string;
  bitcoinWalletAddress: string;
  sepoliaRpcUrl: string;
  bankAccounts: BankTransferAccount[];
  bankTransferEnabled: boolean;
  defaultBankAccount: BankTransferAccount | null;
};

let cryptoVerificationQueue: Promise<void> = Promise.resolve();

const cleanEnv = (value: unknown) => String(value || "").trim().replace(/^["'](.+)["']$/, "$1").trim();

const normalizeBankTransferDetails = (value: unknown) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => ({
        label: cleanEnv(item?.label),
        value: cleanEnv(item?.value),
      }))
      .filter((item) => item.label && item.value);
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([label, detailValue]) => ({
        label: cleanEnv(label),
        value: cleanEnv(detailValue),
      }))
      .filter((item) => item.label && item.value);
  }

  return [];
};

const normalizeBankTransferAccount = (value: unknown, index: number): BankTransferAccount | null => {
  if (!value || typeof value !== "object") return null;

  const source = value as Record<string, unknown>;
  const bankName = cleanEnv(source.bankName || source.name);
  const accountName = cleanEnv(source.accountName);
  const accountNumber = cleanEnv(source.accountNumber);

  if (!bankName || !accountName || !accountNumber) {
    return null;
  }

  return {
    id: cleanEnv(source.id || source.slug || source.code) || `bank-${index + 1}`,
    bankName,
    accountName,
    accountNumber,
    instructions: cleanEnv(source.instructions || source.transferInstructions),
    details: normalizeBankTransferDetails(source.details || source.requiredDetails || source.bankDetails),
  };
};

const parseBankTransferAccounts = (raw: string) => {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed) ? parsed : [parsed];
    return items
      .map((item, index) => normalizeBankTransferAccount(item, index))
      .filter((item): item is BankTransferAccount => Boolean(item));
  } catch {
    return [];
  }
};

const ensureUniqueBankTransferAccountIds = (accounts: BankTransferAccount[]) => {
  const seen = new Map<string, number>();

  return accounts.map((account, index) => {
    const baseId = cleanEnv(account.id) || `bank-${index + 1}`;
    const count = (seen.get(baseId) || 0) + 1;
    seen.set(baseId, count);

    return {
      ...account,
      id: count === 1 ? baseId : `${baseId}-${count}`,
    };
  });
};

const parseLegacyBankDetails = () => {
  const raw = cleanEnv(process.env.GIVING_BANK_DETAILS_JSON);
  if (!raw) return [];

  try {
    return normalizeBankTransferDetails(JSON.parse(raw));
  } catch {
    return [];
  }
};

const getGivingRuntimeConfig = (): GivingRuntimeConfig => {
  loadProjectEnv(true);

  const paystackPublicKey = cleanEnv(process.env.PAYSTACK_PUBLIC_KEY);
  const paystackSecretKey = cleanEnv(process.env.PAYSTACK_SECRET_KEY);
  const givingCurrency = cleanEnv(process.env.GIVING_CURRENCY || "NGN").toUpperCase() || "NGN";
  const givingCallbackUrl = cleanEnv(process.env.GIVING_CALLBACK_URL);
  const ethereumWalletAddress = cleanEnv(
    process.env.GIVING_CRYPTO_WALLET_ADDRESS || process.env.ETHEREUM_WALLET_ADDRESS || process.env.CRYPTO_WALLET_ADDRESS
  );
  const bitcoinWalletAddress = cleanEnv(process.env.BITCOIN_WALLET_ADDRESS);
  const sepoliaRpcUrl = cleanEnv(process.env.GIVING_CRYPTO_RPC_URL || process.env.SEPOLIA_RPC_URL);
  const bankAccountsFromJson = parseBankTransferAccounts(
    cleanEnv(
      process.env.GIVING_BANK_ACCOUNTS_JSON ||
      process.env.GIVING_BANK_TRANSFER_ACCOUNTS_JSON ||
      process.env.GIVING_BANK_OPTIONS_JSON ||
      process.env.GIVING_BANKS_JSON
    )
  );

  const legacyBank = normalizeBankTransferAccount({
    id: "default-bank",
    bankName: process.env.GIVING_BANK_NAME,
    accountName: process.env.GIVING_BANK_ACCOUNT_NAME,
    accountNumber: process.env.GIVING_BANK_ACCOUNT_NUMBER,
    instructions: process.env.GIVING_BANK_TRANSFER_INSTRUCTIONS,
    details: parseLegacyBankDetails(),
  }, 0);

  const bankAccounts = ensureUniqueBankTransferAccountIds(bankAccountsFromJson.length > 0
    ? bankAccountsFromJson
    : legacyBank
      ? [legacyBank]
      : []);

  return {
    paystackPublicKey,
    paystackSecretKey,
    paystackWebhookSecret: cleanEnv(process.env.PAYSTACK_WEBHOOK_SECRET || paystackSecretKey),
    givingCurrency,
    givingCallbackUrl,
    ethereumWalletAddress,
    bitcoinWalletAddress,
    sepoliaRpcUrl,
    bankAccounts,
    bankTransferEnabled: bankAccounts.length > 0,
    defaultBankAccount: bankAccounts[0] || null,
  };
};

loadProjectEnv();

const MIN_GIVING_AMOUNT_KOBO = 100 * 100;

const normalizeEmail = (value: unknown) => {
  const email = String(value || "").trim().toLowerCase();
  return email.includes("@") ? email : "";
};

const safeIsoString = (value: unknown, fallback = new Date().toISOString()) => {
  const parsed = new Date(String(value || ""));
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toISOString();
};

const normalizeGivingFund = (value: unknown) => {
  const normalized = String(value || "general")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "general";
};

const normalizeGivingSource = (value: unknown) => {
  const normalized = String(value || "website").trim().toLowerCase();
  return normalized || "website";
};

const hashPayload = (value: unknown) => {
  const body = typeof value === "string" ? value : JSON.stringify(value || {});
  return crypto.createHash("sha256").update(body).digest("hex");
};

const normalizeGivingTransaction = (source: Partial<GivingTransaction>): GivingTransaction => {
  const status = normalizeGivingStatus(source.status) as GivingTransactionStatus;
  const nowIso = new Date().toISOString();
  const runtimeConfig = getGivingRuntimeConfig();
  const provider = source.provider === "crypto"
    ? "crypto"
    : source.provider === "bank_transfer"
      ? "bank_transfer"
      : "paystack";

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
      ? source.timeline
          .map((entry) => ({
            event: String(entry?.event || "").trim() || "updated",
            status: normalizeGivingStatus(entry?.status) as GivingTransactionStatus,
            at: safeIsoString(entry?.at, nowIso),
            payloadHash: String(entry?.payloadHash || "").trim() || hashPayload(entry || {}),
          }))
          .slice(-20)
      : [],
    metadata: source.metadata && typeof source.metadata === "object" ? source.metadata : {},
    txHash: source.txHash ? String(source.txHash).trim().toLowerCase() : undefined,
    walletAddress: source.walletAddress ? String(source.walletAddress).trim() : undefined,
  };
};

const withCryptoVerificationLock = async <T>(fn: () => Promise<T>) => {
  const previousQueue = cryptoVerificationQueue;
  let releaseQueue!: () => void;
  cryptoVerificationQueue = new Promise<void>((resolve) => {
    releaseQueue = resolve;
  });

  await previousQueue;

  try {
    return await fn();
  } finally {
    releaseQueue();
  }
};

// ── PostgreSQL pool (lazy-init) ─────────────────────────────────────────────
const { Pool } = pg;
let _givingPool: pg.Pool | null = null;

const getGivingPool = (): pg.Pool => {
  if (!_givingPool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set for giving transactions");
    }
    _givingPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    _givingPool.on("error", (err) => {
      console.error("[giving] DB pool error:", err.message);
    });
  }
  return _givingPool;
};

const rowToTransaction = (row: Record<string, unknown>): GivingTransaction =>
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

const getTransactionByReference = async (reference: string): Promise<GivingTransaction | null> => {
  const result = await getGivingPool().query(
    "SELECT * FROM giving_transactions WHERE reference = $1",
    [reference]
  );
  return result.rows.length ? rowToTransaction(result.rows[0]) : null;
};

const referenceExists = async (reference: string): Promise<boolean> => {
  const result = await getGivingPool().query(
    "SELECT 1 FROM giving_transactions WHERE reference = $1",
    [reference]
  );
  return result.rows.length > 0;
};

const insertGivingTransaction = async (tx: GivingTransaction): Promise<void> => {
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

const updateGivingTransaction = async (tx: GivingTransaction): Promise<void> => {
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

const findTransactionByTxHashDb = async (txHash: string, excludeReference: string): Promise<GivingTransaction | null> => {
  const normalizedHash = String(txHash || "").trim().toLowerCase();
  if (!normalizedHash) return null;
  const result = await getGivingPool().query(
    "SELECT * FROM giving_transactions WHERE tx_hash = $1 AND reference != $2",
    [normalizedHash, excludeReference]
  );
  return result.rows.length ? rowToTransaction(result.rows[0]) : null;
};

const parseGivingAmountKobo = (value: unknown) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return Number.NaN;

  const rounded = Math.round(amount);
  if (rounded >= MIN_GIVING_AMOUNT_KOBO) {
    return rounded;
  }

  return Math.round(toKobo(amount));
};

const appendReferenceQuery = (value: string, reference: string) => {
  const separator = value.includes("?") ? "&" : "?";
  return `${value}${separator}reference=${encodeURIComponent(reference)}`;
};

const resolveGivingCallbackUrl = (req: express.Request, reference: string, callbackUrl: string) => {
  if (callbackUrl) {
    return appendReferenceQuery(callbackUrl, reference);
  }

  return buildPublicAppUrl(req, `giving?reference=${encodeURIComponent(reference)}`);
};

const toGivingConfirmation = (record: GivingTransaction) => ({
  reference: record.reference,
  status: record.status,
  amountNaira: record.amountKobo / 100,
  currency: record.currency,
  fund: record.fund,
  donorName: record.donorName,
  donorEmail: record.donorEmail,
  donorPhone: record.donorPhone,
  provider: record.provider,
  providerStatus: record.providerStatus,
  providerMessage: record.providerMessage,
  updatedAt: record.updatedAt,
  paidAt: record.paidAt,
  timeline: record.timeline,
});

const markGivingTransactionAbandoned = async (reference: string, providerMessage = "Payment was not completed.") => {
  const safeReference = String(reference || "").trim();
  if (!safeReference) return null;

  const current = await getTransactionByReference(safeReference);
  if (!current) return null;
  if (current.status === "success") return current;

  const nowIso = new Date().toISOString();
  current.status = resolveGivingStatus(current.status, "abandoned") as GivingTransactionStatus;
  current.providerStatus = current.provider === "paystack"
    ? "abandoned_by_donor"
    : current.providerStatus || "abandoned";
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

const verifyPaystackTransaction = async (reference: string, secretKey: string) => {
  if (!secretKey) {
    return null;
  }

  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.status) {
      return null;
    }

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
    cryptoEnabled: Boolean(runtimeConfig.ethereumWalletAddress || runtimeConfig.bitcoinWalletAddress),
    ethereumAddress: runtimeConfig.ethereumWalletAddress,
    bitcoinAddress: runtimeConfig.bitcoinWalletAddress,
  });
});

router.post("/initialize", async (req, res) => {
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

  if (donorName.length < 2) {
    return res.status(400).json({ error: "Please provide donorName." });
  }

  if (!donorEmail) {
    return res.status(400).json({ error: "Please provide a valid donorEmail." });
  }

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

  if (isCrypto) {
    const pending: GivingTransaction = normalizeGivingTransaction({
      id: crypto.randomUUID(),
      provider: "crypto",
      reference,
      status: "pending",
      amountKobo,
      currency: "USDT",
      fund,
      donorName,
      donorEmail,
      donorPhone,
      message,
      source,
      providerStatus: "crypto_awaiting_payment",
      providerMessage: "Awaiting crypto payment confirmation.",
      initializedAt: nowIso,
      updatedAt: nowIso,
      paidAt: null,
      timeline: [{ event: "initialize.requested", status: "pending", at: nowIso, payloadHash: timelineHash }],
      metadata: { ctaRef },
      walletAddress: runtimeConfig.ethereumWalletAddress,
    });

    await insertGivingTransaction(pending);
    return res.json({
      ok: true,
      reference,
      amountNaira: amountKobo / 100,
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
      id: crypto.randomUUID(),
      provider: "bank_transfer",
      reference,
      status: "pending",
      amountKobo,
      currency: runtimeConfig.givingCurrency,
      fund,
      donorName,
      donorEmail,
      donorPhone,
      message,
      source,
      providerStatus: "bank_transfer_awaiting_payment",
      providerMessage: "Awaiting bank transfer confirmation.",
      initializedAt: nowIso,
      updatedAt: nowIso,
      paidAt: null,
      timeline: [{ event: "initialize.requested", status: "pending", at: nowIso, payloadHash: timelineHash }],
      metadata: {
        ctaRef,
        bankAccountId: selectedBankAccount.id,
        bankName: selectedBankAccount.bankName,
        accountName: selectedBankAccount.accountName,
        accountNumber: selectedBankAccount.accountNumber,
        bankDetails: selectedBankAccount.details,
      },
    });

    await insertGivingTransaction(pending);
    return res.json({
      ok: true,
      reference,
      amountNaira: amountKobo / 100,
      bankAccountId: selectedBankAccount.id,
      bankName: selectedBankAccount.bankName,
      accountName: selectedBankAccount.accountName,
      accountNumber: selectedBankAccount.accountNumber,
      transferInstructions: selectedBankAccount.instructions,
      details: selectedBankAccount.details,
      bankAccounts: runtimeConfig.bankAccounts,
    });
  }

  if (!runtimeConfig.paystackSecretKey || !runtimeConfig.paystackPublicKey) {
    return res.status(503).json({ error: "Paystack is not configured." });
  }

  const callback_url = resolveGivingCallbackUrl(req, reference, runtimeConfig.givingCallbackUrl);
  const pending: GivingTransaction = normalizeGivingTransaction({
    id: crypto.randomUUID(),
    provider: "paystack",
    reference,
    status: "pending",
    amountKobo,
    currency: runtimeConfig.givingCurrency,
    fund,
    donorName,
    donorEmail,
    donorPhone,
    message,
    source,
    providerStatus: "popup_ready",
    providerMessage: "Payment popup is ready to launch.",
    initializedAt: nowIso,
    updatedAt: nowIso,
    paidAt: null,
    timeline: [{ event: "initialize.requested", status: "pending", at: nowIso, payloadHash: timelineHash }],
    metadata: {
      ctaRef,
      callbackUrl: callback_url,
    },
  });

  await insertGivingTransaction(pending);
  return res.json({
    ok: true,
    reference,
    publicKey: runtimeConfig.paystackPublicKey,
    amountKobo,
    currency: runtimeConfig.givingCurrency,
    callbackUrl: callback_url,
  });
});

router.post("/verify-crypto", async (req, res) => {
  const runtimeConfig = getGivingRuntimeConfig();
  const reference = String(req.body?.reference || "").trim();
  const txHash = String(req.body?.txHash || "").trim().toLowerCase();

  if (!reference || !txHash) {
    return res.status(400).json({ error: "Please provide reference and txHash." });
  }

  if (!runtimeConfig.sepoliaRpcUrl) {
    return res.status(503).json({ error: "Blockchain verification is currently unavailable." });
  }

  try {
    const rpcResponse = await fetch(runtimeConfig.sepoliaRpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getTransactionByHash",
        params: [txHash],
      }),
    });

    const rpcPayload: any = await rpcResponse.json().catch(() => ({}));
    const transaction = rpcPayload?.result;

    if (!transaction) {
      return res.status(400).json({ error: "Transaction not found on the Sepolia network." });
    }

    const isNativeToChurch = String(transaction.to || "").toLowerCase() === runtimeConfig.ethereumWalletAddress?.toLowerCase();
    let isInputToChurch = false;
    const input = String(transaction.input || "0x");
    if (!isNativeToChurch && input.startsWith("0xa9059cbb")) {
      const recipientFromInput = `0x${input.slice(34, 74).toLowerCase()}`;
      isInputToChurch = recipientFromInput === runtimeConfig.ethereumWalletAddress?.toLowerCase();
    }

    if (!isNativeToChurch && !isInputToChurch) {
      return res.status(400).json({ error: "This transaction was not sent to the authorized church wallet." });
    }

    return await withCryptoVerificationLock(async () => {
      const current = await getTransactionByReference(reference);

      if (!current) return res.status(404).json({ error: "Reference not found." });
      if (current.provider !== "crypto") return res.status(400).json({ error: "This is not a crypto transaction." });
      if (current.status === "success") {
        return res.json({ ok: true, message: "Transaction already verified.", data: toGivingConfirmation(current) });
      }

      const duplicate = await findTransactionByTxHashDb(txHash, reference);
      if (duplicate) {
        const nowIso = new Date().toISOString();
        current.status = "failed";
        current.providerStatus = "duplicate_tx_hash";
        current.providerMessage = `This transaction hash has already been used on reference ${duplicate.reference}. Please use a different payment hash.`;
        current.txHash = txHash;
        current.paidAt = null;
        current.updatedAt = nowIso;
        current.timeline.push({
          event: "crypto.duplicate_hash",
          status: "failed",
          at: nowIso,
          payloadHash: hashPayload({
            reference,
            txHash,
            duplicateReference: duplicate.reference,
          }),
        });

        await updateGivingTransaction(current);
        return res.status(409).json({
          error: current.providerMessage,
          duplicateOfReference: duplicate.reference,
          data: toGivingConfirmation(current),
        });
      }

      const nowIso = new Date().toISOString();
      current.status = "success";
      current.providerStatus = "verified_on_chain";
      current.providerMessage = "Blockchain transaction verified successfully.";
      current.txHash = txHash;
      current.paidAt = nowIso;
      current.updatedAt = nowIso;
      current.timeline.push({
        event: "crypto.verified",
        status: "success",
        at: nowIso,
        payloadHash: hashPayload(transaction),
      });

      await updateGivingTransaction(current);
      return res.json({
        ok: true,
        message: "Transaction verified successfully!",
        data: toGivingConfirmation(current),
      });
    });
  } catch (error: any) {
    return res.status(503).json({ error: error?.message || "A server error occurred during verification." });
  }
});

router.get("/confirm", async (req, res) => {
  const runtimeConfig = getGivingRuntimeConfig();
  const reference = String(req.query.reference || "").trim();
  if (!reference) {
    return res.status(400).json({ error: "reference is required." });
  }

  const current = await getTransactionByReference(reference);
  if (!current) {
    return res.status(404).json({ error: "Transaction not found." });
  }

  if (current.provider === "paystack" && runtimeConfig.paystackSecretKey) {
    const verified = await verifyPaystackTransaction(reference, runtimeConfig.paystackSecretKey);
    if (verified) {
      const remoteStatus = normalizeGivingStatus(verified.status) as GivingTransactionStatus;
      const resolvedStatus = resolveGivingStatus(current.status, remoteStatus) as GivingTransactionStatus;
      const nowIso = new Date().toISOString();

      current.status = resolvedStatus;
      current.providerStatus = String(verified.status || current.providerStatus || "").trim();
      current.providerMessage = String(
        verified.gateway_response || verified.message || current.providerMessage || ""
      ).trim();
      current.updatedAt = nowIso;
      current.paidAt = resolvedStatus === "success"
        ? safeIsoString(verified.paid_at || current.paidAt || nowIso, nowIso)
        : current.paidAt;
      current.amountKobo = Number(verified.amount) || current.amountKobo;
      current.currency = String(verified.currency || current.currency || runtimeConfig.givingCurrency).trim().toUpperCase() || runtimeConfig.givingCurrency;
      current.timeline.push({
        event: "paystack.confirmed",
        status: resolvedStatus,
        at: nowIso,
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

  if (!reference) {
    return res.status(400).json({ error: "reference is required." });
  }

  const current = await markGivingTransactionAbandoned(reference, providerMessage);
  if (!current) {
    return res.status(404).json({ error: "Transaction not found." });
  }

  return res.json({ ok: true, data: toGivingConfirmation(current) });
});

// ── Paystack Webhook ────────────────────────────────────────────────────────
// Paystack POSTs charge events here. We validate HMAC-SHA512 before touching
// any data. Must use raw body (not parsed JSON) for signature verification.
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const runtimeConfig = getGivingRuntimeConfig();

    if (!runtimeConfig.paystackWebhookSecret) {
      // Not configured — return 200 so Paystack doesn't retry, but skip processing.
      console.warn("[giving] Webhook received but PAYSTACK_WEBHOOK_SECRET is not set — skipping.");
      return res.sendStatus(200);
    }

    const signature = String(req.headers["x-paystack-signature"] || "").trim();
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));

    const expected = crypto
      .createHmac("sha512", runtimeConfig.paystackWebhookSecret)
      .update(rawBody)
      .digest("hex");

    if (signature !== expected) {
      console.warn("[giving] Webhook rejected — invalid signature.");
      return res.sendStatus(401);
    }

    let event: any;
    try {
      event = JSON.parse(rawBody.toString("utf8"));
    } catch {
      console.warn("[giving] Webhook rejected — body is not valid JSON.");
      return res.sendStatus(400);
    }

    // Always acknowledge promptly — Paystack retries on non-2xx or timeouts.
    res.sendStatus(200);

    const eventType = String(event?.event || "");
    const data = event?.data || {};

    if (eventType === "charge.success") {
      const reference = String(data?.reference || "").trim();
      if (!reference) {
        console.warn("[giving] charge.success webhook missing reference — skipped.");
        return;
      }

      try {
        const current = await getTransactionByReference(reference);

        if (!current) {
          console.warn(`[giving] charge.success webhook — reference ${reference} not found in DB.`);
          return;
        }

        if (current.status === "success") {
          // Already confirmed — idempotent, nothing to do.
          return;
        }

        const nowIso = new Date().toISOString();
        current.status = "success";
        current.providerStatus = String(data?.status || "success").trim();
        current.providerMessage = String(data?.gateway_response || "Payment confirmed via webhook.").trim();
        current.amountKobo = Number(data?.amount) || current.amountKobo;
        current.currency = String(data?.currency || current.currency || runtimeConfig.givingCurrency).trim().toUpperCase() || runtimeConfig.givingCurrency;
        current.paidAt = safeIsoString(data?.paid_at || nowIso, nowIso);
        current.updatedAt = nowIso;
        current.timeline.push({
          event: "paystack.webhook.charge_success",
          status: "success",
          at: nowIso,
          payloadHash: hashPayload(data),
        });

        await updateGivingTransaction(current);
        console.log(`[giving] Webhook processed: charge.success for reference=${reference}.`);
      } catch (err: any) {
        console.error(`[giving] Webhook handler error for reference=${reference}:`, err?.message || err);
      }
    } else {
      // Log unhandled event types for visibility but don't fail.
      console.log(`[giving] Webhook received unhandled event: ${eventType}`);
    }
  }
);

export default router;
