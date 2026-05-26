import type { Writable } from "node:stream";

const SKIP_ALWAYS = [
  /^npm notice\b/i,
  /^Need to install the following packages:/,
  /^Ok to proceed\?/,
  /^Successfully logged in\.?\s*$/i,
];

const SKIP_BROWSER_ONLY = [/On a remote or headless machine\?/i, /device-auth/i];

export function createLoginOutputFilter(options: { device: boolean }): {
  write: (chunk: Buffer | string, out: Writable) => void;
  flush: (out: Writable) => void;
} {
  let pending = "";

  const shouldSkip = (line: string): boolean => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (SKIP_ALWAYS.some((re) => re.test(trimmed))) return true;
    if (!options.device && SKIP_BROWSER_ONLY.some((re) => re.test(trimmed))) {
      return true;
    }
    return false;
  };

  const write = (chunk: Buffer | string, out: Writable): void => {
    pending += chunk.toString();
    const lines = pending.split("\n");
    pending = lines.pop() ?? "";
    for (const line of lines) {
      if (!shouldSkip(line)) {
        out.write(`${line}\n`);
      }
    }
  };

  const flush = (out: Writable): void => {
    if (pending && !shouldSkip(pending)) {
      out.write(pending);
    }
    pending = "";
  };

  return { write, flush };
}
