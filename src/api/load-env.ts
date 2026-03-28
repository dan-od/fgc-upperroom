import { loadProjectEnvFile } from "../../lib/load-project-env.js";

export const loadProjectEnv = (override = false) => {
  loadProjectEnvFile({ override });
};

loadProjectEnv();
