import type { Provider } from "../config/provider.js";
import { loadProvider } from "../config/provider.js";
import { hasClaudeAuth } from "./claude-auth.js";
import { hasCodexAuth } from "./codex-auth.js";

export async function hasProviderAuth(provider: Provider): Promise<boolean> {
  switch (provider) {
    case "chatgpt":
      return hasCodexAuth();
    case "claude":
      return hasClaudeAuth();
  }
}

export async function resolveActiveProvider(): Promise<Provider> {
  const configured = await loadProvider();
  if (configured && (await hasProviderAuth(configured))) {
    return configured;
  }
  if (await hasCodexAuth()) return "chatgpt";
  if (await hasClaudeAuth()) return "claude";
  return configured ?? "chatgpt";
}

export async function isLoggedIn(): Promise<boolean> {
  const provider = await resolveActiveProvider();
  return hasProviderAuth(provider);
}
