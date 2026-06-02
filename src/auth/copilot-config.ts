import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

type CopilotConfig = {
  loggedInUsers?: Array<{ host?: string; login?: string }>;
};

export function getCopilotHome(): string {
  return process.env.COPILOT_HOME ?? join(homedir(), ".copilot");
}

export function getCopilotConfigPath(): string {
  return join(getCopilotHome(), "config.json");
}

function parseCopilotConfig(raw: string): CopilotConfig {
  const withoutComments = raw.replace(/^\s*\/\/.*$/gm, "");
  return JSON.parse(withoutComments) as CopilotConfig;
}

/** Fast local check: Copilot writes logged-in users to ~/.copilot/config.json. */
export async function hasCopilotStoredLogin(): Promise<boolean> {
  try {
    const raw = await readFile(getCopilotConfigPath(), "utf8");
    const config = parseCopilotConfig(raw);
    return (config.loggedInUsers?.length ?? 0) > 0;
  } catch {
    return false;
  }
}
