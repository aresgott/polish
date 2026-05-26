import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { arch } from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);

const PACKAGE_PREFIX = "@anthropic-ai/claude-code";

const PLATFORMS: Record<string, { pkg: string; bin: string }> = {
  "darwin-arm64": { pkg: `${PACKAGE_PREFIX}-darwin-arm64`, bin: "claude" },
  "darwin-x64": { pkg: `${PACKAGE_PREFIX}-darwin-x64`, bin: "claude" },
  "linux-x64": { pkg: `${PACKAGE_PREFIX}-linux-x64`, bin: "claude" },
  "linux-arm64": { pkg: `${PACKAGE_PREFIX}-linux-arm64`, bin: "claude" },
  "linux-x64-musl": { pkg: `${PACKAGE_PREFIX}-linux-x64-musl`, bin: "claude" },
  "linux-arm64-musl": { pkg: `${PACKAGE_PREFIX}-linux-arm64-musl`, bin: "claude" },
  "win32-x64": { pkg: `${PACKAGE_PREFIX}-win32-x64`, bin: "claude.exe" },
  "win32-arm64": { pkg: `${PACKAGE_PREFIX}-win32-arm64`, bin: "claude.exe" },
};

function detectMusl(): boolean {
  if (process.platform !== "linux") return false;
  const report =
    typeof process.report?.getReport === "function" ? process.report.getReport() : null;
  return report != null && report.header?.glibcVersionRuntime === undefined;
}

function getPlatformKey(): string | null {
  const platform = process.platform;
  const cpu = arch();
  if (platform === "linux" && detectMusl()) {
    return `${platform}-${cpu}-musl`;
  }
  return `${platform}-${cpu}`;
}

function findClaudeInPath(): string | null {
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    const result = execFileSync(cmd, ["claude"], { encoding: "utf8" }).trim();
    return result.split("\n")[0] || null;
  } catch {
    return null;
  }
}

/** Resolves the `claude` binary: system PATH first, then bundled optional dep. */
export function resolveClaudeBin(): string {
  const systemClaude = findClaudeInPath();
  if (systemClaude) return systemClaude;

  const key = getPlatformKey();
  const entry = key ? PLATFORMS[key] : null;
  if (entry) {
    try {
      const pkgJson = require.resolve(`${entry.pkg}/package.json`);
      return path.join(path.dirname(pkgJson), entry.bin);
    } catch {
      // optional dependency not installed
    }
  }

  throw new Error(
    "Claude CLI not found. Install it with: npm install -g @anthropic-ai/claude-code",
  );
}
