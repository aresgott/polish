import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

function findCopilotInPath(): string | null {
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    const result = execFileSync(cmd, ["copilot"], { encoding: "utf8" }).trim();
    return result.split("\n")[0] || null;
  } catch {
    return null;
  }
}

/** Resolves the `copilot` binary: system PATH first, then bundled package. */
export function resolveCopilotBin(): string {
  const systemCopilot = findCopilotInPath();
  if (systemCopilot) return systemCopilot;

  try {
    const pkgJson = require.resolve("@github/copilot/package.json");
    return path.join(path.dirname(pkgJson), "npm-loader.js");
  } catch {
    throw new Error(
      "GitHub Copilot CLI not found. Install it with: npm install -g @github/copilot",
    );
  }
}
