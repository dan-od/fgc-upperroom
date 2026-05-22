import crypto from "node:crypto";
import express from "express";
import { getGivingRuntimeConfig, cleanEnv } from "./giving.config.js";
import {
  getTransactionByReference,
  updateGivingTransaction,
  safeIsoString,
  hashPayload,
} from "./giving.db.js";
import type { GivingTransaction } from "./types.js";

export const notifyBotGivingSuccess = async (tx: GivingTransaction): Promise<void> => {
  const botApiUrl = cleanEnv(process.env.BOT_API_URL);
  const botAdminKey = cleanEnv(process.env.BOT_ADMIN_API_KEY);
  if (!botApiUrl || !botAdminKey) return;
  try {
    const response = await fetch(`${botApiUrl}/bot/api/giving/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-bot-admin-key": botAdminKey },
      body: JSON.stringify({
        reference: tx.reference,
        amount_kobo: tx.amountKobo,
        currency: tx.currency,
        fund: tx.fund,
        donor_name: tx.donorName,
        donor_phone: tx.donorPhone,
        paid_at: tx.paidAt,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      console.warn(`[giving] Bot notification failed (status ${response.status}) for reference=${tx.reference}`);
    }
  } catch (err: any) {
    console.warn(`[giving] Bot notification error for reference=${tx.reference}:`, err?.message);
  }
};

// Paystack POSTs charge events here. We validate HMAC-SHA512 before touching
// any data. Must use express.raw() so req.body is a Buffer for signature verification.
export const webhookHandler: express.RequestHandler = async (req, res) => {
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

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
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

  const webhookMaxAgeMs = Number(process.env.WEBHOOK_MAX_AGE_MS) || 300_000;
  const eventTimestamp = event?.data?.paid_at || event?.data?.created_at;
  if (eventTimestamp) {
    const eventTime = new Date(String(eventTimestamp)).getTime();
    if (!Number.isNaN(eventTime) && Date.now() - eventTime > webhookMaxAgeMs) {
      console.warn(
        `[giving] Webhook rejected — event too old (${Math.round((Date.now() - eventTime) / 1000)}s). reference=${event?.data?.reference}`
      );
      return res.sendStatus(400);
    }
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
      if (current.status === "success") return; // idempotent

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
      void notifyBotGivingSuccess(current);
    } catch (err: any) {
      console.error(`[giving] Webhook handler error for reference=${reference}:`, err?.message || err);
    }
  } else {
    console.log(`[giving] Webhook received unhandled event: ${eventType}`);
  }
};
