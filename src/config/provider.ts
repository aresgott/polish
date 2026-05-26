import { readFile, writeFile } from "node:fs/promises";
import { loadConfig, saveConfig } from "./tone.js";

export const PROVIDERS = ["chatgpt", "claude"] as const;
export type Provider = (typeof PROVIDERS)[number];

export const PROVIDER_LABELS: Record<Provider, string> = {
  chatgpt: "ChatGPT (Codex OAuth)",
  claude: "Claude (subscription OAuth)",
};

export function parseProviderName(name: string): Provider | null {
  const key = name.trim().toLowerCase();
  return PROVIDERS.includes(key as Provider) ? (key as Provider) : null;
}

export async function loadProvider(): Promise<Provider | null> {
  const config = await loadConfig();
  return config.provider ?? null;
}

export async function saveProvider(provider: Provider): Promise<void> {
  const config = await loadConfig();
  await saveConfig({ ...config, provider });
}
