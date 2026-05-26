import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { homedir, userInfo } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { resolveClaudeBin } from "./claude-bin.js";

const execFileAsync = promisify(execFile);

const KEYCHAIN_SERVICE = "Claude Code-credentials";

type ClaudeCredentialsFile = {
  claudeAiOauth?: {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  };
};

export function getClaudeCredentialsPath(): string {
  const configDir = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
  return join(configDir, ".credentials.json");
}

async function readClaudeCredentialsFile(): Promise<ClaudeCredentialsFile | null> {
  try {
    await access(getClaudeCredentialsPath());
    const raw = await readFile(getClaudeCredentialsPath(), "utf8");
    return JSON.parse(raw) as ClaudeCredentialsFile;
  } catch {
    return null;
  }
}

async function readClaudeCredentialsFromKeychain(): Promise<ClaudeCredentialsFile | null> {
  if (process.platform !== "darwin") return null;

  try {
    const account = userInfo().username;
    const { stdout } = await execFileAsync("security", [
      "find-generic-password",
      "-s",
      KEYCHAIN_SERVICE,
      "-a",
      account,
      "-w",
    ]);
    return JSON.parse(stdout.trim()) as ClaudeCredentialsFile;
  } catch {
    try {
      const { stdout } = await execFileAsync("security", [
        "find-generic-password",
        "-s",
        KEYCHAIN_SERVICE,
        "-w",
      ]);
      return JSON.parse(stdout.trim()) as ClaudeCredentialsFile;
    } catch {
      return null;
    }
  }
}

async function readClaudeCredentials(): Promise<ClaudeCredentialsFile | null> {
  return (await readClaudeCredentialsFromKeychain()) ?? (await readClaudeCredentialsFile());
}

export async function hasClaudeAuth(): Promise<boolean> {
  try {
    const claudeBin = resolveClaudeBin();
    const { stdout } = await execFileAsync(claudeBin, ["auth", "status", "--json"]);
    const status = JSON.parse(stdout.trim()) as { loggedIn?: boolean };
    if (status.loggedIn) return true;
  } catch {
    // fall through to credential read
  }

  const token = await getClaudeAccessToken();
  return Boolean(token);
}

export async function getClaudeAccessToken(): Promise<string | null> {
  const parsed = await readClaudeCredentials();
  const oauth = parsed?.claudeAiOauth;
  if (!oauth?.accessToken) return null;

  if (oauth.expiresAt && oauth.expiresAt < Date.now()) {
    return null;
  }

  return oauth.accessToken;
}
