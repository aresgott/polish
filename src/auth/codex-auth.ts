import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export function getCodexAuthPath(): string {
  const codexHome = process.env.CODEX_HOME ?? join(homedir(), ".codex");
  return join(codexHome, "auth.json");
}

export async function hasCodexAuth(): Promise<boolean> {
  try {
    await access(getCodexAuthPath());
    return true;
  } catch {
    return false;
  }
}
