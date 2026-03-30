import { pathToFileURL } from "node:url";
import { startServer } from "./src/api/app.js";

const isDirectExecution = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isDirectExecution) {
  startServer().catch((error) => {
    console.error("[BACKEND_API] Startup failed:", error);
    process.exitCode = 1;
  });
}

export { createApp, startServer } from "./src/api/app.js";
