import { spawn } from "node:child_process";
import { resolveClaudeBin } from "./claude-bin.js";

export async function runClaudeLogout(): Promise<number> {
  const claudeBin = resolveClaudeBin();

  return new Promise((resolve, reject) => {
    const child = spawn(claudeBin, ["auth", "logout"], {
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}
