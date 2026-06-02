import { withPolishCopilotClient } from "./copilot-client.js";
import {
  copilotCredentialAccount,
  deleteCopilotCredential,
} from "./copilot-credential.js";
import {
  clearCopilotStoredLogin,
  getCopilotLoggedInUsers,
} from "./copilot-config.js";
import { hasCopilotAuth } from "./copilot-auth.js";

export async function runCopilotLogout(): Promise<number> {
  const status = await withPolishCopilotClient((client) => client.getAuthStatus());

  if (!status.isAuthenticated) {
    return 0;
  }

  if (status.authType === "env") {
    console.error(
      "\nSigned in via environment variable. Unset COPILOT_GITHUB_TOKEN, GH_TOKEN, or GITHUB_TOKEN.",
    );
    return 1;
  }

  if (status.authType === "gh-cli") {
    console.error("\nSigned in via GitHub CLI. Run: gh auth logout");
    return 1;
  }

  if (status.authType && status.authType !== "user") {
    console.error(
      `\nSigned in via ${status.authType}. Update that credential source to sign out.`,
    );
    return 1;
  }

  // Interactive OAuth login ("user"): the Copilot CLI has no programmatic
  // logout RPC, so remove the stored credential ourselves. This is scoped to
  // the "copilot-cli" credential service only — other providers are untouched.
  const accounts = await collectCopilotAccounts(status.host, status.login);
  for (const account of accounts) {
    await deleteCopilotCredential(account);
  }
  await clearCopilotStoredLogin();

  if (await hasCopilotAuth()) {
    console.error(
      "\nCould not fully sign out. Remove stored credentials under ~/.copilot, or run /logout inside the Copilot CLI.",
    );
    return 1;
  }

  return 0;
}

async function collectCopilotAccounts(
  host: string | undefined,
  login: string | undefined,
): Promise<string[]> {
  const accounts = new Set<string>();
  if (host && login) {
    accounts.add(copilotCredentialAccount(host, login));
  }
  for (const user of await getCopilotLoggedInUsers()) {
    if (user.host && user.login) {
      accounts.add(copilotCredentialAccount(user.host, user.login));
    }
  }
  return [...accounts];
}
