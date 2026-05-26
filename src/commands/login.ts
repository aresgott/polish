import { runCodexLogin } from "../auth/codex-login.js";
import { runClaudeLogin } from "../auth/claude-login.js";
import { hasProviderAuth } from "../auth/provider-auth.js";
import {
  PROVIDER_LABELS,
  saveProvider,
  type Provider,
} from "../config/provider.js";
import { selectProvider } from "../util/select.js";

async function runProviderLogin(provider: Provider, device: boolean): Promise<number> {
  switch (provider) {
    case "chatgpt":
      return runCodexLogin(device);
    case "claude":
      if (device) {
        console.error("Claude login requires a browser on this machine. Omit --device.");
        return 1;
      }
      return runClaudeLogin();
  }
}

export async function loginCommand(options: {
  device?: boolean;
  provider?: Provider | null;
}): Promise<void> {
  let provider = options.provider ?? null;

  if (!provider) {
    provider = await selectProvider();
    if (!provider) {
      console.error(
        "No provider selected. Run interactively, or: polish login chatgpt|claude",
      );
      process.exit(1);
    }
  }

  if (await hasProviderAuth(provider)) {
    console.log(`You're already signed in with ${PROVIDER_LABELS[provider]}.\n`);
    console.log("Try: polish hello world");
    return;
  }

  const device = options.device ?? false;

  if (provider === "chatgpt") {
    if (device) {
      console.log("Sign in with ChatGPT (device code)\n");
      console.log("Follow the prompts below.\n");
    } else {
      console.log("Sign in with ChatGPT\n");
      console.log("Opening your browser…");
      console.log("If it doesn't open, use the link below.\n");
    }
  }

  const code = await runProviderLogin(provider, device);
  if (code !== 0) {
    if (provider === "chatgpt" && !device) {
      console.error("\nLogin failed. On a remote machine, try: polish login --device");
    } else {
      console.error("\nLogin failed.");
    }
    process.exit(code);
  }

  const ok = await hasProviderAuth(provider);
  if (!ok) {
    console.error("\nLogin finished but credentials were not saved. Try again.");
    process.exit(1);
  }

  await saveProvider(provider);
  console.log(`\n✓ Signed in with ${PROVIDER_LABELS[provider]}. Try: polish hello world`);

  if (provider === "chatgpt") {
    console.log("\nNote: Only one device can be signed in at a time.");
    console.log("Signing in here will invalidate any other active session.");
  }
}
