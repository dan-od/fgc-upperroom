import { readJsonArray, paths } from "./storage.js";

const MEDIA_STATUS_SET = new Set(["draft", "pending_review", "approved", "scheduled", "published"]);
const BLOG_STATUS_SET = new Set(["draft", "pending_review", "approved", "scheduled", "published"]);

const safeIsoString = (value: unknown, fallback = new Date().toISOString()) => {
  const parsed = new Date(String(value || ""));
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toISOString();
};

const toTimestamp = (value: unknown, fallback = Date.now()) => {
  const direct = Number(value);
  if (Number.isFinite(direct) && direct > 0) return direct;

  const parsed = new Date(String(value || ""));
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.getTime();
};

const normalizeMediaStatus = (value: unknown) => {
  const normalized = String(value || "").trim().toLowerCase();
  return MEDIA_STATUS_SET.has(normalized) ? normalized : "published";
};

const normalizeBlogStatus = (value: unknown) => {
  const normalized = String(value || "").trim().toLowerCase();
  return BLOG_STATUS_SET.has(normalized) ? normalized : "draft";
};

export const normalizeStoredTestimony = (item: Record<string, unknown>, index = 0) => {
  const createdAt = safeIsoString(item.createdAt || item.updatedAt, new Date().toISOString());
  const updatedAt = item.updatedAt ? safeIsoString(item.updatedAt, createdAt) : null;

  return {
    id: String(item.id || `testimony-${index + 1}`),
    name: String(item.name || "Anonymous").trim() || "Anonymous",
    role: String(item.role || "Member").trim() || "Member",
    quote: String(item.quote || "").trim(),
    createdAt,
    updatedAt,
  };
};

export const normalizeStoredMediaItem = (item: Record<string, unknown>, index = 0) => {
  const nowIso = new Date().toISOString();
  const timestamp = toTimestamp(item.timestamp || item.updatedAt || item.createdAt || item.date);
  const status = normalizeMediaStatus(item.status);
  const createdAt = safeIsoString(item.createdAt, new Date(timestamp).toISOString());
  const updatedAt = safeIsoString(item.updatedAt, createdAt);
  const publishedAt = status === "published"
    ? safeIsoString(item.publishedAt || updatedAt || createdAt, updatedAt)
    : item.publishedAt
      ? safeIsoString(item.publishedAt, updatedAt)
      : null;

  return {
    ...item,
    id: String(item.id || `admin-media-${timestamp}-${index}`),
    title: String(item.title || `Media Item ${index + 1}`).trim() || `Media Item ${index + 1}`,
    description: String(item.description || "").trim(),
    category: String(item.category || item.mediaCategory || "worship").trim().toLowerCase() || "worship",
    mediaCategory: String(item.mediaCategory || item.category || "worship").trim().toLowerCase() || "worship",
    type: String(item.type || "image").trim().toLowerCase() || "image",
    speaker: String(item.speaker || "").trim(),
    keypoint: String(item.keypoint || "").trim(),
    syncKey: String(item.syncKey || "").trim(),
    mergeKey: String(item.mergeKey || item.syncKey || item.title || "").trim(),
    thumbnail: String(item.thumbnail || item.previewUrl || item.src || "").trim(),
    src: String(item.src || item.thumbnail || item.previewUrl || "").trim(),
    videoUrl: String(item.videoUrl || "").trim(),
    audioUrl: String(item.audioUrl || "").trim(),
    media: Array.isArray(item.media) ? item.media : [],
    status,
    timestamp,
    date: String(item.date || new Date(timestamp).toISOString().slice(0, 10)).trim() || new Date(timestamp).toISOString().slice(0, 10),
    createdAt,
    updatedAt,
    publishedAt,
    source: String(item.source || "admin").trim() || "admin",
    createdBy: String(item.createdBy || "").trim(),
    updatedBy: String(item.updatedBy || "").trim(),
    metadata: item.metadata && typeof item.metadata === "object" ? item.metadata : {},
    importedAt: item.importedAt ? safeIsoString(item.importedAt, nowIso) : null,
  };
};

export const readStoredMediaItems = async () => {
  const rows = await readJsonArray<Record<string, unknown>>(paths.adminMedia);
  return rows
    .map((item, index) => normalizeStoredMediaItem(item, index))
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
};

export const getPublicMediaItems = async () => {
  const items = await readStoredMediaItems();
  return items.filter((item) => item.status === "published");
};

export const mapMediaItemToVideoEntry = (item: Record<string, any>) => {
  const assets = Array.isArray(item.media) ? item.media : [];
  const videoAsset = assets.find((asset) => String(asset?.type || "").toLowerCase() === "video");
  const fallbackVideoUrl = String(videoAsset?.videoUrl || videoAsset?.src || item.videoUrl || item.src || "").trim();
  if (!fallbackVideoUrl) return null;

  const publishedAt = safeIsoString(item.publishedAt || item.updatedAt || item.createdAt, new Date().toISOString());

  return {
    id: String(item.id || ""),
    title: String(item.title || "Untitled Sermon").trim() || "Untitled Sermon",
    description: String(item.description || "").trim(),
    speaker: String(item.speaker || "").trim(),
    keypoint: String(item.keypoint || "").trim(),
    url: String(item.thumbnail || item.src || "").trim(),
    thumbnail: String(item.thumbnail || item.src || "").trim(),
    watchUrl: fallbackVideoUrl,
    videoUrl: fallbackVideoUrl,
    mergeKey: String(item.mergeKey || item.syncKey || item.title || "").trim(),
    syncKey: String(item.syncKey || "").trim(),
    publishedAt,
    date: String(item.date || publishedAt.slice(0, 10)).trim() || publishedAt.slice(0, 10),
    timestamp: toTimestamp(item.timestamp || publishedAt, Date.now()),
  };
};

export const getPublicSermonVideos = async () => {
  const items = await getPublicMediaItems();
  return items
    .filter((item) => item.category === "sermons")
    .map((item) => mapMediaItemToVideoEntry(item))
    .filter(Boolean)
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
};

export const normalizeStoredBlogPost = (item: Record<string, unknown>, index = 0) => {
  const createdAt = safeIsoString(item.createdAt || item.updatedAt || item.publishedAt, new Date().toISOString());
  const updatedAt = item.updatedAt ? safeIsoString(item.updatedAt, createdAt) : createdAt;
  const publishedAt = item.publishedAt ? safeIsoString(item.publishedAt, updatedAt) : null;

  return {
    ...item,
    id: String(item.id || `blog-post-${index + 1}`),
    title: String(item.title || `Untitled Post ${index + 1}`).trim() || `Untitled Post ${index + 1}`,
    content: String(item.content || "").trim(),
    category: String(item.category || "article").trim().toLowerCase() || "article",
    author: String(item.author || "Admin Team").trim() || "Admin Team",
    excerpt: String(item.excerpt || "").trim(),
    tags: String(item.tags || "").trim(),
    image: String(item.image || "").trim(),
    featured: Boolean(item.featured),
    status: normalizeBlogStatus(item.status),
    createdAt,
    updatedAt,
    publishedAt,
    scheduledFor: item.scheduledFor ? safeIsoString(item.scheduledFor, updatedAt) : null,
    workflow: item.workflow && typeof item.workflow === "object" ? item.workflow : {},
    versions: Array.isArray(item.versions) ? item.versions : [],
  };
};

export const readStoredBlogPosts = async () => {
  const rows = await readJsonArray<Record<string, unknown>>(paths.adminBlogPosts);
  return rows
    .map((item, index) => normalizeStoredBlogPost(item, index))
    .sort((a, b) => new Date(b.publishedAt || b.updatedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.updatedAt || a.createdAt).getTime());
};

export const getPublicBlogPosts = async () => {
  const posts = await readStoredBlogPosts();
  return posts.filter((post) => post.status === "published");
};

export const readStoredTestimonies = async () => {
  const rows = await readJsonArray<Record<string, unknown>>(paths.adminTestimonies);
  return rows
    .map((item, index) => normalizeStoredTestimony(item, index))
    .filter((item) => item.quote)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
};

export const getPublicTestimonies = async () => {
  return readStoredTestimonies();
};
