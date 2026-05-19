import express from "express";
import { cleanEnv } from "./giving.config.js";

const getGivingAllowedOrigins = (): Set<string> => {
  const origins = new Set([
    "https://fgcupperroom.org",
    "https://www.fgcupperroom.org",
    "http://localhost:5173",
  ]);
  const envOrigin = cleanEnv(process.env.VITE_APP_BASE_URL).replace(/\/$/, "");
  if (envOrigin) origins.add(envOrigin);
  return origins;
};

export const givingCors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const origin = req.headers.origin as string | undefined;
  if (!origin) return next();
  if (!getGivingAllowedOrigins().has(origin)) {
    return res.status(403).json({ error: "Origin not allowed." });
  }
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.sendStatus(204);
  }
  return next();
};

export const _rlStore = new Map<string, { count: number; resetAt: number }>();

export const initializeRateLimit = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const ip = String(req.ip || (req.socket as any)?.remoteAddress || "unknown");
  const now = Date.now();
  const WINDOW_MS = 60_000;
  const MAX_REQUESTS = 10;

  if (_rlStore.size > 10_000) {
    for (const [key, val] of _rlStore) {
      if (now > val.resetAt) _rlStore.delete(key);
    }
  }

  const entry = _rlStore.get(ip);
  if (!entry || now > entry.resetAt) {
    _rlStore.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }
  if (entry.count >= MAX_REQUESTS) {
    return res.status(429).json({ error: "Too many requests. Please wait a minute and try again." });
  }
  entry.count++;
  return next();
};
