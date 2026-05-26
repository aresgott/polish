import { spawn } from "node:child_process";
import { resolveCodexBin } from "./codex-bin.js";

export async function runCodexLogout(): Promise<number> {
  const codexBin = resolveCodexBin();

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [codexBin, "logout"], {
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}
