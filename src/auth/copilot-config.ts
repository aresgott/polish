import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export type CopilotUser = { host?: string; login?: string };

type CopilotConfig = {
  loggedInUsers?: CopilotUser[];
  lastLoggedInUser?: CopilotUser;
  [key: string]: unknown;
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

async function readCopilotConfig(): Promise<CopilotConfig | null> {
  try {
    const raw = await readFile(getCopilotConfigPath(), "utf8");
    return parseCopilotConfig(raw);
  } catch {
    return null;
  }
}

/** Fast local check: Copilot writes logged-in users to ~/.copilot/config.json. */
export async function hasCopilotStoredLogin(): Promise<boolean> {
  const config = await readCopilotConfig();
  return (config?.loggedInUsers?.length ?? 0) > 0;
}

/** Logged-in accounts recorded in ~/.copilot/config.json (host + login). */
export async function getCopilotLoggedInUsers(): Promise<CopilotUser[]> {
  const config = await readCopilotConfig();
  return config?.loggedInUsers ?? [];
}

/** Removes the stored login records from ~/.copilot/config.json, leaving other settings intact. */
export async function clearCopilotStoredLogin(): Promise<void> {
  const config = await readCopilotConfig();
  if (!config) return;
  delete config.loggedInUsers;
  delete config.lastLoggedInUser;
  await writeFile(getCopilotConfigPath(), `${JSON.stringify(config, null, 2)}\n`, "utf8");
}
