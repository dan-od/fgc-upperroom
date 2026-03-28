import "./load-env.js";
import type express from "express";
import {
  DEFAULT_APP_BASE_PATH,
  joinUrlPrefix,
  normalizeBasePath,
  toBasename,
} from "../shared/pathing.js";

export const SERVER_APP_BASE_PATH = normalizeBasePath(
  process.env.APP_BASE_PATH || process.env.PUBLIC_APP_BASE_PATH || DEFAULT_APP_BASE_PATH
);

export const SERVER_APP_BASENAME = toBasename(SERVER_APP_BASE_PATH);

const resolveForwardedValue = (value: string | string[] | undefined) => {
  return String(Array.isArray(value) ? value[0] : value || "")
    .split(",")[0]
    .trim();
};

const inferOrigin = (req: express.Request) => {
  const proto = resolveForwardedValue(req.headers["x-forwarded-proto"]) || req.protocol || "http";
  const host = resolveForwardedValue(req.headers["x-forwarded-host"]) || req.get("host") || "";
  return host ? `${proto}://${host}` : "";
};

const resolveConfiguredSiteBase = () => {
  const configured = String(process.env.PUBLIC_SITE_BASE_URL || "").trim();
  if (!configured) return "";

  try {
    const url = new URL(configured);
    const currentPath = normalizeBasePath(url.pathname || "/");

    if (currentPath === "/" && SERVER_APP_BASE_PATH !== "/") {
      url.pathname = SERVER_APP_BASE_PATH;
    }

    return url.toString().replace(/\/+$/, "");
  } catch {
    return configured.replace(/\/+$/, "");
  }
};

export const buildPublicAppUrl = (req: express.Request, resource = "") => {
  const configuredSiteBase = resolveConfiguredSiteBase();
  const origin = configuredSiteBase || inferOrigin(req);
  const appBase = configuredSiteBase
    ? origin
    : SERVER_APP_BASE_PATH === "/"
      ? origin
      : joinUrlPrefix(origin, SERVER_APP_BASENAME.replace(/^\/+/, ""));

  return joinUrlPrefix(appBase, resource);
};
