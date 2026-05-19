import express from "express";

export const createRateLimit = (max: number, windowMs: number, message?: string) => {
  const store = new Map<string, { count: number; resetAt: number }>();

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = String(req.ip || (req.socket as any)?.remoteAddress || "unknown");
    const now = Date.now();

    if (store.size > 10_000) {
      for (const [key, val] of store) {
        if (now > val.resetAt) store.delete(key);
      }
    }

    const entry = store.get(ip);
    if (!entry || now > entry.resetAt) {
      store.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (entry.count >= max) {
      return res.status(429).json({ error: message || "Too many requests. Please try again later." });
    }
    entry.count++;
    return next();
  };
};
