import { execFileSync } from "node:child_process";
import { arch } from "node:os";
import { fileURLToPath } from "node:url";

const PACKAGE_PREFIX = "@github/copilot";

const PLATFORMS: Record<string, string> = {
  "darwin-arm64": `${PACKAGE_PREFIX}-darwin-arm64`,
  "darwin-x64": `${PACKAGE_PREFIX}-darwin-x64`,
  "linux-x64": `${PACKAGE_PREFIX}-linux-x64`,
  "linux-arm64": `${PACKAGE_PREFIX}-linux-arm64`,
  "linux-x64-musl": `${PACKAGE_PREFIX}-linuxmusl-x64`,
  "linux-arm64-musl": `${PACKAGE_PREFIX}-linuxmusl-arm64`,
  "win32-x64": `${PACKAGE_PREFIX}-win32-x64`,
  "win32-arm64": `${PACKAGE_PREFIX}-win32-arm64`,
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

function findCopilotInPath(): string | null {
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    const result = execFileSync(cmd, ["copilot"], { encoding: "utf8" }).trim();
    return result.split("\n")[0] || null;
  } catch {
    return null;
  }
}

function resolveBundledCopilotBin(): string | null {
  const key = getPlatformKey();
  const pkg = key ? PLATFORMS[key] : null;
  if (!pkg) return null;

  try {
    return fileURLToPath(import.meta.resolve(pkg));
  } catch {
    return null;
  }
}

/** Resolves the `copilot` binary: system PATH first, then bundled platform package. */
export function resolveCopilotBin(): string {
  const systemCopilot = findCopilotInPath();
  if (systemCopilot) return systemCopilot;

  const bundled = resolveBundledCopilotBin();
  if (bundled) return bundled;

  throw new Error(
    "GitHub Copilot CLI not found. Install it with: npm install -g @github/copilot",
  );
}
