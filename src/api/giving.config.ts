import { loadProjectEnv } from "./load-env.js";

export type BankTransferDetail = { label: string; value: string };

export type BankTransferAccount = {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  instructions: string;
  details: BankTransferDetail[];
};

export type GivingRuntimeConfig = {
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
  cryptoEnabled: boolean;
};

export const cleanEnv = (value: unknown): string =>
  String(value || "").trim().replace(/^["'](.+)["']$/, "$1").trim();

const normalizeBankTransferDetails = (value: unknown): BankTransferDetail[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => ({ label: cleanEnv(item?.label), value: cleanEnv(item?.value) }))
      .filter((item) => item.label && item.value);
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([label, v]) => ({ label: cleanEnv(label), value: cleanEnv(v) }))
      .filter((item) => item.label && item.value);
  }
  return [];
};

const normalizeBankTransferAccount = (value: unknown, index: number): BankTransferAccount | null => {
  if (!value || typeof value !== "object") return null;
  const s = value as Record<string, unknown>;
  const bankName = cleanEnv(s.bankName || s.name);
  const accountName = cleanEnv(s.accountName);
  const accountNumber = cleanEnv(s.accountNumber);
  if (!bankName || !accountName || !accountNumber) return null;
  return {
    id: cleanEnv(s.id || s.slug || s.code) || `bank-${index + 1}`,
    bankName,
    accountName,
    accountNumber,
    instructions: cleanEnv(s.instructions || s.transferInstructions),
    details: normalizeBankTransferDetails(s.details || s.requiredDetails || s.bankDetails),
  };
};

const parseBankTransferAccounts = (raw: string): BankTransferAccount[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed) ? parsed : [parsed];
    return items
      .map((item, i) => normalizeBankTransferAccount(item, i))
      .filter((item): item is BankTransferAccount => Boolean(item));
  } catch {
    return [];
  }
};

const ensureUniqueBankTransferAccountIds = (accounts: BankTransferAccount[]): BankTransferAccount[] => {
  const seen = new Map<string, number>();
  return accounts.map((account, index) => {
    const baseId = cleanEnv(account.id) || `bank-${index + 1}`;
    const count = (seen.get(baseId) || 0) + 1;
    seen.set(baseId, count);
    return { ...account, id: count === 1 ? baseId : `${baseId}-${count}` };
  });
};

const parseLegacyBankDetails = (): BankTransferDetail[] => {
  const raw = cleanEnv(process.env.GIVING_BANK_DETAILS_JSON);
  if (!raw) return [];
  try { return normalizeBankTransferDetails(JSON.parse(raw)); } catch { return []; }
};

export const getGivingRuntimeConfig = (): GivingRuntimeConfig => {
  loadProjectEnv();
  const paystackPublicKey = cleanEnv(process.env.PAYSTACK_PUBLIC_KEY);
  const paystackSecretKey = cleanEnv(process.env.PAYSTACK_SECRET_KEY);
  const givingCurrency = cleanEnv(process.env.GIVING_CURRENCY || "NGN").toUpperCase() || "NGN";
  const givingCallbackUrl = cleanEnv(process.env.GIVING_CALLBACK_URL);
  // Canonical: GIVING_CRYPTO_WALLET_ADDRESS — ETHEREUM_WALLET_ADDRESS and CRYPTO_WALLET_ADDRESS are deprecated aliases.
  const ethereumWalletAddress = cleanEnv(
    process.env.GIVING_CRYPTO_WALLET_ADDRESS || process.env.ETHEREUM_WALLET_ADDRESS || process.env.CRYPTO_WALLET_ADDRESS
  );
  const bitcoinWalletAddress = cleanEnv(process.env.BITCOIN_WALLET_ADDRESS);
  const sepoliaRpcUrl = cleanEnv(process.env.GIVING_CRYPTO_RPC_URL || process.env.SEPOLIA_RPC_URL);
  // Canonical: GIVING_BANK_ACCOUNTS_JSON — GIVING_BANK_TRANSFER_ACCOUNTS_JSON, GIVING_BANK_OPTIONS_JSON, GIVING_BANKS_JSON are deprecated aliases.
  const bankAccountsFromJson = parseBankTransferAccounts(
    cleanEnv(
      process.env.GIVING_BANK_ACCOUNTS_JSON ||
      process.env.GIVING_BANK_TRANSFER_ACCOUNTS_JSON ||
      process.env.GIVING_BANK_OPTIONS_JSON ||
      process.env.GIVING_BANKS_JSON
    )
  );
  const legacyBank = normalizeBankTransferAccount(
    {
      id: "default-bank",
      bankName: process.env.GIVING_BANK_NAME,
      accountName: process.env.GIVING_BANK_ACCOUNT_NAME,
      accountNumber: process.env.GIVING_BANK_ACCOUNT_NUMBER,
      instructions: process.env.GIVING_BANK_TRANSFER_INSTRUCTIONS,
      details: parseLegacyBankDetails(),
    },
    0
  );
  const bankAccounts = ensureUniqueBankTransferAccountIds(
    bankAccountsFromJson.length > 0 ? bankAccountsFromJson : legacyBank ? [legacyBank] : []
  );
  const cryptoEnabled =
    ["1", "true", "yes"].includes(cleanEnv(process.env.GIVING_ENABLE_CRYPTO || "false").toLowerCase()) &&
    Boolean(ethereumWalletAddress || bitcoinWalletAddress);
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
    cryptoEnabled,
  };
};
