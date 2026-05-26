import { runCodexLogout } from "../auth/codex-logout.js";
import { hasCodexAuth } from "../auth/codex-auth.js";
import { runClaudeLogout } from "../auth/claude-logout.js";
import { hasClaudeAuth } from "../auth/claude-auth.js";
import { resolveActiveProvider } from "../auth/provider-auth.js";
import { PROVIDER_LABELS } from "../config/provider.js";
import { loadConfig, saveConfig } from "../config/tone.js";

export async function logoutCommand(): Promise<void> {
  const provider = await resolveActiveProvider();

  if (provider === "chatgpt") {
    if (!(await hasCodexAuth())) {
      console.log("You're not signed in.");
      return;
    }
    const code = await runCodexLogout();
    if (code !== 0) process.exit(code);
    if (await hasCodexAuth()) {
      console.error("\nSign-out finished but credentials may still be present.");
      process.exit(1);
    }
  } else if (provider === "claude") {
    if (!(await hasClaudeAuth())) {
      console.log("You're not signed in.");
      return;
    }
    const code = await runClaudeLogout();
    if (code !== 0) process.exit(code);
    if (await hasClaudeAuth()) {
      console.error("\nSign-out finished but credentials may still be present.");
      process.exit(1);
    }
  }

  const config = await loadConfig();
  if (config.provider === provider) {
    await saveConfig({ tone: config.tone });
  }

  console.log(`\n✓ Signed out from ${PROVIDER_LABELS[provider]}.`);
}
