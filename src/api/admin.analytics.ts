import express from "express";
import { AdminAuditLogEntry } from "./types.js";
import { requireAdminPermission } from "./auth.middleware.js";
import { readStoredBlogPosts } from "./public-content.js";
import { paths, readJsonArray } from "./storage.js";

const router = express.Router();

const buildSegmentItems = (counts: Record<string, number>) => {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  return Object.entries(counts)
    .map(([label, count]) => ({
      label,
      count,
      share: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.count - a.count);
};

const incrementCount = (record: Record<string, number>, key: string) => {
  const normalized = key.trim() || "Unknown";
  record[normalized] = (record[normalized] || 0) + 1;
};

// GET /api/admin/analytics
router.get("/", requireAdminPermission("analytics:read"), async (req, res) => {
  const windowDays = Math.max(1, Math.min(365, Number(req.query.windowDays) || 30));
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [giving, blog, audit, rumEvents, contactSubmissions, subscribers] = await Promise.all([
    readJsonArray<any>(paths.givingTransactions),
    readStoredBlogPosts(),
    readJsonArray<AdminAuditLogEntry>(paths.adminAuditLog),
    readJsonArray<any>(paths.rumEvents),
    readJsonArray<any>(paths.contactSubmissions),
    readJsonArray<any>(paths.newsletterSubscribers),
  ]);

  const recentGiving = giving.filter((g: any) => new Date(g.initializedAt || g.updatedAt || 0) >= since);
  const successfulGiving = recentGiving.filter((g: any) => g.status === "success");
  const totalGivingKobo = successfulGiving.reduce((sum: number, g: any) => sum + (Number(g.amountKobo) || 0), 0);
  const recentAudit = audit.filter((a) => new Date(a.createdAt) >= since);
  const recentRum = rumEvents.filter((entry: any) => new Date(entry.timestamp || 0) >= since);
  const recentContacts = contactSubmissions.filter((entry: any) => new Date(entry.createdAt || 0) >= since);
  const activeSubscribers = subscribers.filter((entry: any) => String(entry.status || "active").trim().toLowerCase() !== "unsubscribed");
  const recentSubscribers = activeSubscribers.filter((entry: any) => new Date(entry.subscribedAt || entry.updatedAt || 0) >= since);
  const sundayOfferingCtaClicks = recentRum.filter((entry: any) => entry.metric === "SUNDAY_OFFERING_CTA_CLICK").length;
  const sundayOfferingInitializations = recentRum.filter((entry: any) => entry.metric === "SUNDAY_OFFERING_INITIALIZED").length;
  const uniqueRoutes = new Set(recentRum.map((entry: any) => String(entry.route || "").trim()).filter(Boolean)).size;

  const timelineMap = new Map<string, { day: string; pageViews: number; contacts: number }>();
  for (let index = windowDays - 1; index >= 0; index -= 1) {
    const day = new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    timelineMap.set(day, { day, pageViews: 0, contacts: 0 });
  }
  recentRum.forEach((entry: any) => {
    const day = new Date(entry.timestamp || 0).toISOString().slice(0, 10);
    const bucket = timelineMap.get(day);
    if (bucket) bucket.pageViews += 1;
  });
  recentContacts.forEach((entry: any) => {
    const day = new Date(entry.createdAt || 0).toISOString().slice(0, 10);
    const bucket = timelineMap.get(day);
    if (bucket) bucket.contacts += 1;
  });

  const trafficByRoute: Record<string, number> = {};
  const performanceRatings: Record<string, number> = {};
  const trafficSources: Record<string, number> = {};
  const contactSubjects: Record<string, number> = {};
  const subscriberSources: Record<string, number> = {};
  const givingByFund: Record<string, number> = {};
  const givingByStatus: Record<string, number> = {};
  const givingBySource: Record<string, number> = {};

  recentRum.forEach((entry: any) => {
    incrementCount(trafficByRoute, String(entry.route || "Unknown route"));
    incrementCount(performanceRatings, String(entry.rating || "unknown"));
    incrementCount(trafficSources, String(entry.source || "unknown"));
  });
  recentContacts.forEach((entry: any) => {
    incrementCount(contactSubjects, String(entry.subjectLabel || entry.subject || "General"));
  });
  activeSubscribers.forEach((entry: any) => {
    incrementCount(subscriberSources, String(entry.source || "website"));
  });
  recentGiving.forEach((entry: any) => {
    incrementCount(givingByFund, String(entry.fund || "general"));
    incrementCount(givingByStatus, String(entry.status || "pending"));
    incrementCount(givingBySource, String(entry.source || "website"));
  });

  return res.json({
    generatedAt: new Date().toISOString(),
    windowDays,
    overview: {
      pageViews: recentRum.length,
      uniqueRoutes,
      activeSubscribers: activeSubscribers.length,
      contactSubmissions: recentContacts.length,
      givingSuccessfulTransactions: successfulGiving.length,
      sundayOfferingCtaClicks,
      totalGivingNaira: totalGivingKobo / 100,
      publishedBlogPosts: blog.filter((entry: any) => entry.status === "published").length,
      auditEvents: recentAudit.length,
    },
    trends: {
      pageViews: null, uniqueRoutes: null, newSubscribers: null,
      contactSubmissions: null, givingSuccessfulTransactions: null, sundayOfferingCtaClicks: null,
    },
    timeline: Array.from(timelineMap.values()),
    segments: {
      trafficByRoute: buildSegmentItems(trafficByRoute),
      performanceRatings: buildSegmentItems(performanceRatings),
      trafficSources: buildSegmentItems(trafficSources),
      contactSubjects: buildSegmentItems(contactSubjects),
      subscriberSources: buildSegmentItems(subscriberSources),
      givingByFund: buildSegmentItems(givingByFund),
      givingByStatus: buildSegmentItems(givingByStatus),
      givingBySource: buildSegmentItems(givingBySource),
      sundayOfferingFunnel: buildSegmentItems({
        "CTA Clicks": sundayOfferingCtaClicks,
        "Payment Initialized": sundayOfferingInitializations,
        "Successful Giving": successfulGiving.filter((entry: any) => String(entry.fund || "") === "sunday-offering").length,
      }),
    },
  });
});

export default router;
