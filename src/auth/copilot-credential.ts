import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Keychain/credential service name used by the GitHub Copilot CLI (via keytar).
 * Accounts are stored as `<host>:<login>` (e.g. "https://github.com:octocat").
 */
const COPILOT_CREDENTIAL_SERVICE = "copilot-cli";

export function copilotCredentialAccount(host: string, login: string): string {
  return `${host}:${login}`;
}

/**
 * Removes a stored Copilot OAuth credential from the OS credential store.
 *
 * Best-effort and strictly scoped to the `copilot-cli` service for the given
 * account — it never touches other providers' credentials. Failures (e.g. the
 * platform tool is missing, or the entry is already gone) are swallowed.
 */
export async function deleteCopilotCredential(account: string): Promise<void> {
  try {
    if (process.platform === "darwin") {
      await execFileAsync("security", [
        "delete-generic-password",
        "-s",
        COPILOT_CREDENTIAL_SERVICE,
        "-a",
        account,
      ]);
    } else if (process.platform === "win32") {
      // keytar stores Windows credentials under the target "<service>/<account>".
      await execFileAsync("cmdkey", [
        `/delete:${COPILOT_CREDENTIAL_SERVICE}/${account}`,
      ]);
    } else {
      // Linux/keytar uses libsecret; match on the service + account attributes.
      await execFileAsync("secret-tool", [
        "clear",
        "service",
        COPILOT_CREDENTIAL_SERVICE,
        "account",
        account,
      ]);
    }
  } catch {
    // Credential already absent or the platform tool is unavailable.
  }
}
