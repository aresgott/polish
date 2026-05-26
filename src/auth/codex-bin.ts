import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

function findCodexInPath(): string | null {
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    const result = execFileSync(cmd, ["codex"], { encoding: "utf8" }).trim();
    return result.split("\n")[0] || null;
  } catch {
    return null;
  }
}

/** Resolves the `codex` binary: system PATH first, then bundled package. */
export function resolveCodexBin(): string {
  const systemCodex = findCodexInPath();
  if (systemCodex) return systemCodex;

  try {
    const pkgJson = require.resolve("@openai/codex/package.json");
    return path.join(path.dirname(pkgJson), "bin", "codex.js");
  } catch {
    throw new Error(
      "Codex CLI not found. Install it with: npm install -g @openai/codex",
    );
  }
}
