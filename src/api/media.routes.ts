import express from "express";
import multer from "multer";
import path from "node:path";
import { promises as fs } from "node:fs";
import crypto from "node:crypto";
import { requireAdminPermission } from "./auth.middleware.js";
import { getPublicMediaItems, normalizeStoredMediaItem, readStoredMediaItems } from "./public-content.js";
import { MEDIA_UPLOAD_DIR, paths, writeJsonArray } from "./storage.js";

const publicMediaRouter = express.Router();
const adminMediaRouter = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 25,
  },
});

const inferAssetType = (mimetype: string) => {
  if (mimetype.startsWith("video/")) return "video";
  if (mimetype.startsWith("audio/")) return "audio";
  return "image";
};

publicMediaRouter.get("/", async (_req, res) => {
  const items = await getPublicMediaItems();
  return res.json({ data: items });
});

adminMediaRouter.get("/", requireAdminPermission("content:media:read"), async (_req, res) => {
  const items = await readStoredMediaItems();
  return res.json({ data: items });
});

adminMediaRouter.put("/", requireAdminPermission("content:media:write"), async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : null;
  if (!items) {
    return res.status(400).json({ error: "Expected body.items to be an array." });
  }

  const normalized = items
    .map((item, index) => normalizeStoredMediaItem(item, index))
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

  await writeJsonArray(paths.adminMedia, normalized);
  return res.json({ ok: true, count: normalized.length, data: normalized });
});

adminMediaRouter.post(
  "/upload",
  requireAdminPermission("content:media:write"),
  upload.array("files"),
  async (req, res) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded." });
    }

    await fs.mkdir(MEDIA_UPLOAD_DIR, { recursive: true });

    const data = [];

    for (const file of files) {
      const ext = path.extname(file.originalname);
      const id = crypto.randomUUID();
      const filename = `${id}${ext}`;
      const filePath = path.join(MEDIA_UPLOAD_DIR, filename);
      const src = `/uploads/media/${filename}`;
      const type = inferAssetType(file.mimetype);

      await fs.writeFile(filePath, file.buffer);

      data.push({
        id: `asset-${id}`,
        type,
        src,
        thumbnail: type === "image" ? src : "",
        videoUrl: type === "video" ? src : "",
        audioUrl: type === "audio" ? src : "",
        alt: file.originalname,
        name: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
      });
    }

    return res.json({ ok: true, data });
  }
);

adminMediaRouter.post("/:id/approve", requireAdminPermission("content:media:approve"), async (req, res) => {
  const { id } = req.params;
  const items = await readStoredMediaItems();
  const nowIso = new Date().toISOString();
  let approvedItem = null;

  const nextItems = items.map((item) => {
    if (String(item.id) !== String(id)) {
      return item;
    }

    approvedItem = normalizeStoredMediaItem({
      ...item,
      status: "published",
      publishedAt: item.publishedAt || nowIso,
      updatedAt: nowIso,
    });
    return approvedItem;
  });

  if (!approvedItem) {
    return res.status(404).json({ error: "Media item not found." });
  }

  await writeJsonArray(paths.adminMedia, nextItems);
  return res.json({ ok: true, data: approvedItem });
});

adminMediaRouter.delete("/:id", requireAdminPermission("content:media:write"), async (req, res) => {
  const { id } = req.params;
  const items = await readStoredMediaItems();
  const nextItems = items.filter((item) => String(item.id) !== String(id));
  if (nextItems.length === items.length) {
    return res.status(404).json({ error: "Media item not found." });
  }

  await writeJsonArray(paths.adminMedia, nextItems);
  return res.json({ ok: true });
});

export { publicMediaRouter, adminMediaRouter };
