import express from "express";
import crypto from "node:crypto";
import { requireAdminAuth } from "./auth.middleware.js";
import { paths, readJsonArray, writeJsonArray } from "./storage.js";

const router = express.Router();

const normalizeEmail = (value: unknown) => String(value || "").trim().toLowerCase();

router.post("/subscribe", async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const email = normalizeEmail(req.body?.email);
  const phoneNumber = String(req.body?.phoneNumber || "").trim();
  const source = String(req.body?.source || "website").trim() || "website";

  if (!name || !email || !email.includes("@")) {
    return res.status(400).json({ error: "Please provide a valid name and email address." });
  }

  const subscribers = await readJsonArray<Record<string, unknown>>(paths.newsletterSubscribers);
  const nowIso = new Date().toISOString();
  const existingIndex = subscribers.findIndex((entry) => normalizeEmail(entry.email) === email);

  const nextRecord = {
    id: existingIndex >= 0 ? String(subscribers[existingIndex].id || crypto.randomUUID()) : crypto.randomUUID(),
    name,
    email,
    phoneNumber,
    source,
    status: "active",
    subscribedAt: existingIndex >= 0
      ? String(subscribers[existingIndex].subscribedAt || nowIso)
      : nowIso,
    updatedAt: nowIso,
  };

  if (existingIndex >= 0) {
    subscribers[existingIndex] = {
      ...subscribers[existingIndex],
      ...nextRecord,
    };
  } else {
    subscribers.unshift(nextRecord);
  }

  await writeJsonArray(paths.newsletterSubscribers, subscribers);
  return res.json({
    ok: true,
    message: existingIndex >= 0
      ? "You are already subscribed for email updates."
      : "You are subscribed for event email updates.",
    data: nextRecord,
  });
});

router.post("/sync-event", requireAdminAuth, async (req, res) => {
  const event = req.body?.event;
  if (!event || typeof event !== "object") {
    return res.status(400).json({ error: "Expected body.event to be an object." });
  }

  const subscribers = await readJsonArray<Record<string, unknown>>(paths.newsletterSubscribers);
  const activeSubscribers = subscribers.filter((entry) => String(entry.status || "active").trim().toLowerCase() !== "unsubscribed");
  const logEntries = await readJsonArray<Record<string, unknown>>(paths.eventEmailSyncLog);
  const entry = {
    id: crypto.randomUUID(),
    eventId: String(event.id || "").trim(),
    eventTitle: String(event.title || "Untitled Event").trim() || "Untitled Event",
    recipientCount: activeSubscribers.length,
    syncedAt: new Date().toISOString(),
  };

  logEntries.unshift(entry);
  await writeJsonArray(paths.eventEmailSyncLog, logEntries.slice(0, 1000));

  return res.json({
    ok: true,
    recipientCount: activeSubscribers.length,
    message: `Event communication audience synced for ${activeSubscribers.length} recipients.`,
    data: entry,
  });
});

router.get("/subscribers", requireAdminAuth, async (_req, res) => {
  const subscribers = await readJsonArray(paths.newsletterSubscribers);
  return res.json({ data: subscribers });
});

export default router;
