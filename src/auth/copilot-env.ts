const COPILOT_TOKEN_ENV_KEYS = [
  "COPILOT_GITHUB_TOKEN",
  "GH_TOKEN",
  "GITHUB_TOKEN",
] as const;

/** Token types supported by GitHub Copilot CLI (classic ghp_ is not). */
export function isCopilotCompatibleToken(token: string): boolean {
  return (
    token.startsWith("gho_") ||
    token.startsWith("github_pat_") ||
    token.startsWith("ghu_")
  );
}

export function getCopilotEnvToken(): string | null {
  for (const key of COPILOT_TOKEN_ENV_KEYS) {
    const value = process.env[key]?.trim();
    if (value && isCopilotCompatibleToken(value)) {
      return value;
    }
  }
  return null;
}

export function hasCopilotEnvToken(): boolean {
  return getCopilotEnvToken() !== null;
}
