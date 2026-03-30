import "./load-env.js";
import path from "node:path";
import { promises as fs } from "node:fs";

const resolveDir = (envName: string, fallbackSegments: string[]) => {
  const override = String(process.env[envName] || "").trim();
  if (!override) {
    return path.join(process.cwd(), ...fallbackSegments);
  }

  return path.isAbsolute(override) ? override : path.join(process.cwd(), override);
};

export const DATA_DIR = resolveDir("APP_DATA_DIR", ["data"]);
export const PUBLIC_DIR = resolveDir("APP_PUBLIC_DIR", ["public"]);
export const DIST_DIR = resolveDir("APP_DIST_DIR", ["dist"]);
export const UPLOADS_DIR = path.join(PUBLIC_DIR, "uploads");
export const MEDIA_UPLOAD_DIR = path.join(UPLOADS_DIR, "media");

export const paths = {
  adminUsers: path.join(DATA_DIR, "admin-users.json"),
  adminSessions: path.join(DATA_DIR, "admin-sessions.json"),
  adminBlogPosts: path.join(DATA_DIR, "admin-blog-posts.json"),
  adminAuditLog: path.join(DATA_DIR, "admin-audit-log.json"),
  adminResetTokens: path.join(DATA_DIR, "admin-reset-tokens.json"),
  adminMedia: path.join(DATA_DIR, "admin-media.json"),
  adminTestimonies: path.join(DATA_DIR, "admin-testimonies.json"),
  givingTransactions: path.join(DATA_DIR, "giving-transactions.json"),
  contactSubmissions: path.join(DATA_DIR, "contact-submissions.json"),
  rumEvents: path.join(DATA_DIR, "rum-events.json"),
  newsletterSubscribers: path.join(DATA_DIR, "newsletter-subscribers.json"),
  eventEmailSyncLog: path.join(DATA_DIR, "event-email-sync-log.json"),
} as const;

export const ensureDirectory = async (dirPath: string) => {
  await fs.mkdir(dirPath, { recursive: true });
};

export const ensureAppStorage = async () => {
  await Promise.all([
    ensureDirectory(DATA_DIR),
    ensureDirectory(UPLOADS_DIR),
    ensureDirectory(MEDIA_UPLOAD_DIR),
  ]);
};

export const readJsonArray = async <T>(filePath: string): Promise<T[]> => {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const writeJsonArray = async (filePath: string, value: unknown[]) => {
  await ensureDirectory(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
};

export const readTextFile = async (filePath: string) => {
  return fs.readFile(filePath, "utf8");
};
