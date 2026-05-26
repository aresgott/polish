import { spawn } from "node:child_process";
import { resolveCodexBin } from "./codex-bin.js";
import { createLoginOutputFilter } from "./login-output.js";

export async function runCodexLogin(device = false): Promise<number> {
  const codexBin = resolveCodexBin();
  const args = ["login"];
  if (device) {
    args.push("--device-auth");
  }

  const filter = createLoginOutputFilter({ device });

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [codexBin, ...args], {
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
