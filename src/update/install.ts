import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { isPublishedOnNpm } from "./registry.js";

const execFileAsync = promisify(execFile);

export type InstallMethod = "npm" | "homebrew";

export async function detectInstallMethod(): Promise<InstallMethod> {
  const entry = process.argv[1] ?? "";
  if (entry.includes("/Cellar/polish/") || entry.includes("homebrew")) {
    return "homebrew";
  }

  try {
    await execFileAsync("brew", ["--prefix", "polish"]);
    return "homebrew";
  } catch {
    return "npm";
  }
}

async function resolveNpmInstallSpec(): Promise<string> {
  return (await isPublishedOnNpm()) ? "@aresgott/polish@latest" : "github:aresgott/polish";
}

export async function runUpdateInstall(method: InstallMethod): Promise<number> {
  const isWin = process.platform === "win32";

  if (method === "homebrew") {
    return new Promise((resolve, reject) => {
      console.log("Updating via Homebrew…\n");
      const child = spawn("brew", ["upgrade", "polish"], {
        stdio: "inherit",
        env: process.env,
      });
      child.on("error", reject);
      child.on("close", (code) => resolve(code ?? 1));
    });
  }

  const spec = await resolveNpmInstallSpec();
  return new Promise((resolve, reject) => {
    console.log("Updating via npm…\n");
    const child = spawn("npm", ["install", "-g", spec], {
      stdio: "inherit",
      env: process.env,
      shell: isWin,
    });
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}

export function manualUpdateHint(method: InstallMethod): string {
  if (method === "homebrew") {
    return "Update manually: brew update && brew upgrade polish";
  }
  return "Update manually: npm install -g @aresgott/polish@latest";
}
