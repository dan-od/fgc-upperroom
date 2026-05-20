import express from "express";
import crypto from "node:crypto";
import { ContactSubmission, RumMetricEvent } from "./types.js";
import { getPublicBlogPosts, getPublicSermonVideos, getPublicTestimonies } from "./public-content.js";
import { paths, readJsonArray, writeJsonArray } from "./storage.js";
import { createRateLimit } from "./middleware/rateLimit.js";

const contactRateLimit = createRateLimit(3, 60 * 60 * 1000, "Too many contact submissions. Please try again in an hour.");
const rumRateLimit = createRateLimit(60, 60 * 1000, "Too many events. Please slow down.");

const router = express.Router();

const summarizeRumEvents = (events: RumMetricEvent[]) => {
  const byMetric = events.reduce<Record<string, { count: number; average: number; latest: string }>>((summary, event) => {
    const metric = String(event.metric || "unknown").trim() || "unknown";
    const current = summary[metric] || { count: 0, average: 0, latest: event.timestamp };
    const nextCount = current.count + 1;
    const nextAverage = ((current.average * current.count) + Number(event.value || 0)) / nextCount;

    summary[metric] = {
      count: nextCount,
      average: Number(nextAverage.toFixed(metric === "CLS" ? 4 : 2)),
      latest: event.timestamp,
    };

    return summary;
  }, {});

  return Object.entries(byMetric)
    .map(([metric, stats]) => ({ metric, ...stats }))
    .sort((a, b) => a.metric.localeCompare(b.metric));
};

router.post("/contact/submit", contactRateLimit, async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "").trim();
  const phoneNumber = String(req.body?.phoneNumber || "").trim();
  const subject = String(req.body?.subject || "General").trim() || "General";
  const message = String(req.body?.message || "").trim();
  const source = String(req.body?.source || "website").trim() || "website";

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Please provide name, email, and message." });
  }

  const submissions = await readJsonArray<ContactSubmission>(paths.contactSubmissions);
  const entry: ContactSubmission = {
    id: crypto.randomUUID(),
    ticketId: `TIC-${Date.now()}`,
    name,
    email,
    phoneNumber,
    subject,
    subjectLabel: subject,
    message,
    source,
    createdAt: new Date().toISOString(),
    autoResponseMessage: "Thank you for contacting us!",
  };

  submissions.unshift(entry);
  await writeJsonArray(paths.contactSubmissions, submissions.slice(0, 5000));

  return res.json({
    ok: true,
    ticketId: entry.ticketId,
    message: "Thank you for contacting us. We will get back to you shortly.",
  });
});

router.post("/observability/rum", rumRateLimit, async (req, res) => {
  const entry: RumMetricEvent = {
    id: crypto.randomUUID(),
    metric: String(req.body?.metric || "").trim(),
    value: Number(req.body?.value || 0),
    rating: String(req.body?.rating || "").trim(),
    page: String(req.body?.page || "").trim(),
    route: String(req.body?.route || "").trim(),
    source: String(req.body?.source || "").trim(),
    userAgent: String(req.body?.userAgent || req.headers["user-agent"] || "").trim(),
    timestamp: new Date().toISOString(),
  };

  const events = await readJsonArray<RumMetricEvent>(paths.rumEvents);
  events.push(entry);
  await writeJsonArray(paths.rumEvents, events.slice(-5000));

  return res.json({ ok: true });
});

router.get("/observability/rum", async (_req, res) => {
  const events = await readJsonArray<RumMetricEvent>(paths.rumEvents);
  return res.json({
    total: events.length,
    data: summarizeRumEvents(events.slice(-1000)),
  });
});

router.get("/blog", async (_req, res) => {
  const posts = await getPublicBlogPosts();
  return res.json({ data: posts });
});

router.get("/testimonies", async (_req, res) => {
  const testimonies = await getPublicTestimonies();
  return res.json({ data: testimonies });
});

router.get("/live/status", async (_req, res) => {
  const sermons = await getPublicSermonVideos();
  const latest = sermons[0] || null;
  const hasYouTubeSetup = Boolean(process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_CHANNEL_ID);

  return res.json({
    live: false,
    isLive: false,
    title: "Offline",
    viewers: 0,
    stream: null,
    latest,
    setupRequired: !hasYouTubeSetup && sermons.length === 0,
  });
});

router.get("/vod", async (req, res) => {
  const sermons = await getPublicSermonVideos();
  const limit = Math.max(1, Math.min(24, Number(req.query.limit) || 12));
  return res.json({ data: sermons.slice(0, limit) });
});

router.get("/sermons", async (_req, res) => {
  const sermons = await getPublicSermonVideos();
  const hasYouTubeSetup = Boolean(process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_CHANNEL_ID);

  return res.json({
    data: sermons,
    setupRequired: !hasYouTubeSetup && sermons.length === 0,
  });
});

export default router;
