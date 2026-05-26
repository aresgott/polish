import { spawn } from "node:child_process";
import { resolveClaudeBin } from "./claude-bin.js";
import { createLoginOutputFilter } from "./login-output.js";

export async function runClaudeLogin(): Promise<number> {
  const claudeBin = resolveClaudeBin();
  const filter = createLoginOutputFilter({ device: false });

  return new Promise((resolve, reject) => {
    const child = spawn(claudeBin, ["auth", "login", "--claudeai"], {
      stdio: ["inherit", "pipe", "pipe"],
      env: process.env,
    });

    const onData = (chunk: Buffer, out: NodeJS.WriteStream) => {
      filter.write(chunk, out);
    };

    child.stdout?.on("data", (chunk) => onData(chunk, process.stdout));
    child.stderr?.on("data", (chunk) => onData(chunk, process.stderr));

    child.on("error", reject);
    child.on("close", (code) => {
      filter.flush(process.stdout);
      filter.flush(process.stderr);
      resolve(code ?? 1);
    });
  });
}
