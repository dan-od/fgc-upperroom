import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import path from "node:path";
import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import multer from "multer";

dotenv.config();

const DEFAULT_MEDIA_THUMBNAIL = "/assets/media/Senior Pastor.jpeg";
const MEDIA_DATA_DIR = path.join(process.cwd(), "data");
const MEDIA_JSON_PATH = path.join(MEDIA_DATA_DIR, "admin-media.json");
const NEWSLETTER_JSON_PATH = path.join(MEDIA_DATA_DIR, "newsletter-subscribers.json");
const EVENT_EMAIL_SYNC_LOG_PATH = path.join(MEDIA_DATA_DIR, "event-email-sync-log.json");
const CONTACT_SUBMISSIONS_JSON_PATH = path.join(MEDIA_DATA_DIR, "contact-submissions.json");
const RUM_EVENTS_JSON_PATH = path.join(MEDIA_DATA_DIR, "rum-events.json");
const ADMIN_USERS_JSON_PATH = path.join(MEDIA_DATA_DIR, "admin-users.json");
const ADMIN_SESSIONS_JSON_PATH = path.join(MEDIA_DATA_DIR, "admin-sessions.json");
const ADMIN_AUDIT_LOG_JSON_PATH = path.join(MEDIA_DATA_DIR, "admin-audit-log.json");
const ADMIN_RESET_TOKENS_JSON_PATH = path.join(MEDIA_DATA_DIR, "admin-reset-tokens.json");
const MEDIA_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "media");
const BOT_API_BASE = String(process.env.BOT_API_URL || "http://localhost:4100").replace(/\/+$/, "");
const CONTACT_AUTORESPONSE_WEBHOOK_URL = String(process.env.CONTACT_AUTORESPONSE_WEBHOOK_URL || "").trim();
const CONTACT_ADMIN_NOTIFICATION_WEBHOOK_URL = String(process.env.CONTACT_ADMIN_NOTIFICATION_WEBHOOK_URL || "").trim();

const CONTACT_SUBJECT_LABELS: Record<string, string> = {
  general: "General Inquiry",
  visit: "Plan a Visit",
  prayer: "Prayer Request",
  join: "Join a Department",
  other: "Other",
};

type NewsletterSubscriber = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  source: string;
  isSubscribed: boolean;
  createdAt: string;
  updatedAt: string;
};

type EventEmailSyncRecord = {
  id: string;
  createdAt: string;
  event: {
    id: string;
    title: string;
    date: string;
    time: string;
    location: string;
    description: string;
  };
  recipientCount: number;
  recipients: Array<{ email: string; name: string; source: string }>;
};

type ContactSubmission = {
  id: string;
  ticketId: string;
  name: string;
  email: string;
  phoneNumber: string;
  subject: string;
  subjectLabel: string;
  message: string;
  source: string;
  createdAt: string;
  autoResponseMessage: string;
};

type RumMetricEvent = {
  id: string;
  metric: string;
  value: number;
  rating: string;
  page: string;
  route: string;
  source: string;
  userAgent: string;
  timestamp: string;
};

type AdminRole = "super_admin" | "editor" | "reviewer";

type AdminUserRecord = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  passwordHash: string;
  passwordSalt: string;
  isActive: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  pendingTwoFactorSecret: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
};

type AdminSessionRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
};

type AdminAuditLogEntry = {
  id: string;
  actorUserId: string | null;
  actorEmail: string | null;
  actorRole: AdminRole | null;
  action: string;
  resource: string;
  ip: string;
  userAgent: string;
  details: Record<string, unknown>;
  createdAt: string;
};

type AdminResetTokenRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
};

type UploadedMediaFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 25,
  },
});

const ensureMediaStorage = async () => {
  await fs.mkdir(MEDIA_DATA_DIR, { recursive: true });
  await fs.mkdir(MEDIA_UPLOAD_DIR, { recursive: true });

  try {
    await fs.access(MEDIA_JSON_PATH);
  } catch {
    await fs.writeFile(MEDIA_JSON_PATH, "[]", "utf8");
  }

  try {
    await fs.access(NEWSLETTER_JSON_PATH);
  } catch {
    await fs.writeFile(NEWSLETTER_JSON_PATH, "[]", "utf8");
  }

  try {
    await fs.access(EVENT_EMAIL_SYNC_LOG_PATH);
  } catch {
    await fs.writeFile(EVENT_EMAIL_SYNC_LOG_PATH, "[]", "utf8");
  }

  try {
    await fs.access(CONTACT_SUBMISSIONS_JSON_PATH);
  } catch {
    await fs.writeFile(CONTACT_SUBMISSIONS_JSON_PATH, "[]", "utf8");
  }

  try {
    await fs.access(RUM_EVENTS_JSON_PATH);
  } catch {
    await fs.writeFile(RUM_EVENTS_JSON_PATH, "[]", "utf8");
  }

  try {
    await fs.access(ADMIN_USERS_JSON_PATH);
  } catch {
    await fs.writeFile(ADMIN_USERS_JSON_PATH, "[]", "utf8");
  }

  try {
    await fs.access(ADMIN_SESSIONS_JSON_PATH);
  } catch {
    await fs.writeFile(ADMIN_SESSIONS_JSON_PATH, "[]", "utf8");
  }

  try {
    await fs.access(ADMIN_AUDIT_LOG_JSON_PATH);
  } catch {
    await fs.writeFile(ADMIN_AUDIT_LOG_JSON_PATH, "[]", "utf8");
  }

  try {
    await fs.access(ADMIN_RESET_TOKENS_JSON_PATH);
  } catch {
    await fs.writeFile(ADMIN_RESET_TOKENS_JSON_PATH, "[]", "utf8");
  }
};

const readMediaItems = async () => {
  try {
    const raw = await fs.readFile(MEDIA_JSON_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeMediaItems = async (items: unknown[]) => {
  await fs.writeFile(MEDIA_JSON_PATH, JSON.stringify(items, null, 2), "utf8");
};

const readJsonArray = async <T>(filePath: string): Promise<T[]> => {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeJsonArray = async (filePath: string, value: unknown[]) => {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
};

const ADMIN_SESSION_TTL_HOURS = Math.max(1, Math.min(Number(process.env.ADMIN_SESSION_TTL_HOURS || 12), 72));
const ADMIN_RESET_TOKEN_TTL_MINUTES = Math.max(5, Math.min(Number(process.env.ADMIN_RESET_TOKEN_TTL_MINUTES || 30), 180));
const ADMIN_BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const ADMIN_ROLES: AdminRole[] = ["super_admin", "editor", "reviewer"];
const ADMIN_PERMISSION_BY_ROLE: Record<AdminRole, string[]> = {
  super_admin: ["*"],
  editor: [
    "content:blog:write",
    "content:blog:publish",
    "content:event:read",
    "content:event:write",
    "content:event:publish",
    "content:media:read",
    "content:media:write",
  ],
  reviewer: [
    "content:blog:read",
    "content:blog:approve",
    "content:event:read",
    "content:event:approve",
    "content:media:read",
    "audit:read",
  ],
};

const safeIsoString = (value: unknown, fallback = new Date().toISOString()) => {
  const parsed = new Date(String(value || ""));
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toISOString();
};

const sanitizeAdminRole = (value: unknown): AdminRole => {
  const normalized = String(value || "").trim().toLowerCase();
  if (ADMIN_ROLES.includes(normalized as AdminRole)) {
    return normalized as AdminRole;
  }
  return "editor";
};

const hashPassword = (password: string, salt = crypto.randomBytes(16).toString("hex")) => {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
  return { hash, salt };
};

const verifyPassword = (password: string, hash: string, salt: string) => {
  if (!password || !hash || !salt) return false;
  const calculated = hashPassword(password, salt).hash;
  const left = Buffer.from(calculated, "hex");
  const right = Buffer.from(hash, "hex");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

const generateBase32Secret = (bytes = 20) => {
  const source = crypto.randomBytes(bytes);
  let bits = "";
  for (const byte of source) {
    bits += byte.toString(2).padStart(8, "0");
  }

  let output = "";
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, "0");
    output += ADMIN_BASE32_ALPHABET[parseInt(chunk, 2)];
  }

  return output;
};

const decodeBase32 = (input: string) => {
  const normalized = String(input || "")
    .toUpperCase()
    .replace(/=+$/g, "")
    .replace(/[^A-Z2-7]/g, "");

  let bits = "";
  for (const char of normalized) {
    const idx = ADMIN_BASE32_ALPHABET.indexOf(char);
    if (idx < 0) continue;
    bits += idx.toString(2).padStart(5, "0");
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }

  return Buffer.from(bytes);
};

const generateTotpCode = (secret: string, timestampMs = Date.now(), periodSeconds = 30) => {
  const counter = Math.floor(timestampMs / 1000 / periodSeconds);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const secretBytes = decodeBase32(secret);
  const digest = crypto.createHmac("sha1", secretBytes).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
};

const verifyTotpCode = (secret: string, code: string, window = 1) => {
  const normalizedCode = String(code || "").replace(/\D/g, "");
  if (normalizedCode.length !== 6 || !secret) return false;
  const now = Date.now();
  for (let i = -window; i <= window; i++) {
    const candidate = generateTotpCode(secret, now + i * 30_000);
    if (candidate === normalizedCode) return true;
  }
  return false;
};

const sanitizeAdminUser = (item: Partial<AdminUserRecord>): AdminUserRecord | null => {
  if (!item?.id || !item?.email || !item?.passwordHash || !item?.passwordSalt) return null;

  return {
    id: String(item.id),
    email: normalizeEmail(item.email),
    name: String(item.name || "Admin User").trim() || "Admin User",
    role: sanitizeAdminRole(item.role),
    passwordHash: String(item.passwordHash || ""),
    passwordSalt: String(item.passwordSalt || ""),
    isActive: item.isActive !== false,
    twoFactorEnabled: Boolean(item.twoFactorEnabled),
    twoFactorSecret: item.twoFactorSecret ? String(item.twoFactorSecret) : null,
    pendingTwoFactorSecret: item.pendingTwoFactorSecret ? String(item.pendingTwoFactorSecret) : null,
    createdAt: safeIsoString(item.createdAt),
    updatedAt: safeIsoString(item.updatedAt),
    lastLoginAt: item.lastLoginAt ? safeIsoString(item.lastLoginAt) : null,
  };
};

const toAdminPublicUser = (user: AdminUserRecord) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  isActive: user.isActive,
  twoFactorEnabled: user.twoFactorEnabled,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  lastLoginAt: user.lastLoginAt,
});

const readAdminUsers = async () => {
  const rows = await readJsonArray<AdminUserRecord>(ADMIN_USERS_JSON_PATH);
  return rows.map((item) => sanitizeAdminUser(item)).filter(Boolean) as AdminUserRecord[];
};

const writeAdminUsers = async (users: AdminUserRecord[]) => {
  await writeJsonArray(ADMIN_USERS_JSON_PATH, users);
};

const readAdminSessions = async () => {
  const rows = await readJsonArray<AdminSessionRecord>(ADMIN_SESSIONS_JSON_PATH);
  const now = Date.now();
  const cleaned = rows
    .filter((item) => {
      const expiresAt = new Date(String(item?.expiresAt || "")).getTime();
      return Number.isFinite(expiresAt) && expiresAt > now && item?.tokenHash && item?.userId;
    })
    .map((item) => ({
      id: String(item.id),
      userId: String(item.userId),
      tokenHash: String(item.tokenHash),
      createdAt: safeIsoString(item.createdAt),
      updatedAt: safeIsoString(item.updatedAt),
      expiresAt: safeIsoString(item.expiresAt),
    }));

  if (cleaned.length !== rows.length) {
    await writeJsonArray(ADMIN_SESSIONS_JSON_PATH, cleaned);
  }

  return cleaned;
};

const writeAdminSessions = async (sessions: AdminSessionRecord[]) => {
  await writeJsonArray(ADMIN_SESSIONS_JSON_PATH, sessions);
};

const readAdminResetTokens = async () => {
  const rows = await readJsonArray<AdminResetTokenRecord>(ADMIN_RESET_TOKENS_JSON_PATH);
  const now = Date.now();
  const cleaned = rows
    .filter((item) => {
      const expiresAt = new Date(String(item?.expiresAt || "")).getTime();
      return Number.isFinite(expiresAt) && expiresAt > now && item?.tokenHash && item?.userId && !item?.usedAt;
    })
    .map((item) => ({
      id: String(item.id),
      userId: String(item.userId),
      tokenHash: String(item.tokenHash),
      createdAt: safeIsoString(item.createdAt),
      expiresAt: safeIsoString(item.expiresAt),
      usedAt: item.usedAt ? safeIsoString(item.usedAt) : null,
    }));

  if (cleaned.length !== rows.length) {
    await writeJsonArray(ADMIN_RESET_TOKENS_JSON_PATH, cleaned);
  }

  return cleaned;
};

const writeAdminResetTokens = async (tokens: AdminResetTokenRecord[]) => {
  await writeJsonArray(ADMIN_RESET_TOKENS_JSON_PATH, tokens);
};

const hasPermission = (role: AdminRole, permission: string) => {
  const rolePermissions = ADMIN_PERMISSION_BY_ROLE[role] || [];
  return rolePermissions.includes("*") || rolePermissions.includes(permission);
};

const getRequestIp = (req: express.Request) => {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  if (forwarded) return forwarded;
  return req.socket?.remoteAddress || "";
};

const appendAdminAuditLog = async (
  actor: { id: string; email: string; role: AdminRole } | null,
  action: string,
  resource: string,
  details: Record<string, unknown>,
  req: express.Request
) => {
  const records = await readJsonArray<AdminAuditLogEntry>(ADMIN_AUDIT_LOG_JSON_PATH);
  const entry: AdminAuditLogEntry = {
    id: crypto.randomUUID(),
    actorUserId: actor?.id || null,
    actorEmail: actor?.email || null,
    actorRole: actor?.role || null,
    action: String(action || "unknown"),
    resource: String(resource || "unknown"),
    ip: getRequestIp(req),
    userAgent: String(req.headers["user-agent"] || "").slice(0, 180),
    details: details || {},
    createdAt: new Date().toISOString(),
  };
  const next = [entry, ...records].slice(0, 3000);
  await writeJsonArray(ADMIN_AUDIT_LOG_JSON_PATH, next);
};

const getAdminTokenFromRequest = (req: express.Request) => {
  const headerValue = String(req.headers.authorization || "").trim();
  if (headerValue.toLowerCase().startsWith("bearer ")) {
    return headerValue.slice(7).trim();
  }
  const alt = String(req.headers["x-admin-token"] || "").trim();
  return alt || "";
};

const sanitizePassword = (value: unknown) => String(value || "").trim();

const validateStrongPassword = (password: string) => {
  if (password.length < 10) return "Password must be at least 10 characters.";
  if (!/[a-z]/.test(password)) return "Password must include a lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter.";
  if (!/\d/.test(password)) return "Password must include a number.";
  return null;
};

const buildAdminSession = (userId: string, tokenHashValue: string): AdminSessionRecord => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ADMIN_SESSION_TTL_HOURS * 60 * 60 * 1000);
  return {
    id: crypto.randomUUID(),
    userId,
    tokenHash: tokenHashValue,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
};

const ensureSeedAdminUser = async () => {
  const users = await readAdminUsers();
  const email = normalizeEmail(process.env.ADMIN_DEFAULT_EMAIL || process.env.ADMIN_EMAIL || "admin@upperroom.local");
  const password = String(
    process.env.ADMIN_DEFAULT_PASSWORD || process.env.ADMIN_PASSWORD || process.env.VITE_ADMIN_PASSWORD || "admin123"
  ).trim();
  const passwordValidation = validateStrongPassword(password);

  // Keep startup resilient in dev, but require non-empty password.
  const finalPassword = passwordValidation ? `${password}A1!` : password;

  if (users.some((item) => item.role === "super_admin" && item.isActive)) {
    const singleUser = users.length === 1 ? users[0] : null;
    const canSyncSingleSeedUser = Boolean(
      singleUser &&
      singleUser.role === "super_admin" &&
      singleUser.isActive &&
      !singleUser.lastLoginAt
    );

    if (canSyncSingleSeedUser && singleUser) {
      const needsEmailUpdate = singleUser.email !== email;
      const needsPasswordUpdate = !verifyPassword(finalPassword, singleUser.passwordHash, singleUser.passwordSalt);

      if (needsEmailUpdate || needsPasswordUpdate) {
        const hashed = hashPassword(finalPassword);
        const now = new Date().toISOString();
        users[0] = {
          ...singleUser,
          email,
          passwordHash: hashed.hash,
          passwordSalt: hashed.salt,
          updatedAt: now,
        };
        await writeAdminUsers(users);
      }
    }

    return;
  }

  const hashed = hashPassword(finalPassword);
  const now = new Date().toISOString();

  const seedUser: AdminUserRecord = {
    id: crypto.randomUUID(),
    email,
    name: "Primary Admin",
    role: "super_admin",
    passwordHash: hashed.hash,
    passwordSalt: hashed.salt,
    isActive: true,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    pendingTwoFactorSecret: null,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
  };

  await writeAdminUsers([seedUser, ...users]);
};

const readRumEvents = async () => readJsonArray<RumMetricEvent>(RUM_EVENTS_JSON_PATH);

const writeRumEvents = async (events: RumMetricEvent[]) => {
  await writeJsonArray(RUM_EVENTS_JSON_PATH, events.slice(0, 2500));
};

const summarizeRum = (events: RumMetricEvent[]) => {
  const buckets = new Map<string, number[]>();

  for (const item of events) {
    if (!item?.metric || typeof item.value !== "number" || Number.isNaN(item.value)) continue;
    const values = buckets.get(item.metric) || [];
    values.push(item.value);
    buckets.set(item.metric, values);
  }

  const byMetric = Array.from(buckets.entries()).map(([metric, values]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const p75Index = Math.max(0, Math.ceil(0.75 * sorted.length) - 1);
    const p95Index = Math.max(0, Math.ceil(0.95 * sorted.length) - 1);
    return {
      metric,
      count: sorted.length,
      p75: Number(sorted[p75Index].toFixed(2)),
      p95: Number(sorted[p95Index].toFixed(2)),
    };
  });

  return {
    count: events.length,
    byMetric,
    latest: events[0]?.timestamp || null,
  };
};

const DAY_MS = 24 * 60 * 60 * 1000;

const normalizeWindowDays = (raw: unknown, fallback = 30) => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.round(parsed);
  return Math.min(180, Math.max(7, rounded));
};

const parseTimestamp = (value: unknown) => {
  const time = new Date(String(value || "")).getTime();
  return Number.isFinite(time) ? time : NaN;
};

const isInRecentDays = (value: unknown, days: number, now = Date.now()) => {
  const time = parseTimestamp(value);
  if (!Number.isFinite(time)) return false;
  return time >= now - days * DAY_MS && time <= now;
};

const isInPreviousDaysWindow = (value: unknown, days: number, now = Date.now()) => {
  const time = parseTimestamp(value);
  if (!Number.isFinite(time)) return false;
  return time >= now - days * 2 * DAY_MS && time < now - days * DAY_MS;
};

const toIsoDayKey = (value: unknown) => {
  const parsed = new Date(String(value || ""));
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};

const percentageChange = (current: number, previous: number) => {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous <= 0 && current <= 0) return 0;
  if (previous <= 0) return null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
};

const buildSegmentBuckets = (
  list: Array<{ label: string; count: number }>,
  options: { limit?: number; includeRemainder?: boolean; remainderLabel?: string } = {}
) => {
  const sorted = list.filter((item) => item.count > 0).sort((a, b) => b.count - a.count);
  const total = sorted.reduce((sum, item) => sum + item.count, 0);
  if (!total) return [];

  const limit = Math.max(1, Number(options.limit || sorted.length));
  const top = sorted.slice(0, limit);
  const output = top.map((item) => ({
    label: item.label,
    count: item.count,
    share: Number(((item.count / total) * 100).toFixed(1)),
  }));

  if (options.includeRemainder && sorted.length > limit) {
    const remainder = sorted.slice(limit).reduce((sum, item) => sum + item.count, 0);
    if (remainder > 0) {
      output.push({
        label: options.remainderLabel || "Other",
        count: remainder,
        share: Number(((remainder / total) * 100).toFixed(1)),
      });
    }
  }

  return output;
};

const normalizeEmail = (value: unknown) => String(value || "").trim().toLowerCase();

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const normalizeContactSubject = (value: unknown) => {
  const subject = String(value || "").trim().toLowerCase();
  return CONTACT_SUBJECT_LABELS[subject] ? subject : "other";
};

const normalizeContactMessage = (value: unknown) =>
  String(value || "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, 3000);

const normalizeContactPhone = (value: unknown) =>
  String(value || "")
    .replace(/[^\d+\-\s()]/g, "")
    .trim()
    .slice(0, 40);

const createContactTicketId = (date = new Date()) => {
  const y = String(date.getFullYear());
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const randomSuffix = Math.floor(Math.random() * 9000 + 1000);
  return `UR-${y}${m}${d}-${randomSuffix}`;
};

const buildAutoResponseMessage = (subject: string, name: string) => {
  const firstName = name.split(/\s+/).filter(Boolean)[0] || "there";

  if (subject === "prayer") {
    return `Thank you, ${firstName}. We have received your prayer request and our prayer team will stand with you in prayer. If this is urgent, please call +234 703 152 6399.`;
  }

  if (subject === "visit") {
    return `Thank you, ${firstName}. We would love to host you at Upper Room. A team member will follow up with service details and directions shortly.`;
  }

  if (subject === "join") {
    return `Thank you, ${firstName}. We have received your interest in serving and a unit leader will reach out to help you find where to plug in.`;
  }

  return `Thank you, ${firstName}. Your message has been received and our team will respond as soon as possible.`;
};

const postWebhookJson = async (url: string, payload: unknown) => {
  if (!url) return false;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch {
    return false;
  }
};

const dispatchContactWebhooks = async (submission: ContactSubmission) => {
  const basePayload = {
    event: "contact.submitted",
    submittedAt: submission.createdAt,
    ticketId: submission.ticketId,
    subject: submission.subject,
    subjectLabel: submission.subjectLabel,
    contact: {
      name: submission.name,
      email: submission.email,
      phoneNumber: submission.phoneNumber,
    },
    message: submission.message,
    autoResponseMessage: submission.autoResponseMessage,
    source: submission.source,
  };

  await Promise.all([
    postWebhookJson(CONTACT_AUTORESPONSE_WEBHOOK_URL, {
      ...basePayload,
      channel: "autoresponse",
    }),
    postWebhookJson(CONTACT_ADMIN_NOTIFICATION_WEBHOOK_URL, {
      ...basePayload,
      channel: "admin-notification",
    }),
  ]);
};

const dispatchPrayerRequestFromContact = async (submission: ContactSubmission) => {
  if (submission.subject !== "prayer") return;

  try {
    await fetch(`${BOT_API_BASE}/bot/api/prayer-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requesterName: submission.name,
        email: submission.email,
        phoneNumber: submission.phoneNumber,
        title: "Prayer Request (Contact Form)",
        requestText: submission.message,
        priority: "normal",
        isConfidential: true,
        source: "website-contact",
      }),
    });
  } catch {
    // Best-effort integration only: contact submission should still succeed.
  }
};

const readNewsletterSubscribers = async () => {
  const rows = await readJsonArray<NewsletterSubscriber>(NEWSLETTER_JSON_PATH);
  return rows
    .map((item) => ({
      ...item,
      email: normalizeEmail(item?.email),
      name: String(item?.name || "").trim(),
      phoneNumber: String(item?.phoneNumber || "").trim(),
      source: String(item?.source || "website").trim() || "website",
      isSubscribed: item?.isSubscribed !== false,
      createdAt: String(item?.createdAt || ""),
      updatedAt: String(item?.updatedAt || ""),
    }))
    .filter((item) => isValidEmail(item.email));
};

const upsertNewsletterSubscriber = async (input: {
  name?: unknown;
  email?: unknown;
  phoneNumber?: unknown;
  source?: unknown;
}) => {
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) {
    throw new Error("A valid email is required.");
  }

  const subscribers = await readNewsletterSubscribers();
  const nowIso = new Date().toISOString();
  const existingIndex = subscribers.findIndex((item) => item.email === email);

  const next: NewsletterSubscriber = {
    id: existingIndex >= 0 ? subscribers[existingIndex].id : crypto.randomUUID(),
    name: String(input.name || "").trim(),
    email,
    phoneNumber: String(input.phoneNumber || "").trim(),
    source: String(input.source || "website").trim() || "website",
    isSubscribed: true,
    createdAt: existingIndex >= 0 ? subscribers[existingIndex].createdAt : nowIso,
    updatedAt: nowIso,
  };

  if (existingIndex >= 0) {
    subscribers[existingIndex] = {
      ...subscribers[existingIndex],
      ...next,
    };
  } else {
    subscribers.unshift(next);
  }

  await writeJsonArray(NEWSLETTER_JSON_PATH, subscribers);
  return next;
};

const fetchBotVisitorEmailAudience = async () => {
  try {
    const response = await fetch(`${BOT_API_BASE}/bot/api/visitors`);
    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    const visitors = Array.isArray(payload?.visitors) ? payload.visitors : [];
    return visitors
      .map((item) => ({
        email: normalizeEmail(item?.email),
        name: String(item?.name || "").trim(),
      }))
      .filter((item) => isValidEmail(item.email));
  } catch {
    return [];
  }
};

const sanitizeFileName = (name: string) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "file";
};

const getAssetTypeFromMime = (mimeType: string) => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "image";
};

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  const API_ONLY = String(process.env.API_ONLY || "").toLowerCase() === "true";

  await ensureMediaStorage();
  await ensureSeedAdminUser();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "2mb" }));
  app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

  const apiRouter = express.Router();
  apiRouter.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });
  apiRouter.use((req, res, next) => {
    const startedAt = process.hrtime.bigint();
    res.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const log = {
        level: res.statusCode >= 500 ? "error" : "info",
        service: "fgc-upperroom-web-api",
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
        ts: new Date().toISOString(),
      };
      const text = JSON.stringify(log);
      if (res.statusCode >= 500) {
        console.error(text);
      } else {
        console.log(text);
      }
    });
    next();
  });

  type AuthenticatedRequest = express.Request & {
    adminUser?: AdminUserRecord;
    adminSession?: AdminSessionRecord;
  };

  const requireAdminAuth = async (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
    try {
      const token = getAdminTokenFromRequest(req);
      if (!token) {
        return res.status(401).json({ error: "Authentication required." });
      }

      const tokenHashValue = hashToken(token);
      const [sessions, users] = await Promise.all([readAdminSessions(), readAdminUsers()]);
      const session = sessions.find((item) => item.tokenHash === tokenHashValue);
      if (!session) {
        return res.status(401).json({ error: "Session not found or expired." });
      }

      const user = users.find((item) => item.id === session.userId && item.isActive);
      if (!user) {
        return res.status(401).json({ error: "Admin account is not active." });
      }

      req.adminSession = session;
      req.adminUser = user;
      next();
    } catch {
      return res.status(500).json({ error: "Unable to validate admin session." });
    }
  };

  const requireAdminPermission = (permission: string) => {
    return async (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
      await requireAdminAuth(req, res, () => {
        const role = req.adminUser?.role;
        if (!role || !hasPermission(role, permission)) {
          return res.status(403).json({ error: "Insufficient permissions." });
        }
        next();
      });
    };
  };

  const resolveActor = (req: AuthenticatedRequest) => {
    if (!req.adminUser) return null;
    return { id: req.adminUser.id, email: req.adminUser.email, role: req.adminUser.role };
  };

  apiRouter.post("/admin/auth/login", async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = sanitizePassword(req.body?.password);
    const otpCode = String(req.body?.otpCode || req.body?.otp || "").trim();

    if (!isValidEmail(email) || !password) {
      return res.status(400).json({ error: "Valid email and password are required." });
    }

    const users = await readAdminUsers();
    const userIndex = users.findIndex((item) => item.email === email);
    if (userIndex < 0) {
      return res.status(401).json({ error: "Invalid login credentials." });
    }

    const user = users[userIndex];
    if (!user.isActive || !verifyPassword(password, user.passwordHash, user.passwordSalt)) {
      return res.status(401).json({ error: "Invalid login credentials." });
    }

    if (user.twoFactorEnabled) {
      if (!otpCode) {
        return res.status(401).json({ error: "Two-factor code required.", code: "OTP_REQUIRED" });
      }

      const validOtp = verifyTotpCode(String(user.twoFactorSecret || ""), otpCode);
      if (!validOtp) {
        return res.status(401).json({ error: "Invalid two-factor code." });
      }
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHashValue = hashToken(rawToken);
    const sessions = await readAdminSessions();
    const nextSession = buildAdminSession(user.id, tokenHashValue);
    await writeAdminSessions([nextSession, ...sessions].slice(0, 3000));

    const now = new Date().toISOString();
    users[userIndex] = {
      ...user,
      lastLoginAt: now,
      updatedAt: now,
    };
    await writeAdminUsers(users);

    await appendAdminAuditLog(
      { id: user.id, email: user.email, role: user.role },
      "auth.login",
      "admin.auth",
      { twoFactorEnabled: user.twoFactorEnabled },
      req
    );

    return res.json({
      ok: true,
      token: rawToken,
      user: toAdminPublicUser(users[userIndex]),
      expiresAt: nextSession.expiresAt,
    });
  });

  apiRouter.post("/admin/auth/logout", requireAdminAuth, async (req: AuthenticatedRequest, res) => {
    const token = getAdminTokenFromRequest(req);
    const tokenHashValue = hashToken(token);
    const sessions = await readAdminSessions();
    const next = sessions.filter((item) => item.tokenHash !== tokenHashValue);
    await writeAdminSessions(next);

    await appendAdminAuditLog(resolveActor(req), "auth.logout", "admin.auth", {}, req);
    return res.json({ ok: true });
  });

  apiRouter.get("/admin/auth/me", requireAdminAuth, async (req: AuthenticatedRequest, res) => {
    return res.json({ ok: true, user: toAdminPublicUser(req.adminUser as AdminUserRecord) });
  });

  apiRouter.post("/admin/auth/change-password", requireAdminAuth, async (req: AuthenticatedRequest, res) => {
    const currentPassword = sanitizePassword(req.body?.currentPassword);
    const newPassword = sanitizePassword(req.body?.newPassword);
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "currentPassword and newPassword are required." });
    }

    const passwordError = validateStrongPassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const users = await readAdminUsers();
    const userIndex = users.findIndex((item) => item.id === req.adminUser?.id);
    if (userIndex < 0) return res.status(404).json({ error: "Admin user not found." });
    const currentUser = users[userIndex];

    if (!verifyPassword(currentPassword, currentUser.passwordHash, currentUser.passwordSalt)) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }

    const hashed = hashPassword(newPassword);
    users[userIndex] = {
      ...currentUser,
      passwordHash: hashed.hash,
      passwordSalt: hashed.salt,
      updatedAt: new Date().toISOString(),
    };
    await writeAdminUsers(users);

    await appendAdminAuditLog(resolveActor(req), "auth.password_changed", "admin.auth", {}, req);
    return res.json({ ok: true });
  });

  apiRouter.post("/admin/auth/password-reset/request", async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Valid email is required." });
    }

    const users = await readAdminUsers();
    const user = users.find((item) => item.email === email && item.isActive);
    if (!user) {
      return res.json({ ok: true, message: "If that account exists, reset instructions were generated." });
    }

    const rawToken = crypto.randomBytes(24).toString("hex");
    const tokenHashValue = hashToken(rawToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ADMIN_RESET_TOKEN_TTL_MINUTES * 60 * 1000);

    const records = await readAdminResetTokens();
    const nextRecord: AdminResetTokenRecord = {
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash: tokenHashValue,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      usedAt: null,
    };
    await writeAdminResetTokens([nextRecord, ...records].slice(0, 3000));

    await appendAdminAuditLog(
      { id: user.id, email: user.email, role: user.role },
      "auth.password_reset_requested",
      "admin.auth",
      {},
      req
    );

    const response: Record<string, unknown> = {
      ok: true,
      message: "Password reset token generated.",
    };
    if (process.env.NODE_ENV !== "production") {
      response.resetToken = rawToken;
      response.expiresAt = nextRecord.expiresAt;
    }
    return res.json(response);
  });

  apiRouter.post("/admin/auth/password-reset/confirm", async (req, res) => {
    const rawToken = sanitizePassword(req.body?.token);
    const newPassword = sanitizePassword(req.body?.newPassword);

    if (!rawToken || !newPassword) {
      return res.status(400).json({ error: "token and newPassword are required." });
    }

    const passwordError = validateStrongPassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const tokens = await readAdminResetTokens();
    const tokenHashValue = hashToken(rawToken);
    const tokenRecord = tokens.find((item) => item.tokenHash === tokenHashValue);
    if (!tokenRecord) {
      return res.status(400).json({ error: "Reset token is invalid or expired." });
    }

    const users = await readAdminUsers();
    const userIndex = users.findIndex((item) => item.id === tokenRecord.userId && item.isActive);
    if (userIndex < 0) {
      return res.status(404).json({ error: "Admin user not found." });
    }

    const hashed = hashPassword(newPassword);
    users[userIndex] = {
      ...users[userIndex],
      passwordHash: hashed.hash,
      passwordSalt: hashed.salt,
      updatedAt: new Date().toISOString(),
    };
    await writeAdminUsers(users);

    await writeAdminResetTokens(tokens.filter((item) => item.tokenHash !== tokenHashValue));

    await appendAdminAuditLog(
      { id: users[userIndex].id, email: users[userIndex].email, role: users[userIndex].role },
      "auth.password_reset_confirmed",
      "admin.auth",
      {},
      req
    );
    return res.json({ ok: true });
  });

  apiRouter.post("/admin/auth/2fa/setup", requireAdminAuth, async (req: AuthenticatedRequest, res) => {
    const users = await readAdminUsers();
    const userIndex = users.findIndex((item) => item.id === req.adminUser?.id);
    if (userIndex < 0) {
      return res.status(404).json({ error: "Admin user not found." });
    }

    const secret = generateBase32Secret();
    users[userIndex] = {
      ...users[userIndex],
      pendingTwoFactorSecret: secret,
      updatedAt: new Date().toISOString(),
    };
    await writeAdminUsers(users);

    const issuer = encodeURIComponent("FGC Upper Room");
    const label = encodeURIComponent(`FGC-Admin:${users[userIndex].email}`);
    const otpauthUrl = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&period=30`;

    await appendAdminAuditLog(resolveActor(req), "auth.2fa_setup_started", "admin.auth", {}, req);
    return res.json({ ok: true, secret, otpauthUrl });
  });

  apiRouter.post("/admin/auth/2fa/verify", requireAdminAuth, async (req: AuthenticatedRequest, res) => {
    const otpCode = String(req.body?.otpCode || req.body?.otp || "").trim();
    if (!otpCode) {
      return res.status(400).json({ error: "otpCode is required." });
    }

    const users = await readAdminUsers();
    const userIndex = users.findIndex((item) => item.id === req.adminUser?.id);
    if (userIndex < 0) {
      return res.status(404).json({ error: "Admin user not found." });
    }

    const user = users[userIndex];
    const candidateSecret = user.pendingTwoFactorSecret || user.twoFactorSecret || "";
    if (!candidateSecret) {
      return res.status(400).json({ error: "No two-factor setup in progress." });
    }

    const isValid = verifyTotpCode(candidateSecret, otpCode);
    if (!isValid) {
      return res.status(400).json({ error: "Invalid two-factor code." });
    }

    users[userIndex] = {
      ...user,
      twoFactorEnabled: true,
      twoFactorSecret: candidateSecret,
      pendingTwoFactorSecret: null,
      updatedAt: new Date().toISOString(),
    };
    await writeAdminUsers(users);

    await appendAdminAuditLog(resolveActor(req), "auth.2fa_enabled", "admin.auth", {}, req);
    return res.json({ ok: true, twoFactorEnabled: true });
  });

  apiRouter.post("/admin/auth/2fa/disable", requireAdminAuth, async (req: AuthenticatedRequest, res) => {
    const otpCode = String(req.body?.otpCode || req.body?.otp || "").trim();
    const user = req.adminUser as AdminUserRecord;
    if (user.twoFactorEnabled && !verifyTotpCode(String(user.twoFactorSecret || ""), otpCode)) {
      return res.status(400).json({ error: "Valid two-factor code is required to disable 2FA." });
    }

    const users = await readAdminUsers();
    const userIndex = users.findIndex((item) => item.id === req.adminUser?.id);
    if (userIndex < 0) {
      return res.status(404).json({ error: "Admin user not found." });
    }

    users[userIndex] = {
      ...users[userIndex],
      twoFactorEnabled: false,
      twoFactorSecret: null,
      pendingTwoFactorSecret: null,
      updatedAt: new Date().toISOString(),
    };
    await writeAdminUsers(users);

    await appendAdminAuditLog(resolveActor(req), "auth.2fa_disabled", "admin.auth", {}, req);
    return res.json({ ok: true, twoFactorEnabled: false });
  });

  apiRouter.get("/admin/users", requireAdminPermission("admin:users:manage"), async (_req: AuthenticatedRequest, res) => {
    const users = await readAdminUsers();
    return res.json({ count: users.length, users: users.map(toAdminPublicUser) });
  });

  apiRouter.post("/admin/users", requireAdminPermission("admin:users:manage"), async (req: AuthenticatedRequest, res) => {
    const email = normalizeEmail(req.body?.email);
    const name = String(req.body?.name || "").trim();
    const role = sanitizeAdminRole(req.body?.role);
    const password = sanitizePassword(req.body?.password);

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Valid email is required." });
    }

    if (!name) {
      return res.status(400).json({ error: "Name is required." });
    }

    const passwordError = validateStrongPassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const users = await readAdminUsers();
    if (users.some((item) => item.email === email)) {
      return res.status(409).json({ error: "An admin user with that email already exists." });
    }

    const hashed = hashPassword(password);
    const now = new Date().toISOString();
    const user: AdminUserRecord = {
      id: crypto.randomUUID(),
      email,
      name,
      role,
      passwordHash: hashed.hash,
      passwordSalt: hashed.salt,
      isActive: true,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      pendingTwoFactorSecret: null,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    };

    await writeAdminUsers([user, ...users]);
    await appendAdminAuditLog(resolveActor(req), "admin.user_created", "admin.users", { userId: user.id, role: user.role }, req);
    return res.status(201).json({ ok: true, user: toAdminPublicUser(user) });
  });

  apiRouter.patch("/admin/users/:id", requireAdminPermission("admin:users:manage"), async (req: AuthenticatedRequest, res) => {
    const targetId = String(req.params.id || "").trim();
    const users = await readAdminUsers();
    const userIndex = users.findIndex((item) => item.id === targetId);
    if (userIndex < 0) {
      return res.status(404).json({ error: "Admin user not found." });
    }

    const nextRole = req.body?.role ? sanitizeAdminRole(req.body.role) : users[userIndex].role;
    const nextActive = req.body?.isActive === undefined ? users[userIndex].isActive : Boolean(req.body?.isActive);
    const nextName = req.body?.name ? String(req.body.name).trim() : users[userIndex].name;

    users[userIndex] = {
      ...users[userIndex],
      role: nextRole,
      isActive: nextActive,
      name: nextName || users[userIndex].name,
      updatedAt: new Date().toISOString(),
    };
    await writeAdminUsers(users);

    await appendAdminAuditLog(
      resolveActor(req),
      "admin.user_updated",
      "admin.users",
      { userId: users[userIndex].id, role: users[userIndex].role, isActive: users[userIndex].isActive },
      req
    );
    return res.json({ ok: true, user: toAdminPublicUser(users[userIndex]) });
  });

  apiRouter.get("/admin/audit-log", requireAdminPermission("audit:read"), async (_req, res) => {
    const records = await readJsonArray<AdminAuditLogEntry>(ADMIN_AUDIT_LOG_JSON_PATH);
    return res.json({ count: records.length, records: records.slice(0, 500) });
  });

  apiRouter.post("/admin/audit-log", requireAdminAuth, async (req: AuthenticatedRequest, res) => {
    const action = String(req.body?.action || "").trim();
    const resource = String(req.body?.resource || "").trim();
    const details = req.body?.details && typeof req.body.details === "object" ? req.body.details : {};

    if (!action || !resource) {
      return res.status(400).json({ error: "action and resource are required." });
    }

    await appendAdminAuditLog(resolveActor(req), action, resource, details, req);
    return res.status(201).json({ ok: true });
  });

  apiRouter.get("/admin/analytics", requireAdminAuth, async (req: AuthenticatedRequest, res) => {
    const windowDays = normalizeWindowDays(req.query?.windowDays, 30);
    const now = Date.now();
    const timelineDays = Math.min(windowDays, 30);

    const [rumEvents, subscribers, contactSubmissions] = await Promise.all([
      readRumEvents(),
      readNewsletterSubscribers(),
      readJsonArray<ContactSubmission>(CONTACT_SUBMISSIONS_JSON_PATH),
    ]);

    const rumInWindow = rumEvents.filter((item) => isInRecentDays(item.timestamp, windowDays, now));
    const rumPreviousWindow = rumEvents.filter((item) => isInPreviousDaysWindow(item.timestamp, windowDays, now));
    const contactsInWindow = contactSubmissions.filter((item) => isInRecentDays(item.createdAt, windowDays, now));
    const contactsPreviousWindow = contactSubmissions.filter((item) => isInPreviousDaysWindow(item.createdAt, windowDays, now));
    const activeSubscribers = subscribers.filter((item) => item.isSubscribed);
    const newSubscribersInWindow = activeSubscribers.filter((item) => isInRecentDays(item.createdAt, windowDays, now));
    const newSubscribersPreviousWindow = activeSubscribers.filter((item) => isInPreviousDaysWindow(item.createdAt, windowDays, now));

    const routeCounts = new Map<string, number>();
    const ratingCounts = new Map<string, number>();
    const sourceCounts = new Map<string, number>();
    const contactSubjectCounts = new Map<string, number>();
    const subscriberSourceCounts = new Map<string, number>();
    const estimatedVisitorSessions = new Set<string>();

    for (const item of rumInWindow) {
      const route = String(item?.route || item?.page || "/").trim() || "/";
      routeCounts.set(route, (routeCounts.get(route) || 0) + 1);

      const source = String(item?.source || "web").trim() || "web";
      sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);

      const rating = String(item?.rating || "unknown").trim().toLowerCase() || "unknown";
      ratingCounts.set(rating, (ratingCounts.get(rating) || 0) + 1);

      const dayKey = toIsoDayKey(item.timestamp);
      const uaKey = String(item?.userAgent || "").trim().slice(0, 64) || "unknown-agent";
      if (dayKey) {
        estimatedVisitorSessions.add(`${dayKey}:${uaKey}`);
      }
    }

    for (const item of contactsInWindow) {
      const subjectLabel =
        String(item?.subjectLabel || "").trim() ||
        CONTACT_SUBJECT_LABELS[String(item?.subject || "").trim().toLowerCase()] ||
        "Other";
      contactSubjectCounts.set(subjectLabel, (contactSubjectCounts.get(subjectLabel) || 0) + 1);
    }

    for (const item of activeSubscribers) {
      const source = String(item?.source || "website").trim() || "website";
      subscriberSourceCounts.set(source, (subscriberSourceCounts.get(source) || 0) + 1);
    }

    const timelineMap = new Map<string, { day: string; pageViews: number; contacts: number; subscribers: number }>();
    for (let i = timelineDays - 1; i >= 0; i -= 1) {
      const day = new Date(now - i * DAY_MS).toISOString().slice(0, 10);
      timelineMap.set(day, { day, pageViews: 0, contacts: 0, subscribers: 0 });
    }

    for (const item of rumInWindow) {
      const day = toIsoDayKey(item.timestamp);
      const row = timelineMap.get(day);
      if (row) row.pageViews += 1;
    }

    for (const item of contactsInWindow) {
      const day = toIsoDayKey(item.createdAt);
      const row = timelineMap.get(day);
      if (row) row.contacts += 1;
    }

    for (const item of newSubscribersInWindow) {
      const day = toIsoDayKey(item.createdAt);
      const row = timelineMap.get(day);
      if (row) row.subscribers += 1;
    }

    const uniqueRoutesInWindow = routeCounts.size;
    const uniqueRoutesPreviousWindow = new Set(
      rumPreviousWindow.map((item) => String(item?.route || item?.page || "/").trim() || "/")
    ).size;

    return res.json({
      generatedAt: new Date().toISOString(),
      windowDays,
      overview: {
        pageViews: rumInWindow.length,
        uniqueRoutes: uniqueRoutesInWindow,
        estimatedVisitors: estimatedVisitorSessions.size,
        activeSubscribers: activeSubscribers.length,
        newSubscribers: newSubscribersInWindow.length,
        contactSubmissions: contactsInWindow.length,
      },
      trends: {
        pageViews: percentageChange(rumInWindow.length, rumPreviousWindow.length),
        uniqueRoutes: percentageChange(uniqueRoutesInWindow, uniqueRoutesPreviousWindow),
        newSubscribers: percentageChange(newSubscribersInWindow.length, newSubscribersPreviousWindow.length),
        contactSubmissions: percentageChange(contactsInWindow.length, contactsPreviousWindow.length),
      },
      rum: summarizeRum(rumInWindow),
      segments: {
        trafficByRoute: buildSegmentBuckets(
          Array.from(routeCounts.entries()).map(([label, count]) => ({ label, count })),
          { limit: 6, includeRemainder: true, remainderLabel: "Other routes" }
        ),
        performanceRatings: buildSegmentBuckets(
          Array.from(ratingCounts.entries()).map(([key, count]) => ({
            label: key === "needs-improvement" ? "Needs Improvement" : key.charAt(0).toUpperCase() + key.slice(1),
            count,
          }))
        ),
        trafficSources: buildSegmentBuckets(
          Array.from(sourceCounts.entries()).map(([label, count]) => ({ label, count })),
          { limit: 5, includeRemainder: true, remainderLabel: "Other sources" }
        ),
        contactSubjects: buildSegmentBuckets(
          Array.from(contactSubjectCounts.entries()).map(([label, count]) => ({ label, count }))
        ),
        subscriberSources: buildSegmentBuckets(
          Array.from(subscriberSourceCounts.entries()).map(([label, count]) => ({ label, count })),
          { limit: 5, includeRemainder: true, remainderLabel: "Other sources" }
        ),
      },
      timeline: Array.from(timelineMap.values()),
    });
  });

  apiRouter.get("/admin/media", async (_req, res) => {
    const items = await readMediaItems();
    res.json({ data: items });
  });

  apiRouter.put("/admin/media", requireAdminPermission("content:media:write"), async (req: AuthenticatedRequest, res) => {
    const items = req.body?.items;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "Expected body.items to be an array." });
    }

    await writeMediaItems(items);
    await appendAdminAuditLog(resolveActor(req), "content.media.saved", "admin.media", { count: items.length }, req);
    return res.json({ ok: true, count: items.length });
  });

  apiRouter.post(
    "/admin/media/upload",
    requireAdminPermission("content:media:write"),
    upload.array("files", 25),
    async (req: AuthenticatedRequest, res) => {
    const requestWithFiles = req as typeof req & { files?: UploadedMediaFile[] };
    const files = Array.isArray(requestWithFiles.files) ? requestWithFiles.files : [];

    if (!files.length) {
      return res.status(400).json({ error: "No files uploaded." });
    }

    const assets = await Promise.all(
      files.map(async (file, index) => {
        const ext = path.extname(file.originalname || "");
        const safeBase = sanitizeFileName(path.basename(file.originalname || "file", ext));
        const generatedName = `${Date.now()}-${crypto.randomUUID()}-${safeBase}${ext}`;
        const absolutePath = path.join(MEDIA_UPLOAD_DIR, generatedName);
        const publicUrl = `/uploads/media/${generatedName}`;
        const type = getAssetTypeFromMime(file.mimetype || "");

        await fs.writeFile(absolutePath, file.buffer);

        if (type === "video") {
          return {
            id: `asset-${Date.now()}-${index}`,
            type,
            src: publicUrl,
            thumbnail: DEFAULT_MEDIA_THUMBNAIL,
            alt: file.originalname,
            name: file.originalname,
            mimeType: file.mimetype,
            fileSize: file.size,
          };
        }

        if (type === "audio") {
          return {
            id: `asset-${Date.now()}-${index}`,
            type,
            audioUrl: publicUrl,
            src: "",
            thumbnail: DEFAULT_MEDIA_THUMBNAIL,
            alt: file.originalname,
            name: file.originalname,
            mimeType: file.mimetype,
            fileSize: file.size,
          };
        }

        return {
          id: `asset-${Date.now()}-${index}`,
          type: "image",
          src: publicUrl,
          thumbnail: publicUrl,
          alt: file.originalname,
          name: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
        };
      })
    );

      await appendAdminAuditLog(resolveActor(req), "content.media.uploaded", "admin.media", { files: files.length }, req);
      return res.json({ data: assets });
    }
  );

  apiRouter.post("/newsletter/subscribe", async (req, res) => {
    try {
      const subscriber = await upsertNewsletterSubscriber({
        name: req.body?.name,
        email: req.body?.email,
        phoneNumber: req.body?.phoneNumber,
        source: req.body?.source,
      });

      return res.json({
        ok: true,
        subscriber,
        message: `Thanks ${subscriber.name || "there"}! You're now subscribed to event email updates.`,
      });
    } catch (error: any) {
      return res.status(400).json({ error: error?.message || "Unable to subscribe email." });
    }
  });

  apiRouter.get("/newsletter/subscribers", requireAdminPermission("content:event:read"), async (_req, res) => {
    const subscribers = await readNewsletterSubscribers();
    const active = subscribers.filter((item) => item.isSubscribed);
    return res.json({ count: active.length, subscribers: active });
  });

  apiRouter.post("/newsletter/sync-event", requireAdminPermission("content:event:publish"), async (req: AuthenticatedRequest, res) => {
    const title = String(req.body?.event?.title || "").trim();
    if (!title) {
      return res.status(400).json({ error: "event.title is required." });
    }

    const eventSnapshot = {
      id: String(req.body?.event?.id || "").trim(),
      title,
      date: String(req.body?.event?.date || "").trim(),
      time: String(req.body?.event?.time || "").trim(),
      location: String(req.body?.event?.location || "").trim(),
      description: String(req.body?.event?.description || "").trim(),
    };

    const newsletterSubscribers = (await readNewsletterSubscribers())
      .filter((item) => item.isSubscribed)
      .map((item) => ({
        email: item.email,
        name: item.name,
        source: "newsletter",
      }));

    const botVisitorEmails = (await fetchBotVisitorEmailAudience()).map((item) => ({
      email: item.email,
      name: item.name,
      source: "visitor",
    }));

    const merged = new Map<string, { email: string; name: string; source: string }>();
    for (const item of [...newsletterSubscribers, ...botVisitorEmails]) {
      if (!item.email) continue;
      const existing = merged.get(item.email);
      if (!existing) {
        merged.set(item.email, item);
        continue;
      }

      merged.set(item.email, {
        ...existing,
        name: existing.name || item.name,
        source: existing.source.includes(item.source) ? existing.source : `${existing.source}+${item.source}`,
      });
    }

    const recipients = Array.from(merged.values()).sort((a, b) => a.email.localeCompare(b.email));
    const syncRecord: EventEmailSyncRecord = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      event: eventSnapshot,
      recipientCount: recipients.length,
      recipients,
    };

    const previous = await readJsonArray<EventEmailSyncRecord>(EVENT_EMAIL_SYNC_LOG_PATH);
    const next = [syncRecord, ...previous].slice(0, 200);
    await writeJsonArray(EVENT_EMAIL_SYNC_LOG_PATH, next);

    await appendAdminAuditLog(resolveActor(req), "content.event.newsletter_sync", "newsletter.sync", {
      eventId: eventSnapshot.id,
      recipientCount: syncRecord.recipientCount,
    }, req);

    return res.json({
      ok: true,
      syncId: syncRecord.id,
      recipientCount: syncRecord.recipientCount,
      recipientsPreview: recipients.slice(0, 30),
      message:
        syncRecord.recipientCount > 0
          ? `Event communication audience synced for ${syncRecord.recipientCount} email recipient(s).`
          : "No email recipients found for this event sync.",
    });
  });

  apiRouter.get("/newsletter/sync-log", requireAdminPermission("content:event:read"), async (_req, res) => {
    const records = await readJsonArray<EventEmailSyncRecord>(EVENT_EMAIL_SYNC_LOG_PATH);
    return res.json({ count: records.length, records });
  });

  apiRouter.post("/observability/rum", async (req, res) => {
    const metric = String(req.body?.metric || "").trim().slice(0, 32);
    const value = Number(req.body?.value);
    const page = String(req.body?.page || "").trim().slice(0, 300) || "/";
    const rating = String(req.body?.rating || "unknown").trim().slice(0, 24);
    const route = String(req.body?.route || page).trim().slice(0, 300);
    const source = String(req.body?.source || "web").trim().slice(0, 40);

    if (!metric || !Number.isFinite(value)) {
      return res.status(400).json({ error: "metric and numeric value are required." });
    }

    const item: RumMetricEvent = {
      id: crypto.randomUUID(),
      metric,
      value,
      rating,
      page,
      route,
      source,
      userAgent: String(req.headers["user-agent"] || "").slice(0, 180),
      timestamp: new Date().toISOString(),
    };

    const current = await readRumEvents();
    await writeRumEvents([item, ...current]);
    return res.status(202).json({ ok: true });
  });

  apiRouter.get("/observability/rum", async (_req, res) => {
    const events = await readRumEvents();
    return res.json(summarizeRum(events));
  });

  apiRouter.post("/contact/submit", async (req, res) => {
    const name = String(req.body?.name || "").trim().slice(0, 120);
    const email = normalizeEmail(req.body?.email);
    const subject = normalizeContactSubject(req.body?.subject);
    const subjectLabel = CONTACT_SUBJECT_LABELS[subject];
    const message = normalizeContactMessage(req.body?.message);
    const phoneNumber = normalizeContactPhone(req.body?.phoneNumber);
    const source = String(req.body?.source || "website").trim().slice(0, 80) || "website";

    if (name.length < 2) {
      return res.status(400).json({ error: "Please provide your full name." });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Please provide a valid email address." });
    }

    if (message.length < 15) {
      return res.status(400).json({ error: "Please provide more details in your message." });
    }

    const createdAt = new Date().toISOString();
    const autoResponseMessage = buildAutoResponseMessage(subject, name);
    const submission: ContactSubmission = {
      id: crypto.randomUUID(),
      ticketId: createContactTicketId(),
      name,
      email,
      phoneNumber,
      subject,
      subjectLabel,
      message,
      source,
      createdAt,
      autoResponseMessage,
    };

    const current = await readJsonArray<ContactSubmission>(CONTACT_SUBMISSIONS_JSON_PATH);
    const next = [submission, ...current].slice(0, 1000);
    await writeJsonArray(CONTACT_SUBMISSIONS_JSON_PATH, next);

    void Promise.all([dispatchContactWebhooks(submission), dispatchPrayerRequestFromContact(submission)]);

    return res.json({
      ok: true,
      ticketId: submission.ticketId,
      receivedAt: submission.createdAt,
      message: `${submission.autoResponseMessage} Ticket ID: ${submission.ticketId}.`,
    });
  });

  // API Route for Sermons (Automatic YouTube Sync)
  apiRouter.get("/sermons", async (req, res) => {
    const apiKey = process.env.YOUTUBE_API_KEY;
    const channelId = process.env.YOUTUBE_CHANNEL_ID;

    if (!apiKey || !channelId) {
      return res.json({ setupRequired: true, data: [] });
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet,id&order=date&maxResults=12&type=video`
      );

      if (!response.ok) throw new Error("YouTube API Error");

      const data = await response.json();

      const sermons = data.items.map((item: any) => {
        const description = item.snippet.description || "";

        const speakerMatch = description.match(/Speaker:\s*([^\n\r]+)/i);
        const keypointMatch = description.match(/Key Point:\s*([^\n\r]+)/i);

        return {
          id: item.id.videoId,
          url: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
          title: item.snippet.title,
          category: 'sermons',
          description: description,
          speaker: speakerMatch ? speakerMatch[1].trim() : "Guest Speaker",
          keypoint: keypointMatch ? keypointMatch[1].trim() : "",
          date: new Date(item.snippet.publishedAt).toLocaleDateString('en-US', { 
            month: 'long', day: 'numeric', year: 'numeric' 
          }),
          videoUrl: `https://www.youtube.com/embed/${item.id.videoId}`
        };
      });

      res.json({ data: sermons });
    } catch (error: any) {
      res.status(500).json({ error: error.message, data: [] });
    }
  });

  app.use('/api', apiRouter);
  app.use('/fgc-testing/api', apiRouter);

  // Vite middleware for development (skip in API-only mode)
  if (!API_ONLY && process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!API_ONLY) {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
