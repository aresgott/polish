import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { getClaudeAccessToken } from "../auth/claude-auth.js";

/** OAuth subscription tokens support current 4.x models, not legacy 3.5 IDs. */
const PREFERRED_MODELS = [
  "claude-haiku-4-5",
  "claude-haiku-4-5-20251001",
  "claude-sonnet-4-6",
  "claude-sonnet-4-20250514",
];

function formatClaudeError(err: unknown): string {
  if (err && typeof err === "object" && "errors" in err) {
    const errors = (err as { errors?: unknown[] }).errors;
    const last = errors?.[errors.length - 1];
    if (last && typeof last === "object") {
      const api = last as {
        statusCode?: number;
        data?: { error?: { type?: string; message?: string } };
        responseBody?: string;
      };
      const type = api.data?.error?.type;
      const message = api.data?.error?.message;
      if (type || message) {
        return [type, message].filter(Boolean).join(": ");
      }
      if (api.statusCode) return `HTTP ${api.statusCode}`;
    }
  }
  return err instanceof Error ? err.message : String(err);
}

export async function generateWithClaude(
  input: string,
  system: string,
): Promise<string> {
  const authToken = await getClaudeAccessToken();
  if (!authToken) {
    throw new Error("Not logged in to Claude. Run: polish login");
  }

  const anthropic = createAnthropic({
    authToken,
    headers: {
      "anthropic-beta": "claude-code-20250219,oauth-2025-04-20",
    },
  });
  let lastError: unknown;
  let lastMessage = "";

  for (const modelId of PREFERRED_MODELS) {
    try {
      const result = await generateText({
        model: anthropic(modelId),
        system,
        prompt: input,
        maxRetries: 1,
      });
      const text = result.text.trim();
      if (text) return text;
    } catch (err) {
      lastError = err;
      lastMessage = formatClaudeError(err);
      // Unavailable model IDs — try next immediately.
      if (/model:/i.test(lastMessage)) continue;
    }
  }

  throw new Error(
    lastMessage || "Failed to generate text with any available Claude model.",
    { cause: lastError },
  );
}
