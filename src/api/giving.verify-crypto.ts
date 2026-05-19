import express from "express";
import { getGivingRuntimeConfig } from "./giving.config.js";
import {
  getTransactionByReference,
  updateGivingTransaction,
  findTransactionByTxHashDb,
  toGivingConfirmation,
  hashPayload,
} from "./giving.db.js";

let cryptoVerificationQueue: Promise<void> = Promise.resolve();

const withCryptoVerificationLock = async <T>(fn: () => Promise<T>): Promise<T> => {
  const previousQueue = cryptoVerificationQueue;
  let releaseQueue!: () => void;
  cryptoVerificationQueue = new Promise<void>((resolve) => { releaseQueue = resolve; });
  await previousQueue;
  try {
    return await fn();
  } finally {
    releaseQueue();
  }
};

export const handleVerifyCrypto = async (req: express.Request, res: express.Response) => {
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
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getTransactionByHash", params: [txHash] }),
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
          event: "crypto.duplicate_hash", status: "failed", at: nowIso,
          payloadHash: hashPayload({ reference, txHash, duplicateReference: duplicate.reference }),
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
        event: "crypto.verified", status: "success", at: nowIso,
        payloadHash: hashPayload(transaction),
      });
      await updateGivingTransaction(current);
      return res.json({ ok: true, message: "Transaction verified successfully!", data: toGivingConfirmation(current) });
    });
  } catch (error: any) {
    return res.status(503).json({ error: error?.message || "A server error occurred during verification." });
  }
};
