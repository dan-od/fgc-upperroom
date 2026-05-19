import "./load-env.js";
import express from "express";
import path from "node:path";
import { promises as fs } from "node:fs";
import { createServer as createViteServer } from "vite";
import givingRouter from "./giving.routes.js";
import commonRouter from "./common.routes.js";
import adminRouter from "./admin.routes.js";
import givingAdminRouter from "./giving-admin.routes.js";
import newsletterRouter from "./newsletter.routes.js";
import { adminMediaRouter, publicMediaRouter } from "./media.routes.js";
import { hashPassword } from "./auth.utils.js";
import type { AdminUserRecord } from "./types.js";
import { SERVER_APP_BASE_PATH, SERVER_APP_BASENAME } from "./server-paths.js";
import { DIST_DIR, UPLOADS_DIR, ensureAppStorage, paths } from "./storage.js";

type CreateAppOptions = {
  apiOnly?: boolean;
  isProd?: boolean;
};

const shouldServeSpa = (req: express.Request) => {
  if (req.method !== "GET") return false;
  if (!String(req.headers.accept || "").includes("text/html")) return false;

  const pathname = req.path;
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/bot") ||
    pathname.startsWith("/attendance") ||
    pathname.startsWith("/uploads")
  ) {
    return false;
  }

  if (path.extname(pathname)) return false;

  if (SERVER_APP_BASENAME === "/") {
    return true;
  }

  return pathname === SERVER_APP_BASENAME || pathname.startsWith(`${SERVER_APP_BASENAME}/`);
};

async function ensureSeedAdminUser() {
  const users = await fs.readFile(paths.adminUsers, "utf8")
    .then((raw) => JSON.parse(raw))
    .catch(() => []);

  if (Array.isArray(users) && users.length > 0) {
    return;
  }

  const email = String(
    process.env.ADMIN_EMAIL ||
    process.env.ADMIN_DEFAULT_EMAIL ||
    "admin@upperroom.local"
  ).trim();
  const password = String(
    process.env.ADMIN_PASSWORD ||
    process.env.ADMIN_DEFAULT_PASSWORD ||
    "Admin123!"
  ).trim();
  const { hash, salt } = hashPassword(password);
  const nowIso = new Date().toISOString();

  const seed: AdminUserRecord = {
    id: "seed-admin",
    email,
    name: "System Administrator",
    role: "super_admin",
    passwordHash: hash,
    passwordSalt: salt,
    isActive: true,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    pendingTwoFactorSecret: null,
    createdAt: nowIso,
    updatedAt: nowIso,
    lastLoginAt: null,
  };

  await fs.writeFile(paths.adminUsers, JSON.stringify([seed], null, 2), "utf8");
}

export const createApp = async (options: CreateAppOptions = {}) => {
  const apiOnly = options.apiOnly ?? String(process.env.API_ONLY || "").toLowerCase() === "true";
  const isProd = options.isProd ?? process.env.NODE_ENV === "production";

  await ensureAppStorage();
  await ensureSeedAdminUser();

  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "2mb" }));

  app.use((req, res, next) => {
    const startedAt = process.hrtime.bigint();
    res.on("finish", () => {
      if (req.path.endsWith("/health")) return;
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      console.log(
        JSON.stringify({
          method: req.method,
          path: req.originalUrl,
          status: res.statusCode,
          durationMs: Number(durationMs.toFixed(1)),
        })
      );
    });
    next();
  });

  const apiRouter = express.Router();
  apiRouter.use("/giving", givingRouter);
  apiRouter.use("/media", publicMediaRouter);
  apiRouter.use("/admin/media", adminMediaRouter);
  apiRouter.use("/admin/giving", givingAdminRouter);
  apiRouter.use("/admin", adminRouter);
  apiRouter.use("/newsletter", newsletterRouter);
  apiRouter.use("/", commonRouter);
  app.use("/api", apiRouter);

  app.use("/uploads", express.static(UPLOADS_DIR));

  if (!apiOnly && !isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  if (!apiOnly && isProd) {
    if (SERVER_APP_BASENAME !== "/") {
      app.get("/", (_req, res) => {
        res.redirect(302, SERVER_APP_BASE_PATH);
      });
    }

    app.use(SERVER_APP_BASENAME, express.static(DIST_DIR, { index: false }));
    app.use((req, res, next) => {
      if (!shouldServeSpa(req)) {
        return next();
      }

      return res.sendFile(path.join(DIST_DIR, "index.html"));
    });
  }

  return app;
};

export const startServer = async () => {
  const app = await createApp();
  const defaultPort = String(process.env.API_ONLY || "").toLowerCase() === "true" ? 3001 : 3000;
  const port = Number(process.env.PORT || defaultPort);

  return new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const server = app.listen(port, () => {
      console.log(`[BACKEND_API] Server running on http://localhost:${port}`);
      resolve(server);

      const gracefulShutdown = async (signal: string) => {
        console.log(`[BACKEND_API] ${signal} received — starting graceful shutdown`);

        const forceExit = setTimeout(() => {
          console.error("[BACKEND_API] Graceful shutdown timed out after 15s — forcing exit");
          process.exit(1);
        }, 15_000);

        try {
          await new Promise<void>((res, rej) => server.close((err) => (err ? rej(err) : res())));
          clearTimeout(forceExit);
          console.log("[BACKEND_API] Graceful shutdown complete");
          process.exit(0);
        } catch (error) {
          console.error("[BACKEND_API] Error during graceful shutdown", error);
          process.exit(1);
        }
      };

      process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
      process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    });
  });
};
